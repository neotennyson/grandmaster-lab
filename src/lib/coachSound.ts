import type { SoundName } from "./coachBus"
import { loadCoach } from "./coach"

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!loadCoach().sound) return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === "suspended") void ctx.resume()
  return ctx
}

const fileCache = new Map<string, HTMLAudioElement>()

function playFile(src: string, volume = 0.9) {
  if (!loadCoach().sound) return
  try {
    let el = fileCache.get(src)
    if (!el) {
      el = new Audio(src)
      el.preload = "auto"
      fileCache.set(src, el)
    }
    el.volume = volume
    el.currentTime = 0
    void el.play().catch(() => {})
  } catch {
    void 0
  }
}

interface Tone {
  f: number
  t: number
  d: number
  type?: OscillatorType
  g?: number
}

function play(tones: Tone[]) {
  const ac = audio()
  if (!ac) return
  for (const tone of tones) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = tone.type ?? "sine"
    osc.frequency.value = tone.f
    const start = ac.currentTime + tone.t
    const dur = tone.d
    const vol = (tone.g ?? 0.08) / Math.max(1, tones.length * 0.5)
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(vol, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(start)
    osc.stop(start + dur + 0.02)
  }
}

export function playSound(name: SoundName) {
  switch (name) {
    case "click":
      play([{ f: 660, t: 0, d: 0.07, type: "triangle", g: 0.05 }])
      break
    case "praise":
      play([
        { f: 523.25, t: 0, d: 0.09, type: "triangle", g: 0.07 },
        { f: 659.25, t: 0.05, d: 0.1, type: "triangle", g: 0.07 },
      ])
      break
    case "blunder":
      play([
        { f: 196, t: 0, d: 0.16, type: "sawtooth", g: 0.05 },
        { f: 138, t: 0.02, d: 0.3, type: "sine", g: 0.08 },
      ])
      break
    case "levelup":
      play([
        { f: 523.25, t: 0, d: 0.14, g: 0.09 },
        { f: 659.25, t: 0.1, d: 0.14, g: 0.09 },
        { f: 783.99, t: 0.2, d: 0.16, g: 0.09 },
        { f: 1046.5, t: 0.3, d: 0.3, g: 0.1 },
      ])
      break
    case "badge":
      play([
        { f: 830.6, t: 0, d: 0.12, type: "triangle", g: 0.08 },
        { f: 1108.7, t: 0.08, d: 0.24, type: "triangle", g: 0.08 },
      ])
      break
    case "win":
      play([
        { f: 523.25, t: 0, d: 0.12, g: 0.08 },
        { f: 659.25, t: 0.09, d: 0.12, g: 0.08 },
        { f: 830.61, t: 0.18, d: 0.14, g: 0.09 },
        { f: 1046.5, t: 0.28, d: 0.34, g: 0.1 },
        { f: 1318.5, t: 0.34, d: 0.34, type: "triangle", g: 0.07 },
      ])
      break
    case "flag":
      play([
        { f: 220, t: 0, d: 0.2, type: "square", g: 0.04 },
        { f: 110, t: 0.05, d: 0.45, type: "sine", g: 0.07 },
      ])
      break
    case "tick":
      play([{ f: 1100, t: 0, d: 0.035, type: "square", g: 0.02 }])
      break
    case "move":
      playFile("/sounds/Move.mp3", 0.85)
      break
    case "capture":
      playFile("/sounds/Capture.mp3", 1)
      break
    case "check": {
      const ac = audio()
      if (ac) {
        play([
          { f: 880, t: 0, d: 0.09, type: "sine", g: 0.18 },
          { f: 1245, t: 0.1, d: 0.12, type: "sine", g: 0.16 },
        ])
      }
      break
    }
  }
}
