# MDLxL tutorial capture sources

These scripts reproduce historical recordings. For current tutorials, follow the [MDLxL tutorial design rules](../../AGENTS.md#mdlxl-tutorial-design).

Source snapshot used to record the French/German tutorials. This is the existing native Electron/CDP → BMP → FFmpeg global-palette workflow, with localized control lookups. It does not generate translated screenshot overlays or mutate the application source.

The original seven guides produce 25 GIFs and 17 PNGs per language. The [FX continuation](fx/README.md) adds four GIFs and one PNG per language: the eight-guide inventory was 29 GIFs and 18 PNGs per locale. Anchor/Align/Live/Corpse reuse `D:/Codex/lpw-tutorial-languages/captures/es/`; Glow Up reuses the accepted `D:/Codex/lpw-glow-up-revision/capture.cjs`. Ribbon and OptimizeXL reuse the same capture runtime/encoding from `D:/Codex/lpw-fx-tutorial-20261102/source/authoring/`; their action sequences were reconstructed from site commit `0c4126bb22f0ca98587241e7b275dadfe8668239`, the Spanish timeline metadata/content and `D:/Codex/lpw-ribbons-optixl-review/verification.json` because their original authoring scripts were no longer present.

The [FX continuation](fx/README.md) adds the eighth tutorial: The unpublished [UV grid continuation](uv-grid/README.md) adds three GIFs and one PNG per locale, for nine-guide totals of 32 GIFs and 19 PNGs per language. The GIFs are published once as standalone files; their timings and key cues live in small animation-index.json files. Embedded Base64 payload modules are no longer published.

## Run on the authoring machine

1. Copy these source files to `D:/Codex/french-german/captures`, preserving `fr/` and `de/`. The snapshot retains the exact D: task paths used for this recording; adjust those paths together for another task. App and site checkouts are `D:/Codex/french-german/MDLxL` and `D:/Codex/french-german/LowPolyWorks`.
2. Restore each locale's input model files listed in `inputs.json` from the existing authoring inputs; verify their SHA-256 before capture. Footman is `D:/Claude/MDLxL-TestModels/citadel-fixture/Footman.mdx`; Archer is `D:/Claude/MDLxL-TestModels/tutorials/archer.mdx`. Cube, spikes, Live_Select and source are preserved in `D:/Codex/lpw-tutorial-languages/captures/es/`; Unit is `D:/Codex/lpw-glow-up-revision/capture/Unit.mdx`. Never remove or replace the permanent corpus. These binary inputs are deliberately not duplicated in this source snapshot.
3. Link the app's `node_modules` to the established checkout. Build the final app before recording, then keep catalogs and `dist` frozen. Electron is `D:/Claude/MDLxL/node_modules/electron/dist/electron.exe`; FFmpeg is `D:/Claude/MDLxL/electron/ffmpeg/ffmpeg.exe`. Native Warcraft assets are read from the existing local game/archives. Keep `TEMP` and `TMP` on D:.
4. Run `node captures/run.cjs fr anchor align live corpse glow ribbon optixl`, then the same command with `de`. Each recording is launched through MDLxL's `scripts/hidden-run.ps1` on an invisible Windows desktop. The driver rejects a changed renderer/catalog fingerprint and removes its disposable profiles/raw frames after encoding. Do not set `LPW_TOOL_ONLY` for a full run. The driver invokes `encode.mjs`, preserving the Spanish timeline phases, cues and clip dimensions.
5. Run `python captures/verify-media.py` and `node captures/collect-targets.mjs`. Apply the measured tool target percentages to the localized `content.html`; content is intentionally outside the capture scripts' ownership. Serve the actual site at port4197, then run `review-playback.cjs` through the same hidden launcher with `LPW_QA_LANG=fr` or `de`. That script clicks/scrolls the real pages, observes each complete loop without resetting player state, checks measured native tool targets, and checks desktop/mobile page widths. `LPW_QA_LOOPS_ONLY=1` and `LPW_QA_STATIC_ONLY=1` allow independent checks when only stills change.

For a proven sidebar-only label change outside every GIF crop, `node captures/prepare-tool-only.cjs` adds early exits at the existing native tool screenshot calls; `node captures/refresh-tools.cjs` refreshes exactly seven main-window PNGs per language and asserts all standalone GIFs and playback metadata remain identical. This path was used only after crop/occlusion proof; it is not a substitute for re-recording a changed visible GIF.

## Native verification details

- Native popup screenshot capture must remain on the invisible desktop. OptimizeXL uses real native child windows shown inactive at x=-3000: Chromium's offscreen child `capturePage` returned 0×0 despite a painted DOM. CDP keeps the genuine popup at1100×700; captures crop that native output. The other guides use offscreen BrowserWindows.
- OptimizeXL attaches the app's read-only test hook to the native popup, polls the current renderer's readiness (not a disposed renderer's promise), and explicitly focuses the native child immediately before manual camera drags. Both camera position change and actual affected-animation rows are required. The German final pass sets Strength by native range keyboard input to10% and asserts its value; the French final pass records a normal low-strength drag (8.21% visible in the recorded review). Both show three actually changed animations.
- Ribbon selects Footman geoset0 vertices295–308, retains bone19/native fit length78.612, enables animation index4 (`Attack - 1`) only, and verifies the actual0.8-second lifetime/12700 start. Native green tool/POSE indicators are recorded in the frames.
- BMP conversion uses System.Drawing before FFmpeg because the established binary cannot decode PNG. Repeated frames are hardlinked only in task-owned disposable encoding directories. No recursive cleanup follows a junction.
- No release assets, publication, installed app, real profile or original model are modified. Reports, source provenance and final media hashes are kept in the task's report folder; raw frames/profiles are disposable.

## Current web delivery

The tutorial library serves standalone MP4 clips. The seven language indexes provide frame timing and localized keyboard cues for the native video player. Keep the MP4 hash in each content URL in sync with the published bytes.

Run the tutorial-hotkeys and tutorial-loading tests after changing delivery. Check actual looping playback, cue readability and green ping placement at desktop and mobile page sizes.
