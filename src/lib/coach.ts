export interface CoachProfile {
  xp: number
  level: number
  flowBest: number
  badges: string[]
  reviewsDone: number
  openingsMastered: number
  wins: number
  lastTs: number
  sound: boolean
}

const KEY = "gambit.coach.v1"

export function loadCoach(): CoachProfile {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      return { ...freshCoach(), ...JSON.parse(raw) }
    }
  } catch {
    void 0
  }
  return freshCoach()
}

export function freshCoach(): CoachProfile {
  return {
    xp: 0,
    level: 0,
    flowBest: 0,
    badges: [],
    reviewsDone: 0,
    openingsMastered: 0,
    wins: 0,
    lastTs: Date.now(),
    sound: true,
  }
}

export function saveCoach(p: CoachProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    void 0
  }
}

export const TITLES = [
  "PAWN OF THE WAR ROOM",
  "NOVICE OF THORNE",
  "INITIATE OF THE LINES",
  "ADEPT OF THE CENTER",
  "STEEL PAWN",
  "STRATEGIST",
  "TACTICIAN",
  "STORMHAND",
  "MASTER'S SHADOW",
  "GRANDMASTER'S BLADE",
  "THORNE'S EQUAL",
]

const LEVEL_THS = [0, 140, 360, 720, 1240, 1980, 2980, 4300, 6000, 8200, 11000, 15000]

export function levelOf(xp: number): number {
  let lvl = 0
  for (let i = 0; i < LEVEL_THS.length; i++) {
    if (xp >= LEVEL_THS[i]) lvl = i
  }
  return lvl
}

export function levelProgress(xp: number): { cur: number; need: number; pct: number; title: string } {
  const lvl = levelOf(xp)
  const cur = LEVEL_THS[lvl] ?? LEVEL_THS[LEVEL_THS.length - 1]
  const next = LEVEL_THS[Math.min(lvl + 1, LEVEL_THS.length - 1)]
  const span = Math.max(1, next - cur)
  const into = Math.min(xp, next) - cur
  return {
    cur,
    need: next,
    pct: Math.min(100, Math.round((into / span) * 100)),
    title: TITLES[Math.min(lvl, TITLES.length - 1)],
  }
}

export interface Badge {
  id: string
  name: string
  desc: string
  glyph: string
}

export const BADGES: Badge[] = [
  { id: "first_blood", name: "First Blood", desc: "You beat the engine. Once. Everything changes after this.", glyph: "⚔" },
  { id: "untouchable", name: "Untouchable", desc: "A full game with zero blunders. Surgical.", glyph: "⛨" },
  { id: "flow8", name: "Thorne's Flow", desc: "8 consecutive engine-grade moves in one game.", glyph: "❁" },
  { id: "bullet_king", name: "Bullet King", desc: "Won a 1-minute war. Against the machine.", glyph: "⚡" },
  { id: "blitz_hunter", name: "Blitz Hunter", desc: "Won a blitz game (5|0 or faster).", glyph: "⇶" },
  { id: "ice_blood", name: "Ice Blood", desc: "Won a long-haul game (30 minutes or more).", glyph: "❄" },
  { id: "bookworm", name: "Bookworm", desc: "Mastered 5 opening lines in the Lab.", glyph: "▣" },
  { id: "scholars_eye", name: "Scholar's Eye", desc: "Opened your first full game review.", glyph: "◎" },
  { id: "deep_diver", name: "Deep Diver", desc: "3 full reviews completed.", glyph: "⌘" },
  { id: "immortal_reader", name: "Immortal Reader", desc: "Walked one of the immortal games to the final move.", glyph: "♜" },
  { id: "the_comeback", name: "The Comeback", desc: "Won a game you were once losing badly.", glyph: "↻" },
  { id: "kairos_equal", name: "Thorne's Equal", desc: "Reached the final title — the student meets the master.", glyph: "✸" },
]

export function unlockBadges(profile: CoachProfile, ctx: {
  won?: boolean
  tcId?: string
  blunderless?: boolean
  plies?: number
  flow?: number
  comeback?: boolean
  finishedMasterGame?: boolean
}): string[] {
  const earned: string[] = []
  const has = (id: string) => profile.badges.includes(id)
  const add = (id: string) => {
    if (!has(id)) earned.push(id)
  }
  if (ctx.won) add("first_blood")
  if (ctx.won && ctx.tcId === "1|0") add("bullet_king")
  if (ctx.won && ["3|0", "3|2", "5|0", "5|3"].includes(ctx.tcId ?? "")) add("blitz_hunter")
  if (ctx.won && ["30|0", "60|0"].includes(ctx.tcId ?? "")) add("ice_blood")
  if (ctx.blunderless && (ctx.plies ?? 0) >= 20) add("untouchable")
  if ((ctx.flow ?? 0) >= 8) add("flow8")
  if (profile.openingsMastered >= 5) add("bookworm")
  if (profile.reviewsDone >= 1) add("scholars_eye")
  if (profile.reviewsDone >= 3) add("deep_diver")
  if (ctx.finishedMasterGame) add("immortal_reader")
  if (ctx.won && ctx.comeback) add("the_comeback")
  if (levelOf(profile.xp) >= 11) add("kairos_equal")
  return earned
}

export type ReactionTone = "praise" | "note" | "warn" | "fire" | "lore" | "calm" | "hype"

export interface CoachReaction {
  tone: ReactionTone
  text: string
  key?: string
}

export interface CoachLine {
  tone: ReactionTone
  text: (v: Record<string, string | number>) => string
  key?: string
}

const pick = <T,>(arr: T[], seed = Math.random()): T => arr[Math.floor(seed * arr.length) % arr.length]

function mkPool(name: string, lines: Array<[ReactionTone, (v: Record<string, string | number>) => string]>): CoachLine[] {
  return lines.map(([tone, text], i) => ({ tone, text, key: `${name}:${i}` }))
}

function render(line: CoachLine, vars: Record<string, string | number> = {}): CoachReaction {
  return { tone: line.tone, text: line.text(vars), key: line.key }
}

export interface MoveVerdict {
  cls: string
  lossCP: number
  combo: number
  bestSAN: string
  mySAN: string
  isCapture: boolean
  isCheck: boolean
}

const PRAISE_HIGH: CoachLine[] = mkPool("praise_high", [
  ["hype", (v) => `That's chess from the atlas. ${v.combo} now in flow — I can't improve on ${v.mySAN}, and I don't try.`],
  ["hype", (v) => `${v.mySAN}. Engine-grade. Streak: ${v.combo}. Keep the pressure like this and the machine starts doubting itself.`],
  ["praise", (v) => `Best move on the board — flow ${v.combo}. This is the version of you I'm building.`],
])

const PRAISE: CoachLine[] = mkPool("praise", [
  ["praise", (v) => `${v.mySAN}? Clean. ${v.combo} strong in a row.`],
  ["praise", (v) => `Solid linework. ${v.combo} clean cuts so far.`],
])

const NEUTRAL: CoachLine[] = [
  { tone: "note", text: () => `Playable. But the sharper move existed — file it for the report.` },
  { tone: "note", text: () => `Okay. Not what I'd have chosen, but nothing breaks.` },
]

const SOFT_WARN: CoachLine[] = mkPool("warn", [
  ["warn", (v) => `Loose. ${v.bestSAN} would have gripped harder.`],
  ["warn", (v) => `You slipped some pressure — the report will babble about ${v.bestSAN} anyway.`],
])

const HARD_WARN: CoachLine[] = mkPool("fire", [
  ["fire", (v) => `No. ${v.bestSAN} was the move. Park this one — the report will turn it into a lesson.`],
  ["fire", (v) => `That leaks blood. The thread was ${v.bestSAN}. We will autopsy it after the game.`],
])

const CAPTURES: CoachLine[] = [
  { tone: "lore", text: () => `Material is just a bookkeeping detail — Tal would trade anything for this initiative. Snap it with purpose.` },
  { tone: "praise", text: () => `Take it. Every capture is a promise you intend to keep.` },
]

const CHECKS: CoachLine[] = [
  { tone: "note", text: () => `Check — the tap on the shoulder. Make sure you're not just knocking politely.` },
  { tone: "lore", text: () => `Checking is asking a question. Fischer never asked unless the answer ended the story.` },
]

const TIME_PRESSURE: CoachLine[] = [
  { tone: "fire", text: () => `Twenty seconds. Breathe at the next move, not before.` },
  { tone: "fire", text: () => `Now it's a fight against the clock too — flag-vs-blunder, choose your poison fast.` },
]

const BULLET_OPEN: CoachLine[] = [
  { tone: "hype", text: () => `1-minute mode vs a perfect engine? We're gaming tonight. Premove everything — the clock is your real enemy.` },
]

const OPENING_START: CoachLine[] = [
  { tone: "lore", text: () => `Claim the center, castle early, don't move a piece twice without cause — the gospel. Play.` },
  { tone: "hype", text: () => `New war. I've eaten every opening book ever printed; you have one job — surprise yourself.` },
]

const YOUR_TURN_HYPE: CoachLine[] = [
  { tone: "calm", text: () => `Take your time. The engine isn't rushing; neither should you.` },
  { tone: "hype", text: () => `Find the move that makes the engine pause one extra millisecond.` },
]

export interface GameEndCtx {
  won: boolean
  draw: boolean
  tcId: string
  myAcc: number | null
}

export function coachStart(ctx: { tcId: string }): CoachReaction {
  if (ctx.tcId === "1|0") return render(pick(BULLET_OPEN))
  return render(pick(OPENING_START))
}

export function coachGreet(): string {
  return pick([
    `I am Elias Thorne. Every opening book, every immortal game, every engine line — all in here. You bring the hands.`,
    `Elias Thorne here. The strongest player in existence is about to sit across from you. I'll make sure you survive, then thrive.`,
    `Welcome back. The machine waits. Let's sharpen something today.`,
  ])
}

export function coachOnYourMove(v: MoveVerdict, coachMode: boolean): CoachReaction | null {
  if (coachMode) {
    if (["brilliant", "great", "best", "excellent"].includes(v.cls)) {
      return render(v.combo >= 4 ? pick(PRAISE_HIGH) : pick(PRAISE), {
        mySAN: v.mySAN,
        combo: v.combo,
        bestSAN: v.bestSAN,
      })
    }
    if (v.cls === "good")
      return render(v.combo >= 3 ? pick(PRAISE) : pick(NEUTRAL), { mySAN: v.mySAN, combo: v.combo, bestSAN: v.bestSAN })
    if (v.cls === "inaccuracy") {
      return v.combo >= 3
        ? { tone: "warn", key: "warn_streak", text: `Streak ends at ${v.combo}. ${v.bestSAN} kept it stronger — small cost.` }
        : render(pick(SOFT_WARN), { mySAN: v.mySAN, combo: v.combo, bestSAN: v.bestSAN })
    }
    if (v.cls === "mistake") return render(pick(HARD_WARN), { mySAN: v.mySAN, combo: 0, bestSAN: v.bestSAN })
    if (v.cls === "blunder")
      return { tone: "fire", key: "fire_blunder", text: `Blunder — ${v.bestSAN} was the spine of the position. Hold steady; the report will make this a weapon.` }
  } else {
    if (["brilliant", "great", "best"].includes(v.cls))
      return render(pick(PRAISE), { mySAN: v.mySAN, combo: v.combo, bestSAN: v.bestSAN })
    if (v.isCapture) return render(pick(CAPTURES), { mySAN: v.mySAN, combo: v.combo, bestSAN: v.bestSAN })
    if (v.isCheck) return render(pick(CHECKS), { mySAN: v.mySAN, combo: v.combo, bestSAN: v.bestSAN })
  }
  return null
}

export function coachOnBotMove(ctx: { isCapture: boolean; isCheck: boolean; timeLow: boolean; mvSAN: string }): CoachReaction | null {
  if (ctx.timeLow) return render(pick(TIME_PRESSURE))
  if (ctx.isCapture)
    return { tone: "note", text: `He took something? Recalculate — safety or payback, pick a lane.` }
  if (ctx.isCheck) return { tone: "note", text: `You're checked. King first, counter later.` }
  if (Math.random() < 0.16) return render(pick(YOUR_TURN_HYPE))
  return null
}

export function coachOnEnd(ctx: GameEndCtx): CoachReaction {
  if (ctx.draw)
    return { tone: "calm", text: `Even swords. Walking away whole from a perfect engine is a badge of a different shape.` }
  if (ctx.won)
    return {
      tone: "hype",
      text: `YOU beat the strongest engine alive. Whatever nerves you had before this session — delete them. This goes in the vault.`,
    }
  const graded: CoachReaction =
    (ctx.myAcc ?? 0) >= 85
      ? { tone: "calm", key: "end_calm:0", text: `You played at ${ctx.myAcc ?? "??"}% and still fell — that's the machine being the machine. We expand from here.` }
      : (ctx.myAcc ?? 0) >= 70
        ? { tone: "calm", key: "end_calm:1", text: `${ctx.myAcc ?? "??"}% accuracy, real combat. The report is your gym — study one blunder only. Force: what did it punish?` }
        : { tone: "calm", key: "end_calm:2", text: `Intense defeat — rich study material. Open the review; I'll mark every fault and we'll fix two today, not twenty.` }
  return graded
}

export function coachOnReviewIntro(ctx: { acc: number; opening: string | null; worstCls: string }): CoachReaction {
  if (ctx.acc >= 90)
    return { tone: "hype", key: "intro_hype", text: `${ctx.acc}% — clinical. ${ctx.opening ? `The ${ctx.opening} suited you.` : ""} Let's find the last 10%.` }
  if (ctx.acc >= 75)
    return { tone: "praise", key: "intro_praise", text: `${ctx.acc}%. A fighter's game. We fix ${ctx.worstCls === "blunder" ? "the blunders" : "the leaks"} and you're crossing 85 next time.` }
  if (ctx.acc >= 50)
    return { tone: "praise", key: "intro_praise", text: `${ctx.acc}% — honest numbers. The report is your temple now; this is where you grow fastest.` }
  return {
    tone: "calm",
    key: "intro_calm",
    text: `${ctx.acc}%. That's a full book Ten days of study compressed into one score — walk the report with me, no shame in any of it.`,
  }
}

export function coachOnOpeningLine(ctx: { name: string; clean: boolean }): CoachReaction {
  if (!ctx.clean)
    return { tone: "note", key: "opening_slip", text: `${ctx.name} — with slips. Run it again without my arrows; mastery is playing blind and still being right.` }
  return {
    tone: "hype",
    key: "opening_clean",
    text: `${ctx.name}, clean. That line now lives in you — opponents will donate pieces to it.`,
  }
}

export function coachOnMasterIntro(ctx: { title: string; players: string }): CoachReaction {
  return {
    tone: "lore",
    key: "master_intro",
    text: `${ctx.title} — ${ctx.players}. On this board, every move is a philosophy. Watch where the pieces are sent, not just where they go.`,
  }
}

export function xpForGame(ctx: { won: boolean; draw: boolean; tcId: string }): number {
  if (ctx.won) {
    if (ctx.tcId === "1|0") return 90
    if (["3|0", "3|2", "5|0", "5|3"].includes(ctx.tcId)) return 75
    return 65
  }
  if (ctx.draw) return 35
  return 25
}

export function coachOnZen(xp: number): CoachReaction {
  void xp
  return { tone: "lore", text: pick([
    `Chess is 99% technique, 1% imagination — but the 1% votes first.`,
    `The master lost a thousand games before he found his footwork. You're in good company.`,
    `When in doubt: improve your worst piece. When certain: be twice as certain.`,
    `Tactics flow from a superior position. Make the ground fertile, then harvest.`,
    `A blunder is data wearing a costume. Undress it in the report and it becomes strength.`,
  ]) }
}

export function coachDrillIntro(ctx: { name: string }): CoachReaction {
  return {
    tone: "lore",
    key: "drill_intro",
    text: `The ${ctx.name}. Follow the arrows and play the book moves — I'll call every one.`,
  }
}

export function coachOnDrillMove(ctx: { san: string; correct: boolean; name: string }): CoachReaction {
  if (ctx.correct) {
    const variants: CoachReaction[] = [
      { tone: "praise", key: "drill_book:0", text: `Book. ${ctx.san} — the theory approves.` },
      { tone: "hype", key: "drill_book:1", text: `${ctx.san}. Exactly what the line wants. Keep the rhythm.` },
      { tone: "praise", key: "drill_book:2", text: `Book move. ${ctx.name} is taking shape on the board.` },
    ]
    return variants[Math.floor(Math.random() * variants.length)]
  }
  return {
    tone: "warn",
    key: "drill_slip",
    text: `Off book. The line plays ${ctx.san} here — reset the pattern.`,
  }
}

export function coachOnMasterMove(ctx: { san: string; ply: number; isCapture: boolean; isCheck: boolean; isMate: boolean }): CoachReaction {
  const n = Math.ceil(ctx.ply / 2)
  const side = ctx.ply % 2 === 1 ? "White" : "Black"
  if (ctx.isMate)
    return { tone: "fire", key: "master_move:3", text: `${side} mates with ${ctx.san} — study how every move before this drove it home.` }
  if (ctx.isCheck && ctx.isCapture)
    return { tone: "hype", key: "master_move:2", text: `${n}. ${ctx.san} — a check that takes material. The old masters loved a double blow.` }
  if (ctx.isCapture)
    return { tone: "lore", key: "master_move:1", text: `${n}. ${ctx.san} — material changes hands. Watch whether it was a trade or a theft.` }
  if (ctx.isCheck)
    return { tone: "note", key: "master_move:1", text: `${n}. ${ctx.san} — a question mark of a move. The answer comes two moves later; watch for it.` }
  return {
    tone: "lore",
    key: `master_move:${ctx.ply % 2}`,
    text: `${n}. ${ctx.san} — a quiet move doing loud work. Follow what it sets up.`,
  }
}
