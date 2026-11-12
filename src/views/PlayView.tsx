import { useEffect, useMemo, useRef, useState } from "react"
import { Chess, type Move } from "chess.js"
import { Engine, scoreToWhiteCp } from "../lib/engine"
import { BOT_TIERS, findTC, type EngineBotTier, type GameRecord, type TimeControl } from "../lib/types"
import { saveGame, newId, loadPlayer, applyGameRating } from "../lib/store"
import { loadCoach, saveCoach } from "../lib/coach"
import { Board } from "../components/Board"
import { Piece } from "../components/pieces"
import { isSacrifice, uciToCoords } from "../lib/analysis"
import { openingName } from "../lib/openings"
import type { MoveClass } from "../lib/types"
import {
  xpForGame,
  unlockBadges,
  coachGreet,
  coachStart,
  coachOnYourMove,
  coachOnBotMove,
  coachOnEnd,
  levelOf,
  TITLES,
  BADGES,
  type ReactionTone,
} from "../lib/coach"
import { emit } from "../lib/coachBus"
import { playSound } from "../lib/coachSound"
import { speak, stopSpeaking } from "../lib/voice"
import { CoachAvatar, CoachBubble } from "../components/Coach"
import { ClockFace, ClockTicker } from "../components/ClockFace"
import { IconTarget, IconPlusSquare, IconBoard, IconUsers, IconFlag, IconInfo, IconSwap, IconFirst, IconPrev, IconPlay, IconLast, IconPawn } from "../components/icons"

export interface PlaySettings {
  myColor: "w" | "b"
  tier: EngineBotTier
  coach: boolean
  deep: boolean
  tcId: string
}

type OverState = string | null
type PanelTab = "moves" | "info"

interface Clocks {
  w: number
  b: number
  started: boolean
}

const DRAW_THRESHOLD = -150

export function PlayView({
  settings,
  onExit,
  onNavigate,
  onReview,
}: {
  settings: PlaySettings
  onExit: () => void
  onNavigate: (m: "home" | "openings" | "masters") => void
  onReview: (g: GameRecord) => void
}) {
  const tc: TimeControl = useMemo(() => findTC(settings.tcId), [settings.tcId])
  const baseMs = tc.base * 60_000
  const [state, setState] = useState<{ fen: string; hist: Move[]; over: OverState; overReason: string }>({
    fen: new Chess().fen(),
    hist: [],
    over: null,
    overReason: "",
  })
  const [thinking, setThinking] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const engineRef = useRef<Engine | null>(null)
  const reqRef = useRef(0)
  const [engineReady, setEngineReady] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [premove, setPremoveState] = useState<{ from: string; to: string; promotion?: string } | null>(null)
  const premoveRef = useRef<{ from: string; to: string; promotion?: string } | null>(null)
  premoveRef.current = premove

  const clockRef = useRef<Clocks>({ w: baseMs, b: baseMs, started: false })
  const [coachTone, setCoachTone] = useState<ReactionTone>("hype")
  const [coachText, setCoachText] = useState<string>(() => coachGreet())
  useEffect(() => {
    speak(coachText)
    return () => stopSpeaking()
  }, [coachText])
  const flowRef = useRef(0)
  const [, setCoachProfile] = useState(loadCoach)
  const coachProfileRef = useRef(loadCoach())
  const probeRef = useRef<Engine | null>(null)
  const coachMovesRef = useRef<{ blunderless: boolean; flow: number }>({ blunderless: true, flow: 0 })
  const minEvalRef = useRef(0)
  const endedForRef = useRef("")
  const autoReviewTimerRef = useRef<number | null>(null)
  const [tab, setTab] = useState<PanelTab>("moves")
  const [navPly, setNavPly] = useState<number | null>(null)
  const [rating, setRating] = useState(() => loadPlayer().rating)
  const [ratingDelta, setRatingDelta] = useState<{ before: number; after: number; delta: number } | null>(null)


  function say(tone: ReactionTone, text: string) {
    setCoachTone(tone)
    setCoachText(text)
  }

  useEffect(() => {
    const probe = new Engine()
    probe.boot().then(() => (probeRef.current = probe))
    return () => probe.destroy()
  }, [])

  function commitProfile(next: import("../lib/coach").CoachProfile) {
    coachProfileRef.current = next
    saveCoach(next)
    setCoachProfile(next)
  }

  function awardXP(amount: number, reason: string) {
    const p = coachProfileRef.current
    const next = { ...p, xp: p.xp + amount, lastTs: Date.now() }
    commitProfile(next)
    emit({ kind: "xp", amount, reason })
    const lvlBefore = levelOf(p.xp)
    const lvlAfter = levelOf(next.xp)
    if (lvlAfter > lvlBefore) {
      emit({ kind: "levelup", level: lvlAfter, title: TITLES[Math.min(lvlAfter, TITLES.length - 1)] })
      playSound("levelup")
      say("hype", `LEVEL ${lvlAfter} — ${TITLES[Math.min(lvlAfter, TITLES.length - 1)]}. The student grows.`)
    }
  }

  function checkBadge(id: string) {
    const p = coachProfileRef.current
    if (p.badges.includes(id)) return
    const b = BADGES.find((x) => x.id === id)
    commitProfile({ ...p, badges: [...p.badges, id] })
    if (b) {
      emit({ kind: "badge", id: b.id, name: b.name, glyph: b.glyph, desc: b.desc })
      playSound("badge")
    }
  }

  const runningSide = useMemo<"w" | "b" | null>(() => {
    if (state.over || !clockRef.current.started) return null
    const c = new Chess(state.fen)
    return c.turn()
  }, [state.fen, state.over])

  useEffect(() => {
    const s = coachStart({ tcId: settings.tcId })
    setCoachTone(s.tone)
    setCoachText(s.text)
    endedForRef.current = ""
  }, [settings.tcId, settings.myColor])

  useEffect(() => {
    if (navPly !== null) setNavPly(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hist.length])

  useEffect(() => {
    const e = new Engine()
    e.boot()
      .then(() => {
        setEngineReady(true)
        engineRef.current = e
      })
      .catch(() => setNotice("Engine failed to load"))
    return () => {
      reqRef.current++
      if (autoReviewTimerRef.current) clearTimeout(autoReviewTimerRef.current)
      e.destroy()
    }
  }, [])

  function startClockIfNeeded() {
    if (!clockRef.current.started) clockRef.current.started = true
  }

  function gameOverText(c: Chess, reason?: string): { r: string; why: string } | null {
    if (c.isCheckmate()) {
      const r = c.turn() === "w" ? "0-1" : "1-0"
      return { r, why: reason ?? "Checkmate" }
    }
    if (c.isStalemate()) return { r: "1/2-1/2", why: "Stalemate" }
    if (c.isInsufficientMaterial()) return { r: "1/2-1/2", why: "Insufficient material" }
    if (c.isThreefoldRepetition()) return { r: "1/2-1/2", why: "Threefold repetition" }
    if (c.isDrawByFiftyMoves()) return { r: "1/2-1/2", why: "Fifty-move rule" }
    return null
  }

  function flagTimeout(loser: "w" | "b") {
    setState((s) => {
      if (s.over) return s
      const c = new Chess(s.fen)
      const winner = loser === "w" ? "b" : "w"
      const canMate = sideCanMate(c, winner)
      const result = canMate
        ? winner === "w"
          ? { r: "1-0", why: "Time out" }
          : { r: "0-1", why: "Time out" }
        : { r: "1/2-1/2", why: "Time out vs insufficient material" }
      reqRef.current++
      return { ...s, over: result.r, overReason: result.why }
    })
    setThinking(false)
    setPremoveState(null)
  }

  function sideCanMate(c: Chess, side: "w" | "b"): boolean {
    const pieces: { type: string; square: string }[] = []
    for (const row of c.board()) {
      for (const sq of row) {
        if (!sq) continue
        if (sq.color !== side || sq.type === "k") continue
        pieces.push({ type: sq.type, square: sq.square as string })
      }
    }
    if (!pieces.length) return false
    const types = new Set(pieces.map((p) => p.type))
    if (types.has("p") || types.has("r") || types.has("q")) return true
    if (types.size === 1 && types.has("b")) {
      const colors = new Set(pieces.map((p) => (p.square.charCodeAt(0) - 97 + Number(p.square[1])) % 2))
      return colors.size === 2
    }
    return pieces.length > 1
  }

  const chessNow = useMemo(() => {
    try {
      return new Chess(state.fen)
    } catch {
      return new Chess()
    }
  }, [state.fen])

  const myTurn = chessNow.turn() === settings.myColor && !state.over
  const browsing = navPly !== null

  const legalFrom = useMemo(() => {
    if (!myTurn || !sel) return []
    try {
      return chessNow.moves({ square: sel as never, verbose: true }).map((m) => String((m as Move).to))
    } catch {
      return []
    }
  }, [myTurn, sel, chessNow])

  const targetsFor = useMemo(
    () => (sq: string): string[] => {
      if (!myTurn) return []
      try {
        return chessNow.moves({ square: sq as never, verbose: true }).map((m) => String((m as Move).to))
      } catch {
        return []
      }
    },
    [myTurn, chessNow],
  )

  function applyMoveObj(mv: { from: string; to: string; promotion?: string }) {
    startClockIfNeeded()
    const fenBefore = state.fen
    const c = new Chess(fenBefore)
    const mvr = c.turn()
    let played = ""
    let moveFlags: { captured?: string } = {}
    try {
      const probeMove = c.move(mv)
      played = probeMove?.san ?? ""
      moveFlags = probeMove ?? {}
    } catch {
      played = ""
    }
    if (!played) return
    const isCapture = !!moveFlags.captured
    if (c.inCheck()) playSound("check")
    else playSound(isCapture ? "capture" : "move")
    const res = gameOverText(c)
    setState((s) => {
      const cc = new Chess(s.fen)
      let applied: Move | null = null
      try {
        applied = cc.move(mv) as Move
      } catch {
        return s
      }
      if (!applied) return s
      const inc = tc.inc * 1000
      clockRef.current[mvr] += inc
      return {
        fen: cc.fen(),
        hist: [...s.hist, applied],
        over: res?.r ?? null,
        overReason: res?.why ?? "",
      }
    })
    setSel(null)
    void coachJudge({ fenBefore, mv, san: played, isCapture })
  }

  function plausibleShape(board: Chess, from: string, to: string, promotion?: string): boolean {
    const pc = board.get(from as never)
    if (!pc) return false
    const target = board.get(to as never)
    if (target && target.color === pc.color) return false
    if (from === to) return false
    const df = to.charCodeAt(0) - from.charCodeAt(0)
    const dr = Number(to[1]) - Number(from[1])
    const adf = Math.abs(df)
    const adr = Math.abs(dr)
    switch (pc.type) {
      case "n":
        return (adf === 1 && adr === 2) || (adf === 2 && adr === 1)
      case "b":
        return adf === adr
      case "r":
        return df === 0 || dr === 0
      case "q":
        return df === 0 || dr === 0 || adf === adr
      case "k": {
        if (adf <= 1 && adr <= 1) return true
        if (from === "e1") return to === "g1" || to === "c1" || to === "h1" || to === "a1"
        if (from === "e8") return to === "g8" || to === "c8" || to === "h8" || to === "a8"
        return false
      }
      case "p": {
        const dir = pc.color === "w" ? 1 : -1
        const homeRank = pc.color === "w" ? "2" : "7"
        if (promotion) {
          const lastRank = pc.color === "w" ? "8" : "1"
          return to[1] === lastRank && (df === 0 || adf === 1) && dr === Number(lastRank) - Number(from[1])
        }
        return (
          (df === 0 && (dr === dir || (dr === 2 * dir && from[1] === homeRank))) ||
          (adf === 1 && dr === dir) ||
          (adf === 1 && dr === 2 * dir && from[1] === homeRank)
        )
      }
      default:
        return false
    }
  }

  function userMoveAttempt(from: string, to: string) {
    if (browsing) return
    const c = new Chess(state.fen)
    const isMyPiece = c.get(from as never)?.color === settings.myColor
    if (!myTurn) {
      if (isMyPiece && !state.over) {
        let target = to
        if (from.toLowerCase() === "e1" && (to === "h1" || to === "a1")) target = to === "h1" ? "g1" : "c1"
        if (from.toLowerCase() === "e8" && (to === "h8" || to === "a8")) target = to === "h8" ? "g8" : "c8"
        if (!plausibleShape(c, from, target)) {
          setPremoveState(null)
          return
        }
        const pm = c.moves({ verbose: true }).find((m) => m.from === from && m.to === target && !!m.promotion)
        const promotion = pm ? "q" : target[1] === "8" || target[1] === "1" ? "q" : undefined
        setPremoveState({ from, to: target, promotion })
      }
      return
    }
    let target = to
    if (from.toLowerCase() === "e1" && (to === "h1" || to === "a1")) target = to === "h1" ? "g1" : "c1"
    if (from.toLowerCase() === "e8" && (to === "h8" || to === "a8")) target = to === "h8" ? "g8" : "c8"
    if (!target || target === from) return
    const legalHere = c.moves({ verbose: true }).find((m) => m.from === from && m.to === target)
    if (!legalHere) return
    const promoMove = c.moves({ verbose: true }).find((m) => m.from === from && m.to === target && !!m.promotion)
    if (promoMove) {
      setPromo({ from, to: target })
      return
    }
    setPremoveState(null)
    applyMoveObj({ from, to: target })
  }

  async function coachJudge(ctx: { fenBefore: string; mv: { from: string; to: string; promotion?: string }; san: string; isCapture: boolean }) {
    const fenAfter = new Chess(ctx.fenBefore)
    let ok = true
    try {
      fenAfter.move(ctx.mv)
    } catch {
      ok = false
    }
    if (!ok) return

    if (!settings.coach || !probeRef.current || tc.base < 3) {
      if (ctx.isCapture) {
        const r = coachOnYourMove({ cls: "good", lossCP: 0, combo: flowRef.current, bestSAN: ctx.san, mySAN: ctx.san, isCapture: true, isCheck: false }, false)
        if (r) say(r.tone, r.text)
      }
      return
    }

    const probe = probeRef.current
    const before = await probe.go({ fen: ctx.fenBefore, movetime: 480, multipv: 2 })
    const after = await probe.go({ fen: fenAfter.fen(), movetime: 260, multipv: 1 })
    const mover = new Chess(ctx.fenBefore).turn()
    const bestScoreWhite = before.lines[0] ? scoreToWhiteCp(before.lines[0].score, mover) : 0
    const oppStm: "w" | "b" = mover === "w" ? "b" : "w"
    const playedScoreWhite = after.lines[0] ? scoreToWhiteCp(after.lines[0].score, oppStm) : 0
    const lossCP = Math.max(0, Math.round(mover === "w" ? bestScoreWhite - playedScoreWhite : playedScoreWhite - bestScoreWhite))
    const playedIsBest = before.bestmove === uciOf(ctx.mv)
    const secondGap =
      before.lines[0] && before.lines[1]
        ? Math.abs(scoreToWhiteCp(before.lines[0].score, mover) - scoreToWhiteCp(before.lines[1].score, mover))
        : null
    const sacrifice = isSacrifice(fenAfter.fen())
    let cls: MoveClass = "good"
    if (playedIsBest) {
      cls = sacrifice && lossCP <= 40 ? "brilliant" : secondGap !== null && secondGap >= 110 && lossCP <= 25 ? "great" : "best"
    } else if (lossCP >= 300) cls = "blunder"
    else if (lossCP >= 150) cls = "mistake"
    else if (lossCP >= 60) cls = "inaccuracy"
    else if (lossCP <= 20) cls = "excellent"
    else cls = "good"

    const bestSAN = ((): string => {
      const bc = new Chess(ctx.fenBefore)
      try {
        const coordsList = before.bestmove ? uciToCoords(before.bestmove) : null
        if (!coordsList) return ctx.san
        const m = bc.move({ from: coordsList.from, to: coordsList.to, promotion: coordsList.promotion })
        return m?.san ?? ctx.san
      } catch {
        return ctx.san
      }
    })()

    const comboNext = ["brilliant", "great", "best", "excellent", "good"].includes(cls)
      ? flowRef.current + 1
      : cls === "inaccuracy"
        ? Math.max(0, flowRef.current - 1)
        : 0
    if (cls === "blunder" || cls === "mistake") coachMovesRef.current.blunderless = false
    if (["mistake", "blunder"].includes(cls)) {
      const evalWhite = mover === "w" ? playedScoreWhite : -playedScoreWhite
      minEvalRef.current = Math.min(minEvalRef.current, evalWhite)
    }
    flowRef.current = comboNext
    coachMovesRef.current.flow = Math.max(coachMovesRef.current.flow, comboNext)
    if (comboNext >= 8) checkBadge("flow8")

    const verdict = { cls, lossCP, combo: comboNext, bestSAN, mySAN: ctx.san, isCapture: ctx.isCapture, isCheck: false }
    const reaction = coachOnYourMove(verdict, settings.coach)
    if (reaction) say(reaction.tone, reaction.text)

    if (cls === "blunder" || cls === "mistake") playSound("blunder")
    else if (["brilliant", "great", "best"].includes(cls)) playSound("praise")
    else playSound("click")

    const xpAmount =
      cls === "brilliant" ? 14 : cls === "great" ? 9 : cls === "best" ? 5 : cls === "excellent" ? 4 : cls === "good" ? 2 : cls === "blunder" || cls === "mistake" ? 0 : 1
    awardXP(xpAmount, "flow")
  }

  function uciOf(mv: { from: string; to: string; promotion?: string }): string {
    return `${mv.from}${mv.to}${mv.promotion ?? ""}`
  }

  function applyPromo(piece: "q" | "r" | "n" | "b") {
    if (!promo) return
    setPremoveState(null)
    applyMoveObj({ from: promo.from, to: promo.to, promotion: piece })
    setPromo(null)
  }

  function clickSquare(sq: string) {
    if (state.over || browsing) return
    const piece = chessNow.get(sq as never)
    if (premove && (premove.to === sq || premove.from === sq)) {
      setPremoveState(null)
      return
    }
    if (sel === sq) {
      setSel(null)
      return
    }
    if (sel && legalFrom.includes(sq)) {
      userMoveAttempt(sel, sq)
      return
    }
    if (!myTurn) {
      if (piece && piece.color === settings.myColor) setSel(sq)
      else setSel(null)
      return
    }
    if (sel) {
      if (piece && piece.color === settings.myColor) setSel(sq)
      else setSel(null)
      return
    }
    if (piece && piece.color === settings.myColor) setSel(sq)
  }

  useEffect(() => {
    const engine = engineRef.current
    if (!engineReady || !engine || state.over) return
    const turn = chessNow.turn()
    if (turn === settings.myColor) return
    const id = ++reqRef.current
    setThinking(true)
    const botRemaining = clockRef.current[turn]
    const tierTime = settings.deep ? BOT_TIERS[settings.tier].time + 6000 : BOT_TIERS[settings.tier].time
    const movetime = Math.max(80, Math.min(tierTime, botRemaining - 150))
    engine
      .go({ fen: chessNow.fen(), movetime, skill: 20 })
      .then((res) => {
        if (id !== reqRef.current) return
        setThinking(false)
        if (!res.bestmove || res.bestmove === "(none)") return
        const coords = uciToCoords(res.bestmove)
        clockRef.current.started = true
        const botEval = new Chess(state.fen)
        let botAppliedInfo = { capture: false, check: false }
        try {
          const ap = botEval.move({ from: coords.from, to: coords.to, promotion: coords.promotion })
          botAppliedInfo = {
            capture: !!ap?.captured,
            check: botEval.inCheck(),
          }
          if (botAppliedInfo.check) playSound("check")
          else playSound(botAppliedInfo.capture ? "capture" : "move")
        } catch {
          botAppliedInfo = { capture: false, check: false }
        }
        setState((s) => {
          const c = new Chess(s.fen)
          let applied: Move | null = null
          try {
            applied = c.move({ from: coords.from, to: coords.to, promotion: coords.promotion }) as Move
          } catch {
            return s
          }
          if (!applied) return s
          clockRef.current[turn] += tc.inc * 1000
          const res2 = gameOverText(c)
          return {
            fen: c.fen(),
            hist: [...s.hist, applied],
            over: res2?.r ?? null,
            overReason: res2?.why ?? "",
          }
        })
        tryPremove()
        const myClockNow = clockRef.current[settings.myColor]
        if (state.over) return
        const r = coachOnBotMove({
          isCapture: botAppliedInfo.capture,
          isCheck: botAppliedInfo.check,
          timeLow: myClockNow < 20000 && myClockNow > 0,
          mvSAN: res.bestmove,
        })
        if (r) say(r.tone, r.text)
      })
      .catch(() => setThinking(false))
    return () => {
      reqRef.current++
    }
  }, [state.fen, engineReady, state.over])

  function tryPremove() {
    const pm = premoveRef.current
    if (!pm || state.over) return
    setState((s) => {
      const c = new Chess(s.fen)
      let applied: Move | null = null
      try {
        applied = c.move({ from: pm.from, to: pm.to, promotion: pm.promotion }) as Move
      } catch {
        applied = null
      }
      if (!applied) return s
      const res = gameOverText(c)
      const stm = new Chess(s.fen).turn()
      clockRef.current[stm] += tc.inc * 1000
      if (c.inCheck()) playSound("check")
      return { fen: c.fen(), hist: [...s.hist, applied], over: res?.r ?? null, overReason: res?.why ?? "" }
    })
    setPremoveState(null)
  }

  function resign() {
    if (state.over) return
    const result = settings.myColor === "w" ? "0-1" : "1-0"
    setState((s) => ({ ...s, over: result, overReason: "Resignation" }))
    reqRef.current++
    setThinking(false)
    setPremoveState(null)
  }

  async function offerDraw() {
    if (state.over || thinking) return
    const c = new Chess(state.fen)
    const probe = new Engine()
    try {
      await probe.boot()
      const res = await probe.go({ fen: state.fen, movetime: 600, multipv: 1 })
      probe.destroy()
      const line = res.lines[0]
      const accepted = acceptLogic(c.turn(), line)
      if (accepted) {
        setState((s) => ({ ...s, over: "1/2-1/2", overReason: "Draw by agreement" }))
        reqRef.current++
        setNotice("Draw agreed.")
      } else {
        setNotice("Draw declined.")
      }
    } catch {
      probe.destroy()
      setNotice("Draw declined.")
    }
  }

  function acceptLogic(mySide: string, line: { score: { type: string; value: number } } | undefined): boolean {
    if (!line) return false
    const raw = line.score.type === "mate" ? (line.score.value > 0 ? 10000 : -10000) : line.score.value
    const botEval = mySide === "w" ? -raw : raw
    return botEval <= DRAW_THRESHOLD
  }

  function toGameRecord(): GameRecord {
    const c = new Chess()
    c.setHeader("Event", `Gambit ${tc.id} vs Engine`)
    c.setHeader("White", settings.myColor === "w" ? "You" : "Gambit Engine")
    c.setHeader("Black", settings.myColor === "b" ? "You" : "Gambit Engine")
    for (const m of state.hist) {
      try {
        c.move(m.san)
      } catch {
        break
      }
    }
    if (state.over) c.setHeader("Result", state.over)
    return {
      id: savedId ?? newId(),
      ts: Date.now(),
      pgn: c.pgn(),
      myColor: settings.myColor,
      botTier: `${BOT_TIERS[settings.tier].label}${settings.deep ? " DEEP" : ""} · ${tc.id}`,
      result: state.over ?? "*",
      coach: settings.coach,
      tc: tc.id,
    }
  }

  function saveAndReview() {
    const rec = toGameRecord()
    saveGame(rec)
    setSavedId(rec.id)
    onReview(rec)
  }

  function saveAndExit() {
    const rec = toGameRecord()
    saveGame(rec)
    setSavedId(rec.id)
    onExit()
  }

  function leaveTo(m: "home" | "openings" | "masters") {
    if (!savedId && state.hist.length > 0) saveGame(toGameRecord())
    onNavigate(m)
  }

  function resetGame() {
    if (autoReviewTimerRef.current) clearTimeout(autoReviewTimerRef.current)
    autoReviewTimerRef.current = null
    reqRef.current++
    setState({ fen: new Chess().fen(), hist: [], over: null, overReason: "" })
    setPremoveState(null)
    setSel(null)
    flowRef.current = 0
    coachMovesRef.current = { blunderless: true, flow: 0 }
    minEvalRef.current = 0
    endedForRef.current = ""
    setSavedId(null)
    setNavPly(null)
    setRatingDelta(null)
    clockRef.current = { w: baseMs, b: baseMs, started: false }
    const g = coachGreet()
    say("hype", g)
  }

  function rematch() {
    if (!savedId && state.hist.length > 0) saveGame(toGameRecord())
    resetGame()
  }

  function rematchFromOverlay() {
    if (!savedId) saveGame(toGameRecord())
    resetGame()
    setSavedId(null)
  }

  const pairs = useMemo(() => {
    const rows: { no: number; w?: Move; b?: Move; wPly: number; bPly: number }[] = []
    for (let i = 0; i < state.hist.length; i += 2) {
      rows.push({ no: i / 2 + 1, w: state.hist[i], b: state.hist[i + 1], wPly: i + 1, bPly: i + 2 })
    }
    return rows
  }, [state.hist])

  const navFens = useMemo(() => {
    const out = [new Chess().fen()]
    const walk = new Chess()
    for (const m of state.hist) {
      try {
        walk.move({ from: m.from, to: m.to, promotion: m.promotion })
        out.push(walk.fen())
      } catch {
        break
      }
    }
    return out
  }, [state.hist])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      if (e.key === "Escape") {
        setSel(null)
        setPremoveState(null)
        setPromo(null)
      } else if (e.key === "f" || e.key === "F") {
        setFlipped((f) => !f)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])



  useEffect(() => {
    if (!state.over) return
    const key = `${state.hist.length}|${state.over}`
    if (endedForRef.current === key) return
    endedForRef.current = key
    const won = (state.over === "1-0" && settings.myColor === "w") || (state.over === "0-1" && settings.myColor === "b")
    const draw = state.over === "1/2-1/2"
    const endReact = coachOnEnd({ won, draw, tcId: tc.id, myAcc: null })
    say(endReact.tone, endReact.text)
    if (won) playSound("win")
    else if (state.overReason.includes("Time") && !won && !draw) playSound("flag")
    const p = coachProfileRef.current
    const gained = xpForGame({ won, draw, tcId: tc.id })
    const next = { ...p, xp: p.xp + gained, lastTs: Date.now(), wins: p.wins + (won ? 1 : 0) }
    const fresh = unlockBadges(next, {
      won,
      tcId: tc.id,
      blunderless: coachMovesRef.current.blunderless,
      plies: state.hist.length,
      flow: coachMovesRef.current.flow,
      comeback: won && minEvalRef.current <= -300,
    })
    if (fresh.length) next.badges = [...next.badges, ...fresh]
    commitProfile(next)
    const rr = applyGameRating(settings.tier, won ? 1 : draw ? 0.5 : 0)
    setRating(rr.after)
    setRatingDelta({ before: rr.before, after: rr.after, delta: rr.delta })
    const lvlBefore = levelOf(p.xp)
    const lvlAfter = levelOf(next.xp)
    emit({ kind: "xp", amount: gained, reason: won ? "victory" : draw ? "draw" : "battle" })
    if (lvlAfter > lvlBefore) {
      emit({ kind: "levelup", level: lvlAfter, title: TITLES[Math.min(lvlAfter, TITLES.length - 1)] })
      playSound("levelup")
    }
    fresh.forEach((id) => {
      const b = BADGES.find((x) => x.id === id)
      if (b) {
        emit({ kind: "badge", id: b.id, name: b.name, glyph: b.glyph, desc: b.desc })
        playSound("badge")
      }
    })
    if (autoReviewTimerRef.current) clearTimeout(autoReviewTimerRef.current)
    autoReviewTimerRef.current = window.setTimeout(() => {
      autoReviewTimerRef.current = null
      saveAndReview()
    }, 8000)
  }, [state.over])

  const view = useMemo<"w" | "b">(
    () => (flipped ? (settings.myColor === "w" ? "b" : "w") : settings.myColor),
    [flipped, settings.myColor],
  )

  const displayFen = browsing ? navFens[Math.min(navPly ?? 0, navFens.length - 1)] : state.fen
  const displayLast =
    browsing
      ? navPly && navPly > 0
        ? (() => {
            const m = state.hist[navPly - 1]
            return m ? { from: m.from, to: m.to } : null
          })()
        : null
      : state.hist.length
        ? { from: state.hist[state.hist.length - 1].from, to: state.hist[state.hist.length - 1].to }
        : null

  const capturedByMe = state.hist.filter((m) => m.color === settings.myColor && m.captured).map((m) => m.captured as string)
  const capturedByBot = state.hist.filter((m) => m.color !== settings.myColor && m.captured).map((m) => m.captured as string)
  const capVal = (arr: string[]) => arr.reduce((t, pc) => t + (pc === "q" ? 9 : pc === "r" ? 5 : pc === "n" || pc === "b" ? 3 : 1), 0)
  const ORDER = ["q", "r", "b", "n", "p"]
  const myCaps = [...capturedByMe].sort((a, b) => ORDER.indexOf(b) - ORDER.indexOf(a))
  const botCaps = [...capturedByBot].sort((a, b) => ORDER.indexOf(b) - ORDER.indexOf(a))
  const myLead = capVal(capturedByMe) - capVal(capturedByBot)
  const rolledOver = state.over ? describeResult(state.over, settings.myColor, state.overReason) : null
  const opening = openingName(state.hist.map((m) => m.san))
  const currentPly = browsing ? (navPly ?? 0) : state.hist.length
  const myClockSide = settings.myColor
  const botSide = settings.myColor === "w" ? "b" : "w"

  return (
    <div className="view play-view">
      <ClockTicker clocks={clockRef} running={runningSide} over={!!state.over} onFlag={flagTimeout} />

      <div className="play-center">
        <div className="play-col">
          <div className="pb">
            <span className="pb-avatar"><IconPawn size={20} /></span>
            <div className="pb-info">
              <div className="pb-name">
                {BOT_TIERS[settings.tier].label}
                <span className="pb-rating">(3200)</span>
                <span className="pb-lag" title="connection">
                  ▂▄▆
                </span>
              </div>
              <div className="pb-caps">
                {botCaps.map((pc, i) => (
                  <span key={i} className="pb-cap">
                    <Piece type={pc} color={settings.myColor === "w" ? "b" : "w"} />
                  </span>
                ))}
                {myLead < 0 && <span className="pb-cap-diff">+{-myLead}</span>}
              </div>
              <div className="pb-sub">{thinking ? "thinking…" : `${tc.base}+${tc.inc} · engine`}</div>
            </div>
            <ClockFace clocks={clockRef} side={botSide} running={runningSide} over={!!state.over} tc={tc} />
            <button className="pb-gear" title="Flip board" onClick={() => setFlipped((f) => !f)}>
              <IconSwap size={17} />
            </button>
          </div>

          <div className="board-frame">
            <div className="board-hold">
              <Board
                fen={displayFen}
                orientation={view}
                lastMove={displayLast}
                interactive={!state.over && !browsing}
                armColor={settings.myColor}
                selected={sel}
                legalTargets={myTurn && !browsing ? legalFrom : []}
                targetsFor={targetsFor}
                premove={premove}
                onSquareClick={clickSquare}
                onMoveAttempt={userMoveAttempt}
              />
              {promo && (
                <div className="promo-layer" onClick={() => setPromo(null)}>
                  <div className="promo-box">
                    {(["q", "r", "n", "b"] as const).map((p) => (
                      <button key={p} className="promo-btn" onClick={() => applyPromo(p)}>
                        {p === "q" ? "♛" : p === "r" ? "♜" : p === "n" ? "♞" : "♝"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {rolledOver && (
                <div className="end-banner">
                  <div className={`end-card ${rolledOver.kind}`}>
                    <span className={`end-tag ${rolledOver.kind}`}>{rolledOver.title}</span>
                    {ratingDelta && (
                      <span className={`end-delta ${ratingDelta.delta >= 0 ? "up" : "down"}`}>
                        Rating {ratingDelta.before} → {ratingDelta.after}
                        <b>{ratingDelta.delta >= 0 ? ` +${ratingDelta.delta}` : ` ${ratingDelta.delta}`}</b>
                      </span>
                    )}
                    <button className="btn primary small" onClick={saveAndReview}>
                      Game Review
                    </button>
                    <button className="btn ghost small" onClick={rematchFromOverlay}>
                      Rematch
                    </button>
                    <button className="btn ghost small" onClick={saveAndExit}>
                      Exit
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pb">
            <span className="pb-avatar me"><IconPawn size={20} /></span>
            <div className="pb-info">
              <div className="pb-name">
                You
                <span className="pb-rating">({rating})</span>
                {tc.inc > 0 && <span className="pb-inc">+{tc.inc}</span>}
              </div>
              <div className="pb-caps">
                {myCaps.map((pc, i) => (
                  <span key={i} className="pb-cap">
                    <Piece type={pc} color={settings.myColor} />
                  </span>
                ))}
                {myLead > 0 && <span className="pb-cap-diff">+{myLead}</span>}
              </div>
              <div className="pb-sub">{premove ? "premove armed" : myTurn ? "your move" : "waiting…"}</div>
            </div>
            <ClockFace clocks={clockRef} side={myClockSide} running={runningSide} over={!!state.over} tc={tc} />
          </div>

          <div className="board-grip" />
        </div>
      </div>

      <aside className="cc-right">
        <div className="cc-topbar">
          <button className="cc-topbtn" onClick={() => leaveTo("home")}>
            <span className="ico"><IconTarget size={21} /></span>
            <span>Play</span>
          </button>
          <button className="cc-topbtn" onClick={rematch}>
            <span className="ico"><IconPlusSquare size={21} /></span>
            <span>New Game</span>
          </button>
          <button className="cc-topbtn" onClick={() => leaveTo("home")}>
            <span className="ico"><IconBoard size={21} /></span>
            <span>Games</span>
          </button>
          <button className="cc-topbtn" onClick={() => leaveTo("masters")}>
            <span className="ico"><IconUsers size={21} /></span>
            <span>Players</span>
          </button>
        </div>
        <div className="cc-tabs">
          {(["moves", "info"] as PanelTab[]).map((t) => (
            <button key={t} className={`cc-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
              {t === "moves" ? "Moves" : "Info"}
            </button>
          ))}
        </div>

        {tab === "moves" && (
          <div className="cc-tabbody">
            <div className="cc-opening">
              <span>{opening ?? (state.hist.length ? "Custom position" : "Let's play")}</span>
              <span className="cc-info"><IconInfo size={14} /></span>
            </div>
            {premove && (
              <button className="premove-chip" onClick={() => setPremoveState(null)}>
                ⤴ {premove.from.toUpperCase()} → {premove.to.toUpperCase()} · cancel
              </button>
            )}
            {notice && <div className="notice">{notice}</div>}
            <div className="cc-moves">
              {pairs.map((r) => {
                const activeRow = Math.ceil(currentPly / 2)
                const isActiveRow = r.no === activeRow
                return (
                  <div key={r.no} className={`mvrow${isActiveRow ? " active" : ""}`}>
                    <span className="mvno">{r.no}.</span>
                    {r.w ? (
                      <button
                        className={`mvcell${currentPly === r.wPly ? " cur" : ""}`}
                        onClick={() => setNavPly(r.wPly === state.hist.length ? null : r.wPly)}
                      >
                        {r.w.san}
                      </button>
                    ) : (
                      <span className="mvcell" />
                    )}
                    {r.b ? (
                      <button
                        className={`mvcell${currentPly === r.bPly ? " cur" : ""}`}
                        onClick={() => setNavPly(r.bPly === state.hist.length ? null : r.bPly)}
                      >
                        <span className="mv-ico">
                          <Piece type={r.b.piece} color={r.b.color} />
                        </span>
                        {r.b.san}
                      </button>
                    ) : (
                      <span className="mvcell" />
                    )}
                  </div>
                )
              })}
              {!pairs.length && (
                <div className="empty-note">
                  {tc.cls === "bullet"
                    ? "1-minute bullet. Premove everything."
                    : tc.cls === "classical"
                      ? "One hour. Deep work territory."
                      : "The engine awaits your first move."}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "info" && (
          <div className="cc-tabbody">
            <div className="cc-placeholder">
              Engine: {BOT_TIERS[settings.tier].label}
              <br />
              Format: {tc.base} min + {tc.inc}s
              <br />
              Coach: {settings.coach ? "ELIAS live" : "silent"}
              <br />
              Premoves: enabled
            </div>
          </div>
        )}

        <div className="coach-strip">
          <CoachAvatar size={26} />
          <div className="coach-strip-txt">
            <b>ELIAS</b>
            <CoachBubble tone={coachTone} text={coachText} compact />
          </div>
        </div>

        <div className="cc-nav">
          <button className="cc-navbtn" title="First move" onClick={() => setNavPly(state.hist.length ? 0 : null)}>
            <IconFirst size={17} />
          </button>
          <button className="cc-navbtn" title="Previous" onClick={() => setNavPly(Math.max(0, (navPly ?? state.hist.length) - 1))}>
            <IconPrev size={17} />
          </button>
          <button className="cc-navbtn" title="Live" onClick={() => setNavPly(null)}>
            <IconPlay size={17} />
          </button>
          <button
            className="cc-navbtn"
            title="Next"
            onClick={() => {
              const next = Math.min(state.hist.length, (navPly ?? state.hist.length) + 1)
              setNavPly(next === state.hist.length ? null : next)
            }}
          >
            <IconPrev size={17} className="flip-x" />
          </button>
          <button className="cc-navbtn" title="Latest" onClick={() => setNavPly(null)}>
            <IconLast size={17} />
          </button>
        </div>
        <div className="cc-bottom">
          <button className="cc-textbtn" onClick={offerDraw} disabled={!!state.over || thinking}>
            ½ Draw
          </button>
          <button className="cc-textbtn" onClick={resign} disabled={!!state.over}>
            <IconFlag size={14} /> Resign
          </button>
          <button className="cc-flip" title="Flip board" onClick={() => setFlipped((f) => !f)}>
            <IconSwap size={18} />
          </button>
        </div>
      </aside>
    </div>
  )
}

function describeResult(result: string, myColor: "w" | "b", reason: string): { title: string; sub: string; kind: string } {
  if (result === "1/2-1/2")
    return {
      title: "Draw",
      sub: `${reason}. The machine respects you — a little.`,
      kind: "draw",
    }
  const won = (result === "1-0" && myColor === "w") || (result === "0-1" && myColor === "b")
  const why = reason && reason !== "Checkmate" ? ` (${reason.toLowerCase()})` : ""
  return won
    ? { title: "You Beat The Engine", sub: `Victory${why}. Into the vault it goes.`, kind: "win" }
    : { title: "Defeat", sub: `Lost${why}. The report shows exactly where it broke.`, kind: "loss" }
}
