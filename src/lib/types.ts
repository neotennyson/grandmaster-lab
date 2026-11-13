export type MoveClass =
  | "brilliant"
  | "great"
  | "best"
  | "excellent"
  | "good"
  | "book"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "forced"

export interface ClassMeta {
  label: string
  glyph: string
  color: string
  bg: string
}

export const CLASS_META: Record<MoveClass, ClassMeta> = {
  brilliant: { label: "Brilliant", glyph: "!!", color: "#26c2a3", bg: "rgba(38,194,163,.14)" },
  great: { label: "Great Move", glyph: "!", color: "#749bbf", bg: "rgba(116,155,191,.16)" },
  best: { label: "Best Move", glyph: "★", color: "#81b64c", bg: "rgba(129,182,76,.16)" },
  excellent: { label: "Excellent", glyph: "✓", color: "#95bb4a", bg: "rgba(149,187,74,.14)" },
  good: { label: "Good", glyph: "✓", color: "#95b776", bg: "rgba(149,183,118,.14)" },
  book: { label: "Book", glyph: "▣", color: "#a88865", bg: "rgba(168,136,101,.18)" },
  inaccuracy: { label: "Inaccuracy", glyph: "?!", color: "#ffc700", bg: "rgba(255,199,0,.16)" },
  mistake: { label: "Mistake", glyph: "?", color: "#ffa459", bg: "rgba(255,164,89,.16)" },
  blunder: { label: "Blunder", glyph: "??", color: "#fa412d", bg: "rgba(250,65,45,.18)" },
  forced: { label: "Forced", glyph: "⇄", color: "#8a8f98", bg: "rgba(138,143,152,.14)" },
}

export const CLASS_SCORE_ORDER: MoveClass[] = [
  "brilliant",
  "great",
  "best",
  "excellent",
  "good",
  "book",
  "inaccuracy",
  "mistake",
  "blunder",
]

export interface PlyReview {
  ply: number
  san: string
  uci: string
  color: "w" | "b"
  fenBefore: string
  fenAfter: string
  bestSAN: string
  bestUCI: string
  bestFrom: string
  bestTo: string
  bestPV: string[]
  secondGapCP: number | null
  evalAfterCP: number
  evalAfterWhite: number
  lossCP: number
  wpBefore: number
  wpAfter: number
  acc: number
  cls: MoveClass
  playedIsBest: boolean
  isSacrifice: boolean
  isCheck: boolean
  isMate: boolean
  comment: string
}

export interface ReviewReport {
  plies: PlyReview[]
  opening: string | null
  bookPlies: number
  accW: number
  accB: number
  lossW: number
  lossB: number
  counts: Record<MoveClass, { w: number; b: number }>
  keyMomentsW: number[]
  keyMomentsB: number[]
  result: string
}

export interface GameRecord {
  id: string
  ts: number
  pgn: string
  myColor: "w" | "b"
  botTier: string
  result: string
  coach: boolean
  tc?: string
  reviewed?: {
    accW: number
    accB: number
    myAcc: number
    opening: string | null
    countsMine: Partial<Record<MoveClass, number>>
    worstPly: number
    worstCls: MoveClass
    worstLoss: number
  }
}

export type TimeClass = "bullet" | "blitz" | "rapid" | "classical"

export interface TimeControl {
  id: string
  base: number
  inc: number
  cls: TimeClass
}

export const TIME_CONTROLS: TimeControl[] = [
  { id: "1|0", base: 1, inc: 0, cls: "bullet" },
  { id: "3|0", base: 3, inc: 0, cls: "blitz" },
  { id: "3|2", base: 3, inc: 2, cls: "blitz" },
  { id: "5|0", base: 5, inc: 0, cls: "blitz" },
  { id: "5|3", base: 5, inc: 3, cls: "blitz" },
  { id: "10|0", base: 10, inc: 0, cls: "rapid" },
  { id: "10|5", base: 10, inc: 5, cls: "rapid" },
  { id: "30|0", base: 30, inc: 0, cls: "rapid" },
  { id: "60|0", base: 60, inc: 0, cls: "classical" },
]

export const TIME_CLASS_LABEL: Record<TimeClass, string> = {
  bullet: "BULLET",
  blitz: "BLITZ",
  rapid: "RAPID",
  classical: "CLASSICAL",
}

export function findTC(id: string): TimeControl {
  return TIME_CONTROLS.find((t) => t.id === id) ?? TIME_CONTROLS[5]
}

export function fmtClock(ms: number): string {
  if (ms < 0) ms = 0
  const totalSec = ms / 1000
  const m = Math.floor(totalSec / 60)
  const s = totalSec - m * 60
  if (totalSec < 20) {
    const tenths = Math.floor(s * 10)
    return `${m}:${String(Math.floor(s)).padStart(2, "0")}.${tenths}`
  }
  return `${m}:${String(Math.floor(s)).padStart(2, "0")}`
}

export type EngineBotTier = "max" | "turbo" | "deep"

export const BOT_TIERS: Record<EngineBotTier, { label: string; time: number; desc: string }> = {
  max: { label: "LAB MAX", time: 4000, desc: "Maximum strength. No mercy." },
  turbo: { label: "LAB QUICK", time: 1200, desc: "Full strength, fast hands." },
  deep: { label: "LAB DEEP", time: 10000, desc: "Maximum strength, long think." },
}
