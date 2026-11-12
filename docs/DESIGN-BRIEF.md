# DESIGN BRIEF — Grandmaster Lab dashboard rework

Goal: make the Home/dashboard look like a flagship product, not a fan project. The bar: something a top-tier design team (Claude Opus-class design taste) would ship.

## Current state
- `src/views/HomeView.tsx` renders the dashboard: hero play panel, Game Review CTA, Daily Puzzle, right column (Elias card, Openings to Drill, Recent Games, Immortal of the Day), bottom stat tiles (Games Played, Last Accuracy, Primary Leak).
- `src/index.css` is a single stylesheet (~5700+ lines) using the chess.com dark palette: page `#302E2B`, cards `#262522`, controls `#403E3B`, dim text `#B9B7B4`, accent greens (`#81b64c`, `#a9d474`), board `#ebecd0/#739552`.
- Viewport target: desktop-first 1600px, but must not break at 1280–1920.

## What "super f***ing cool" means here
1. **Hierarchy**: one clear hero (resume/continue training), everything else subordinate. Today every panel has equal weight.
2. **Depth**: layered surfaces (subtle gradients, inner borders, soft shadows on hover), not flat boxes with 1px borders everywhere.
3. **Motion**: tasteful — hover lifts, number count-ups for stats, staggered card entrance (CSS only, no new deps).
4. **Data with personality**: the stat tiles should read like a coach's diagnosis, not a spreadsheet — accuracy trend sparkline (inline SVG, no charts lib), primary-leak callout with the worst classification glyph.
5. **The Elias card is the product**: bigger portrait presence, current title/rating as a headline, "today's mission" line pulled from weakest area.

## Constraints (hard)
- React + TS + existing CSS architecture (single index.css, class-based, no Tailwind, no CSS-in-JS, no new npm deps).
- Do not rename/remove classes exercised by `scripts/sweep.mjs` (22 checks) — `.qp-btn`, `.side-item`, `.coach-strip`, etc. must keep existing.
- Keep the chess.com dark palette family and the existing component structure; rework layout + polish, don't rewrite logic.
- Asset credits: portrait is `public/avatar/elias.jpg`, sounds/fonts per CREDITS.md.
- GPL-3.0 repo, no external services.

## Acceptance
- `npm run build` clean, `npx oxlint` 0 errors, `node scripts/sweep.mjs` 22/22.
- Before/after screenshots of the dashboard at 1600px committed to `docs/`.
