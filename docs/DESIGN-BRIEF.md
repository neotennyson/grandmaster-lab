# Grandmaster Lab — Product Design System

Grandmaster Lab is a chess training studio: play, review, study openings, and follow master games in one connected workspace. The interface uses familiar chess-product conventions while keeping its own identity, layout details, colors, copy, and artwork.

## Visual direction

- **Palette:** warm charcoal surfaces, familiar chess green actions, quiet gray borders, amber for progress, ivory text.
- **Character:** focused, editorial, premium training room—not an arcade, spreadsheet, or imitation of another platform.
- **Signature details:** compact numbered navigation, the "Your Journey" rating card, Elias's 3D-style portrait with a speaking pulse, and progress cues woven into each activity.
- **Motion:** short entrances, subtle hover lift, clear focus states, and reduced-motion support.

## Product surfaces

- **Dashboard:** one prominent next action, quick time controls, personal coach focus, recent games, daily puzzle, opening drills, and progress summary.
- **Live play:** generous board, player clocks, captured material, move list, contextual controls. Elias can react in text; live narration stays off.
- **Game review:** accuracy and move-class report, eval graph, guided walkthrough, coach voice during the review.
- **Practice:** daily puzzles, opening drills, and master games get contextual coach explanations after each move, with local Kokoro voice enabled for those sessions.
- **Setup:** clear controls for time, color, engine strength, board palette, coach reactions, and review depth.

## Implementation constraints

- React + TypeScript + Vite; existing class-based CSS; no new runtime dependencies.
- Preserve game rules, storage, engine behavior, keyboard navigation, and tested selectors such as `.qp-btn`, `.side-item`, `.cc-navbtn`, `.cc-tab`, `.end-banner`, and `.game-row`.
- Keep responsive behavior usable on 390px phones through desktop widths; no horizontal overflow.
- Use original Grandmaster Lab branding and original/openly licensed assets; do not copy third-party logos, proprietary artwork, or exact page layouts.

## Verification

- `npm run build`
- `node scripts/sweep.mjs` — 22 browser interactions
- `node scripts/leak-check.mjs`
- Screenshots: `docs/dashboard-after.png`, `docs/play-after.png`, `docs/review-after.png`, `docs/openings-after.png`, `docs/vault-after.png`, `docs/reader-after.png`, `docs/setup-after.png`.
