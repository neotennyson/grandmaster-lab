import { chromium } from "playwright"

const results = []
const note = (ok, label, detail = "") => {
  results.push(ok)
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  ·  " + detail : ""}`)
}

const run = async () => {
  const browser = await chromium.launch({ args: ["--enable-precise-memory-info"] })
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  const errors = []
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message))
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text())
  })

  await page.goto("http://localhost:5173", { waitUntil: "networkidle" })
  await page.waitForTimeout(800)

  const heap = () => page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1))

  const boardBox = async () => page.locator(".board").first().boundingBox()
  const sqCenter = async (sq) => {
    const b = await boardBox()
    const cell = b.width / 8
    return {
      x: b.x + (sq.charCodeAt(0) - 97 + 0.5) * cell,
      y: b.y + (8 - Number(sq[1]) + 0.5) * cell,
    }
  }
  const drag = async (from, to) => {
    const a = await sqCenter(from)
    const z = await sqCenter(to)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    for (let i = 1; i <= 5; i++) {
      await page.mouse.move(a.x + ((z.x - a.x) * i) / 5, a.y + ((z.y - a.y) * i) / 5)
      await page.waitForTimeout(12)
    }
    await page.mouse.up()
    await page.waitForTimeout(500)
  }

  const heaps = [await heap()]

  async function cycle(n) {
    await page.locator(".qp-btn", { hasText: "3 min" }).first().click()
    await page.waitForSelector(".board", { timeout: 8000 })
    await page.waitForTimeout(1600)
    await drag("e2", "e4")
    await page.waitForTimeout(1500)
    await page.locator(".cc-textbtn", { hasText: "Resign" }).click()
    await page.waitForSelector(".end-banner", { timeout: 5000 })
    await page.locator(".end-card button", { hasText: "Game Review" }).click()
    await page.waitForSelector(".review-view", { timeout: 8000 })
    await page.waitForFunction(() => !document.querySelector(".prog-bar"), { timeout: 90000 })
    await page.locator(".review-head button", { hasText: "Archive" }).click()
    await page.waitForSelector(".play-panel", { timeout: 8000 })
    await page.waitForTimeout(600)
    const h = await heap()
    heaps.push(h)
    console.log(`cycle ${n}: heap ${h} MB`)
  }

  for (let i = 1; i <= 3; i++) await cycle(i)

  const growth = heaps[heaps.length - 1] - heaps[1]
  note(growth < 45, "heap stable across 3 play→review cycles", `start ${heaps[1]}MB → end ${heaps[heaps.length - 1]}MB (Δ${growth}MB)`)

  const storage = await page.evaluate(() => {
    let bytes = 0
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      bytes += k.length + (localStorage.getItem(k)?.length ?? 0)
    }
    return { keys: localStorage.length, kb: Math.round(bytes / 1024) }
  })
  note(storage.kb < 512, "localStorage bounded", `${storage.keys} keys · ${storage.kb} KB`)

  // drag fuzz: 24 random drags must never throw or corrupt committed moves
  await page.locator(".qp-btn", { hasText: "1 min" }).first().click()
  await page.waitForSelector(".board", { timeout: 8000 })
  await page.waitForTimeout(1500)
  const before = await page.evaluate(() => document.querySelectorAll(".mvcell").length)
  const sqs = "abcdefgh"
  for (let i = 0; i < 24; i++) {
    const f1 = sqs[i % 8]
    const r1 = String(1 + ((i * 3) % 8))
    const f2 = sqs[(i * 5 + 3) % 8]
    const r2 = String(1 + ((i * 7 + 2) % 8))
    await drag(f1 + r1, f2 + r2)
  }
  const after = await page.evaluate(() => document.querySelectorAll(".mvcell").length)
  note(after >= before && after <= before + 2, "drag fuzz keeps state consistent", `cells ${before} → ${after}`)
  await page.waitForTimeout(500)

  // rapid view switching
  for (let i = 0; i < 3; i++) {
    await page.locator(".side-item", { hasText: "Openings Lab" }).click()
    await page.waitForSelector(".open-grid .board", { timeout: 6000 })
    await page.locator(".side-item", { hasText: "Master Vault" }).click()
    await page.waitForSelector(".master-card", { timeout: 6000 })
    await page.locator(".side-item", { hasText: "Play" }).click()
    await page.waitForSelector(".play-panel", { timeout: 6000 })
  }
  note(true, "rapid view switching survives")
  const heapEnd = await heap()
  note(true, "final heap", `${heapEnd} MB`)

  note(errors.length === 0, "no console/page errors", errors.slice(0, 5).join(" | ") || "clean")

  await browser.close()
  const fails = results.filter((r) => !r).length
  console.log(`\n=== ${results.length - fails}/${results.length} checks passed ===`)
  process.exit(fails ? 1 : 0)
}
run()
