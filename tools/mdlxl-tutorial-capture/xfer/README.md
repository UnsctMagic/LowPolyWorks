# XFER (Transfer window) tutorial recordings

The ten clips of the XFER guide (`xfer`, route `/mdlxl/tutorials/xfer/`, area Animation under Tools), recorded in MDLxL online `main` `44eb1f1d` (release 0.40.3). English only so far: the other five languages and the Mordor page follow once the English clips are approved. Follows the [MDLxL tutorial design rules](../../../AGENTS.md#mdlxl-tutorial-design). Adapted from the Fit guide's pipeline (`../fit/`).

| Step | Clip | What it shows |
| --- | --- | --- |
| 1 | `xfer-open` | XFER button (ping), the Transplant / Retarget switch (ping), From > Open file... (ping), the Animations list (Walk - 1, Attack - 2) played by both views |
| 2 | `xfer-views` | Pause / Play, dragging the time track, Speed, the view dropdown, a real mouse drag that turns both views, the reset (↺) button |
| 3 | `xfer-transplant-method` | Rotation, Position, Mix, a dot on the result and its Rotation / Position chip, This animation / All animations, the More menu when it exists |
| 4 | `xfer-transplant-options` | Mirror, Sounds, Effects, Keep |
| 5 | `xfer-transplant-apply` | Transplant (Transplanted), close, Animations tab, `Ctrl + Z` caption undoes it |
| 6 | `xfer-retarget-take` | Retarget switch, an animation, Body animation, taking an arm and a leg by their handles, Take whole body, Clear all, Mirror, Other side |
| 7 | `xfer-retarget-tune` | Strength, Pose, Raise, Turn, Roll with the orange path, double-click to reset, Whole movement, This moment (diamond), Clear fixes |
| 8 | `xfer-retarget-timeline` | Drag a clip (Delay), trim an edge, double-click the edge, Timing fold (Speed, Ease), Add after and its x |
| 9 | `xfer-retarget-switches` | All taken parts, Keep foot on the ground, Stay in own range, Keep arm out of the body, Travel, Keep weapon above the ground, Take from |
| 10 | `xfer-retarget-finish` | Name, Add animation, the new animation in the Result dropdown, Keep own animations, Add all, Save as..., Load from... |

1600x900, 25 fps H.264 (2000k), muted loops. Green ring + crosshair pings are drawn into the app on each control when it is introduced; a pointer arrow is drawn into the page (the compositor recording has no system cursor). The card picture (`xfer-card.png`, 960x504, 256 colours) is a late frame of `xfer-open`.

## Inputs

- App: a detached worktree of MDLxL `origin/main` `44eb1f1d` built with `vite build` (its `node_modules` is a junction to the main checkout's; scripts are run with `node`, never `pnpm run`).
- Receiver: copy of `D:/Claude/MDLxL-TestModels/corpus-sd/orc__grunt.mdx` named `TEST XFER GRUNT 01.mdx`. Donor: copy of `corpus-sd/undead__gargoyle.mdx` named `Gargoyle.mdx`, chosen through From > Open file... (the native file dialog is answered with that file by the harness; it is the only stubbed thing). Textures come from the Warcraft III install (`MDLVIS_GAME_DATA=D:/Warcraft III`). The test model collection is read only.
- Handle positions are read from the preview's own `poseHandles` and clicked with the real mouse; every drag, click and key is a real input event.

## Controls not shown for this pair

Poor fit note (this pair fits), More menu (its repair choices are not offered for this pair), Leg timing and the front-leg choice (both models stand on two legs), Both / Rider / Mount (neither model is a rider), Both hands on the weapon and Point weapon like theirs (one-handed Grunt weapon, no donor weapon), Own features (the Grunt has none), Both-sides Shift click in the part chip. The 0.40.3 Transplant window has the Method row (Rotation / Position / Mix, scope, More) instead of the older Repairs and Engine 2 checkboxes.

## Checks in `capture.cjs` (written to `<work>/captures/en/proof.json`)

Window state before and after each click, donor chosen, both views show the clicked animation, Pause holds a view and Play resumes, the track drag moves the time, Speed 50%, the Result dropdown changes both views, dragging the result turns the donor too and the reset button turns both back, Rotation leaves no part on engine 2, Position puts every part on engine 2, Mix shows arm and leg dots and the chip changes one part, Mirror, Sounds, Effects and Keep toggle, Transplant changes the bone count and gives the 10 donor animations, `Ctrl + Z` restores bones and animations, Retarget starts with nothing taken, a hand handle takes an arm and a foot handle a leg, Take whole body takes 7 parts and Clear all 0, Strength / Pose / Raise / Turn / Roll change and move the path, double-click resets Strength to 100%, dragging the hand changes Raise / Turn, This moment adds a diamond and Clear fixes removes it, dragging a clip sets Delay, trimming shows a dashed end and a double-click restores it, Add after adds a lane and its x removes it, each switch changes, Add animation adds the named animation, Add all adds the donor's missing animations, Load from lists the saved setup. 66 checks, all passing.

## Run

`node run.cjs` (records through MDLxL `scripts/hidden-run.ps1` on the invisible desktop, encodes, removes raw frames and profiles; `LPW_ONLY=clip,clip` records some clips), `node integrate.mjs` (card and article in `dist/mdlxl/tutorials/content.html`), then registration: `tutorialSlugs` in `dist/mdlxl-routes.js`, `guideSorting` in `dist/mdlxl-tutorials.js`, `guideNames` in `tools/model-pages.mjs`, the `#tutorial-xfer` selectors in `dist/mdlxl-tutorials.css`, `version` in `dist/mdlxl-tutorials.js` (`20261127-xfer-tutorial`), `node tools/model-pages.mjs`, `node tools/check-project.mjs`, `python -I verify-media.py`, `contact-sheet.py <mp4> <jpg> <seconds>`, and `review-playback.cjs` (serve with `PORT=4197 node server.mjs`, run through hidden-run.ps1 with electron).
