import { useEffect, useRef, useState } from "react"
import { levelProgress } from "../lib/coach"
import { onBus, type BusEvent } from "../lib/coachBus"
import { playSound } from "../lib/coachSound"
import { stopSpeaking } from "../lib/voice"

export function CoachAvatar({ size = 46 }: { size?: number }) {
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    const onVoiceState = (event: Event) => setSpeaking((event as CustomEvent<boolean>).detail)
    window.addEventListener("gambit:voice-state", onVoiceState)
    return () => window.removeEventListener("gambit:voice-state", onVoiceState)
  }, [])

  return (
    <span
      className={`elias-avatar${speaking ? " is-speaking" : ""}`}
      style={{ width: size, height: size }}
      aria-label={speaking ? "Elias Thorne speaking" : "Elias Thorne"}
      data-speaking={speaking}
    >
      <img src="/avatar/elias.jpg" alt="" draggable={false} />
    </span>
  )
}

export interface FlowMeterProps {
  combo: number
}

export function FlowMeter({ combo }: FlowMeterProps) {
  const pct = Math.min(100, combo * 10)
  return (
    <div className="flow-wrap" title="Flow: consecutive engine-grade moves">
      <span className="flow-label">FLOW</span>
      <div className="flow-track">
        <div className="flow-fill" style={{ width: `${pct}%` }} data-hot={combo >= 5 ? "y" : "n"} />
      </div>
      <span className="flow-combo">{combo}</span>
    </div>
  )
}

export function CoachBubble({ tone, text, compact }: { tone: string; text: string; compact?: boolean }) {
  return (
    <div className={`coach-bubble tone-${tone}${compact ? " compact" : ""}`} key={text}>
      <span className="bubble-tail" />
      {text.split("•").map((part, i) => (
        <p key={i} className="coach-line">
          {part}
        </p>
      ))}
    </div>
  )
}

export function XpHud({ xp }: { xp: number }) {
  const p = levelProgress(xp)
  return (
    <div className="xp-hud">
      <div className="xp-title">{p.title}</div>
      <div className="xp-track">
        <div className="xp-fill" style={{ width: `${p.pct}%` }} />
      </div>
      <div className="xp-num">
        {xp} XP · next {p.need}
      </div>
    </div>
  )
}

interface Toast {
  id: number
  title: string
  sub: string
  glyph: string
  kind: "badge" | "level" | "xp"
}

let toastSeq = 1

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<number[]>([])
  useEffect(() => {
    const off = onBus((e: BusEvent) => {
      if (e.kind === "badge" || e.kind === "levelup") {
        const t: Toast =
          e.kind === "badge"
            ? { id: toastSeq++, title: `BADGE · ${e.name}`, sub: e.desc, glyph: e.glyph, kind: "badge" }
            : { id: toastSeq++, title: `LEVEL ${e.level}`, sub: e.title, glyph: "✦", kind: "level" }
        setToasts((ts) => [...ts, t])
        const timer = window.setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== t.id)), 5200)
        timers.current.push(timer)
      }
    })
    return () => {
      off()
      timers.current.forEach((t) => clearTimeout(t))
    }
  }, [])
  return (
    <div className="toast-host">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <span className="toast-glyph">{t.glyph}</span>
          <div>
            <div className="toast-title">{t.title}</div>
            <div className="toast-sub">{t.sub}</div>
          </div>
        </div>
      ))}
      <SoundSwitch />
    </div>
  )
}

function SoundSwitch() {
  const [on, setOn] = useState(() => {
    try {
      return loadSoundPref()
    } catch {
      return true
    }
  })
  return (
    <button
      className={`sound-switch${on ? " on" : ""}`}
      title={on ? "Coach sound: on" : "Coach sound: muted"}
      onClick={() => {
        setOn(!on)
        persistSoundPref(!on)
        if (on) stopSpeaking()
        else playSound("praise")
      }}
    >
      {on ? "♪" : "✕"}
    </button>
  )
}

export function soundPref(): boolean {
  return loadSoundPref()
}

function loadSoundPref(): boolean {
  try {
    const raw = localStorage.getItem("gambit.coach.v1")
    if (raw) {
      const p = JSON.parse(raw)
      return p.sound !== false
    }
  } catch {
    return true
  }
  return true
}

function persistSoundPref(on: boolean) {
  try {
    const raw = localStorage.getItem("gambit.coach.v1")
    const profile = raw ? JSON.parse(raw) : {}
    profile.sound = on
    profile.lastTs = Date.now()
    localStorage.setItem("gambit.coach.v1", JSON.stringify(profile))
  } catch {
    void 0
  }
}
