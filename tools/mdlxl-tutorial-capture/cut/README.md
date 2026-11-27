# Vertex editor Cut tutorial recordings

The two clips of the Cut guide (`cut`, route `/mdlxl/tutorials/cut/`, a Quick trick in the Vertex editor area), recorded in MDLxL main `6058bc3f` (PR #678) in EN/ES/RU/ZH/FR/DE with the app in each language. The Mordor page plays the English clips. Follows the [MDLxL tutorial design rules](../../../AGENTS.md#mdlxl-tutorial-design). Adapted from [`ribbon-current`](../ribbon-current/); the new card is added the way [`animated-vertices`](../animated-vertices/) added its cards.

| Step | Clip | What it shows |
| --- | --- | --- |
| 1 | `cut-line` | Cut (ping); a vertex; the pointer glides along a far line (it lights up, the dot follows, dashed line from the vertex); click: one new point, two triangles split |
| 2 | `cut-corner` | `Ctrl + Z` (caption); a vertex; the pointer moves onto the far corner (dashed line to it); click: the middle line turns, no new point |

1264x760, 25 fps H.264, muted loops. Green ring + crosshair pings are drawn into the app on the Cut button. The card picture (`cut-card.png`) is the frame of `cut-line` with the most yellow (lit line, dot, dashed line).

## Inputs

- App: a detached worktree of MDLxL `6058bc3f` built with `vite build`, own `node_modules` (`pnpm install --frozen-lockfile --prefer-offline`).
- Model: a copy of `D:/Claude/MDLxL-TestModels/citadel-fixture/Footman.mdx` in `<work>/models/` (collection read only); textures are not needed (Wireframe).
- Spot: geoset 1 (Geosets button 2, Show all off), a round fan: centre vertex 3 and ring 4-11. Left view, Wireframe, Fit selection on the fan, then nothing selected. First point: vertex 6; far line 3-7 (neighbour triangle behind it has corner 11). Vertex 5 is not used: it shares its spot with vertex 2 and the pointer picks vertex 2 first, so the far corner is not offered there.
- Setup before recording (not part of a clip): view, geoset buttons, the fan selection for Fit selection (set through the app's selection handler, as the ribbon guide does), one click on empty space to clear it.
- Playwright: `D:/Claude/tools/node_modules/playwright-core`.

## Checks in `capture.cjs` (written to `<work>/captures/<lang>/proof.json`)

Hover marks (`[data-anchor-overlay]` `dataset.cut` = `start`, `edge`, `corner`) read while the real mouse moves; `cut-line`: geoset 1 goes from 52 vertices / 35 triangles to 53 / 37, the new point is selected and lies at the middle of line 3-7, lines 6-new and 11-new exist; `cut-corner`: Ctrl + Z restores the faces exactly, the final model has the same counts and the line 6-11 instead of 3-7.

## Run

`node run.cjs [locales]` (records through MDLxL `scripts/hidden-run.ps1` on the invisible desktop, encodes, removes raw frames and profiles), `node integrate.mjs`, then register the guide (`tutorialSlugs` in `dist/mdlxl-routes.js`, `guideSorting` in `dist/mdlxl-tutorials.js`, `guideNames` in `tools/model-pages.mjs`, the `#tutorial-cut` selectors in `dist/mdlxl-tutorials.css`), set the `?v=` key (`20261118-cut-tutorial`) everywhere, `node tools/model-pages.mjs`, `node tools/check-project.mjs`, `python -I verify-media.py`, and `review-playback.cjs` (serve with `PORT=4197 node server.mjs`, one language per run).
