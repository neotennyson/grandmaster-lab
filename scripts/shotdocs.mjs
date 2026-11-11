import { chromium } from "playwright"
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 })
await p.goto("http://localhost:5173", { waitUntil: "networkidle" })
await p.waitForTimeout(700)
await p.screenshot({ path: "docs/screenshot-home.png" })
await p.locator(".qp-btn", { hasText: "10 min" }).first().click()
await p.waitForSelector(".board", { timeout: 6000 })
await p.waitForTimeout(2000)
const bd = await p.locator(".board").first().boundingBox()
const cell = bd.width / 8
const c = (sq) => ({ x: bd.x + (sq.charCodeAt(0) - 97 + 0.5) * cell, y: bd.y + (8 - Number(sq[1]) + 0.5) * cell })
async function drag(f, t) {
  const a = c(f), z = c(t)
  await p.mouse.move(a.x, a.y); await p.mouse.down()
  for (let i = 1; i <= 6; i++) { await p.mouse.move(a.x + ((z.x - a.x) * i) / 6, a.y + ((z.y - a.y) * i) / 6); await p.waitForTimeout(13) }
  await p.mouse.up(); await p.waitForTimeout(1400)
}
await drag("e2", "e4")
await p.waitForTimeout(3000)
await drag("g1", "f3")
await p.waitForTimeout(3200)
await p.screenshot({ path: "docs/screenshot-play.png" })
await b.close()
console.log("docs screenshots done")
