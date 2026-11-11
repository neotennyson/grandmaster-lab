import { useEffect, useState } from "react"
import { fmtClock, type TimeControl } from "../lib/types"
import { IconClock } from "./icons"

export function ClockFace({
  clocks,
  side,
  running,
  over,
  tc,
}: {
  clocks: { current: { w: number; b: number; started: boolean } }
  side: "w" | "b"
  running: "w" | "b" | null
  over: boolean
  tc: TimeControl
}) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (running !== side || over) return
    const id = setInterval(() => tick((n) => n + 1), 100)
    return () => clearInterval(id)
  }, [running, side, over])

  const ms = clocks.current[side]
  const active = running === side && !over
  const low = ms < 10_000 && active
  return (
    <div className={`face-clock${active ? " active" : ""}${low ? " low" : ""}`}>
      {active && <IconClock size={16} className="clock-ico" />}
      {fmtClock(ms)}
      <span className="tc-suffix">{tc.inc ? `+${tc.inc}` : ""}</span>
    </div>
  )
}

export function ClockTicker({
  clocks,
  running,
  over,
  onFlag,
}: {
  clocks: { current: { w: number; b: number; started: boolean } }
  running: "w" | "b" | null
  over: boolean
  onFlag: (side: "w" | "b") => void
}) {
  useEffect(() => {
    if (!running || over) return
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      const delta = now - last
      last = now
      clocks.current[running] -= delta
      if (clocks.current[running] <= 0) {
        clocks.current[running] = 0
        onFlag(running)
      }
    }, 90)
    return () => clearInterval(id)
  }, [running, over])
  return null
}
