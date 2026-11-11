import { useEffect, useMemo, useRef, useState } from "react"
import { Chess } from "chess.js"
import { openingFamilies } from "../lib/openings"
import { Board } from "../components/Board"
import { bumpMastery, loadMastery, loadGames } from "../lib/store"
import { loadCoach, saveCoach, BADGES } from "../lib/coach"
import { emit } from "../lib/coachBus"
import { playSound } from "../lib/coachSound"

export function OpeningsView() {
  const families = useMemo(() => openingFamilies(), [])
  const [familyKey, setFamilyKey] = useState(families[0]?.key ?? "")
  const [lineIdx, setLineIdx] = useState(0)
  const [mode, setMode] = useState<"drill" | "learn">("learn")
  const [side, setSide] = useState<"w" | "b">("w")
  const [step, setStep] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [flash, setFlash] = useState<{ kind: "ok" | "bad" | "done"; text: string } | null>(null)
  const [mastery, setMasteryBumped] = useState(loadMastery())
  const lineRef = useRef<HTMLDivElement>(null)
  const completedRef = useRef("")
  const [selSq, setSelSq] = useState<string | null>(null)
  void selSq

  const family = families.find((f) => f.key === familyKey) ?? families[0]
  const entries = family?.lines ?? []
  const entry = entries[Math.min(lineIdx, Math.max(0, entries.length - 1))]

  const hist = useMemo(() => {
    if (!entry) return []
    const full = entry.moves.split(" ")
    return full.slice(0, step)
  }, [entry, step])

  const chess = useMemo(() => {
    const c = new Chess()
    for (const san of hist) {
      try {
        c.move(san)
      } catch {
        break
      }
    }
    return c
  }, [hist])

  const expectedNext = useMemo(() => {
    if (!entry) return []
    const full = entry.moves.split(" ")
    if (step >= full.length) return []
    return [{ san: full[step], entry }]
  }, [entry, step])

  function expectedSquares(): { from: string; to: string }[] {
    const c = chess
    for (const e of expectedNext) {
      const m = c.move(e.san)
      const res = m ? { from: m.from, to: m.to } : null
      c.undo()
      if (res) return [res]
    }
    return []
  }

  const targets = mode === "learn" ? expectedSquares() : []

  function playUserMove(from: string, to: string) {
    if (!entry) return
    const c = new Chess()
    for (const san of hist) {
      try {
        c.move(san)
      } catch {
        break
      }
    }
    const mv = (() => {
      try {
        return c.move({ from, to })
      } catch {
        return null
      }
    })()
    if (!mv) return
    if (expectedNext.length && mv.san === expectedNext[0].san) {
      setStep((s) => s + 1)
      setFlash({ kind: "ok", text: "Book move. Committed." })
      playSound("click")
    } else if (expectedNext.length) {
      setMistakes((m) => m + 1)
      setFlash({ kind: "bad", text: `Not the book move here. The line plays ${expectedNext[0].san}.` })
    }
  }

  useEffect(() => {
    if (!entry) return
    const full = entry.moves.split(" ")
    if (step >= full.length) return
    let c: Chess
    try {
      c = new Chess()
      for (const san of full.slice(0, step)) c.move(san)
    } catch {
      return
    }
    if (c.turn() === side) return
    const t = window.setTimeout(() => {
      setStep((current) => (current === step ? current + 1 : current))
    }, 340)
    return () => clearTimeout(t)
  }, [step, entry, side])

  useEffect(() => {
    if (!entry) return
    const full = entry.moves.split(" ")
    if (step < full.length) return
    const key = `${entry.name}|${entry.moves}|${step}`
    if (completedRef.current === key) return
    completedRef.current = key
    const clean = mistakes === 0
    bumpMastery(entry.name)
    setMasteryBumped(loadMastery())
    setFlash({
      kind: "done",
      text: clean
        ? `Line complete — ${entry.name} mastered, flawless.`
        : `Line complete — ${entry.name} learned (${mistakes} slips). Run it clean next.`,
    })
    const prev = loadCoach()
    const next = { ...prev, xp: prev.xp + 30, openingsMastered: prev.openingsMastered + 1 }
    const freshBadges = BADGES.filter(
      (b) => b.id === "bookworm" && next.openingsMastered >= 5 && !prev.badges.includes("bookworm"),
    )
    if (freshBadges.length) next.badges = [...next.badges, "bookworm"]
    saveCoach(next)
    emit({ kind: "xp", amount: 30, reason: "opening line" })
    freshBadges.forEach((b) => {
      emit({ kind: "badge", id: b.id, name: b.name, glyph: b.glyph, desc: b.desc })
      playSound("badge")
    })
    playSound(clean ? "win" : "praise")
  }, [step, entry, mistakes])

  function selectFamily(key: string) {
    setFamilyKey(key)
    setLineIdx(0)
    setStep(0)
    setMistakes(0)
    setFlash(null)
    completedRef.current = ""
    setSelSq(null)
  }

  function selectLine(i: number) {
    setLineIdx(i)
    setStep(0)
    setMistakes(0)
    setFlash(null)
    completedRef.current = ""
    setSelSq(null)
  }

  const revealedMoves = useMemo(() => {
    if (!entry) return []
    const full = entry.moves.split(" ")
    return full.slice(0, Math.min(step + 1, full.length))
  }, [entry, step])

  const recentOpenings = useMemo(() => {
    const games = loadGames().filter((g) => g.reviewed?.opening)
    const map = new Map<string, number>()
    for (const g of games) {
      const o = g.reviewed!.opening!
      map.set(o, (map.get(o) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [])

  return (
    <div className="view openings-view">
      <aside className="fam-list panel">
        <div className="panel-head">OPENING FAMILIES</div>
        <div className="fam-scroll">
          {families.map((f) => {
            const score = f.lines.reduce((s, l) => s + (mastery[l.name] ?? 0), 0)
            return (
              <button key={f.key} className={`fam-item${f.key === familyKey ? " on" : ""}`} onClick={() => selectFamily(f.key)}>
                <span className="fam-label">{f.label}</span>
                <span className="fam-count">{score > 0 ? `★${Math.min(3, score)}` : `${f.lines.length} lines`}</span>
              </button>
            )
          })}
        </div>
      </aside>

      <div className="open-main">
        <div className="open-head">
          <div>
            <div className="open-title">{family?.label}</div>
            <div className="open-sub">
              You play {side === "w" ? "White" : "Black"} · entry {Math.min(lineIdx + 1, entries.length)}/{entries.length} · {mistakes} slips
            </div>
          </div>
          <div className="open-ctls">
            <button className="btn ghost small" onClick={() => setSide((s) => (s === "w" ? "b" : "w"))}>
              ⇄ switch sides
            </button>
            <button className={`btn ghost small${mode === "learn" ? " on" : ""}`} onClick={() => setMode(mode === "learn" ? "drill" : "learn")}>
              {mode === "learn" ? "training wheels ON" : "pro mode: no hints"}
            </button>
            <button className="btn ghost small" onClick={() => selectLine((lineIdx + 1) % Math.max(1, entries.length))}>
              next line ▸
            </button>
            <button
              className="btn ghost small"
              onClick={() => {
                setStep(0)
                setMistakes(0)
                setFlash(null)
                completedRef.current = ""
                setSelSq(null)
              }}
            >
              restart
            </button>
          </div>
        </div>

        <div className="open-grid">
          <div className="board-col">
            <div className="board-shell">
              <Board
                fen={chess.fen()}
                orientation={side}
                interactive={expectedNext.length > 0}
                armColor={side}
                legalTargets={mode === "learn" ? targets.map((t) => t.to) : []}
                onMoveAttempt={playUserMove}
                onSquareClick={(sq) => {
                  if (selSq) {
                    playUserMove(selSq, sq)
                    setSelSq(null)
                    return
                  }
                  const pc = chess.get(sq as never)
                  if (pc && pc.color === side) setSelSq(sq)
                }}
                arrows={
                  mode === "learn"
                    ? targets.map((t) => ({ from: t.from, to: t.to, color: "#4ba36a" }))
                    : []
                }
              />
            </div>
            {flash && (
              <div className={`open-flash ${flash.kind}`}>{flash.text}</div>
            )}
          </div>

          <div className="open-side">
            <div className="panel">
              <div className="panel-head">LINES IN THIS FAMILY</div>
              <div className="line-list">
                {entries.map((e, i) => (
                  <button key={`${e.name}${i}`} className={`line-item${i === lineIdx ? " on" : ""}`} onClick={() => selectLine(i)}>
                    <span className="line-name">{e.name}</span>
                    <span className="line-eco">
                      {e.eco} · {e.moves.split(" ").length} moves
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">LINE TRAJECTORY</div>
              <div className="line-steps" ref={lineRef}>
                {entry?.moves
                  .split(" ")
                  .map((san, i) => (
                    <span key={i} className={`step ${i <= revealedMoves.length - 1 ? "played" : ""} ${i === step ? "now" : ""}`}>
                      {san}
                    </span>
                  ))}
                {!entry && <div className="empty-note">No lines.</div>}
              </div>
              <div className="mastery-note">
                Mastery: <b>{entry ? mastery[entry.name] ?? 0 : 0}</b> clean runs · {entry ? `${Math.round((step / Math.max(1, entry.moves.split(" ").length)) * 100)}%` : "0%"} through line
              </div>
            </div>

            {recentOpenings.length > 0 && (
              <div className="panel">
                <div className="panel-head">WHAT YOU ACTUALLY PLAY</div>
                <div className="played-chips">
                  {recentOpenings.map(([name, n]) => (
                    <span key={name} className="chip dim-chip">
                      {name} ×{n}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
