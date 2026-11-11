import { Chess } from "chess.js"
import { OPENINGS } from "../src/lib/openings.ts"

let bad = 0
for (const e of OPENINGS) {
  try {
    const c = new Chess()
    for (const san of e.moves.split(" ")) {
      c.move(san)
    }
  } catch (err) {
    bad++
    console.log(`INVALID [${e.eco}] ${e.name}: ${e.moves} -> ${err.message ?? err}`)
  }
}
console.log(`openings checked: ${OPENINGS.length}, invalid: ${bad}`)
