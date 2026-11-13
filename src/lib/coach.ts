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
  "NEW STUDENT",
  "OPENING EXPLORER",
  "TACTICS STUDENT",
  "POSITION BUILDER",
  "CLUB PLAYER",
  "STRATEGIC PLAYER",
  "TOURNAMENT PLAYER",
  "EXPERT CANDIDATE",
  "MASTER CANDIDATE",
  "GRANDMASTER TRACK",
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
  { id: "first_blood", name: "First Engine Win", desc: "Beat the engine for the first time.", glyph: "⚔" },
  { id: "untouchable", name: "Clean Game", desc: "Finish a full game without a blunder.", glyph: "⛨" },
  { id: "flow8", name: "In Rhythm", desc: "Play eight strong moves in a row.", glyph: "❁" },
  { id: "bullet_king", name: "Bullet Win", desc: "Win a one-minute game against the engine.", glyph: "⚡" },
  { id: "blitz_hunter", name: "Blitz Win", desc: "Win a blitz game in five minutes or less.", glyph: "⇶" },
  { id: "ice_blood", name: "Long Game", desc: "Win a game with a time control of thirty minutes or more.", glyph: "❄" },
  { id: "bookworm", name: "Opening Scholar", desc: "Master five opening lines in the Lab.", glyph: "▣" },
  { id: "scholars_eye", name: "First Review", desc: "Complete your first full game review.", glyph: "◎" },
  { id: "deep_diver", name: "Review Habit", desc: "Complete three full game reviews.", glyph: "⌘" },
  { id: "immortal_reader", name: "Master Game Reader", desc: "Study an immortal game through its final move.", glyph: "♜" },
  { id: "the_comeback", name: "Comeback", desc: "Win after falling into a difficult position.", glyph: "↻" },
  { id: "kairos_equal", name: "Thorne's Equal", desc: "Reach the final coaching rank.", glyph: "✸" },
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
  ["hype", (v) => `Lovely find. ${v.combo} strong moves in a row — you're seeing the position clearly.`],
  ["hype", (v) => `${v.mySAN}. Exactly right. Keep asking the position the same careful questions.`],
  ["praise", () => `Best move on the board. That's a difficult idea to spot over the board.`],
])

const PRAISE: CoachLine[] = mkPool("praise", [
  ["praise", (v) => `${v.mySAN}. Nice. You kept the position under control.`],
  ["praise", () => `Good, purposeful play. Keep looking for your least active piece.`],
])

const NEUTRAL: CoachLine[] = [
  { tone: "note", text: () => `Playable, though there was a more active option. We'll compare them in the review.` },
  { tone: "note", text: () => `That's solid. Nothing urgent changes in the position.` },
]

const SOFT_WARN: CoachLine[] = mkPool("warn", [
  ["warn", (v) => `A little loose. ${v.bestSAN} would have held the position together.`],
  ["warn", (v) => `You gave up some pressure. We'll compare it with ${v.bestSAN} afterward.`],
])

const HARD_WARN: CoachLine[] = mkPool("fire", [
  ["fire", (v) => `That misses the key idea. ${v.bestSAN} was stronger; we'll work through why in the review.`],
  ["fire", (v) => `A difficult moment. ${v.bestSAN} was the safer way to meet the threat.`],
])

const CAPTURES: CoachLine[] = [
  { tone: "lore", text: () => `Before recapturing, check what changed for both kings and every loose piece.` },
  { tone: "praise", text: () => `You took the piece. Now check whether the recapture helps your position.` },
]

const CHECKS: CoachLine[] = [
  { tone: "note", text: () => `Check. First list the king's safe squares, then look for your follow-up.` },
  { tone: "lore", text: () => `A check is useful when it improves your position. What does this one threaten?` },
]

const TIME_PRESSURE: CoachLine[] = [
  { tone: "fire", text: () => `Twenty seconds. Take one breath, then look for checks, captures, and threats.` },
  { tone: "fire", text: () => `The clock is tight. Choose a safe move and keep the position playable.` },
]

const BULLET_OPEN: CoachLine[] = [
  { tone: "hype", text: () => `One minute against the engine. Keep it simple and trust your first good instinct.` },
]

const OPENING_START: CoachLine[] = [
  { tone: "lore", text: () => `Start with the center and develop naturally. If anything looks strange, we'll review it afterward.` },
  { tone: "hype", text: () => `A new game and a clean slate. Let's see what kind of position you build.` },
]

const YOUR_TURN_HYPE: CoachLine[] = [
  { tone: "calm", text: () => `Take your time. Look at what your least active piece could do.` },
  { tone: "hype", text: () => `No rush. Find a move that improves your position, not just one that looks forcing.` },
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
    `I'm Elias. I'll keep the game yours and help you see one thing more clearly each time.`,
    `Good to see you. Play your game; we'll talk through the key moments afterward.`,
    `Ready when you are. I'll be here for the review.`,
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
        ? { tone: "warn", key: "warn_streak", text: `Your run of strong moves pauses here. ${v.bestSAN} kept the position a little tighter.` }
        : render(pick(SOFT_WARN), { mySAN: v.mySAN, combo: v.combo, bestSAN: v.bestSAN })
    }
    if (v.cls === "mistake") return render(pick(HARD_WARN), { mySAN: v.mySAN, combo: 0, bestSAN: v.bestSAN })
    if (v.cls === "blunder")
      return { tone: "fire", key: "fire_blunder", text: `A blunder. ${v.bestSAN} was stronger. Stay with it; we'll work through the idea in the review.` }
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
    return { tone: "note", text: `The engine took something. Check whether to recapture, defend, or create a threat.` }
  if (ctx.isCheck) return { tone: "note", text: `You're in check. Find a safe king move first.` }
  if (Math.random() < 0.16) return render(pick(YOUR_TURN_HYPE))
  return null
}

export function coachOnEnd(ctx: GameEndCtx): CoachReaction {
  if (ctx.draw)
    return { tone: "calm", text: `A draw against the engine is useful practice. Let's review where the balance changed.` }
  if (ctx.won)
    return {
      tone: "hype",
      text: `You beat the engine. Congratulations—that's a real result. Let's see what worked and save the game.`,
    }
  const graded: CoachReaction =
    (ctx.myAcc ?? 0) >= 85
      ? { tone: "calm", key: "end_calm:0", text: `You played at ${ctx.myAcc ?? "??"}% and still fell. The engine punished one detail; we'll find it together.` }
      : (ctx.myAcc ?? 0) >= 70
        ? { tone: "calm", key: "end_calm:1", text: `${ctx.myAcc ?? "??"}% accuracy. A competitive game. Let's pick one decision to improve next time.` }
        : { tone: "calm", key: "end_calm:2", text: `Tough game. We'll focus on two positions that can make the biggest difference.` }
  return graded
}

export function coachOnReviewIntro(ctx: { acc: number; opening: string | null; worstCls: string }): CoachReaction {
  if (ctx.acc >= 90)
    return { tone: "hype", key: "intro_hype", text: `${ctx.acc}%—excellent play. ${ctx.opening ? `Your ${ctx.opening} setup worked well.` : ""} Let's look for the small improvements.` }
  if (ctx.acc >= 75)
    return { tone: "praise", key: "intro_praise", text: `${ctx.acc}%. A solid game. We'll look at ${ctx.worstCls === "blunder" ? "the blunder" : "the loose moves"} and find a better plan.` }
  if (ctx.acc >= 50)
    return { tone: "praise", key: "intro_praise", text: `${ctx.acc}%. Honest numbers. This review is a chance to learn, not a verdict.` }
  return {
    tone: "calm",
    key: "intro_calm",
    text: `${ctx.acc}%. No shame in the score. Let's take the game move by move and find what you can improve.`,
  }
}

export function coachOnOpeningLine(ctx: { name: string; clean: boolean }): CoachReaction {
  if (!ctx.clean)
    return { tone: "note", key: "opening_slip", text: `A few slips in ${ctx.name}. Let's repeat the line and make the ideas feel natural.` }
  return {
    tone: "hype",
    key: "opening_clean",
    text: `Clean run of ${ctx.name}. You remembered the main ideas.`,
  }
}

export function coachOnMasterIntro(ctx: { title: string; players: string }): CoachReaction {
  return {
    tone: "lore",
    key: "master_intro",
    text: `${ctx.title} — ${ctx.players}. Watch how they improve their pieces before starting an attack.`,
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
    `Sometimes the best move is simply a better square for your least active piece.`,
    `When the position feels unclear, improve one of your pieces and see what changes.`,
    `Good chess is a series of small questions. Take them one at a time.`,
    `Tactics are easier to spot when your pieces are working together.`,
    `A mistake is information. Understanding it makes the next game easier.`,
  ]) }
}

export function coachDrillIntro(ctx: { name: string }): CoachReaction {
  return {
    tone: "lore",
    key: "drill_intro",
    text: `Let's practice ${ctx.name}. I'll explain what the line is doing, not just what to play.`,
  }
}

export function coachOnDrillMove(ctx: { san: string; correct: boolean; name: string }): CoachReaction {
  if (ctx.correct) {
    const variants: CoachReaction[] = [
      { tone: "praise", key: "drill_book:0", text: `Right. ${ctx.san} is the main move here.` },
      { tone: "hype", key: "drill_book:1", text: `${ctx.san}. Good. That keeps the line on track.` },
      { tone: "praise", key: "drill_book:2", text: `Yes. Keep developing and maintain the pressure.` },
    ]
    return variants[Math.floor(Math.random() * variants.length)]
  }
  return {
    tone: "warn",
    key: "drill_slip",
    text: `Not quite. The line continues with ${ctx.san}. Try to see why it fits.`,
  }
}

export function coachOnMasterMove(ctx: { san: string; ply: number; isCapture: boolean; isCheck: boolean; isMate: boolean }): CoachReaction {
  const n = Math.ceil(ctx.ply / 2)
  const side = ctx.ply % 2 === 1 ? "White" : "Black"
  if (ctx.isMate)
    return { tone: "fire", key: "master_move:3", text: `${side} finds mate with ${ctx.san}. Notice how little room the king has left.` }
  if (ctx.isCheck && ctx.isCapture)
    return { tone: "hype", key: "master_move:2", text: `${n}. ${ctx.san} — check and capture at once. Notice the two threats.` }
  if (ctx.isCapture)
    return { tone: "lore", key: "master_move:1", text: `${n}. ${ctx.san}. Ask what each side gets from this exchange.` }
  if (ctx.isCheck)
    return { tone: "note", key: "master_move:1", text: `${n}. ${ctx.san}. Does this check help, or give the king a useful tempo?` }
  return {
    tone: "lore",
    key: `master_move:${ctx.ply % 2}`,
    text: `${n}. ${ctx.san}. What does this improve? Follow the piece it supports.`,
  }
}
