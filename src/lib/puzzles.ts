import { Chess } from "chess.js"
import { MASTER_GAMES } from "./masters"

export interface Puzzle {
  fen: string
  san: string
  from: string
  to: string
  promotion?: string
  white: boolean
  game: string
  players: string
  year: number
  moveNo: number
}

let cache: Puzzle[] | null = null

export function puzzleCandidates(): Puzzle[] {
  if (cache) return cache
  const out: Puzzle[] = []
  for (const g of MASTER_GAMES) {
    const c = new Chess()
    try {
      c.loadPgn(g.pgn, { strict: false })
    } catch {
      continue
    }
    const hist = c.history({ verbose: true })
    const walk = new Chess()
    for (let i = 0; i < hist.length; i++) {
      const m = hist[i]
      try {
        walk.move({ from: m.from, to: m.to, promotion: m.promotion })
      } catch {
        break
      }
      const ply = i + 1
      if (ply < 16 || ply > 76) continue
      const tactical = !!m.captured || m.san.includes("+") || m.san.includes("#")
      if (!tactical) continue
      let fenBefore = ""
      walk.undo()
      fenBefore = walk.fen()
      walk.move({ from: m.from, to: m.to, promotion: m.promotion })
      out.push({
        fen: fenBefore,
        san: m.san,
        from: m.from,
        to: m.to,
        promotion: m.promotion,
        white: m.color === "w",
        game: g.title,
        players: `${g.white} vs ${g.black}`,
        year: g.year,
        moveNo: Math.ceil(ply / 2),
      })
    }
  }
  cache = out
  return out
}

export function dailyPuzzle(date = new Date()): Puzzle {
  const list = puzzleCandidates()
  const day = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000)
  return list[day % Math.max(1, list.length)]
}

const SOLVED_KEY = "gambit.puzzle.v1"

export function puzzleSolvedToday(): boolean {
  try {
    const raw = localStorage.getItem(SOLVED_KEY)
    if (!raw) return false
    const p = JSON.parse(raw)
    return p.date === todayKey()
  } catch {
    return false
  }
}

export function markPuzzleSolved() {
  try {
    localStorage.setItem(SOLVED_KEY, JSON.stringify({ date: todayKey() }))
  } catch {
    void 0
  }
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}
