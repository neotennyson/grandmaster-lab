import { Chess } from "chess.js"

function t(name, fn) {
  try {
    const res = fn()
    console.log(`${name}:`, res === undefined ? "(no throw)" : res)
  } catch (e) {
    console.log(`${name}: THROWS [${String(e?.message ?? e).slice(0, 60)}]`)
  }
}

const c = new Chess()

t("e2->e5 (pawn 3 forward)", () => JSON.stringify(c.move({ from: "e2", to: "e5" })))
c.undo()
t("a2->g4 (pawn diagonal)", () => JSON.stringify(c.move({ from: "a2", to: "g4" })))
c.undo()
t("e2->e4->capturing own? d1->e2 queen onto own pawn", () => JSON.stringify(c.move({ from: "d1", to: "e2" })))
c.undo()
t("b1->b5 knight random", () => JSON.stringify(c.move({ from: "b1", to: "b5" })))
c.undo()
t("same square e4->e4", () => JSON.stringify(c.move({ from: "e2", to: "e2" })))
c.undo()
t("knight g1 capture own e2? g1->e2", () => JSON.stringify(c.move({ from: "g1", to: "e2" })))
c.undo()
t("SAN sloppy: 'Ke2'", () => JSON.stringify(c.move("Ke2")))
c.undo()
t("strict flag absent but object w/ from+to mismatched case 'E2'", () => JSON.stringify(c.move({ from: "E2", to: "E4" })))
c.undo()

const c2 = new Chess("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1")
t("black e7e5 after 1.e4", () => JSON.stringify(c2.move({ from: "e7", to: "e5" })))
c2.undo()
t("black LOTS e2e4 again (white piece move on black turn)", () => JSON.stringify(c2.move({ from: "e2", to: "e4" })))
c2.undo()

const c3 = new Chess()
const before = c3.fen()
t("move then undo check", () => {
  c3.move({ from: "e2", to: "e4" })
  return c3.fen() !== before
})
