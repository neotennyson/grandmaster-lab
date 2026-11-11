export type BusEvent =
  | { kind: "bubble"; tone: string; text: string }
  | { kind: "xp"; amount: number; reason: string }
  | { kind: "levelup"; level: number; title: string }
  | { kind: "badge"; id: string; name: string; glyph: string; desc: string }
  | { kind: "sound"; name: SoundName }

export type SoundName = "click" | "praise" | "blunder" | "levelup" | "badge" | "win" | "flag" | "tick" | "move" | "capture" | "check"

type Listener = (e: BusEvent) => void

const listeners: Listener[] = []

export function onBus(l: Listener): () => void {
  listeners.push(l)
  return () => {
    const i = listeners.indexOf(l)
    if (i >= 0) listeners.splice(i, 1)
  }
}

export function emit(e: BusEvent) {
  for (const l of [...listeners]) l(e)
}
