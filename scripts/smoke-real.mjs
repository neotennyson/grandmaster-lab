import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { reviewGame } from "../src/lib/analysis.ts"
import { MASTER_GAMES } from "../src/lib/masters.ts"

process.on("unhandledRejection", (e) => {
  console.error("UNHANDLED", e)
})

const ENGINE_PATH = fileURLToPath(new URL("../node_modules/stockfish/src/stockfish.js", import.meta.url))

const INFO_RE = /info depth (\d+) .*?multipv (\d+) .*?score (cp|mate) (-?\d+)/
const UCI_MOVE_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/
let infoLineCache = null

function parseInfo(line) {
  if (!line.startsWith("info") || !INFO_RE.test(line)) return null
  const m = line.match(INFO_RE)
  const pvIdx = line.indexOf(" pv ")
  return {
    multipv: Number(m[2]),
    depth: Number(m[1]),
    score: { type: m[3], value: Number(m[4]) },
    pv: pvIdx >= 0
      ? line.slice(pvIdx + 4).trim().split(/\s+/).filter((t) => UCI_MOVE_RE.test(t))
      : [],
  }
}

class NodeEngine {
  proc
  buffer = []
  waiters = []
  booted = false
  mpv = 1
  skill = 20

  constructor() {
    this.proc = spawn("node", [ENGINE_PATH], { stdio: ["pipe", "pipe", "pipe"] })
    this.proc.on("error", (e) => console.error("engine spawn error", e))
    this.proc.stdout.setEncoding("utf8")
    this.lines = new Map()
    this.proc.stdout.on("data", (chunk) => {
      for (const line of chunk.split("\n")) {
        const l = line.trim()
        if (!l) continue
        const info = parseInfo(l)
        if (info && info.pv.length) this.lines.set(info.multipv, info)
        const resolved = []
        this.waiters = this.waiters.filter((w) => {
          if (w(l)) {
            resolved.push(w)
            return false
          }
          return true
        })
        resolved.forEach((w) => w.res(l))
      }
    })
    this.proc.stderr.on("data", () => {})
  }

  send(cmd) {
    this.proc.stdin.write(cmd + "\n")
  }

  once(pred) {
    return new Promise((resolve) => {
      this.waiters.push(Object.assign(pred, { res: resolve }))
    })
  }

  async boot() {
    this.send("uci")
    await this.once((l) => l.includes("uciok"))
    this.send("isready")
    await this.once((l) => l.includes("readyok"))
    this.booted = true
  }

  setOption(name, value) {
    this.send(`setoption name ${name} value ${value}`)
  }

  async go({ fen, movetime = 300, multipv = 1, skill }) {
    if (skill !== undefined && skill !== this.skill) {
      this.setOption("Skill Level", skill)
      this.skill = skill
    }
    if (multipv !== this.mpv) {
      this.setOption("MultiPV", multipv)
      this.mpv = multipv
    }
    this.send(`position fen ${fen}`)
    this.send(`go movetime ${movetime}`)
    const lines = this.lines
    lines.clear()
    while (true) {
      const l = await this.once((line) => line.startsWith("bestmove"))
      const best = l.match(/^bestmove (\S+)/)
      if (best) {
        return { bestmove: best[1], ponder: null, lines: [...lines.values()].sort((a, b) => a.multipv - b.multipv) }
      }
      void 0
    }
  }

  waitForRes(w, l) {
    w(l)
  }

  destroy() {
    this.send("quit")
    this.proc.kill()
  }
}

const engine = new NodeEngine()
await engine.boot()
const g = MASTER_GAMES.find((m) => m.id === "kasparov-immortal")

const report = await reviewGame({
  pgn: g.pgn,
  engine,
  movetime: 320,
  onProgress: (d, t) => {
    if (d % 17 === 0) console.log(`  progress ${d}/${t}`)
  },
})

console.log("opening:", report.opening)
console.log("accW:", report.accW, "accB:", report.accB, "avg loss W:", report.lossW, "B:", report.lossB)
const notable = report.plies.filter((p) => ["brilliant", "great", "blunder", "mistake"].includes(p.cls)).slice(0, 8)
for (const p of notable) {
  console.log(`${p.cls.toUpperCase().padEnd(9)} move${String(Math.ceil(p.ply / 2)).padStart(3)} ${p.color === "w" ? "W" : "B"}: ${p.san.padEnd(7)} loss=${String(p.lossCP).padStart(5)}cc :: ${p.comment}`)
}
const bestCmp = report.plies.filter((p) => p.playedIsBest).length
console.log(`moves matching engine top choice so far: ${bestCmp}/${report.plies.length}`)
const key = report.plies.find((p) => p.ply === 48)
if (key) console.log("move 24 Rxd4 (the famous rook sac) classification:", key.cls, "| loss:", key.lossCP, "cc")
engine.destroy()
console.log("E2E REVIEW OK")
