# Asset Credits & Licenses

Code in this repository is GPL-3.0 (see [LICENSE](LICENSE)). The bundled third-party assets carry their own licenses:

## Chess pieces

- Sets used: **"Staunty"** (fallback/regeneration source) and **"Companion"** (active set)
- Source: [lichess-org/lila — public/piece](https://github.com/lichess-org/lila/tree/master/public/piece), the open-source Lichess project (lichess.org)
- License: non-commercial use with attribution, per the license notes published in the lila repository for these sets. This project is a personal, non-commercial training tool.

## Sounds

- **Move.mp3, Capture.mp3** — wooden piece sounds from [lichess-org/lila — public/sound/standard](https://github.com/lichess-org/lila/tree/master/public/sound/standard)
- All other UI sounds are synthesized at runtime with the Web Audio API (no audio files).

## Coach portrait

- [Open Peeps](https://www.openpeeps.com/) by Pablo Stanley — **CC0 1.0 (public domain)**, no rights reserved. Generated via the DiceBear HTTP API (Open Peeps style); the SVG is bundled locally at `public/avatar/elias.svg`.
- The coach's **voice** uses the browser's built-in Web Speech API (`speechSynthesis`) — no audio files, no cloud service.

## Chess engine

- **Stockfish WASM** — bundled at `public/engine/` from the [stockfish npm package](https://github.com/nmrugg/stockfish.js) by Nathan Rugg, built from [Stockfish](https://github.com/official-stockfish/Stockfish) by the Stockfish developers. GPL — this is the reason the repository is licensed GPL-3.0.

## Fonts

- **Noto Sans** — Google Fonts, SIL Open Font License 1.1.

## Data

- **Opening lines (ECO)** — hand-curated in `src/lib/openings.ts`, validated by `scripts/validate-openings.mjs`.
- **Master games** — public-domain historical scores, hand-verified in `src/lib/masters.ts` (`scripts/validate-masters.mjs`).
