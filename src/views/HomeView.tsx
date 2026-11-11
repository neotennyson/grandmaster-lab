import { useMemo, useState } from "react"
import { Chess } from "chess.js"
import { TIME_CONTROLS, TIME_CLASS_LABEL, type GameRecord, type TimeClass } from "../lib/types"
import { academyStats, loadMastery, loadPlayer } from "../lib/store"
import { CLASS_META, CLASS_SCORE_ORDER } from "../lib/types"
import { MastersView } from "./MastersView"
import { loadCoach, BADGES } from "../lib/coach"
import { CoachAvatar, XpHud } from "../components/Coach"
import { DailyPuzzle } from "../components/DailyPuzzle"
import { openingFamilies } from "../lib/openings"
import { MASTER_GAMES } from "../lib/masters"
import { IconBook, IconBoard, IconTarget, IconFlag } from "../components/icons"

export type Mode = "home" | "setup" | "play" | "review" | "openings" | "masters"

export function HomeView({
  games,
  myStats,
  onStartGame,
  onQuickPlay,
  onReview,
  onOpenings,
  onMasters,
  onDelete,
}: {
  games: GameRecord[]
  myStats: ReturnType<typeof academyStats>
  onStartGame: () => void
  onQuickPlay: (tcId: string) => void
  onReview: (g: GameRecord) => void
  onOpenings: () => void
  onMasters: () => void
  onDelete: (id: string) => void
}) {
  const [tab] = useState<"hq" | "masters">("hq")
  const coach = loadCoach()
  const player = loadPlayer()
  const mastery = useMemo(() => loadMastery(), [])
  const classes: TimeClass[] = ["bullet", "blitz", "rapid", "classical"]

  const families = useMemo(() => {
    const fams = openingFamilies()
    return fams
      .map((f) => ({
        ...f,
        stars: f.lines.reduce((s, l) => s + (mastery[l.name] ?? 0), 0),
      }))
      .sort((a, b) => b.stars - a.stars || b.lines.length - a.lines.length)
      .slice(0, 3)
  }, [mastery])

  if (tab === "masters") {
    return <MastersView />
  }

  return (
    <div className="view home-view">
      <div className="play-hero-grid">
        <div className="home-left">
        <section className="panel play-panel">
          <div className="play-panel-head">
            <div>
              <h2 className="play-title">Play Chess</h2>
              <p className="play-sub">The strongest engine on Earth. Pick your clock and go.</p>
            </div>
            <div className="pp-actions">
              <button className="btn primary big" onClick={() => onQuickPlay("10|0")}>
                ▶ Play
              </button>
              <button className="btn ghost big" onClick={onStartGame}>
                Play Bots
              </button>
            </div>
          </div>
          <div className="quick-pair">
            {classes.map((cls) => (
              <div key={cls} className="qp-row">
                <span className="qp-label">{TIME_CLASS_LABEL[cls]}</span>
                <div className="qp-buttons">
                  {TIME_CONTROLS.filter((t) => t.cls === cls).map((t) => (
                    <button key={t.id} className="qp-btn" onClick={() => onQuickPlay(t.id)} title={`${t.base} minutes${t.inc ? ` + ${t.inc}s increment` : ""}`}>
                      <span className="qp-play">▶</span>
                      <span className="qp-time">{t.base} min</span>
                      {t.inc > 0 && <span className="qp-inc">+{t.inc}</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="lab-links">
            <button className="link-btn" onClick={onOpenings}>
              Openings Lab →
            </button>
            <button className="link-btn" onClick={onMasters}>
              Master Vault →
            </button>
          </div>
        </section>

        <section className="panel review-promo">
          <div className="rp-copy">
            <div className="rp-title">Game Review</div>
            <p className="rp-sub">
              Every move graded Brilliant to Blunder, with the exact turning points marked. This is where the rating climbs.
            </p>
            <button
              className="btn primary"
              onClick={() => (games.length ? onReview(games[0]) : onStartGame())}
            >
              {games.length ? "Review latest game" : "Play your first game"}
            </button>
          </div>
          <div className="rp-art">
            <span className="rp-chip c1">!!</span>
            <span className="rp-chip c2">?</span>
            <span className="rp-chip c3">??</span>
          </div>
        </section>

        <DailyPuzzle />
        </div>

        <aside className="home-right">
          <section className="panel coach-card">
            <div className="coach-row">
              <CoachAvatar size={52} />
              <div className="coach-id">
                <div className="coach-name">ELIAS THORNE</div>
                <div className="coach-tag">YOUR GRANDMASTER</div>
              </div>
            </div>
            <p className="coach-quote">
              "Every book, every immortal line, one voice. Play — I'll call your moves as they happen."
            </p>
            <XpHud xp={coach?.xp ?? 0} />
            <div className="coach-mini">
              <span>RATING {player.rating}</span>
              <span>WINS {myStats.wins}</span>
              <span>REVIEWED {myStats.reviewed}</span>
            </div>
          </section>

          <section className="panel rail-card">
            <div className="panel-head">OPENINGS TO DRILL</div>
            {families.map((f) => (
              <button key={f.key} className="rail-row" onClick={onOpenings}>
                <span className="rail-ico blue">
                  <IconBook size={16} />
                </span>
                <span className="rail-name">{f.label}</span>
                <span className="rail-meta">
                  {f.stars > 0 ? "★".repeat(Math.min(3, f.stars)) : `${f.lines.length} lines`}
                </span>
              </button>
            ))}
          </section>

          <section className="panel rail-card">
            <div className="panel-head">RECENT GAMES</div>
            {games.slice(0, 3).map((g) => {
              const won = (g.result === "1-0" && g.myColor === "w") || (g.result === "0-1" && g.myColor === "b")
              const draw = g.result === "1/2-1/2"
              return (
                <button key={g.id} className="rail-row" onClick={() => onReview(g)}>
                  <span className={`mini-res ${draw ? "d" : won ? "w" : "l"}`}>{draw ? "½" : won ? "W" : "L"}</span>
                  <span className="rail-name">
                    {g.reviewed?.opening ?? `vs ${g.botTier.split(" ·")[0]}`}
                    <span className="rail-sub">{g.tc ?? g.botTier.split("· ")[1] ?? ""}</span>
                  </span>
                  <span className="rail-meta">{g.reviewed ? `${g.reviewed.myAcc}%` : "Review ›"}</span>
                </button>
              )
            })}
            {!games.length && <div className="rail-empty">No games yet — start one above.</div>}
          </section>

          <section className="panel rail-card">
            <div className="panel-head">IMMORTAL OF THE DAY</div>
            {(() => {
              const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
              const g = MASTER_GAMES[dayOfYear % MASTER_GAMES.length]
              return (
                <button className="rail-row" onClick={onMasters}>
                  <span className="mini-res g">★</span>
                  <span className="rail-name">
                    {g.title}
                    <span className="rail-sub">
                      {g.white} vs {g.black} · {g.year}
                    </span>
                  </span>
                  <span className="rail-meta">Study ›</span>
                </button>
              )
            })()}
          </section>
        </aside>
      </div>

      <div className="stat-row">
        <StatCard icon={<IconBoard size={20} />} label="GAMES PLAYED" value={`${myStats.games}`} note={`${myStats.wins}/${myStats.draws}/${myStats.losses} W/D/L`} />
        <StatCard
          icon={<IconTarget size={20} />}
          label="LAST ACCURACY"
          value={myStats.lastAccuracy ? `${myStats.lastAccuracy}%` : "—"}
          note={myStats.avgAccuracy ? `avg ${myStats.avgAccuracy}%` : "review a game to fill this"}
        />
        <StatCard
          icon={<IconFlag size={20} />}
          label="PRIMARY LEAK"
          value={myStats.worstClass ? `${CLASS_META[myStats.worstClass.cls].glyph} ×${myStats.worstClass.count}` : "—"}
          note={myStats.worstClass ? CLASS_META[myStats.worstClass.cls].label : "no defects detected"}
        />
      </div>

      <div className="panel badges-panel">
        <div className="panel-head">
          ELIAS PROGRESSION
          <span className="panel-count">{coach?.badges?.length ?? 0}/{BADGES.length} unlocked</span>
        </div>
        <div className="badge-gallery">
          {BADGES.map((b) => {
            const owned = coach?.badges?.includes(b.id)
            return (
              <div key={b.id} className={`badge-cell${owned ? " owned" : " locked"}`} title={b.desc}>
                <span className="badge-glyph">{b.glyph}</span>
                <span>{b.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="leak-chart panel">
        <div className="panel-head">MOVE CLASSIFICATION · YOUR PIECES</div>
        {myStats.reviewed === 0 ? (
          <div className="rail-empty">No reviewed games yet — play a game, then open the Game Review to build this profile.</div>
        ) : (
          <div className="classif-rows">
            {CLASS_SCORE_ORDER.filter((c) => c !== "book").map((cls) => {
              const n = myStats.classTotals[cls] ?? 0
              const max = Math.max(1, ...CLASS_SCORE_ORDER.filter((c) => c !== "book").map((c) => myStats.classTotals[c] ?? 0))
              const meta = CLASS_META[cls]
              return (
                <div key={cls} className="classif-row">
                  <span className="classif-glyph" style={{ background: meta.bg, color: meta.color }}>
                    {meta.glyph}
                  </span>
                  <span className="classif-label">{meta.label}</span>
                  <span className="classif-track">
                    <span className="classif-fill" style={{ width: `${(n / max) * 100}%`, background: meta.color }} />
                  </span>
                  <span className="classif-count">{n}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="archive panel">
        <div className="panel-head">GAME ARCHIVE</div>
        {games.length === 0 && (
          <div className="rail-empty">No games yet. Wage your first war against the machine, then study the corpse of its position.</div>
        )}
        {games.map((g) => {
          const excerpt = firstMoves(g, 6)
          return (
            <div key={g.id} className="game-row">
              <div className="gr-top">
                <span className={`gr-res ${g.result === "1/2-1/2" ? "draw" : "dec"}`}>{resultText(g)}</span>
                <span className="gr-info">
                  {g.myColor === "w" ? "White" : "Black"} vs {g.botTier} · {new Date(g.ts).toLocaleDateString()}
                </span>
              </div>
              <div className="gr-moves">{excerpt}</div>
              <div className="gr-actions">
                {g.reviewed && (
                  <span className="chip dim-chip">
                    {g.reviewed.opening ?? "custom"} · acc {g.reviewed.myAcc}%
                  </span>
                )}
                <button className="btn primary small" onClick={() => onReview(g)}>
                  {g.reviewed ? "Re-review" : "Game Review"}
                </button>
                <button className="btn ghost small" onClick={() => onDelete(g.id)}>
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="stat-card">
      <span className="stat-ico">{icon}</span>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
      <div className="stat-note">{note}</div>
    </div>
  )
}

function resultText(g: GameRecord): string {
  if (g.result === "1/2-1/2") return "DRAW"
  const won = (g.result === "1-0" && g.myColor === "w") || (g.result === "0-1" && g.myColor === "b")
  return won ? "WON" : g.result === "*" ? "UNSIGNED" : "LOST"
}

function firstMoves(g: GameRecord, n: number): string {
  const c = parseSafely(g.pgn)
  return c
    .history()
    .slice(0, n)
    .map((s, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${s}` : s))
    .join(" ")
}

function parseSafely(pgn: string) {
  const c = new Chess()
  try {
    c.loadPgn(pgn, { strict: false })
  } catch {
    return c
  }
  return c
}
