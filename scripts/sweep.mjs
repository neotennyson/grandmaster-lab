import { chromium } from "playwright"

const BASE = "http://localhost:5173"
const errors = []
const results = []
const note = (ok, label, detail = "") => {
  results.push({ ok, label, detail })
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  ·  " + detail : ""}`)
}

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message))
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text())
  })

  await page.goto(BASE, { waitUntil: "networkidle" })

  const boardBox = async () => page.locator(".board").first().boundingBox()
  const center = async (fileRank) => {
    const b = await boardBox()
    const cell = b.width / 8
    return {
      x: b.x + (fileRank.charCodeAt(0) - 97 + 0.5) * cell,
      y: b.y + (8 - Number(fileRank[1]) + 0.5) * cell,
    }
  }
  const clickSq = async (sq) => {
    const p = await center(sq)
    await page.mouse.click(p.x, p.y)
    await page.waitForTimeout(280)
  }
  const dragSq = async (from, to, hold = 6) => {
    const a = await center(from)
    const b = await center(to)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    for (let i = 1; i <= hold; i++) {
      await page.mouse.move(a.x + ((b.x - a.x) * i) / hold, a.y + ((b.y - a.y) * i) / hold)
      await page.waitForTimeout(14)
    }
    await page.mouse.up()
    await page.waitForTimeout(600)
  }

  const lastMoves = async () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll(".mvcell"))
        .map((x) => x.textContent.trim())
        .filter(Boolean)
        .join(","),
    )
  const faceSub = async (which) =>
    page.evaluate((w) => document.querySelector(`.face.${w} .face-sub`)?.textContent ?? "", which)

  // ---------- start a 3+0 game from quick pairing ----------
  await page.locator(".qp-btn", { hasText: "3 min" }).first().click()
  await page.waitForSelector(".board", { timeout: 6000 })
  await page.waitForTimeout(2200)
  note((await page.locator(".face-clock").first().textContent()).includes("3:00"), "clock initializes to 3:00")
  note((await page.locator(".cc-tab").count()) === 2 && (await page.locator(".cc-tab", { hasText: "Chat" }).count()) === 0, "Moves/Info tabs (chat removed during play)")
  note((await page.locator(".cc-navbtn").count()) === 5, "history nav buttons present")

  // ---------- click-click move ----------
  await clickSq("e2")
  const selShown = await page.locator(".sq.sel").count()
  note(selShown === 1, "click selects piece")
  await clickSq("e4")
  await page.waitForTimeout(800)
  let moves = await lastMoves()
  note(moves.startsWith("e4"), "click-click move commits", moves)

  // ---------- enemy piece is not draggable ----------
  await page.waitForTimeout(3400)
  await dragSq("e7", "e5")
  const movesAfterEnemy = await lastMoves()
  note(
    movesAfterEnemy.split(",").filter(Boolean).length === 2,
    "enemy drag does nothing (no extra move)",
    movesAfterEnemy,
  )

  // ---------- illegal drop shakes & rejects ----------
  await dragSq("d2", "d6")
  const movesAfterIllegal = await lastMoves()
  note(
    movesAfterIllegal.split(",").filter(Boolean).length === 2,
    "illegal drop rejected",
    movesAfterIllegal,
  )
  await page.waitForTimeout(500)

  // ---------- premove arms while engine thinks, then releases ----------
  await page.waitForTimeout(500)
  await dragSq("g1", "f3", 4)
  const premoveChip = await page.locator(".premove-chip").count()
  note(premoveChip === 1 || (await lastMoves()).includes("Nf3"), "premove arms or commits during engine turn")
  await page.waitForTimeout(4200)
  const movesAfterPremove = await lastMoves()
  const premoveGone = await page.locator(".premove-chip").count()
  note(
    premoveGone === 0 && movesAfterPremove.includes("Nf3"),
    "premove releases after engine move",
    movesAfterPremove,
  )

  // ---------- chess.com control set only (no takeback/eraser/wisdom) ----------
  await page.waitForTimeout(3600)
  const controls = await page.evaluate(() => {
    const texts = Array.from(document.querySelectorAll(".play-view button")).map((b) => b.textContent ?? "")
    return {
      eraser: texts.some((t) => /eraser/i.test(t)),
      wisdom: texts.some((t) => /wisdom/i.test(t)),
      takeback: texts.some((t) => /takeback/i.test(t)),
      draw: texts.some((t) => /draw/i.test(t)),
      resign: texts.some((t) => /resign/i.test(t)),
      newGame: texts.some((t) => /new game/i.test(t)),
      flip: !!document.querySelector('.play-view [title="Flip board"]'),
    }
  })
  note(
    !controls.eraser && !controls.wisdom && !controls.takeback && controls.draw && controls.resign && controls.newGame && controls.flip,
    "chess.com control set only",
    JSON.stringify(controls),
  )
  const movesBeforeResign = (await lastMoves()).split(",").filter(Boolean).length
  note(movesBeforeResign >= 4, "game flow intact after trimming", `${movesBeforeResign} moves`)

  // ---------- resign -> overlay -> game review ----------
  await page.locator("button", { hasText: "Resign" }).click()
  await page.waitForSelector(".end-banner", { timeout: 4000 })
  note(true, "resign shows end overlay")
  await page.locator(".end-card button", { hasText: "Game Review" }).click()
  await page.waitForSelector(".review-view", { timeout: 8000 })
  note(true, "review screen opens")

  await page.waitForSelector(".acc-big", { timeout: 60000 })
  await page
    .waitForFunction(() => !!document.querySelector(".toast, .ply-label") && !document.querySelector(".prog-bar"), { timeout: 120000 })
    .catch(() => {})
  await page.waitForFunction(() => !document.querySelector(".prog-bar"), { timeout: 120000 })
  const accText = await page.locator(".acc-big").first().textContent()
  note(/\d/.test(accText ?? ""), "accuracy computed", accText ?? "")
  const badges = await page.locator(".review-moves .badge").count()
  note(badges > 0, "move badges rendered", `${badges} badges`)
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("ArrowRight")
  const plyLabel = await page.locator(".ply-label").textContent()
  note(/2\//.test(plyLabel ?? "") || /[1-9]\//.test(plyLabel ?? ""), "keyboard navigation moves ply", plyLabel ?? "")
  await page.screenshot({ path: "/tmp/sweep-review.png" })

  // ---------- archive & delete ----------
  await page.locator(".review-head button", { hasText: "Archive" }).click()
  await page.waitForTimeout(600)
  const rowsBefore = await page.locator(".game-row").count()
  note(rowsBefore >= 1, "game archived on home", `${rowsBefore} rows`)
  await page.locator(".game-row .gr-actions button", { hasText: "✕" }).first().click()
  await page.waitForTimeout(500)
  const rowsAfter = await page.locator(".game-row").count()
  note(rowsAfter === rowsBefore - 1, "delete removes archived game", `${rowsBefore} -> ${rowsAfter}`)

  // ---------- openings lab ----------
  await page.locator(".side-item", { hasText: "Openings Lab" }).click()
  await page.waitForSelector(".open-grid .board", { timeout: 5000 })
  const stepBefore = await page.locator(".step.played").count()
  await dragSq("e2", "e4")
  await page.waitForTimeout(600)
  const stepAfter = await page.locator(".step.played").count()
  note(stepAfter > stepBefore || (await page.locator(".open-flash.ok").count()) > 0, "openings drill accepts book move", `${stepBefore} -> ${stepAfter}`)
  await page.screenshot({ path: "/tmp/sweep-openings.png" })

  // ---------- master vault ----------
  await page.locator(".side-item", { hasText: "Master Vault" }).click()
  await page.waitForSelector(".master-card", { timeout: 5000 })
  await page.locator(".master-card").first().click()
  await page.waitForSelector(".reader-grid .board", { timeout: 5000 })
  await page.keyboard.press("End")
  await page.waitForTimeout(600)
  const endActive = await page.locator(".ml-btn.active").count()
  note(endActive === 1, "vault End key jumps to final move")
  await page.keyboard.press("Home")
  await page.waitForTimeout(300)
  await page.screenshot({ path: "/tmp/sweep-vault.png" })
  note(true, "vault reader renders")

  // ---------- sound toggle ----------
  const snd = page.locator(".sound-switch")
  if (await snd.count()) {
    await snd.click()
    await snd.click()
    note(true, "sound toggle clicks without crash")
  }

  await browser.close()

  const failures = results.filter((r) => !r.ok)
  console.log("\n=== SUMMARY ===")
  console.log(`${results.length - failures.length}/${results.length} passed`)
  if (errors.length) {
    console.log("ERRORS:")
    errors.slice(0, 10).forEach((e) => console.log(" ", e))
  } else {
    console.log("no console/page errors")
  }
  process.exit(failures.length ? 1 : 0)
}

run()
