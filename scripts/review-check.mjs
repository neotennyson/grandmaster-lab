import { chromium } from "playwright"

const browser = await chromium.launch()
const page = await browser.newPage()
const errors = []
page.on("pageerror", (error) => errors.push(String(error)))

await page.goto("http://localhost:5173", { waitUntil: "networkidle" })
const checks = await page.evaluate(async () => {
  const { describeThreat, isMoveSacrifice, sortByWinChanceDrop } = await import("/src/lib/analysis.ts")
  const sacrificeFen = "4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1"
  const safeFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  const mateFen = "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq g3 0 2"
  const ranked = sortByWinChanceDrop([
    { id: "small", wpBefore: 70, wpAfter: 60 },
    { id: "large", wpBefore: 80, wpAfter: 20 },
  ])
  return {
    recognizesSoundPieceSacrifice: isMoveSacrifice(sacrificeFen, { from: "f3", to: "d4" }),
    rejectsQuietDevelopmentAsSacrifice: !isMoveSacrifice(safeFen, { from: "g1", to: "f3" }),
    ranksLargestWinChanceLossFirst: ranked[0]?.id === "large",
    identifiesImmediateMate: describeThreat(mateFen)?.includes("Qh4#") ?? false,
    avoidsInventingThreatInStartPosition: describeThreat(safeFen) === null,
  }
})

await browser.close()

for (const [name, passed] of Object.entries(checks)) {
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}`)
}
if (errors.length) console.error(errors.join("\n"))
if (Object.values(checks).some((passed) => !passed) || errors.length) process.exit(1)
