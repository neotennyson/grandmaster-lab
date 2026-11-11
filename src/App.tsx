import { useEffect, useMemo, useState } from "react"
import { HomeView, type Mode } from "./views/HomeView"
import { PlayView, type PlaySettings } from "./views/PlayView"
import { ReviewView } from "./views/ReviewView"
import { OpeningsView } from "./views/OpeningsView"
import { MastersView } from "./views/MastersView"
import { BOT_TIERS, findTC, TIME_CONTROLS, TIME_CLASS_LABEL, type GameRecord, type TimeClass } from "./lib/types"
import { academyStats, loadGames, loadPrefs, savePrefs, deleteGame, type Prefs } from "./lib/store"
import { ToastHost } from "./components/Coach"
import { Sidebar } from "./components/Sidebar"

export default function App() {
  const [mode, setMode] = useState<Mode>("home")
  const [games, setGames] = useState<GameRecord[]>(() => loadGames())
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs())
  const [selectedGame, setSelectedGame] = useState<GameRecord | null>(null)
  const [playSettings, setPlaySettings] = useState<PlaySettings>({
    myColor: "w",
    tier: "max",
    coach: true,
    deep: false,
    tcId: "10|0",
  })

  const stats = useMemo(() => academyStats(games), [games])

  useEffect(() => {
    document.documentElement.dataset.board = prefs.boardTheme || "green"
  }, [prefs.boardTheme])

  function updatePrefs(p: Partial<Prefs>) {
    const next = { ...prefs, ...p }
    setPrefs(next)
    savePrefs(next)
  }

  function launchPlay(settings: PlaySettings) {
    setPlaySettings(settings)
    setMode("play")
  }

  function quickPlay(tcId: string) {
    updatePrefs({ tcId })
    const color: "w" | "b" = prefs.myColor === "r" ? (Math.random() < 0.5 ? "w" : "b") : prefs.myColor
    setPlaySettings({
      myColor: color,
      tier: prefs.botTier,
      coach: prefs.coachMode,
      deep: prefs.deepThink,
      tcId,
    })
    setMode("play")
  }

  function reviewGame(g: GameRecord) {
    setSelectedGame(g)
    setMode("review")
  }

  function refreshGames() {
    setGames(loadGames())
  }

  function deleteScheduled(id: string) {
    deleteGame(id)
    refreshGames()
  }

  return (
    <div className="cc-app">
      <Sidebar mode={mode} onNav={(m) => setMode(m === "settings" ? "setup" : m)} coachName="You" />
      <main className={`cc-main${mode === "play" ? " in-game" : ""}`}>
        {mode === "home" && (
          <HomeView
            games={games}
            myStats={stats}
            onStartGame={() => {
              setGames(loadGames())
              setMode("setup")
            }}
            onQuickPlay={(tcId) => {
              setGames(loadGames())
              quickPlay(tcId)
            }}
            onReview={(g) => {
              reviewGame(g)
            }}
            onOpenings={() => setMode("openings")}
            onMasters={() => setMode("masters")}
            onDelete={deleteScheduled}
          />
        )}

        {mode === "setup" && (
          <SetupView prefs={prefs} updatePrefs={updatePrefs} onLaunch={launchPlay} onBack={() => setMode("home")} />
        )}

        {mode === "play" && (
          <PlayView
            settings={playSettings}
            onExit={() => {
              refreshGames()
              setMode("home")
            }}
            onNavigate={(m) => {
              refreshGames()
              setMode(m)
            }}
            onReview={(g) => {
              refreshGames()
              reviewGame(g)
            }}
          />
        )}

        {mode === "review" && selectedGame && (
          <ReviewView
            game={selectedGame}
            fast={prefs.reviewFast}
            onExit={() => {
              refreshGames()
              setMode("home")
            }}
          />
        )}

        {mode === "openings" && <OpeningsView />}
        {mode === "masters" && <MastersView />}
      </main>
      <ToastHost />
    </div>
  )
}

function SetupView({
  prefs,
  updatePrefs,
  onLaunch,
  onBack,
}: {
  prefs: Prefs
  updatePrefs: (p: Partial<Prefs>) => void
  onLaunch: (s: PlaySettings) => void
  onBack: () => void
}) {
  const classes: TimeClass[] = ["bullet", "blitz", "rapid", "classical"]
  const groupBy = (cls: TimeClass) => TIME_CONTROLS.filter((t) => t.cls === cls)
  return (
    <div className="view setup-view">
      <div className="setup-card">
        <h2 className="setup-title">CONFIGURE THE WAR</h2>
        <div className="setup-row">
          <span className="setup-label">TIME FORMAT</span>
          <div className="tc-grid">
            {classes.map((cls) => (
              <div key={cls} className="tc-group">
                <span className="tc-class-break">{TIME_CLASS_LABEL[cls]}</span>
                <div className="tc-row">
                  {groupBy(cls).map((t) => (
                    <button
                      key={t.id}
                      className={`tc-btn${prefs.tcId === t.id ? " on" : ""}`}
                      onClick={() => updatePrefs({ tcId: t.id })}
                      title={`${t.base} min + ${t.inc}s per move`}
                    >
                      {t.id}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="setup-row">
          <span className="setup-label">YOUR SIDE</span>
          <div className="seg">
            {(
              [
                ["w", "WHITE"],
                ["b", "BLACK"],
                ["r", "RANDOM"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} className={`seg-btn${prefs.myColor === v ? " on" : ""}`} onClick={() => updatePrefs({ myColor: v })}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="setup-row">
          <span className="setup-label">ENGINE BRAIN</span>
          <div className="tier-list">
            {(Object.keys(BOT_TIERS) as (keyof typeof BOT_TIERS)[]).map((t) => (
              <button key={t} className={`tier-btn${prefs.botTier === t ? " on" : ""}`} onClick={() => updatePrefs({ botTier: t })}>
                <b>{BOT_TIERS[t].label}</b>
                <span>{BOT_TIERS[t].desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="setup-row">
          <span className="setup-label">DEEP BRAIN</span>
          <div className="seg">
            <button className={`seg-btn${prefs.deepThink ? " on" : ""}`} onClick={() => updatePrefs({ deepThink: true })}>
              YES · think longer
            </button>
            <button className={`seg-btn${!prefs.deepThink ? " on" : ""}`} onClick={() => updatePrefs({ deepThink: false })}>
              STANDARD speed
            </button>
          </div>
        </div>
        <div className="setup-row">
          <span className="setup-label">COACH MODE</span>
          <div className="seg">
            <button className={`seg-btn${prefs.coachMode ? " on" : ""}`} onClick={() => updatePrefs({ coachMode: true })}>
              ON · ELIAS calls your moves live
            </button>
            <button className={`seg-btn${!prefs.coachMode ? " on" : ""}`} onClick={() => updatePrefs({ coachMode: false })}>
              OFF · silent engine
            </button>
          </div>
        </div>
        <div className="setup-row">
          <span className="setup-label">BOARD THEME</span>
          <div className="seg">
            {(
              [
                ["green", "Green"],
                ["brown", "Brown"],
                ["blue", "Blue"],
                ["slate", "Slate"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                className={`seg-btn theme-btn${prefs.boardTheme === id ? " on" : ""}`}
                onClick={() => updatePrefs({ boardTheme: id })}
              >
                <span className={`theme-swatch sw-${id}`} />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="setup-row">
          <span className="setup-label">REVIEW DEPTH</span>
          <div className="seg">
            <button className={`seg-btn${prefs.reviewFast ? " on" : ""}`} onClick={() => updatePrefs({ reviewFast: true })}>
              FAST · 1.1s per position
            </button>
            <button className={`seg-btn${!prefs.reviewFast ? " on" : ""}`} onClick={() => updatePrefs({ reviewFast: false })}>
              DEEP · 3.2s · sharper evals
            </button>
          </div>
        </div>
        <div className="setup-actions">
          <button className="btn ghost" onClick={onBack}>
            ← back
          </button>
          <button
            className="btn primary big"
            onClick={() =>
              onLaunch({
                myColor: prefs.myColor === "r" ? (Math.random() < 0.5 ? "w" : "b") : prefs.myColor,
                tier: prefs.botTier,
                coach: prefs.coachMode,
                deep: prefs.deepThink,
                tcId: prefs.tcId,
              })
            }
          >
            ⚔ {findTC(prefs.tcId).id} VS {BOT_TIERS[prefs.botTier].label}
          </button>
        </div>
      </div>
    </div>
  )
}
