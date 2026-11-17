# EMTR ribbon tutorial recordings

The three clips of the EMTR guide (`emtr`, route `ribbons`), re-recorded in MDLxL 0.40.2 in EN/ES/RU/ZH/FR/DE with the app in each language, now with the elemental Sweep choice of Add ribbon (Fire). The Mordor page plays the English clips. Follows the [MDLxL tutorial design rules](../../../AGENTS.md#mdlxl-tutorial-design). Replaces the 0.3x clips and the two `ribbon-*-tool.png` stills; the old [`ribbon.cjs`](../ribbon.cjs) recording is left untouched.

| Step | Clip | What it shows |
| --- | --- | --- |
| 1 | `ribbon-add` | The sword faces are selected. EMTR; Add ribbon; the wheel zooms the preview; Sweep Fire; Visibility: only the attack (the animation that was checked is unchecked); Create |
| 2 | `ribbon-timing` | The wheel zooms the preview; Lasts `+` ×6 (0.3 s to 0.6 s); the first blue diamond is dragged to 20% of the attack, the second to 100%; the playhead is clicked at 10% (nothing) and 70% (the sweep) |
| 3 | `ribbon-play` | Play; `Alt + LMB` turns the preview around the swing; an animation that is not checked is chosen and stays clean |

All clips are 1264×760, 25 fps H.264, muted loops. Green ring + crosshair pings are drawn into the app on each control while it is recorded; mouse and key cues (`Wheel`, `Alt + LMB`) are captions from `animation-index.json`. The card picture (`ribbon-card.png`) is a frame of the first swing in `ribbon-play` with the most flame in view.

What changed in the controls since the old guide: Add ribbon has a **Sweep** choice (Plain or an element; Fire here), the old default timing is now a visible part of the attack (blue diamonds at about 23% and 55% on create), Lasts has a `+` / `−` step beside the slider, and the preview camera turns with `Alt + LMB` (plain left drag moves the emitter handles). The Fire sweep's two particle emitters keep their own visibility keys; only the ribbon's diamonds are changed in the clip.

## Inputs

- App: a fresh worktree of MDLxL `0b7c7071` (0.40.2) built with `vite build`; `node_modules` is a junction to `D:/Claude/MDLxL/node_modules` (removed as a link afterwards).
- Model: a copy of `D:/Claude/MDLxL-TestModels/citadel-fixture/Footman.mdx` (SHA-256 `7ee255776a6e757bd89766354df763201cd0519c488585b7c30151d5e313fc13`) in `<work>/models/`; textures are game files from `D:/Warcraft III`. The collection itself is read only.
- The sword: geoset 0, vertices 295-308 (selected before the lesson starts, as in the old guide), ribbon parent bone id 19. The animation: `Attack - 1` (12500-13500 ms); 20% is frame 12700. The unchecked animation shown at the end is `Stand - 1`.
- Playwright: `D:/Claude/tools/node_modules/playwright-core`.

## Run

Paths default to the recording machine; override with `LPW_APP`, `LPW_WORK`, `LPW_SITE`. Keep `TEMP`/`TMP` on D:. `LPW_KEEPRAW=1` keeps the raw frames.

1. `node run.cjs [locales]` records each language through MDLxL's `scripts/hidden-run.ps1` (invisible desktop) with real Playwright mouse and keyboard input (`capture.cjs`, `recorder.cjs`; a capture that fails a check is recorded once more). Every step is checked against the model data (`<work>/captures/<lang>/proof.json`): the sword faces selected, the ribbon created on the sword bone, Visibility = only `Attack - 1`, the Fire sweep's two emitters, Lasts changed, the visibility keys at 20% and 100%, the camera turn and the unchecked animation playing. `encode.mjs` writes the MP4s, the card and the index records; raw frames and profiles are removed.
2. `node integrate.mjs` replaces the card picture, the three steps and the two notes in every language page (the app's own labels from `src/locales/*.json`), copies the English clips and card for Mordor and removes the two tool-shot PNGs. Also keep the `?v=` key of the scripts in step (`20261118-ribbon-current`, then `node tools/model-pages.mjs`) and the `#tutorial-emtr .player-frame` aspect ratio in `dist/mdlxl-tutorials.css`.
3. `python -I verify-media.py` decodes every MP4 and checks size, timing, hashes, players, captions, the card and that every green ping is centred on its control.
4. Serve the site (`PORT=4197 node server.mjs`) and run `review-playback.cjs` with Electron through `hidden-run.ps1`, one page per run (`LPW_QA_LANGS=es`). It opens the card at 1600×1100 and 390×844 with CDP mouse input and observes two full loops of every clip with its captions.

`explore.cjs` is the exploration script, not part of a run. `contact-sheet.py <mp4> <out.jpg> [seconds]` makes a contact sheet; every English clip was looked at this way (`<work>/report/`).
