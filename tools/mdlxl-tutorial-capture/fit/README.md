# UV Wrapper Fit tutorial recordings

The two clips of the Fit guide (`fit`, route `/mdlxl/tutorials/fit/`, a Quick trick in the UV Wrapper area), recorded in MDLxL main `e92ddd68` (PR #685) in EN/ES/RU/ZH/FR/DE with the app in each language. The Mordor page plays the English clips. Follows the [MDLxL tutorial design rules](../../../AGENTS.md#mdlxl-tutorial-design). Adapted from the Cut guide's pipeline (on the `claude/cut-tutorial` branch until it is merged).

| Step | Clip | What it shows |
| --- | --- | --- |
| 1 | `fit-area` | Fit (ping); Polygon lasso (ping); nine clicks around the teal scaly column right of the dark red one (the owner's own outline, read from his screen recording); `Enter` (caption) closes the outline |
| 2 | `fit-move` | Fit (ping) again: the selected UVs move into the outline, the live preview shows the snake with its new mapping |

1264x760, 25 fps H.264, muted loops. Green ring + crosshair pings are drawn into the app on the Fit and Polygon lasso buttons. The card picture (`fit-card.png`, 256-colour PNG to stay under the art cap) is the last frame of `fit-move`.

## Inputs

- App: a detached worktree of MDLxL `origin/main` `e92ddd68` built with `vite build` (its `node_modules` is a junction to the main checkout's; scripts are run with `node`, never `pnpm run`).
- Model: a copy of `D:/Claude/MDLxL-TestModels/uv-fit-tutorial/WHStatueTalos02_0.mdx` named `TEST UV FIT SNAKE 01.mdx` in `<work>/models/` (collection read only). Geoset 4 (index 3) is a coiled snake, 157 points / 247 triangles; its material uses the game texture `Buildings\Naga\TempleofTides\TempleOfTheTides.blp`, which the app loads from the Warcraft III install (`MDLVIS_GAME_DATA=D:/Warcraft III`). Its UVs start as two pieces at u 0.557-0.708, v -0.479-0.966.
- Setup before recording (not part of a clip): geoset 4 chosen (Clear, geoset 4; Show all stays on like the owner's), all 157 points selected through the app's selection handler, UV Wrapper opened with its button, the map framed like the owner's view (centre u .531, v -.312; one tile is the map width / 1.312), the tool list scrolled so Fit shows.
- Marked area: the owner's nine clicks, converted from his frames with x = -13.4 + 692 u, y = 768 + 692 v (fitted from his 85 visible UV points): (0.804, -0.502), (0.959, -0.503), (0.955, -0.137), (0.972, -0.042), (0.905, 0.000), (0.825, 0.004), (0.778, -0.053), (0.796, -0.099), (0.824, -0.115).
- Magic wand: tried on the same column (tolerance 32); the outline came out as a small blob inside the column, so no wand clip was made.
- Playwright: `D:/Claude/tools/node_modules/playwright-core`.

## Checks in `capture.cjs` (written to `<work>/captures/<lang>/proof.json`)

Geoset 4 has 157 points / 247 triangles; all points selected; the Fit bar appears and Polygon lasso is active; after `Enter` no UV has moved yet; after Fit the bar closes, the point count, triangle count, triangle list and 3D positions are identical, every one of the 157 UVs lies inside the marked polygon (bounds u 0.807-0.950, v -0.499-0.003) and all 157 moved; `Ctrl + Z` (after the clips) restores every UV exactly.

## Run

`node run.cjs [locales]` (records through MDLxL `scripts/hidden-run.ps1` on the invisible desktop, encodes, removes raw frames and profiles), `node integrate.mjs`, then register the guide (`tutorialSlugs` in `dist/mdlxl-routes.js`, `guideSorting` in `dist/mdlxl-tutorials.js`, `guideNames` in `tools/model-pages.mjs`, the `#tutorial-fit` selectors in `dist/mdlxl-tutorials.css`), set the `?v=` key (`20261119-fit-tutorial`) everywhere, `node tools/model-pages.mjs`, `node tools/check-project.mjs`, `python -I verify-media.py`, and `review-playback.cjs` (serve with `PORT=4197 node server.mjs`, one language per run). `review-playback.cjs` ignores the browser's harmless "ResizeObserver loop" notice, which the site's `frame-snap.js` raises on every guide page (the POSE guide shows it too).

## Re-recording on the owner's recording (19 Nov)

The clips copy the owner's screen recording (his GIF frames f000-f170) at his window size: 1920x1009 window, clips encoded 1920x1008, card picture 960x504. 85 of the 157 points are selected (the first UV piece, v < 0.3; his Stats show 85 sel), the map starts zoomed out (tile 258 px), is zoomed with the wheel at his cursor, panned with a right-drag, Fit, his nine clicks, Enter, Fit again (the 85 UVs fill the outline, the other 72 stay on the dark red part), then his left-drag in the 3D preview. Views and cursor paths are measured from his frames (see the constants at the top of `capture.cjs`).
