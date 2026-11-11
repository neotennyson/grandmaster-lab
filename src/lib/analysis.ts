import { Chess, type Move } from "chess.js"
import { Engine, type EngineResult, scoreToWhiteCp } from "./engine"
import { bookDepth, openingName } from "./openings"
import type { MoveClass, PlyReview, ReviewReport } from "./types"

export const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

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

export function isSacrifice(fenAfter: string): boolean {
  const c = new Chess(fenAfter)
  if (c.isGameOver()) return false
  for (const m of c.moves({ verbose: true })) {
    if (!m.captured) continue
    const recapture = maxRecapture(c, m)
    if (PIECE_VALUE[m.captured] - recapture >= 2) return true
  }
  return false
}

function maxRecapture(chess: Chess, oppMove: Move): number {
  try {
    chess.move(oppMove)
  } catch {
    return 0
  }
  let best = 0
  for (const r of chess.moves({ verbose: true })) {
    if (!r.captured) continue
    if (PIECE_VALUE[r.captured] > best) best = PIECE_VALUE[r.captured]
  }
  chess.undo()
  return best
}

export function describeThreat(fenAfter: string): string | null {
  const c = new Chess(fenAfter)
  if (c.isGameOver()) return c.isCheckmate() ? "checkmate was already on the board" : null
  let best = { san: "", value: -1, fork: false, mate: false, hanging: false }
  for (const m of c.moves({ verbose: true })) {
    let value = m.captured ? PIECE_VALUE[m.captured] : 0
    if (m.san.includes("#")) best.mate = true
    let fork = false
    let hanging = false
    try {
      c.move(m)
      const next = c.moves({ verbose: true })
      const bigTargets = new Set(next.filter((x) => x.captured && PIECE_VALUE[x.captured] >= 3).map((x) => x.to))
      if (bigTargets.size >= 2) fork = true
      const mated = c.isCheckmate()
      if (mated) best.mate = true
      const enemy = c.turn()
      const attacked = c.isAttacked(m.to, enemy)
      if (value >= 3 && !attacked) hanging = true
      c.undo()
      if (mated) value = 10000
      else if (fork) value = Math.max(value, 4)
      else if (hanging) value = Math.max(value, 3.5)
    } catch {
      continue
    }
    if (m.san.includes("#")) value = 10000
    if (value > best.value) best = { san: m.san, value, fork, mate: best.mate || m.san.includes("#"), hanging }
  }
  if (best.mate && best.san) return `mate was in the air: ${best.san}`
  if (best.value >= 9) return `${best.san} grabs the queen`
  if (best.value >= 5) return `${best.san} wins a heavy piece`
  if (best.fork) return `a fork was lurking: ${best.san} hits two pieces`
  if (best.value >= 3) return `${best.san} wins a full piece`
  if (best.value === 1) return `${best.san} just takes the pawn`
  if (best.hanging) return `${best.san} grabs the loose piece`
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
      return `Brilliant! ${side} gives up material — the machine proves the attack: ${p.bestLineSANs.slice(0, 4).join(" ") || "the compensation is real"}.`
    case "great":
      return `A rare "great move" — ${p.bestSAN} is the only sane move on the board.`
    case "best":
      return p.isMate ? "Checkmate, engine-approved." : `The engine's top choice. Nothing to improve.`
    case "excellent":
      return `Practically identical to the engine pick (${p.bestSAN}).`
    case "good":
      return `Solid. The engine prefers ${p.bestSAN}, but nothing damages your position.`
    case "book":
      return `Book move — theory territory.`
    case "forced":
      return `The only legal move on the board.`
    case "inaccuracy":
      return `${side} drifts: ${p.san} gives up a little ground. The engine wants ${p.bestSAN} instead.`
    case "mistake": {
      const threat = describeThreat(p.fenAfter)
      return `Mistake: ${p.san} is a step behind. The engine wants ${p.bestSAN}.${threat ? ` What you missed: ${threat}.` : ""}`
    }
    case "blunder": {
      const threat = describeThreat(p.fenAfter)
      return `Blunder: ${p.san} wrecks ${side}'s position. The correction was ${p.bestSAN}.${threat ? ` What you missed: ${threat}.` : ""}`
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
  if (!list.length) return 0
  const sum = list.reduce((s, p) => s + p.acc, 0)
  return Math.round((sum / list.length) * 10) / 10
}

function avgLoss(list: PlyReview[], color: "w" | "b"): number {
  const items = list.filter((p) => p.color === color)
  if (!items.length) return 0
  return Math.round((items.reduce((s, p) => s + p.lossCP, 0) / items.length) * 10) / 10
}

function topMoments(plies: PlyReview[], color: "w" | "b"): number[] {
  return plies
    .filter((p) => p.color === color && ["blunder", "mistake"].includes(p.cls))
    .sort((a, b) => b.wpAfter - b.wpBefore - (a.wpAfter - a.wpBefore))
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

    const sacrifice = isSacrifice(fenAfter)
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
