export type EngineScore = { type: "cp" | "mate"; value: number }

export interface EngineLine {
  multipv: number
  score: EngineScore
  pv: string[]
  depth: number
}

export interface EngineResult {
  bestmove: string
  ponder: string | null
  lines: EngineLine[]
}

export interface GoRequest {
  fen?: string
  moves?: string[]
  movetime?: number
  depth?: number
  multipv?: number
  skill?: number
}

const INFO_RE = /info depth (\d+) .*?multipv (\d+) .*?score (cp|mate) (-?\d+)/
const BEST_RE = /^bestmove (\S+)(?: ponder (\S+))?/
const UCI_MOVE_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/

function cleanPv(tokens: string[]): string[] {
  return tokens.filter((t) => UCI_MOVE_RE.test(t))
}

export class Engine {
  private worker: Worker | null = null
  private lines = new Map<number, EngineLine>()
  private pending: ((r: EngineResult) => void) | null = null
  private bootResolve: (() => void) | null = null
  private lastMpv = 1

  get booted() {
    return !!this.worker
  }

  async boot(): Promise<void> {
    if (this.worker) return
    this.worker = new Worker("/engine/stockfish.js")
    this.worker.onmessage = (e: MessageEvent) => {
      const line: string = typeof e.data === "string" ? e.data : String(e.data?.line ?? "")
      if (line.startsWith("info") && INFO_RE.test(line)) {
        const m = line.match(INFO_RE)!
        const pvIdx = line.indexOf(" pv ")
        const depth = Number(m[1])
        const multipv = Number(m[2])
        const entry: EngineLine = {
          multipv,
          depth,
          score: { type: m[3] as "cp" | "mate", value: Number(m[4]) },
          pv: pvIdx >= 0 ? cleanPv(line.slice(pvIdx + 4).trim().split(/\s+/)) : [],
        }
        if (entry.pv.length) this.lines.set(multipv, entry)
      } else if (line.startsWith("bestmove")) {
        const m = line.match(BEST_RE)!
        const res: EngineResult = {
          bestmove: m[1],
          ponder: m[2] ?? null,
          lines: [...this.lines.values()].sort((a, b) => a.multipv - b.multipv),
        }
        this.lines.clear()
        const resolve = this.pending
        this.pending = null
        resolve?.(res)
      } else if (line.includes("uciok")) {
        if (this.bootResolve) {
          this.send("isready")
        }
      } else if (line.includes("readyok")) {
        this.bootResolve?.()
        this.bootResolve = null
      }
    }
    this.send("uci")
    await new Promise<void>((res) => (this.bootResolve = res))
  }

  send(cmd: string) {
    this.worker?.postMessage(cmd)
  }

  setOption(name: string, value: string | number) {
    this.send(`setoption name ${name} value ${value}`)
  }

  newGame() {
    this.send("ucinewgame")
    this.send("isready")
  }

  position(fen?: string, moves: string[] = []) {
    const head = fen ? `position fen ${fen}` : "position startpos"
    this.send(`${head}${moves.length ? ` moves ${moves.join(" ")}` : ""}`)
  }

  async go(req: GoRequest): Promise<EngineResult> {
    if (this.pending) {
      await new Promise<void>((res) => {
        const wait = setInterval(() => {
          if (!this.pending) {
            clearInterval(wait)
            res()
          }
        }, 50)
      })
    }
    await this.boot()
    this.lines.clear()
    const { fen, moves = [], movetime = 1000, depth, multipv = 1, skill } = req
    if (skill !== undefined) this.setOption("Skill Level", skill)
    if (multipv !== 1) this.setOption("MultiPV", multipv)
    else if (this.lastMpv !== 1) this.setOption("MultiPV", 1)
    this.lastMpv = multipv
    this.position(fen, moves)
    const cmd = depth ? `go depth ${depth}` : `go movetime ${movetime}`
    return new Promise<EngineResult>((resolve) => {
      this.pending = resolve
      this.send(cmd)
    })
  }

  async stop() {
    this.send("stop")
    await new Promise<void>((res) => {
      const wait = setInterval(() => {
        if (!this.pending) {
          clearInterval(wait)
          res()
        }
      }, 30)
    })
  }

  destroy() {
    this.send("quit")
    this.worker?.terminate()
    this.worker = null
    this.pending = null
  }
}

export function scoreToWhiteCp(score: EngineScore, stm: "w" | "b"): number {
  let cp: number
  if (score.type === "mate") cp = Math.sign(score.value || 1) * (10000 - Math.abs(score.value) * 100)
  else cp = score.value
  return stm === "w" ? cp : -cp
}
