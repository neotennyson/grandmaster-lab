# Gambit Academy

A local-first chess training app built to sharpen one player against a maximum-strength engine — play, full game review, openings drilling, and the immortal games, in one dark, fast workspace. No accounts, no server: everything runs in your browser on your own CPU.

![Gambit Academy](docs/screenshot-play.png)

## Features

### Play
- **Stockfish (WASM) at maximum strength** — Skill Level 20, thinking on your clock
- Time controls: Bullet 1+0 · Blitz 3+0, 3+2, 5+0, 5+3 · Rapid 10+0, 10+5, 30+0 · Classical 60+0
- Premoves, capture trays with material advantage (+N), live clocks, rating (Elo) that updates per game
- Coach mode: a grandmaster character reacts to every move you make in real time (light engine probe grades each move), with flow combos, XP and badges
- Wooden move/capture/check sounds (mute toggle)

### Game Review
- Full post-game analysis: **accuracy %, average centipawn loss, and every move classified** — Brilliant, Great, Best, Excellent, Good, Book, Inaccuracy, Mistake, Blunder, Forced
- Eval bar + clickable eval graph with mistake dots
- Best-move arrows, engine lines, per-move coach comments
- **Category table** (per side) and a **guided walkthrough** of each classification — step through every Brilliant, every Blunder, and everything in between
- Auto-opens after each game; the final position stays visible behind the result banner

### Openings Lab
- 145 validated ECO opening lines; drill them with instant book-move validation
- Learn mode shows the expected move; Pro mode rejects slips

### Master Vault
- Five immortal games (Opera Game, Immortal Game, Byrne–Fischer 1956, Fischer–Spassky 1972 Game 6, Kasparov–Topalov 1999) with verified scores
- Step through with keyboard navigation and ask the engine about any position

### Progression
- XP + 11 rank titles (Pawn of the War Room → Grandmaster's Blade → Thorne's Equal)
- 12 badges, Elo rating with peak tracking, cross-game classification history
- Daily puzzle mined from the immortal games

## Stack

- React 19 + TypeScript + Vite
- [chess.js](https://github.com/jhlywa/chess.js) for rules
- [Stockfish](https://github.com/nmrugg/stockfish.js) WASM running in Web Workers (two instances: gameplay + live coach probe)
- Hand-rolled board renderer (drag/click, premove arrows, animations, captured trays)
- Everything persists in `localStorage` — no backend, no telemetry

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## Repository tools

```bash
node scripts/sweep.mjs             # 22 interaction tests in a real browser (Playwright)
node scripts/leak-check.mjs        # memory/storage leak regression over full game cycles
node scripts/validate-openings.mjs # validate all ECO lines parse
node scripts/validate-masters.mjs  # validate master game scores
node tools/render-set.mjs <set>    # swap the piece set from tools/sets/<set>/*.svg
```

The interaction/leak suites need `npx playwright install chromium` once.

## Credits

- **Stockfish** — the engine, via [nmrugg/stockfish.js](https://github.com/nmrugg/stockfish.js) (GPL). Built by the Stockfish developers.
- **Piece sets** — "Staunty" and "Companion" from the [Lichess open-source project](https://github.com/lichess-org/lila/tree/master/public/piece) (lichess.org). Licensed for non-commercial use with attribution; see the license notes in the lila repository.
- **Move/capture sounds** — from the [Lichess sound set](https://github.com/lichess-org/lila/tree/master/public/sound/standard).
- **Coach portrait** — [DiceBear Personas](https://www.dicebear.com/styles/personas/) by Draftbit (CC BY 4.0).
- **Noto Sans** — Google Fonts (OFL).
- **chess.js** — BSD-2-Clause.

## License

GPL-3.0 — required by the bundled Stockfish engine. See [LICENSE](LICENSE).

Not affiliated with chess.com. The dark UI is an original implementation inspired by the layout conventions of modern chess sites.
