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

function soundOn(): boolean {
  try {
    const raw = localStorage.getItem("gambit.coach.v1")
    if (raw) return JSON.parse(raw).sound !== false
  } catch {
    void 0
  }
  return true
}

function clean(text: string): string {
  return text
    .replace(/•/g, ". ")
    .replace(/[^\p{L}\p{N}\s.,!?'’\-:;()%+]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600)
}

export function speak(text: string) {
  try {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null
    const line = clean(text)
    if (!synth || !line || !soundOn()) return
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

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel()
  } catch {
    void 0
  }
}
