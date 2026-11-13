import { Chess, type Move } from "chess.js"
import { Engine, type EngineResult, scoreToWhiteCp } from "./engine"
import { bookDepth, openingName } from "./openings"
import type { MoveClass, PlyReview, ReviewReport } from "./types"

export const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const PIECE_NAME: Record<string, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" }

export function winPct(whiteCp: number): number {
  const c = Math.max(-15000, Math.min(15000, whiteCp))
  return Math.max(0, Math.min(100, 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1)))
}

export function moveAccuracy(wpBefore: number, wpAfter: number): number {
  const drop = Math.max(0, wpBefore - wpAfter)
  const acc = 103.1668 * Math.exp(-0.04354 * drop) - 3.1669
  return Math.max(0, Math.min(100, acc))
}

function povWp(whiteCp: number, color: "w" | "b"): number {
  return color === "w" ? winPct(whiteCp) : 100 - winPct(whiteCp)
}

export function winChanceDrop(p: Pick<PlyReview, "wpBefore" | "wpAfter">): number {
  return Math.max(0, p.wpBefore - p.wpAfter)
}

export function sortByWinChanceDrop<T extends Pick<PlyReview, "wpBefore" | "wpAfter">>(plies: T[]): T[] {
  return [...plies].sort((a, b) => winChanceDrop(b) - winChanceDrop(a))
}

export function uciToCoords(uci: string): { from: string; to: string; promotion?: "q" | "r" | "b" | "n" } {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length === 5 ? (uci[4] as "q" | "r" | "b" | "n") : undefined,
  }
}

export function pvToSANs(fen: string, pv: string[], max = 6): string[] {
  const c = new Chess(fen)
  const out: string[] = []
  for (const uci of pv.slice(0, max)) {
    const { from, to, promotion } = uciToCoords(uci)
    try {
      const mv = c.move({ from, to, promotion })
      if (!mv) break
      out.push(mv.san)
    } catch {
      break
    }
  }
  return out
}

function materialBalance(fen: string): { w: number; b: number } {
  const c = new Chess(fen)
  let w = 0
  let b = 0
  for (const row of c.board()) {
    for (const sq of row) {
      if (!sq) continue
      const v = PIECE_VALUE[sq.type]
      if (sq.color === "w") w += v
      else b += v
    }
  }
  return { w, b }
}

export function isMoveSacrifice(fenBefore: string, move: Move): boolean {
  if (move.captured || move.promotion) return false
  const offered = new Chess(fenBefore).get(move.from)
  if (!offered || PIECE_VALUE[offered.type] < 3) return false

  const afterMove = new Chess(fenBefore)
  try {
    afterMove.move({ from: move.from, to: move.to, promotion: move.promotion })
  } catch {
    return false
  }

  for (const reply of afterMove.moves({ verbose: true })) {
    if (reply.to !== move.to || !reply.captured) continue
    const afterCapture = new Chess(afterMove.fen())
    try {
      afterCapture.move({ from: reply.from, to: reply.to, promotion: reply.promotion })
    } catch {
      continue
    }
    const canRecapture = afterCapture.moves({ verbose: true }).some((candidate) => candidate.to === reply.to && !!candidate.captured)
    if (!canRecapture) return true
  }
  return false
}

export function describeThreat(fenAfter: string): string | null {
  const c = new Chess(fenAfter)
  if (c.isGameOver()) return c.isCheckmate() ? "checkmate was already on the board" : null
  const moves = c.moves({ verbose: true })
  const mate = moves.find((move) => move.san.endsWith("#"))
  if (mate) return `mate in one was available with ${mate.san}`

  const captures = moves
    .filter((move) => !!move.captured && PIECE_VALUE[move.captured] >= 3)
    .sort((a, b) => PIECE_VALUE[b.captured!] - PIECE_VALUE[a.captured!])
  for (const move of captures) {
    const afterCapture = new Chess(fenAfter)
    try {
      afterCapture.move({ from: move.from, to: move.to, promotion: move.promotion })
    } catch {
      continue
    }
    const canRecapture = afterCapture.moves({ verbose: true }).some((reply) => reply.to === move.to && !!reply.captured)
    if (!canRecapture) return `${move.san} wins the ${PIECE_NAME[move.captured!]}`
  }
  return null
}

function classify(args: {
  lossCP: number
  playedIsBest: boolean
  secondGap: number | null
  inBook: boolean
  sacrifice: boolean
  evalAfterWhite: number
  wpBefore: number
  wpAfter: number
  forced: boolean
}): MoveClass {
  const { lossCP, playedIsBest, secondGap, inBook, sacrifice, evalAfterWhite, wpBefore, wpAfter, forced } = args
  if (forced) return "forced"
  if (inBook) return "book"
  if (playedIsBest) {
    const materialLosingMove = sacrifice
    if (materialLosingMove && lossCP <= 40 && Math.abs(evalAfterWhite) < 4000) return "brilliant"
    const technicalOnly =
      secondGap !== null && secondGap >= 110 && lossCP <= 25 && Math.abs(evalAfterWhite) < 700
    if (technicalOnly) return "great"
    return "best"
  }
  if (wpBefore >= 80 && wpAfter <= 45) return "blunder"
  if (lossCP >= 300) return "blunder"
  if (wpBefore >= 70 && wpAfter <= wpBefore - 35) return "mistake"
  if (lossCP >= 150) return "mistake"
  if (lossCP >= 60) return "inaccuracy"
  if (lossCP <= 20) return "excellent"
  return "good"
}

const SIDE_NAME: Record<"w" | "b", string> = { w: "White", b: "Black" }

function commentFor(p: {
  cls: MoveClass
  color: "w" | "b"
  san: string
  bestSAN: string
  fenAfter: string
  lossCP: number
  sacrifice: boolean
  isMate: boolean
  bestLineSANs: string[]
}): string {
  const side = SIDE_NAME[p.color]
  switch (p.cls) {
    case "brilliant":
      return `Brilliant sacrifice. The engine's continuation is ${p.bestLineSANs.slice(0, 4).join(" ") || p.bestSAN}.`
    case "great":
      return `Strong move. The engine sees this as a particularly precise choice.`
    case "best":
      return p.isMate ? "Checkmate. The engine confirms there is no defense." : `Best move in this position, according to the engine.`
    case "excellent":
      return `Very close to the top move. The engine's choice was ${p.bestSAN}.`
    case "good":
      return `A sound move. The engine prefers ${p.bestSAN}, but your position remains playable.`
    case "book":
      return `This follows a known opening line.`
    case "forced":
      return `Only legal move. There was no decision to judge here.`
    case "inaccuracy":
      return `${side}'s move loses a little ground. ${p.bestSAN} keeps more of the advantage.`
    case "mistake": {
      const threat = describeThreat(p.fenAfter)
      return `This changes the evaluation. The engine prefers ${p.bestSAN}.${threat ? ` The immediate point: ${threat}.` : " Check what your opponent can target next."}`
    }
    case "blunder": {
      const threat = describeThreat(p.fenAfter)
      return `This drops a lot of ground. ${p.bestSAN} was needed.${threat ? ` The immediate point: ${threat}.` : " Look for the opponent's strongest threat."}`
    }
    default:
      return ""
  }
}

export interface ReviewOptions {
  pgn: string
  engine: Engine
  movetime: number
  onProgress?: (done: number, total: number) => void
  isAborted?: () => boolean
}

export interface ParsedGame {
  sans: string[]
  fens: string[]
  result: string
}

export function parseGameFens(pgn: string): ParsedGame {
  const c = new Chess()
  try {
    c.loadPgn(pgn, { strict: false })
  } catch {
    return { sans: [], fens: [new Chess().fen()], result: "*" }
  }
  const sans: string[] = []
  const fens: string[] = []
  const start = new Chess(fenFromPgn(pgn))
  fens.push(start.fen())
  const walk = start
  for (const m of c.history({ verbose: true })) {
    try {
      walk.move({ from: m.from, to: m.to, promotion: m.promotion })
      sans.push(m.san)
      fens.push(walk.fen())
    } catch {
      break
    }
  }
  let result = "*"
  try {
    result = c.getHeaders().Result ?? "*"
  } catch {
    result = "*"
  }
  return { sans, fens, result }
}

function fenFromPgn(pgn: string): string {
  try {
    const m = pgn.match(/\[FEN "([^"]+)"\]/)
    if (m) {
      new Chess(m[1])
      return m[1]
    }
  } catch {
    return new Chess().fen()
  }
  return new Chess().fen()
}

function freshCounts(): Record<MoveClass, { w: number; b: number }> {
  const cls: MoveClass[] = ["brilliant", "great", "best", "excellent", "good", "book", "inaccuracy", "mistake", "blunder", "forced"]
  const out = {} as Record<MoveClass, { w: number; b: number }>
  for (const c of cls) out[c] = { w: 0, b: 0 }
  return out
}

function weightedAccuracy(list: PlyReview[]): number {
  const choices = list.filter((p) => p.cls !== "forced")
  if (!choices.length) return 0
  const sum = choices.reduce((s, p) => s + p.acc, 0)
  return Math.round((sum / choices.length) * 10) / 10
}

function avgLoss(list: PlyReview[], color: "w" | "b"): number {
  const items = list.filter((p) => p.color === color && p.cls !== "forced")
  if (!items.length) return 0
  return Math.round((items.reduce((s, p) => s + p.lossCP, 0) / items.length) * 10) / 10
}

function topMoments(plies: PlyReview[], color: "w" | "b"): number[] {
  return sortByWinChanceDrop(plies.filter((p) => p.color === color && ["blunder", "mistake"].includes(p.cls)))
    .slice(0, 3)
    .map((p) => p.ply)
}

export async function reviewGame(opts: ReviewOptions): Promise<ReviewReport> {
  const { pgn, engine, movetime, onProgress, isAborted } = opts
  const { sans, fens, result } = parseGameFens(pgn)
  engine.setOption("Skill Level", 20)
  engine.setOption("MultiPV", 2)
  const plies: PlyReview[] = []
  const counts = freshCounts()

  for (let i = 0; i < sans.length; i++) {
    if (isAborted?.()) break
    const fenBefore = fens[i]
    const fenAfter = fens[i + 1]
    const turn = new Chess(fenBefore).turn()

    let playedM: Move | null = null
    try {
      playedM = new Chess(fenBefore).move(sans[i]) as Move
    } catch {
      break
    }
    if (!playedM) break
    const uci = `${playedM.from}${playedM.to}${playedM.promotion ?? ""}`

    const boardBefore = new Chess(fenBefore)
    let isForced = boardBefore.moves().length <= 1

    const before: EngineResult | null = isForced
      ? null
      : await engine.go({ fen: fenBefore, movetime, multipv: 2 })
    if (isAborted?.()) break
    const after: EngineResult | null = await engine.go({ fen: fenAfter, movetime, multipv: 1 })
    if (isAborted?.()) break

    const bestScoreWhite = before?.lines[0] ? scoreToWhiteCp(before.lines[0].score, turn) : evalFallback(fenAfter)
    const oppStm: "w" | "b" = turn === "w" ? "b" : "w"
    const playedScoreWhite = after?.lines[0]
      ? scoreToWhiteCp(after.lines[0].score, oppStm)
      : evalFallback(fenAfter)

    const secondGap =
      before && before.lines[0] && before.lines[1]
        ? Math.abs(scoreToWhiteCp(before.lines[0].score, turn) - scoreToWhiteCp(before.lines[1].score, turn))
        : null

    const rawBest = before?.bestmove ?? ""
    const bestUCI = rawBest && rawBest !== "(none)" ? rawBest : ""
    const bestCoords = bestUCI ? uciToCoords(bestUCI) : null
    let bestSAN = "..."
    if (bestCoords) {
      const rec = new Chess(fenBefore)
      try {
        const m = rec.move({ from: bestCoords.from, to: bestCoords.to, promotion: bestCoords.promotion })
        bestSAN = m?.san ?? "..."
      } catch {
        bestSAN = "..."
      }
    }
    const bestPV = before?.lines[0]?.pv ?? []
    const bestLineSANs = bestCoords ? pvToSANs(fenBefore, bestPV, 5) : (after ? pvToSANs(fenAfter, after.lines[0]?.pv ?? [], 5) : [])
    if (bestCoords && !bestLineSANs.length) bestLineSANs.push(bestSAN)
    if (!bestLineSANs.length) bestLineSANs.push(bestSAN)

    const evalAfterWhite = playedScoreWhite
    const wpBefore = povWp(bestScoreWhite, turn)
    const wpAfter = povWp(evalAfterWhite, turn)
    const diff = turn === "w" ? bestScoreWhite - playedScoreWhite : playedScoreWhite - bestScoreWhite
    const lossCP = Math.max(0, diff)

    const sacrifice = isMoveSacrifice(fenBefore, playedM)
    const bookLen = bookDepth(sans.slice(0, i + 1))
    const playedIsBest = !!bestCoords && bestUCI === uci
    const cls = classify({
      lossCP,
      playedIsBest,
      secondGap,
      inBook: i + 1 <= bookLen,
      sacrifice,
      evalAfterWhite,
      wpBefore,
      wpAfter,
      forced: isForced,
    })

    const isMate = playedM.san.endsWith("#")
    const isCheck = (() => {
      try {
        return new Chess(fenAfter).inCheck()
      } catch {
        return false
      }
    })()

    const bestLineSANsTail = bestLineSANs.length >= 1 ? bestLineSANs.slice(1) : bestLineSANs
    const comment = commentFor({
      cls,
      color: turn,
      san: playedM.san,
      bestSAN,
      fenAfter,
      lossCP,
      sacrifice,
      isMate,
      bestLineSANs: bestLineSANsTail,
    })

    plies.push({
      ply: i + 1,
      san: playedM.san,
      uci,
      color: turn,
      fenBefore,
      fenAfter,
      bestSAN,
      bestUCI,
      bestFrom: bestCoords?.from ?? "",
      bestTo: bestCoords?.to ?? "",
      bestPV,
      secondGapCP: secondGap,
      evalAfterCP: Math.round(evalAfterWhite),
      evalAfterWhite: Math.round(evalAfterWhite),
      lossCP,
      wpBefore: Math.round(wpBefore),
      wpAfter: Math.round(wpAfter),
      acc: Math.round(moveAccuracy(wpBefore, wpAfter) * 10) / 10,
      cls,
      playedIsBest,
      isSacrifice: sacrifice,
      isCheck,
      isMate,
      comment,
    })
    counts[cls][turn]++
    onProgress?.(i + 1, sans.length)
  }

  const wPlies = plies.filter((p) => p.color === "w")
  const bPlies = plies.filter((p) => p.color === "b")
  return {
    plies,
    opening: openingName(sans),
    bookPlies: bookDepth(sans),
    accW: weightedAccuracy(wPlies),
    accB: weightedAccuracy(bPlies),
    lossW: avgLoss(plies, "w"),
    lossB: avgLoss(plies, "b"),
    counts,
    keyMomentsW: topMoments(plies, "w"),
    keyMomentsB: topMoments(plies, "b"),
    result,
  }
}

function evalFallback(fen: string): number {
  const m = materialBalance(fen)
  return (m.w - m.b) * 100
}
