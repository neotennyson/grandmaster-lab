import { useState } from "react"
import type { Mode } from "../views/HomeView"
import { loadCoach, TITLES, levelOf } from "../lib/coach"
import { loadPlayer } from "../lib/store"
import { IconPawn, IconBook, IconTrophy, IconChevron, IconSliders } from "./icons"

export function Sidebar({
  mode,
  onNav,
  coachName,
}: {
  mode: Mode
  onNav: (m: Mode | "settings") => void
  coachName: string
}) {
  const [more, setMore] = useState(false)
  const coach = loadCoach()
  const title = TITLES[Math.min(levelOf(coach.xp), TITLES.length - 1)]
  const rating = loadPlayer().rating

  return (
    <aside className="cc-sidebar">
      <div className="side-brand-block">
        <button className="brand-row" onClick={() => onNav("home")} aria-label="Grandmaster Lab home">
          <span className="brand-pawn"><IconPawn size={27} /></span>
          <span className="brand-word"><b>GRANDMASTER</b><span>LAB</span></span>
        </button>
        <span className="brand-caption">PERSONAL CHESS TRAINING</span>
      </div>

      <nav className="side-nav" aria-label="Main navigation">
        <span className="side-section-label">YOUR BOARD</span>
        <button
          className={`side-item${mode === "home" || mode === "setup" || mode === "play" || mode === "review" ? " active" : ""}`}
          onClick={() => onNav("home")}
          aria-current={mode === "home" || mode === "setup" || mode === "play" || mode === "review" ? "page" : undefined}
        >
          <span className="side-icon"><IconPawn size={19} /></span>
          <span>Play</span><span className="side-nav-hint">01</span>
        </button>

        <span className="side-section-label study-label">STUDY ROOM</span>
        <button className={`side-item${mode === "openings" ? " active" : ""}`} onClick={() => onNav("openings")} aria-current={mode === "openings" ? "page" : undefined}>
          <span className="side-icon blue"><IconBook size={19} /></span>
          <span>Openings Lab</span><span className="side-nav-hint">02</span>
        </button>
        <button className={`side-item${mode === "masters" ? " active" : ""}`} onClick={() => onNav("masters")} aria-current={mode === "masters" ? "page" : undefined}>
          <span className="side-icon gold"><IconTrophy size={19} /></span>
          <span>Master Vault</span><span className="side-nav-hint">03</span>
        </button>
        <button className={`side-item more-nav${more ? " open" : ""}`} onClick={() => setMore((v) => !v)} aria-expanded={more}>
          <span className="side-icon"><IconChevron size={18} up={more} /></span>
          <span>More</span>
        </button>
        {more && (
          <div className="side-sub">
            <button className="side-subitem" onClick={() => onNav("home")}>Training overview</button>
            <button className="side-subitem" onClick={() => onNav("settings")}>Preferences</button>
          </div>
        )}
      </nav>

      <div className="side-spacer" />

      <div className="sidebar-rank-card">
        <div className="rank-card-top"><span className="rank-orbit">♞</span><span>YOUR JOURNEY</span></div>
        <b>{title}</b>
        <div className="rank-card-rating"><span>RATING</span><strong>{rating}</strong></div>
      </div>

      <div className="side-footer">
        <div className="side-user">
          <span className="side-user-avatar"><IconPawn size={16} /></span>
          <span className="side-user-meta">
            <span className="side-user-name">{coachName}</span>
            <span className="side-user-sub">{title}</span>
          </span>
        </div>
        <button className="side-settings" title="Preferences" onClick={() => onNav("settings")}>
          <IconSliders size={17} /><span>Preferences</span>
        </button>
      </div>
    </aside>
  )
}
