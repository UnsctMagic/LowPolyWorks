# Focused Skeleton and POSE tutorials

Two MDLxL 0.40.2 guides, real recordings from the app in EN/ES/RU/ZH/FR/DE. The Mordor page shows the English guides and clips, like the other guides. Follows the [MDLxL tutorial design rules](../../../AGENTS.md#mdlxl-tutorial-design). The pipeline is the Animated / Each Piece / Call Upon Forge one ([animated-vertices](../animated-vertices/README.md)) with its own recorder for Movement.

| Guide (route) | Clip | What it shows |
| --- | --- | --- |
| Focused Skeleton (`focused-skeleton`) | `fskel-pick` | Movement on Stand. Skeleton on for about 1.5 s, off; double-click the upper arm (`LMB × 2`): its bone is selected and F.Skeleton turns on; double-click a leg: the focus moves to the leg. Bones and Skeleton stay off. |
| | `fskel-animate` | Double-click the upper arm; click a frame in the middle of the timeline (`LMB`); Workplane YZ; Rotate (`R + LMB`) and drag so the arm swings up; `Space` plays it. |
| POSE (`pose`, Footman) | `pose-on` | Animation and a frame chosen; POSE under Tools; the hand, foot and Body handles appear. |
| | `pose-arms` | Each Hand handle dragged up and out into a V. |
| | `pose-legs` | A Foot handle dragged up (the knee lifts), Body lowered a little; `Alt + LMB` turns the view; `Space` plays the animation into the pose. |

All clips are 1264×760, 25 fps H.264, muted loops. Green ring + crosshair pings are drawn into the app on each control (and on the double-clicked parts and handles) while it is recorded; mouse and key cues are captions from `animation-index.json`. Card pictures: `fskel-card.png` (the raised arm with the focused skeleton, after the drag) and `pose-card.png` (the finished pose before the camera turns). The guides name only controls and keys.

## Inputs

- App: a fresh worktree of MDLxL `origin/main` `0b7c7071` (0.40.2) built with `vite build`; `node_modules` is a junction to `D:/Claude/MDLxL/node_modules` (removed as a link afterwards).
- Models: Focused Skeleton uses a copy of `D:/Claude/LowPolyWorks-anim-tut/dist/models/WH_VC_LahmianVampire01.mdx` (SHA-256 `795bd0a56dd8230cf15281ae0f9de9014e13942a6eb61b5cd7e9c0badaef1f18`), all textures game files. POSE uses a copy of `D:/Claude/MDLxL-TestModels/citadel-fixture/Footman.mdx` (SHA-256 `7ee255776a6e757bd89766354df763201cd0519c488585b7c30151d5e313fc13`) in `<work>/models/`; `capture-pose.cjs` sets `LPW_MODEL=Footman.mdx`. Both come from `D:/Warcraft III` for textures; the collection itself is read only. POSE recognises both hands, both feet and Body on the Footman (chains `limb:42`/`limb:38` hands, `limb:32`/`limb:29` feet, Body = `Bone_Root`; Pelvis repeats Body and is folded in; pelvis, chest and head are Helpers).
- Focused Skeleton: upper arm `Should_L` (double-click point 40% from `Should_L` to `Elbow_L`), leg `Hip_L`, Stand animation (1167-2733), frame 1950 (the middle).
- POSE: Footman `Stand - 1` (167-1667), frame 683 in the longest gap between keys (467 and 900), camera azimuth 45 degrees, wheel zoom 3 steps. Hands are aimed at 14 units outward and 38 above the shoulders (`Bone_Arm1_R/L`), the left foot is dragged up and forward, Body is lowered; Escape clears the selection before the card frame so no gizmo covers the body.
- Playwright: `D:/Claude/tools/node_modules/playwright-core`. Native textures from `D:/Warcraft III`.

## Run

Paths default to the recording machine; override with `LPW_APP`, `LPW_WORK`, `LPW_SITE`. Keep `TEMP`/`TMP` on D:.

1. `node run.cjs fskel [locales]` and `node run.cjs pose [locales]` record each language through MDLxL's `scripts/hidden-run.ps1` (invisible desktop) with real Playwright mouse and keyboard input (`capture-fskel.cjs`, `capture-pose.cjs`, `common.cjs`, `recorder.cjs`). The camera is set once with the same inputs a user has (Fit, Alt + left drag, wheel, right-drag pan) and kept for all clips. Every step is checked against the live model (`<work>/captures/<set>-<lang>/proof.json`): the bones each double-click selects, the Skeleton / Bones / F.Skeleton toggle states, the frame, the Rotation key written on `Should_L`, the hand and foot world positions before and after each drag, the keyed bones, the Body height, the camera turn and that playback advances. `encode.mjs` writes the MP4s, the cards and the index records; raw frames and profiles are removed. `explore.cjs` is the exploration script, not part of a run. `contact-sheet.py <mp4> <out.jpg> [seconds] [columns] [width]` makes a contact sheet; every clip was looked at this way (English sheets in `<work>/report/`).
2. `node integrate.mjs` adds the two cards and articles (the app's own labels from `src/locales/*.json`) to every language page, copies the English clips for Mordor. Also keep `tutorialSlugs` in `dist/mdlxl-routes.js`, `guideNames` in `tools/model-pages.mjs` (then `node tools/model-pages.mjs`), the `#tutorial-fskel` / `#tutorial-pose` selectors in `dist/mdlxl-tutorials.css` and the `?v=` keys of the scripts that import them in step.
3. `python -I verify-media.py` decodes every MP4 and checks size, timing, hashes, players, captions, cards and that every green ping is centred on its control. The ring colour is matched tightly (the module icon bar and the focused skeleton's green axes would otherwise pull the centre).
4. Serve the site (`PORT=4197 node server.mjs`) and run `review-playback.cjs` with Electron through `hidden-run.ps1`, one page per run (`LPW_QA_LANGS=es`). It opens the card at 1600×1100 and 390×844 with CDP mouse input and observes two full loops of every clip with its captions.
