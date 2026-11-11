import { useMemo, useState } from "react"
import { Chess } from "chess.js"
import { Board, type ArrowSpec } from "./Board"
import { dailyPuzzle, markPuzzleSolved, puzzleSolvedToday } from "../lib/puzzles"
import { loadCoach, saveCoach } from "../lib/coach"
import { emit } from "../lib/coachBus"
import { playSound } from "../lib/coachSound"

export function DailyPuzzle() {
  const puzzle = useMemo(() => dailyPuzzle(), [])
  const [solved, setSolved] = useState(() => puzzleSolvedToday())
  const [wrong, setWrong] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const arrows: ArrowSpec[] = solved
    ? [{ from: puzzle.from, to: puzzle.to, color: "#81b64c" }]
    : []

  function attempt(from: string, to: string) {
    if (solved) return
    const c = new Chess(puzzle.fen)
    let mv = null
    try {
      mv = c.move({ from, to, promotion: puzzle.promotion })
    } catch {
      mv = null
    }
    if (mv && mv.san === puzzle.san) {
      setSolved(true)
      setWrong(false)
      markPuzzleSolved()
      const prev = loadCoach()
      const next = { ...prev, xp: prev.xp + 25, lastTs: Date.now() }
      saveCoach(next)
      emit({ kind: "xp", amount: 25, reason: "daily puzzle" })
      playSound("win")
    } else if (mv) {
      setWrong(true)
      setAttempts((a) => a + 1)
      playSound("blunder")
    }
  }

  return (
    <section className="panel puzzle-card">
      <div className="panel-head">
        DAILY PUZZLE
        <span className="panel-count">{solved ? "SOLVED" : `${puzzle.white ? "WHITE" : "BLACK"} to move`}</span>
      </div>
      <div className="puzzle-body">
        <div className="puzzle-board">
          <Board
            fen={puzzle.fen}
            orientation={puzzle.white ? "w" : "b"}
            interactive={!solved}
            armColor={puzzle.white ? "w" : "b"}
            arrows={arrows}
            onMoveAttempt={attempt}
          />
        </div>
        <div className="puzzle-info">
          <div className={`puzzle-status${solved ? " ok" : wrong ? " bad" : ""}`}>
            {solved
              ? "✦ Solved. The master's move was the only path."
              : wrong
                ? `Not the move${attempts > 1 ? ` (${attempts} tries)` : ""} — look for checks, captures, threats.`
                : "Find the strongest continuation — the move the master actually played."}
          </div>
          <div className="puzzle-meta">
            From <b>{puzzle.game}</b> · {puzzle.players} {puzzle.year} · move {puzzle.moveNo}
          </div>
          {solved && <div className="puzzle-xp">+25 XP</div>}
        </div>
      </div>
    </section>
  )
}
