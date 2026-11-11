import type { GameRecord, EngineBotTier, MoveClass } from "./types"

const GAMES_KEY = "gambit.games.v1"
const PREFS_KEY = "gambit.prefs.v1"

export interface Prefs {
  myColor: "w" | "b" | "r"
  botTier: EngineBotTier
  coachMode: boolean
  deepThink: boolean
  reviewFast: boolean
  tcId: string
  tilt3d: boolean
  boardTheme: string
}

export const DEFAULT_PREFS: Prefs = {
  myColor: "w",
  botTier: "max",
  coachMode: true,
  deepThink: false,
  reviewFast: true,
  tcId: "10|0",
  tilt3d: false,
  boardTheme: "green",
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p))
  } catch {
    void 0
  }
}

export function loadGames(): GameRecord[] {
  try {
    const raw = localStorage.getItem(GAMES_KEY)
    if (!raw) return []
    const games = JSON.parse(raw) as GameRecord[]
    return Array.isArray(games) ? games.sort((a, b) => b.ts - a.ts) : []
  } catch {
    return []
  }
}

export function saveGame(g: GameRecord) {
  const games = loadGames()
  games.unshift(g)
  try {
    localStorage.setItem(GAMES_KEY, JSON.stringify(games.slice(0, 100)))
  } catch {
    void 0
  }
}

export function patchGame(id: string, patch: Partial<GameRecord>) {
  const games = loadGames()
  const idx = games.findIndex((g) => g.id === id)
  if (idx >= 0) {
    games[idx] = { ...games[idx], ...patch }
    try {
      localStorage.setItem(GAMES_KEY, JSON.stringify(games))
    } catch {
      void 0
    }
  }
}

export function deleteGame(id: string) {
  const games = loadGames().filter((g) => g.id !== id)
  try {
    localStorage.setItem(GAMES_KEY, JSON.stringify(games))
  } catch {
    void 0
  }
}

export interface AcademyStats {
  games: number
  reviewed: number
  avgAccuracy: number | null
  lastAccuracy: number | null
  wins: number
  losses: number
  draws: number
  classTotals: Partial<Record<MoveClass, number>>
  worstClass: { cls: MoveClass; count: number } | null
}

const TRAIN_CLASSES: MoveClass[] = ["inaccuracy", "mistake", "blunder"]

export function academyStats(games: GameRecord[]): AcademyStats {
  const reviewed = games.filter((g) => g.reviewed)
  const accs = reviewed.map((g) => g.reviewed!.myAcc).filter((x) => typeof x === "number" && x > 0)
  const classTotals: Partial<Record<MoveClass, number>> = {}
  for (const g of reviewed) {
    for (const [cls, count] of Object.entries(g.reviewed!.countsMine)) {
      classTotals[cls as MoveClass] = (classTotals[cls as MoveClass] ?? 0) + (count ?? 0)
    }
  }
  const worst = TRAIN_CLASSES.map((cls) => ({ cls, count: classTotals[cls] ?? 0 })).sort((a, b) => b.count - a.count)[0]
  let wins = 0
  let losses = 0
  let draws = 0
  for (const g of games) {
    const mine = myOutcome(g.result, g.myColor)
    if (mine === "win") wins++
    else if (mine === "loss") losses++
    else if (mine === "draw") draws++
  }
  return {
    games: games.length,
    reviewed: reviewed.length,
    avgAccuracy: accs.length ? Math.round((accs.reduce((s, a) => s + a, 0) / accs.length) * 10) / 10 : null,
    lastAccuracy: accs[0] ?? null,
    wins,
    losses,
    draws,
    classTotals,
    worstClass: worst && worst.count > 0 ? worst : null,
  }
}

export function myOutcome(result: string, myColor: "w" | "b"): "win" | "loss" | "draw" | null {
  if (result === "1-0") return myColor === "w" ? "win" : "loss"
  if (result === "0-1") return myColor === "b" ? "win" : "loss"
  if (result === "1/2-1/2") return "draw"
  return null
}

const PLAYER_KEY = "gambit.player.v1"

export interface PlayerProfile {
  rating: number
  peak: number
  games: number
}

const BOT_RATINGS: Record<string, number> = { turbo: 1750, max: 2000, deep: 2050 }

export function loadPlayer(): PlayerProfile {
  try {
    const raw = localStorage.getItem(PLAYER_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return { rating: 1000, peak: 1000, games: 0, ...p }
    }
  } catch {
    void 0
  }
  return { rating: 1000, peak: 1000, games: 0 }
}

export function savePlayer(p: PlayerProfile) {
  try {
    localStorage.setItem(PLAYER_KEY, JSON.stringify(p))
  } catch {
    void 0
  }
}

export function applyGameRating(
  tier: string,
  score: 0 | 0.5 | 1,
): { before: number; after: number; delta: number; profile: PlayerProfile } {
  const p = loadPlayer()
  const bot = BOT_RATINGS[tier] ?? 2000
  const K = p.games < 10 ? 40 : 28
  const expected = 1 / (1 + Math.pow(10, (bot - p.rating) / 400))
  let delta = Math.round(K * (score - expected))
  if (score === 0) delta = Math.min(delta, -4)
  if (score === 1) delta = Math.max(delta, 8)
  if (score === 0.5) delta = Math.max(-2, Math.min(delta, 3))
  const after = Math.max(100, p.rating + delta)
  const profile = { rating: after, peak: Math.max(p.peak, after), games: p.games + 1 }
  savePlayer(profile)
  return { before: p.rating, after, delta: after - p.rating, profile }
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

const MASTERY_KEY = "gambit.mastery.v1"

export function loadMastery(): Record<string, number> {
  try {
    const raw = localStorage.getItem(MASTERY_KEY)
    if (!raw) return {}
    const m = JSON.parse(raw)
    return typeof m === "object" && m ? m : {}
  } catch {
    return {}
  }
}

export function bumpMastery(name: string) {
  const m = loadMastery()
  m[name] = (m[name] ?? 0) + 1
  try {
    localStorage.setItem(MASTERY_KEY, JSON.stringify(m))
  } catch {
    void 0
  }
}
