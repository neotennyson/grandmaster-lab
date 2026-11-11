import { useState } from "react"
import type { Mode } from "../views/HomeView"
import { loadCoach, TITLES, levelOf } from "../lib/coach"
import { loadPlayer } from "../lib/store"
import {
  IconPawn,
  IconBook,
  IconTrophy,
  IconChevron,
  IconDiamond,
  IconSearch,
  IconUsers,
  IconMail,
  IconBell,
  IconSliders,
} from "./icons"

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

  return (
    <aside className="cc-sidebar">
      <button className="brand-row" onClick={() => onNav("home")}>
        <span className="brand-pawn">
          <IconPawn size={30} />
        </span>
        <span className="brand-word">
          Gambit<span>ACADEMY</span>
        </span>
      </button>

      <button
        className={`side-item${mode === "home" || mode === "setup" || mode === "play" ? " active" : ""}`}
        onClick={() => onNav("home")}
      >
        <span className="side-icon">
          <IconPawn size={19} />
        </span>
        Play
      </button>
      <button className={`side-item${mode === "openings" ? " active" : ""}`} onClick={() => onNav("openings")}>
        <span className="side-icon blue">
          <IconBook size={19} />
        </span>
        Openings Lab
      </button>
      <button className={`side-item${mode === "masters" ? " active" : ""}`} onClick={() => onNav("masters")}>
        <span className="side-icon gold">
          <IconTrophy size={19} />
        </span>
        Master Vault
      </button>
      <button className={`side-item${more ? " open" : ""}`} onClick={() => setMore((v) => !v)}>
        <span className="side-icon">
          <IconChevron size={18} up={more} />
        </span>
        More
      </button>
      {more && (
        <div className="side-sub">
          <button className="side-subitem" onClick={() => onNav("home")}>
            Game Archive
          </button>
          <button className="side-subitem" onClick={() => onNav("setup")}>
            Settings
          </button>
        </div>
      )}

      <button className="side-item promo" onClick={() => onNav("setup")}>
        <span className="side-icon blue">
          <IconDiamond size={17} />
        </span>
        ELIAS+
      </button>

      <div className="side-spacer" />

      <button className="side-search" onClick={() => onNav("openings")}>
        <span className="side-icon">
          <IconSearch size={18} />
        </span>
        Search
      </button>
      <div className="side-user">
        <span className="side-user-avatar">
          <IconPawn size={16} />
        </span>
        <span className="side-user-meta">
          <span className="side-user-name">
            {coachName} <span className="side-user-rating">({loadPlayer().rating})</span>
          </span>
          <span className="side-user-sub">{title}</span>
        </span>
      </div>
      <div className="side-icons">
        <button title="Community">
          <IconUsers size={19} />
        </button>
        <button title="Inbox" className="has-dot">
          <IconMail size={19} />
          <span className="badge-dot">1</span>
        </button>
        <button title="Notifications">
          <IconBell size={19} />
        </button>
        <button title="Settings" onClick={() => onNav("setup")}>
          <IconSliders size={19} />
        </button>
      </div>
    </aside>
  )
}
