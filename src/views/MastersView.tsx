import { useEffect, useMemo, useRef, useState } from "react"
import { Chess } from "chess.js"
import { MASTER_GAMES, type MasterGame } from "../lib/masters"
import { Board, type ArrowSpec } from "../components/Board"
import { Engine } from "../lib/engine"
import { uciToCoords, pvToSANs, winPct } from "../lib/analysis"
import { loadCoach, saveCoach, BADGES, coachOnMasterIntro, coachOnMasterMove, type CoachReaction } from "../lib/coach"
import { emit } from "../lib/coachBus"
import { playSound } from "../lib/coachSound"
import { CoachAvatar, CoachBubble } from "../components/Coach"
import { speak, stopSpeaking } from "../lib/voice"

export function MastersView() {
  const [openGameId, setOpenGameId] = useState<string | null>(null)

  if (openGameId) {
    return <MasterReader game={MASTER_GAMES.find((g) => g.id === openGameId)!} onBack={() => setOpenGameId(null)} />
  }
  return (
    <div className="view masters-view">
      <div className="masters-head">
        <div>
          <h2 className="vm-title">THE MASTER VAULT</h2>
          <p className="vm-sub">
            The games every champion has consumed. Every score is verified — step through them, then let the engine grade the
            immortals themselves.
          </p>
        </div>
      </div>
      <div className="masters-grid">
        {MASTER_GAMES.map((g) => (
          <button key={g.id} className="master-card" onClick={() => setOpenGameId(g.id)}>
            <div className="mc-top">
              <span className={`mc-res ${g.result}`}>{g.result}</span>
              <span className="mc-year">{g.year}</span>
            </div>
            <div className="mc-title">{g.title}</div>
            <div className="mc-players">
              {g.white} vs {g.black}
            </div>
            <div className="mc-meta">
              {g.opening} · ECO {g.eco} · {g.event}
            </div>
            <div className="mc-lesson">{g.lesson}</div>
            <div className="mc-tags">
              {g.tags.map((t) => (
                <span key={t} className="chip dim-chip">
                  {t}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function MasterReader({ game, onBack }: { game: MasterGame; onBack: () => void }) {
  const fens = useMemo(() => {
    const c = new Chess()
    c.loadPgn(game.pgn, { strict: false })
    const start = new Chess()
    const out = [start.fen()]
    const walk = start
    for (const m of c.history({ verbose: true })) {
      walk.move({ from: m.from, to: m.to, promotion: m.promotion })
      out.push(walk.fen())
    }
    return out
  }, [game.pgn])

  const sans = useMemo(() => {
    const c = new Chess()
    c.loadPgn(game.pgn, { strict: false })
    return c.history()
  }, [game.pgn])

  const [idx, setIdx] = useState(0)
  const coachMsg = useMemo<CoachReaction>(() => {
    const intro = coachOnMasterIntro({ title: game.title, players: `${game.white} — ${game.black}` })
    if (idx === 0) return intro
    const san = sans[idx - 1]
    if (!san) return intro
    const c = new Chess()
    try {
      for (let i = 0; i < idx - 1; i++) c.move(sans[i])
      const move = c.move(san)
      if (!move) return intro
      return coachOnMasterMove({
        san,
        ply: idx,
        isCapture: move.flags.includes("c") || move.flags.includes("e"),
        isCheck: c.inCheck(),
        isMate: c.isCheckmate(),
      })
    } catch {
      return intro
    }
  }, [idx, sans, game.title, game.white, game.black])
  const [engine, setEngine] = useState<Engine | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [probe, setProbe] = useState<{ best: string; to: string; from: string; pv: string[]; cp: number } | null>(null)
  const awardedRef = useRef(false)
  const visitedRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    speak(coachMsg.text, coachMsg.key)
    return () => stopSpeaking()
  }, [coachMsg.text, coachMsg.key])

  useEffect(() => {
    visitedRef.current.add(idx)
    if (idx < fens.length - 1 || awardedRef.current) return
    if (visitedRef.current.size < 20) return
    awardedRef.current = true
    const prev = loadCoach()
    if (!prev.badges.includes("immortal_reader")) {
      const next = { ...prev, xp: prev.xp + 30, badges: [...prev.badges, "immortal_reader"] }
      saveCoach(next)
      emit({ kind: "xp", amount: 30, reason: "immortal consumed" })
      const b = BADGES.find((x) => x.id === "immortal_reader")
      if (b) {
        emit({ kind: "badge", id: b.id, name: b.name, glyph: b.glyph, desc: b.desc })
        playSound("badge")
      }
    }
  }, [idx, fens.length])

  async function analyse() {
    if (!engine || analysing) return
    setAnalysing(true)
    try {
      const res = await engine.go({ fen: fens[idx], movetime: 1600, multipv: 1 })
      const bm = res.bestmove
      const coords = uciToCoords(bm)
      const line = res.lines[0]
      const cpRaw = line
        ? line.score.type === "mate"
          ? line.score.value > 0
            ? 9000 + line.score.value
            : -9000 + line.score.value
          : line.score.value
        : 0
      const stm = idx % 2 === 0 ? "w" : "b"
      const cp = stm === "w" ? cpRaw : -cpRaw
      setProbe({
        best: bm,
        to: coords.to,
        from: coords.from,
        pv: pvToSANs(fens[idx], line?.pv ?? [], 5),
        cp,
      })
    } catch {
      setProbe(null)
    }
    setAnalysing(false)
  }

  useEffect(() => {
    const e = new Engine()
    e.boot().then(() => setEngine(e))
    return () => e.destroy()
  }, [])

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if ((ev.target as HTMLElement)?.tagName === "INPUT") return
      if (ev.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1))
      else if (ev.key === "ArrowRight") setIdx((i) => Math.min(fens.length - 1, i + 1))
      else if (ev.key === "Home") setIdx(0)
      else if (ev.key === "End") setIdx(fens.length - 1)
      else return
      ev.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [fens.length])

  const movesWrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const wrap = movesWrapRef.current
    if (!wrap) return
    const active = wrap.querySelector<HTMLElement>(".ml-btn.active")
    if (active) {
      const top = active.offsetTop - wrap.clientHeight / 2
      wrap.scrollTo({ top, behavior: "smooth" })
    }
  }, [idx])

  const arrows: ArrowSpec[] = probe && idx >= 0 ? [{ from: probe.from, to: probe.to, color: "#5aa832" }] : []
  const pairs = sans
    .map((san, i) => ({ san, i }))
    .reduce<{ no: number; w?: { san: string; i: number }; b?: { san: string; i: number } }[]>((acc, m) => {
      const no = Math.floor(m.i / 2) + 1
      let row = acc.find((r) => r.no === no)
      if (!row) {
        row = { no }
        acc.push(row)
      }
      if (m.i % 2 === 0) row.w = { san: m.san, i: m.i + 1 }
      else row.b = { san: m.san, i: m.i + 1 }
      return acc
    }, [])

  return (
    <div className="view reader-view">
      <div className="reader-head">
        <button className="btn ghost small" onClick={onBack}>
          ← Vault
        </button>
        <div className="reader-title">
          <b>{game.title}</b>
          <span>
            {game.white} vs {game.black} · {game.result}
          </span>
        </div>
        <div className="coach-row reader-coach">
          <CoachAvatar size={38} />
          <CoachBubble tone={coachMsg.tone} text={coachMsg.text} compact />
        </div>
      </div>
      <div className="reader-grid">
        <div className="board-col">
          <div className="board-shell">
            <div className="eval-col">
              <div className="eval-bar">
                <div className="eval-fill" style={{ height: `${winPct(probe?.cp ?? 0)}%` }} />
              </div>
              <div className="eval-pill">{probe ? fmt(Number(probe.cp)) : "—"}</div>
            </div>
            <div className="board-grow">
              <Board
                fen={fens[idx]}
                orientation="w"
                lastMove={idx > 0 ? lastFromTo(sans, idx) : null}
                arrows={arrows}
                interactive={false}
                selectable={false}
              />
            </div>
          </div>
          <div className="strip">
            <button className="btn ghost small" onClick={() => setIdx(0)}>
              ⇤
            </button>
            <button className="btn ghost small" onClick={() => setIdx((i) => Math.max(0, i - 1))}>
              ◀
            </button>
            <button className="btn ghost small" onClick={() => setIdx((i) => Math.min(fens.length - 1, i + 1))}>
              ▶
            </button>
            <button className="btn ghost small" onClick={() => setIdx(fens.length - 1)}>
              ⇥
            </button>
            <button
              className="btn primary small"
              disabled={analysing || !engine}
              onClick={analyse}
            >
              {analysing ? "thinking…" : "◎ ask the engine"}
            </button>
            {probe && idx < sans.length && (
              <span className="pv-label">{probe.pv.join(" ")}</span>
            )}
          </div>
        </div>
        <div className="reader-side">
          <div className="panel">
            <div className="panel-head">WHY THIS GAME MATTERS</div>
            <p className="coach-copy">{game.lesson}</p>
            <div className="mc-tags">
              {game.tags.map((t) => (
                <span key={t} className="chip dim-chip">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="panel movelist-panel">
            <div className="panel-head">SCORE</div>
            <div className="review-moves" ref={movesWrapRef}>
              {pairs.map((r) => (
                <div key={r.no} className="ml-row">
                  <span className="ml-no">{r.no}.</span>
                  {r.w && (
                    <button className={`ml-btn${idx === r.w.i ? " active" : ""}`} onClick={() => setIdx(r.w!.i)}>
                      {r.w.san}
                    </button>
                  )}
                  {r.b ? (
                    <button className={`ml-btn${idx === r.b.i ? " active" : ""}`} onClick={() => setIdx(r.b!.i)}>
                      {r.b.san}
                    </button>
                  ) : (
                    <span className="ml-btn empty" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function lastFromTo(sans: string[], idx: number): { from: string; to: string } | null {
  const c = new Chess()
  for (let i = 0; i < idx; i++) {
    try {
      c.move(sans[i])
    } catch {
      return null
    }
  }
  const h = c.history({ verbose: true })
  const last = h[h.length - 1]
  return last ? { from: last.from, to: last.to } : null
}

function fmt(cp: number): string {
  if (Math.abs(cp) > 9000) return `${cp > 0 ? "M" : "-M"}${Math.abs(cp) - 9000}`
  const v = (cp / 100).toFixed(2)
  return cp > 0 ? `+${v}` : v
}
