interface VoiceManifest {
  cues: Record<string, string[]>
}

const VOICE_EVENT = "gambit:voice-state"
let manifestP: Promise<VoiceManifest | null> | null = null
let audioEl: HTMLAudioElement | null = null

function voiceState(speaking: boolean) {
  try {
    window.dispatchEvent(new CustomEvent<boolean>(VOICE_EVENT, { detail: speaking }))
  } catch {
    void 0
  }
}

function loadManifest(): Promise<VoiceManifest | null> {
  if (!manifestP) {
    manifestP = fetch("/voice/manifest.json")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
  }
  return manifestP
}

export function preloadVoice() {
  void loadManifest()
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

function playFile(path: string) {
  try {
    if (!audioEl) {
      audioEl = new Audio()
      audioEl.addEventListener("play", () => voiceState(true))
      audioEl.addEventListener("ended", () => voiceState(false))
      audioEl.addEventListener("pause", () => voiceState(false))
      audioEl.addEventListener("error", () => voiceState(false))
    }
    audioEl.pause()
    audioEl.currentTime = 0
    audioEl.src = path
    audioEl.volume = 0.92
    void audioEl.play().catch(() => voiceState(false))
  } catch {
    voiceState(false)
  }
}

export function speak(_text: string, key?: string | null) {
  if (!soundOn() || !key) return
  void loadManifest().then((manifest) => {
    const files = manifest?.cues[key]
    if (!files?.length) return
    playFile(files[Math.floor(Math.random() * files.length)])
  })
}

export function stopSpeaking() {
  try {
    audioEl?.pause()
    if (audioEl) audioEl.currentTime = 0
    voiceState(false)
  } catch {
    void 0
  }
}
