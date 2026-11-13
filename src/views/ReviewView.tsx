import { useEffect, useMemo, useRef, useState } from "react"
import { Chess } from "chess.js"
import { Engine } from "../lib/engine"
import { reviewGame, uciToCoords, pvToSANs, winPct } from "../lib/analysis"
import type { AccuracyAgg } from "../lib/agg"
import { CLASS_META, CLASS_SCORE_ORDER, BOT_TIERS, type PlyReview, type ReviewReport, type GameRecord, type MoveClass } from "../lib/types"
import { patchGame } from "../lib/store"
import { Board, type ArrowSpec } from "../components/Board"
import { CoachAvatar, CoachBubble, XpHud } from "../components/Coach"
import { coachOnReviewIntro, loadCoach, saveCoach, TITLES, levelOf, BADGES, unlockBadges, type ReactionTone } from "../lib/coach"
import { emit } from "../lib/coachBus"
import { playSound } from "../lib/coachSound"
import { speak, stopSpeaking } from "../lib/voice"

function resultLabel(result: string): string {
  if (result === "1-0") return "1-0 White wins"
  if (result === "0-1") return "0-1 Black wins"
  if (result === "1/2-1/2") return "½-½ Draw"
  return "unfinished"
}

function formatAcc(a: number): string {
  return a > 0 ? `${a.toFixed(1)}%` : "—"
}

function fmtLoss(loss: number): string {
  if (!loss) return "—"
  return `${(loss / 100).toFixed(2)}`
}

function fmtEvalLabel(cp: number): string {
  const abs = Math.abs(cp)
  if (abs > 9000) {
    const mateIn = Math.max(1, Math.round((10000 - abs) / 100))
    return `${cp > 0 ? "M" : "-M"}${mateIn}`
  }
  const v = (cp / 100).toFixed(2)
  return cp > 0 ? `+${v}` : v === "0.00" ? "0.00" : v
}

function moveRows(plies: PlyReview[]): { no: number; w?: PlyReview; b?: PlyReview }[] {
  const rows: { no: number; w?: PlyReview; b?: PlyReview }[] = []
  for (const p of plies) {
    const no = Math.ceil(p.ply / 2)
    let row = rows.find((r) => r.no === no)
    if (!row) {
      row = { no }
      rows.push(row)
    }
    if (p.color === "w") row.w = p
    else row.b = p
  }
  return rows
}

function aggregate(plies: PlyReview[]): AccuracyAgg {
  const counts = {} as Record<MoveClass, { w: number; b: number }>
  for (const cls of CLASS_SCORE_ORDER) counts[cls] = { w: 0, b: 0 }
  let accW = 0
  let accB = 0
  let lossW = 0
  let lossB = 0
  let wCount = 0
  let bCount = 0
  for (const p of plies) {
    counts[p.cls][p.color]++
    if (p.color === "w") {
      accW += p.acc
      lossW += p.lossCP
      wCount++
    } else {
      accB += p.acc
      lossB += p.lossCP
      bCount++
    }
  }
  return {
    counts,
    accW: wCount ? accW / wCount : 0,
    accB: bCount ? accB / bCount : 0,
    lossW: wCount ? lossW / wCount : 0,
    lossB: bCount ? lossB / bCount : 0,
  }
}

export function ReviewView({
  game,
  fast,
  onExit,
}: {
  game: GameRecord
  fast: boolean
  onExit: () => void
}) {
  const engineRef = useRef<Engine | null>(null)
  const abortedRef = useRef(false)
  const patchedRef = useRef(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [complete, setComplete] = useState(false)
  const [report, setReport] = useState<ReviewReport | null>(null)
  const [plies, setPlies] = useState<PlyReview[]>([])
  const [plyIdx, setPlyIdx] = useState(0)
  const [showBest, setShowBest] = useState(true)
  const [walkCat, setWalkCat] = useState("key")
  const [walkIdx, setWalkIdx] = useState(0)
  const [coachTone, setCoachTone] = useState<ReactionTone>("lore")
  const [coachText, setCoachText] = useState<string>("Let's go through this game one move at a time.")
  const [coachKey, setCoachKey] = useState<string | null>("review_entry")
  useEffect(() => {
    speak(coachText, coachKey)
    return () => stopSpeaking()
  }, [coachText, coachKey])
  const [coachXP, setCoachXP] = useState(loadCoach().xp)
  const coachProfileRef = useRef(loadCoach())
  const coachBadgeDone = useRef(false)

  function commitProfile(next: import("../lib/coach").CoachProfile) {
    coachProfileRef.current = next
    saveCoach(next)
    setCoachXP(next.xp)
  }

  function finishCoachCeremony(rep: ReviewReport) {
    if (!game.reviewed) {
      const prev = coachProfileRef.current
      const next = { ...prev, xp: prev.xp + 45, reviewsDone: prev.reviewsDone + 1 }
      const fresh = unlockBadges(next, {})
      if (fresh.length) next.badges = [...next.badges, ...fresh]
      commitProfile(next)
      const lvlBefore = levelOf(prev.xp)
      const lvlAfter = levelOf(next.xp)
      emit({ kind: "xp", amount: 45, reason: "review complete" })
      fresh.forEach((id) => {
        const b = BADGES.find((x) => x.id === id)
        if (b) {
          emit({ kind: "badge", id: b.id, name: b.name, glyph: b.glyph, desc: b.desc })
          playSound("badge")
        }
      })
      if (lvlAfter > lvlBefore) {
        emit({ kind: "levelup", level: lvlAfter, title: TITLES[Math.min(lvlAfter, TITLES.length - 1)] })
        playSound("levelup")
      }
    }
    const intro = coachOnReviewIntro({
      acc: game.myColor === "w" ? rep.accW : rep.accB,
      opening: rep.opening,
      worstCls: rep.plies
        .filter((p) => p.color === game.myColor && (p.cls === "blunder" || p.cls === "mistake"))
        .sort((a, b) => b.wpAfter - b.wpBefore - (a.wpAfter - a.wpBefore))[0]?.cls ?? "inaccuracy",
    })
    setCoachTone(intro.tone)
    setCoachKey(intro.key ?? null)
    setCoachText(
      `${intro.text} • ${
        vocabLesson(rep, game.myColor) ??
        "Nothing catastrophic in this one — polish the in-between moves and push for perfection."
      }`,
    )
  }

  function vocabLesson(rep: ReviewReport, myColor: "w" | "b"): string | null {
    const mine = rep.plies.filter(
      (p) => p.color === myColor && (p.cls === "blunder" || p.cls === "mistake"),
    )
    const worst = mine.sort(
      (a, b) => b.wpAfter - b.wpBefore - (a.wpAfter - a.wpBefore),
    )[0]
    if (!worst) return null
    return `Lesson of the day: move ${Math.ceil(worst.ply / 2)}, ${worst.san}. Step there — the engine line drawn on the board is the cure, not shame.`
  }

  useEffect(() => {
    abortedRef.current = false
    const engine = new Engine()
    engineRef.current = engine
    let alive = true
    engine
      .boot()
      .then(() => {
        if (!alive) return
        engine.setOption("Skill Level", 20)
        return reviewGame({
          pgn: game.pgn,
          engine,
          movetime: fast ? 1100 : 3200,
          isAborted: () => abortedRef.current,
          onProgress: (done, total) => {
            setProgress({ done, total })
          },
        })
      })
      .then((rep) => {
        if (!alive || !rep) return
        setReport(rep)
        setPlies(rep.plies)
        setComplete(true)
        if (!patchedRef.current) {
          patchedRef.current = true
          persistLearnings(rep, game)
        }
        if (!coachBadgeDone.current) {
          coachBadgeDone.current = true
          finishCoachCeremony(rep)
        }
      })
      .catch(() => {
        if (alive) setComplete(true)
      })
    return () => {
      alive = false
      abortedRef.current = true
      engine.destroy()
    }
  }, [game.id])

  const totalSans = useMemo(() => {
    const c = new Chess()
    try {
      c.loadPgn(game.pgn, { strict: false })
      return c.history().length
    } catch {
      return 0
    }
  }, [game.pgn])

  const donePlies = plies
  const viewCount = donePlies.length
  const current = plyIdx >= 1 && plyIdx <= viewCount ? donePlies[plyIdx - 1] : null
  const fen = plyIdx === 0 ? new Chess().fen() : (current?.fenAfter ?? new Chess().fen())

  const lastMove = current
    ? { from: uciToCoords(current.uci).from, to: uciToCoords(current.uci).to }
    : null

  const nextPly = plyIdx < viewCount ? donePlies[plyIdx] : null
  const arrows: ArrowSpec[] = useMemo(() => {
    if (!showBest || !nextPly || !nextPly.bestFrom) return []
    return [{ from: nextPly.bestFrom, to: nextPly.bestTo, color: "#4ba36a" }]
  }, [showBest, nextPly])

  const agg = useMemo(() => aggregate(donePlies), [donePlies])
  const bestPVSANs = current?.bestPV ? pvToSANs(current.fenBefore, current.bestPV, 6) : []

  const WALK_CATS: { id: string; label: string; classes: MoveClass[] }[] = [
    { id: "key", label: "Key Moves", classes: ["brilliant", "great", "inaccuracy", "mistake", "blunder"] },
    { id: "brilliant", label: "Brilliant", classes: ["brilliant"] },
    { id: "great", label: "Great", classes: ["great"] },
    { id: "best", label: "Best", classes: ["best"] },
    { id: "excellent", label: "Excellent", classes: ["excellent"] },
    { id: "good", label: "Good", classes: ["good"] },
    { id: "book", label: "Book", classes: ["book"] },
    { id: "inaccuracy", label: "Inaccuracy", classes: ["inaccuracy"] },
    { id: "mistake", label: "Mistake", classes: ["mistake"] },
    { id: "blunder", label: "Blunder", classes: ["blunder"] },
  ]

  const tourList = useMemo(() => {
    if (!report || !complete) return []
    const cats = WALK_CATS.find((c) => c.id === walkCat)?.classes ?? []
    return report.plies.filter((p) => p.color === game.myColor && cats.includes(p.cls))
  }, [report, complete, walkCat, game.myColor])

  useEffect(() => {
    setWalkIdx(0)
    const first = tourList[0]
    if (first) speak(first.comment, `walk_${first.cls}`)
  }, [walkCat, tourList])

  const curWalk = tourList[Math.min(walkIdx, Math.max(0, tourList.length - 1))]

  function walkJump(target: PlyReview) {
    setPlyIdx(target.ply)
  }
  function walkNext() {
    if (walkIdx < tourList.length - 1) {
      const n = walkIdx + 1
      setWalkIdx(n)
      walkJump(tourList[n])
      speak(tourList[n].comment, `walk_${tourList[n].cls}`)
    }
  }
  function walkPrev() {
    if (walkIdx > 0) {
      const prev = walkIdx - 1
      setWalkIdx(prev)
      walkJump(tourList[prev])
      speak(tourList[prev].comment, `walk_${tourList[prev].cls}`)
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return
      if (e.key === "ArrowLeft") setPlyIdx((p) => Math.max(0, p - 1))
      else if (e.key === "ArrowRight") setPlyIdx((p) => Math.min(viewCount, p + 1))
      else if (e.key === "Home") setPlyIdx(0)
      else if (e.key === "End") setPlyIdx(viewCount)
      else if (e.key === "b") setShowBest((v) => !v)
      else return
      e.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [viewCount])

  const movesWrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const wrap = movesWrapRef.current
    if (!wrap) return
    const active = wrap.querySelector<HTMLElement>(".ml-btn.active")
    if (active) {
      const top = active.offsetTop - wrap.clientHeight / 2
      wrap.scrollTo({ top, behavior: "smooth" })
    }
  }, [plyIdx])

  return (
    <div className="view review-view">
      <div className="review-head">
        <button className="btn ghost small" onClick={onExit}>
          ← Archive
        </button>
        <div className="review-title">
          <span className="rv-opening">{report?.opening ?? "Opening"}</span>
          <span className="rv-result">{resultLabel(game.result)}</span>
        </div>
        {!complete ? (
          <div className="review-prog">
            <div className="prog-info">
              {BOT_TIERS.max.label} reviewing… {progress.done}/{progress.total || totalSans}
            </div>
            <div className="prog-bar">
              <div style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 3}%` }} />
            </div>
          </div>
        ) : (
          <div className="chip toggle-row">
            <button className={`btn ghost small on`}>Report ready</button>
          </div>
        )}
        {complete && (
          <button className="btn ghost small" onClick={() => setShowBest((v) => !v)}>
            ◎ best line
          </button>
        )}
      </div>

      <div className="review-grid">
        <div className="board-col">
          <div className="board-shell">
            <div className="eval-col">
              <div className="eval-bar">
                <div className="eval-fill" style={{ height: `${winPct(current?.evalAfterWhite ?? 0)}%` }} />
              </div>
              <div className="eval-pill">{fmtEvalLabel(current?.evalAfterWhite ?? 0)}</div>
            </div>
            <div className="board-grow">
              <Board
                fen={fen}
                orientation={game.myColor === "w" ? "w" : "b"}
                lastMove={lastMove}
                arrows={arrows}
                interactive={false}
                selectable={false}
              />
            </div>
          </div>
          <EvalGraph plies={donePlies} totalSans={totalSans} onJump={setPlyIdx} activePly={plyIdx} />
          <div className="strip">
            <button className="btn ghost small" onClick={() => setPlyIdx(0)}>
              ⇤
            </button>
            <button className="btn ghost small" onClick={() => setPlyIdx((p) => Math.max(0, p - 1))}>
              ◀
            </button>
            <button className="btn ghost small" onClick={() => setPlyIdx((p) => Math.min(viewCount, p + 1))}>
              ▶
            </button>
            <button className="btn ghost small" onClick={() => setPlyIdx(viewCount)}>
              ⇥
            </button>
            <span className="ply-label">
              ply {Math.min(plyIdx, viewCount)}/{viewCount}
            </span>
          </div>
        </div>

        <div className="side-col">
          <div className="panel coach-panel">
            <div className="coach-row">
              <CoachAvatar size={44} />
              <div className="coach-id">
                <div className="coach-name">ELIAS THORNE</div>
                <div className="coach-tag">GAME REVIEW COACH</div>
              </div>
            </div>
            <CoachBubble tone={coachTone} text={coachText} />
            <XpHud xp={coachXP} />
          </div>
          <div className="panel acc-panel">
            <div className="acc-row">
              {[0, 1].map((i) => {
                const side: "w" | "b" = i === 0 ? "w" : "b"
                return (
                  <div key={side} className={`acc-card ${side}`}>
                    <div className="acc-name">{side === "w" ? "White" : "Black"}</div>
                    <div className="acc-big">{formatAcc(side === "w" ? agg.accW : agg.accB)}</div>
                    <div className="acc-avg">avg loss {fmtLoss(side === "w" ? agg.lossW : agg.lossB)}</div>
                  </div>
                )
              })}
            </div>
            <div className="report-table">
              <div className="rt-head">
                <span />
                <span className="rt-side">{game.myColor === "w" ? "You" : "White"}</span>
                <span className="rt-side">{game.myColor === "b" ? "You" : "Black"}</span>
              </div>
              {CLASS_SCORE_ORDER.map((cls) => {
                const c = agg.counts[cls]
                if (!c.w && !c.b) return null
                const meta = CLASS_META[cls]
                const mine = game.myColor === "w" ? c.w : c.b
                return (
                  <button
                    key={cls}
                    className={`rt-row${walkCat === cls ? " on" : ""}`}
                    onClick={() => {
                      setWalkCat(cls)
                      setWalkIdx(0)
                      const first = donePlies.find((p) => p.color === game.myColor && p.cls === cls)
                      if (first) setPlyIdx(first.ply)
                    }}
                  >
                    <span className="rt-glyph" style={{ color: meta.color, background: meta.bg }}>
                      {meta.glyph}
                    </span>
                    <span className="rt-label">{meta.label}</span>
                    <span className="rt-n">{c.w}</span>
                    <span className="rt-n">{c.b}</span>
                    <span className={`rt-mine${mine > 0 ? " has" : ""}`}>{mine > 0 ? `${mine} yours` : ""}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {complete && (
            <div className="panel walk-panel">
              <div className="panel-head">WALKTHROUGH · YOUR MOVES</div>
              <div className="walk-cats">
                {WALK_CATS.map((c) => {
                  const n = (report?.plies ?? []).filter((p) => p.color === game.myColor && c.classes.includes(p.cls)).length
                  return (
                    <button
                      key={c.id}
                      className={`walk-cat${walkCat === c.id ? " on" : ""}`}
                      onClick={() => {
                        setWalkCat(c.id)
                        setWalkIdx(0)
                        const first = donePlies.find((p) => p.color === game.myColor && c.classes.includes(p.cls))
                        if (first) setPlyIdx(first.ply)
                      }}
                    >
                      {c.label}
                      <span>{n}</span>
                    </button>
                  )
                })}
              </div>
              {curWalk ? (
                <div className="walk-body" key={curWalk.ply}>
                  <div className="walk-pos">
                    {walkIdx + 1} / {tourList.length}
                  </div>
                  <div className="walk-head">
                    <span
                      className="badge"
                      style={{ background: CLASS_META[curWalk.cls].bg, color: CLASS_META[curWalk.cls].color, borderColor: CLASS_META[curWalk.cls].color }}
                    >
                      {CLASS_META[curWalk.cls].glyph}
                    </span>
                    <b>
                      {Math.ceil(curWalk.ply / 2)}. {curWalk.san}
                    </b>
                    <span className="walk-kind">{CLASS_META[curWalk.cls].label}</span>
                  </div>
                  <p className="walk-comment">{curWalk.comment}</p>
                  <div className="walk-nav">
                    <button className="btn ghost small" onClick={walkPrev} disabled={walkIdx === 0}>
                      ◀ Back
                    </button>
                    <button className="btn primary small" onClick={walkNext} disabled={walkIdx >= tourList.length - 1}>
                      Next ▶
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rail-empty">Nothing in this category — clean.</div>
              )}
            </div>
          )}

          <div className="panel movelist-panel">
            <div className="panel-head">GAME REPORT</div>
            <div className="review-moves" ref={movesWrapRef}>
              {moveRows(donePlies).map((row) => (
                <div key={row.no} className="ml-row">
                  <span className="ml-no">{row.no}.</span>
                  {(["w", "b"] as const).map((c1) => {
                    const p = row[c1]
                    if (!p) return <span key={c1} className="ml-btn empty" />
                    const meta = CLASS_META[p.cls]
                    return (
                      <button
                        key={c1}
                        className={`ml-btn${plyIdx === p.ply ? " active" : ""}`}
                        style={{ borderColor: meta.color }}
                        onClick={() => setPlyIdx(p.ply)}
                        title={meta.label}
                      >
                        <span
                          className="badge"
                          style={{ background: meta.bg, color: meta.color, borderColor: meta.color }}
                        >
                          {meta.glyph}
                        </span>
                        {p.san}
                      </button>
                    )
                  })}
                </div>
              ))}
              {!donePlies.length && !complete && (
                <div className="empty-note">The engine is walking through the game, position by position…</div>
              )}
            </div>
          </div>

          <div className="panel coach-panel">
            <div className="panel-head">COACH NOTES</div>
            {current ? (
              <div key={current.ply} className="coach-enter">
                <div
                  className="coach-badge"
                  style={{
                    background: CLASS_META[current.cls].bg,
                    color: CLASS_META[current.cls].color,
                  }}
                >
                  {current.san} · {CLASS_META[current.cls].label}
                </div>
                <p className="coach-copy">{current.comment}</p>
                {bestPVSANs.length > 1 && (
                  <p className="coach-copy subtle">Engine line: {bestPVSANs.join(" ")}</p>
                )}
                <p className="coach-metrics">
                  win chance {(current.wpBefore).toFixed(0)}% → {(current.wpAfter).toFixed(0)}% · accuracy gained {current.acc.toFixed(1)}%
                </p>
              </div>
            ) : (
              <p className="coach-copy">
                {donePlies.length ? "White to move at the start. Step in." : "Report building…"}
              </p>
            )}
          </div>

          {complete && (
            <div className="panel key-panel">
              <div className="panel-head">KEY MOMENTS · {game.myColor === "w" ? "WHITE" : "BLACK"}</div>
              <div className="key-list">
                {donePlies
                  .filter(
                    (p) =>
                      p.color === game.myColor &&
                      (p.cls === "blunder" || p.cls === "mistake" || (p.cls === "inaccuracy" && p.lossCP >= 120)) &&
                      p.wpBefore - p.wpAfter >= 12,
                  )
                  .sort((a, b) => b.wpAfter - b.wpBefore - (a.wpAfter - a.wpBefore))
                  .slice(0, 3)
                  .map((p) => {
                    const meta = CLASS_META[p.cls]
                    return (
                      <button key={p.ply} className="key-card" onClick={() => setPlyIdx(p.ply)}>
                        <span className="badge" style={{ background: meta.bg, color: meta.color, borderColor: meta.color }}>
                          {meta.glyph}
                        </span>
                        <span className="key-san">
                          {Math.ceil(p.ply / 2)}. {p.san}
                        </span>
                        <span className="key-loss">−{(p.wpBefore - p.wpAfter).toFixed(0)}%</span>
                      </button>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function persistLearnings(rep: ReviewReport, game: GameRecord) {
  const my = game.myColor
  const countsMine: Partial<Record<MoveClass, number>> = {}
  for (const cls of CLASS_SCORE_ORDER) {
    const n = rep.counts[cls][my]
    if (n) countsMine[cls] = n
  }
  const mine = rep.plies.filter((p) => p.color === my)
  const worst = mine
    .slice()
    .sort((a, b) => b.wpAfter - b.wpBefore - (a.wpAfter - a.wpBefore))[0]
  patchGame(game.id, {
    reviewed: {
      accW: rep.accW,
      accB: rep.accB,
      myAcc: my === "w" ? rep.accW : rep.accB,
      opening: rep.opening,
      countsMine,
      worstPly: worst?.ply ?? 0,
      worstCls: worst?.cls ?? "best",
      worstLoss: worst?.lossCP ?? 0,
    },
  })
}

function EvalGraph({
  plies,
  totalSans,
  onJump,
  activePly,
}: {
  plies: PlyReview[]
  totalSans: number
  onJump: (ply: number) => void
  activePly: number
}) {
  if (!totalSans) return null
  const w = 100
  const h = 44
  const pts: { x: number; y: number }[] = []
  pts.push({ x: 0, y: h / 2 })
  plies.forEach((p, i) => {
    pts.push({
      x: ((i + 1) / totalSans) * w,
      y: h - (winPct(p.evalAfterWhite) / 100) * h,
    })
  })
  const path = pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")
  return (
    <div className="eval-graph">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <line x1="0" y1={h / 2} x2={w} y2={h / 2} className="eg-zero" />
        <polyline points={path} className="eg-line" fill="none" />
        {plies.map((p, i) => {
          if (p.cls !== "blunder" && p.cls !== "mistake") return null
          return (
            <circle
              key={i}
              cx={((i + 1) / totalSans) * w}
              cy={h - (winPct(p.evalAfterWhite) / 100) * h}
              r="1"
              className={`eg-dot ${p.cls}`}
              onClick={() => onJump(p.ply)}
            />
          )
        })}
        {activePly > 0 && activePly <= plies.length && (
          <circle cx={(activePly / totalSans) * w} cy={h - (winPct(plies[activePly - 1].evalAfterWhite) / 100) * h} r="1.3" className="eg-you" />
        )}
      </svg>
      <div className="eg-labels">
        <span>+white</span>
        <span>black −</span>
      </div>
    </div>
  )
}
