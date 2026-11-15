# FX tutorial recordings

The six clips of the FX guide (`fx`), recorded in MDLxL 0.40.0 in EN/ES/RU/ZH/FR/DE with the app in each language. The Mordor page plays the English clips. Follows the [MDLxL tutorial design rules](../../../AGENTS.md#mdlxl-tutorial-design). The story is the owner's: one build on the Great Unclean One, carried from clip to clip, until it is a snowman.

| Step | Clip | What it shows |
| --- | --- | --- |
| 1 | `fx-skin` | FX opens; the preview turns to the front; double-click the skin (geoset 6); Ice > Frost; the wheel over Variation picks Frosted steel; Apply effect |
| 2 | `fx-pus` | FX again; turn to the back; double-click the pus (geoset 25); Ice > Crystal; Variation Crystal growth; Size, Length, Count and Glow of the Crystals layer; Apply effect |
| 3 | `fx-horns` | Turn to the head; double-click a horn (geoset 9); Ice > Frost, Variation Dark ice; Falling mist off; Add layer > Ice facets; Apply effect |
| 4 | `fx-weapon` | Turn to the weapon; double-click the blade (geoset 10 or 11, which share its surface); Fit selection; Ice > Frost, Variation Ice spikes; Size, Count and Length of the Ice spikes layer; Apply effect |
| 5 | `fx-sweep` | Vertices: Geosets Clear, tick the blade's geoset, Ctrl + A; Emitter Editor > Add ribbon; Sweep Frost; Visibility Attack - 1 and Attack - 2 (Walk off); Create |
| 6 | `fx-result` | Showcase; the animation set to Attack - 1; Preview animation; zoom and turn the camera around the finished model |

All clips are 1264×760, 25 fps H.264, muted loops. Green ring + crosshair pings are drawn into the app on each control and on each double-clicked part while it is recorded; mouse and key cues (`LMB`, `LMB × 2`, the localized wheel, `Ctrl + A`) are captions from `animation-index.json`. A part is double-clicked on the largest of its triangles that no nearer triangle of another shown geoset covers. The card picture (`fx-card.png`) is the Showcase frame of `fx-result` that shows the most ice and sweep.

## Inputs

- App: a fresh worktree of MDLxL `29faa840` (0.40.0) built with `vite build`; `node_modules` is a junction to `D:/Claude/MDLxL/node_modules`.
- Model: a copy of `D:/Claude/MDLxL-TestModels/GreatUnclean/WH_DOC_GreatUCO1C.mdx` (SHA-256 `bdffee239c233efc0ca8f396edfd6731b682809fe26c1eb3d053c54c8cc5b01b`, the owner's model; all its textures are game files) in `<work>/models/`. The collection itself is read only. Parts: skin geoset index 5, pus 24, horns 8, blade 9 or 10. Picking a part is first tried in a step cut from the clip (`s.cut` in `recorder.cjs`; `encode.mjs` closes the gap), so the visible double-click lands on a point that selects the part.
- Playwright: `D:/Claude/tools/node_modules/playwright-core`. Native textures from `D:/Warcraft III`.

## Run

Paths default to the recording machine; override with `LPW_APP`, `LPW_WORK`, `LPW_SITE`. Keep `TEMP`/`TMP` on D:.

1. `node run.cjs [locales]` records each language through MDLxL's `scripts/hidden-run.ps1` (invisible desktop) with real Playwright mouse and keyboard input (`capture.cjs`, `recorder.cjs`). Every step is checked against the FX stack and the model data (`<work>/captures/<lang>/proof.json`): the part each double-click selects, the look and variation, each slider's change, the layer switched off and the layer added, each applied stack, and the Frost sweep's ribbon, emitters, bone and attack visibility. `encode.mjs` writes the MP4s, the card and the index records; raw frames and profiles are removed. Labels and picker names are the app's own from `src/locales/*.json`.
2. `node integrate.mjs` writes the card, title, intro and six steps (the app's own labels) into every language page, keeps the Advanced functions reference, copies the English clips and card to the Mordor page (with Mordor words), and removes the older fx-* clips and index records.
3. `python -I verify-media.py` decodes every MP4 and checks size, timing, hashes, players, captions, the card and that every green ping is centred on its control.
4. Serve the site (`PORT=4197 node server.mjs`) and run `review-playback.cjs` with Electron through `hidden-run.ps1`, one page per run (`LPW_QA_LANGS=es`). The window is offscreen and sized directly (CDP device-metrics emulation crashes offscreen windows). It opens the card at 1600×1100 and 390×844 with CDP mouse input and observes two full loops of every clip with its captions.

`scan.cjs` and `explore.cjs` are the exploration scripts used to find the model's parts, the camera angles and the looks; they are not part of a run. `contact-sheet.py <mp4> <out.jpg> [seconds]` makes the contact sheet of a clip; every clip was looked at this way before the final run.
