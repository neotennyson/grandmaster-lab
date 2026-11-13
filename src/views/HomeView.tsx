import { useMemo } from "react"
import { Chess } from "chess.js"
import { TIME_CONTROLS, TIME_CLASS_LABEL, type GameRecord, type TimeClass } from "../lib/types"
import { academyStats, loadMastery, loadPlayer } from "../lib/store"
import { CLASS_META, CLASS_SCORE_ORDER } from "../lib/types"
import { loadCoach, BADGES, TITLES, levelOf } from "../lib/coach"
import { CoachAvatar, XpHud } from "../components/Coach"
import { DailyPuzzle } from "../components/DailyPuzzle"
import { openingFamilies } from "../lib/openings"
import { MASTER_GAMES } from "../lib/masters"
import { IconBook, IconBoard, IconTarget, IconFlag } from "../components/icons"

export type Mode = "home" | "setup" | "play" | "review" | "openings" | "masters"
const TODAY_LABEL = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(Date.now())

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
  const coach = loadCoach()
  const player = loadPlayer()
  const mastery = useMemo(() => loadMastery(), [])
  const classes: TimeClass[] = ["bullet", "blitz", "rapid", "classical"]
  const accuracyTrail = games
    .filter((g) => g.reviewed)
    .slice(0, 8)
    .reverse()
    .map((g) => g.reviewed!.myAcc)
  const focus = myStats.worstClass
    ? `We'll turn your ${CLASS_META[myStats.worstClass.cls].label.toLowerCase()} into a strength.`
    : "Play one game. I'll learn your patterns and find our first focus."

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

  return (
    <div className="view home-view">
      <header className="dashboard-head">
        <div className="dashboard-welcome">
          <div className="dashboard-eyebrow"><span className="status-pip" /> TRAINING HQ <span>· {TODAY_LABEL}</span></div>
          <h1>Make your next move <em>count.</em></h1>
          <p>Every game gives us something to work with. Let's find yours.</p>
        </div>
        <div className="dashboard-rating">
          <span className="rating-glyph">♞</span>
          <span className="rating-copy"><small>YOUR RATING</small><strong>{player.rating}</strong></span>
          <span className="rating-caption">ELO</span>
        </div>
      </header>

      <div className="play-hero-grid">
        <div className="home-left">
        <section className="panel play-panel featured-panel">
          <div className="hero-watermark" aria-hidden="true">♞</div>
          <div className="play-panel-head">
            <div>
              <div className="hero-overline">PLAY · LEARN · REPEAT</div>
              <h2 className="play-title">Take your seat.</h2>
              <p className="play-sub">A full-strength opponent. A coach who studies every game with you.</p>
            </div>
            <div className="pp-actions">
              <button className="btn primary big" onClick={() => onQuickPlay("10|0")}>
                <span>▶</span> Start a game
              </button>
              <button className="btn ghost big" onClick={onStartGame}>
                Customize
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
            <div className="rp-kicker">YOUR LAST GAME, DECODED</div>
            <div className="rp-title">Find the lesson in every move.</div>
            <p className="rp-sub">
              {games.length
                ? "Revisit the turning points, hear the reasoning, and carry one clear lesson into your next game."
                : "Every move gets a label, a reason, and a better line to try next time."}
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
            <div className="coach-card-head">
              <CoachAvatar size={70} />
              <div className="coach-id">
                <div className="coach-tag">YOUR TRAINING PARTNER</div>
                <div className="coach-name">Elias Thorne</div>
                <div className="coach-rank">{TITLES[Math.min(levelOf(coach?.xp ?? 0), TITLES.length - 1)]}</div>
              </div>
            </div>
            <p className="coach-quote">
              “I won't interrupt your game. When it ends, we'll look at every moment that mattered.”
            </p>
            <XpHud xp={coach?.xp ?? 0} />
            <div className="coach-mission"><span className="mission-dot" /><span><b>TODAY'S FOCUS</b>{focus}</span></div>
            <div className="coach-mini">
              <span><b>{myStats.wins}</b> wins</span>
              <span><b>{myStats.reviewed}</b> reviews</span>
              <span><b>{myStats.avgAccuracy ? `${myStats.avgAccuracy}%` : "—"}</b> accuracy</span>
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

      <div className="section-heading">
        <div><span className="dashboard-eyebrow">YOUR DEVELOPMENT</span><h2>Progress that compounds.</h2></div>
        <span className="section-note">Built from your reviewed games</span>
      </div>
      <div className="stat-row">
        <StatCard icon={<IconBoard size={20} />} label="GAMES PLAYED" value={`${myStats.games}`} note={`${myStats.wins}/${myStats.draws}/${myStats.losses} W/D/L`} />
        <StatCard
          icon={<IconTarget size={20} />}
          label="LAST ACCURACY"
          value={myStats.lastAccuracy ? `${myStats.lastAccuracy}%` : "—"}
          note={myStats.avgAccuracy ? `avg ${myStats.avgAccuracy}%` : "review a game to fill this"}
          trend={accuracyTrail}
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
          <div className="rail-empty">Your games and reviews will appear here after your first match.</div>
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

function StatCard({ icon, label, value, note, trend = [] }: { icon: React.ReactNode; label: string; value: string; note: string; trend?: number[] }) {
  const points = trend.length > 1
    ? trend.map((n, i) => `${(i / (trend.length - 1)) * 80},${28 - Math.max(0, Math.min(100, n)) * 0.24}`).join(" ")
    : ""
  return (
    <div className="stat-card">
      <span className="stat-ico">{icon}</span>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
      <div className="stat-note">{note}</div>
      {points && <svg className="stat-sparkline" viewBox="0 0 80 30" aria-label="Recent accuracy trend"><polyline points={points} /></svg>}
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
