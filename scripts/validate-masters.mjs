import { Chess } from "chess.js"
import { MASTER_GAMES } from "../src/lib/masters.ts"

let bad = 0
for (const g of MASTER_GAMES) {
  try {
    const c = new Chess()
    c.loadPgn(g.pgn, { strict: false })
    const hist = c.history()
    if (!hist.length) throw new Error("no moves parsed")
    console.log(`OK ${g.id}: ${hist.length} moves, last ${hist[hist.length - 1]}`)
  } catch (err) {
    bad++
    console.log(`FAIL ${g.id}: ${err.message ?? err}`)
  }
}
console.log(`master games checked: ${MASTER_GAMES.length}, invalid: ${bad}`)
