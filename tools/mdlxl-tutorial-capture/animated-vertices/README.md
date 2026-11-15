# Animated, Each Piece and Call Upon Forge tutorials

Three MDLxL 0.40.0 guides, real recordings from the app in EN/ES/RU/ZH/FR/DE. The Mordor page shows the English guides and clips, like Spread pieces. Follows the [MDLxL tutorial design rules](../../../AGENTS.md#mdlxl-tutorial-design).

| Guide (route) | Clips |
| --- | --- |
| Animated (`animated`) | `animated-pose` (choose an animation and frame, Shift+Space), `animated-edit` (select and move on the posed model; the base pose takes the edit) |
| Each Piece (`each-piece`) | `animated-each-piece` (Rotate the whole Footman without, then with Each Piece) |
| Call Upon Forge (`call-upon-forge`) | `forge-open`, `forge-isolate` (select the shield and its red team-colour layer, geoset 2; Detach as new geoset; Clear, tick the two new geosets, Show all off), `forge-bevel` (Left view, Wireframe, plate only), `forge-bend` (Textured View, Bend along Across turned to Depth so the sides curve toward the body; Show all on, Fit), `forge-check` (camera, Undo/Redo) |

All clips are 1264×760, 25 fps H.264, muted loops. Green ring + crosshair pings are drawn into the app on each control while it is recorded; keyboard cues are captions from `animation-index.json`. Each guide has its own card picture; the Call Upon Forge card is the bent shield on the whole textured Footman with no selection or vertex markers (`card.png` from the capture).

## Inputs

- App: a fresh worktree of MDLxL `origin/main` built with `vite build` (recorded from `29faa840`, version 0.40.0). `node_modules` is a junction to `D:/Claude/MDLxL/node_modules`.
- Model: a copy of `D:/Claude/MDLxL-TestModels/citadel-fixture/Footman.mdx` (SHA-256 `7ee255776a6e757bd89766354df763201cd0519c488585b7c30151d5e313fc13`) in `<work>/models/`. The collection itself is read only. The shield is Footman geoset 0 vertices 225–231, 253–266 and 425–434 (as in MDLxL's forge-shield tests) plus its red team-colour layer, geoset 1 vertices 0–11.
- Playwright: `D:/Claude/tools/node_modules/playwright-core`. Native textures from `D:/Warcraft III`.

## Run

Paths default to the recording machine; override with `LPW_APP`, `LPW_WORK`, `LPW_SITE`. Keep `TEMP`/`TMP` on D:.

1. `node run.cjs` records the Animated and Each Piece clips (`capture.cjs`); `node run.cjs forge` records the Call Upon Forge clips (`capture-forge.cjs`). Both use `recorder.cjs` and run each language through MDLxL's `scripts/hidden-run.ps1` (invisible desktop) with real Playwright mouse and keyboard input. Every step is checked against the model data (`<work>/captures/[forge-]<lang>/proof.json`); `encode.mjs` then writes the MP4s, cards and index records, and raw frames and profiles are removed. Frames come from the Chromium compositor (CDP screencast); each output frame shows the newest painted frame at its time.
2. `node integrate.mjs` adds the three cards and articles to every language page, makes the Each Piece cards from their clips and copies the English clips for Mordor. Labels are the app's own from `src/locales/*.json`.
3. `python -I verify-media.py` decodes every MP4 and checks size, timing, hashes, players, captions, cards and that every green ping is centred on its control.
4. Serve the site (`PORT=4197 node server.mjs`) and run `review-playback.cjs` with Electron through `hidden-run.ps1`, one page per run (`LPW_QA_LANGS=es`): a second page loaded in the same Electron process failed with `ERR_FAILED`. The window is offscreen and sized directly: CDP device-metrics emulation crashes offscreen windows. For each guide it opens the card at 1600×1100 and 390×844 with CDP mouse input and observes two full loops of every clip with its captions.

Also keep the slugs in `dist/mdlxl-routes.js`, the page names in `tools/model-pages.mjs` and the cache versions of the files that import them in step.
