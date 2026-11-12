interface VoiceManifest {
  exact: Record<string, string[]>
  cues: Record<string, string[]>
}

let manifestP: Promise<VoiceManifest | null> | null = null

function loadManifest(): Promise<VoiceManifest | null> {
  if (!manifestP) {
    manifestP = fetch("/voice/manifest.json")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
  }
  return manifestP
}

function norm(text: string): string {
  return text
    .replace(/•/g, " ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.,!?'’\-:;()%+]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

let audioEl: HTMLAudioElement | null = null

function playFile(path: string) {
  try {
    if (!audioEl) audioEl = new Audio()
    audioEl.pause()
    audioEl.src = path
    audioEl.volume = 0.92
    void audioEl.play().catch(() => void 0)
  } catch {
    void 0
  }
}

function soundOn(): boolean {
  try {
    const raw = localStorage.getItem("gambit.coach.v1")
    if (raw) return JSON.parse(raw).sound !== false
  } catch {
    void 0
  }
  return true
}

let picked: SpeechSynthesisVoice | null = null

function pickVoice(): SpeechSynthesisVoice | null {
  if (picked) return picked
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null
  if (!synth) return null
  const all = synth.getVoices()
  if (!all.length) return null
  const en = all.filter((v) => v.lang.toLowerCase().startsWith("en"))
  const pool = en.length ? en : all
  picked =
    pool.find((v) => /daniel/i.test(v.name)) ||
    pool.find((v) => /google uk english male/i.test(v.name)) ||
    pool.find((v) => /arthur|oliver|george|ryan|rishi/i.test(v.name)) ||
    pool.find((v) => v.lang.toLowerCase() === "en-gb") ||
    pool[0] ||
    null
  return picked
}

try {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.addEventListener?.("voiceschanged", () => {
      picked = null
    })
  }
} catch {
  void 0
}

function clean(text: string): string {
  return text
    .replace(/•/g, ". ")
    .replace(/[^\p{L}\p{N}\s.,!?'’\-:;()%+]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600)
}

function ttsSpeak(text: string) {
  try {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null
    const line = clean(text)
    if (!synth || !line) return
    synth.cancel()
    const u = new SpeechSynthesisUtterance(line)
    const v = pickVoice()
    if (v) u.voice = v
    u.rate = 1.02
    u.pitch = 0.85
    u.volume = 0.92
    synth.speak(u)
  } catch {
    void 0
  }
}

export function speak(text: string, key?: string | null) {
  if (!soundOn()) return
  const line = text.trim()
  if (!line) return
  void loadManifest().then((m) => {
    if (m) {
      const files = (key && m.cues[key]) || m.exact[norm(line)]
      if (files && files.length) {
        playFile(files[Math.floor(Math.random() * files.length)])
        return
      }
    }
    ttsSpeak(line)
  })
}

export function stopSpeaking() {
  try {
    if (audioEl) {
      audioEl.pause()
      audioEl.currentTime = 0
    }
    window.speechSynthesis?.cancel()
  } catch {
    void 0
  }
}
