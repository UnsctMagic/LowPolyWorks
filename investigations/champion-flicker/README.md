# Aspiring Champion flicker: Claude handoff

Status: unresolved. This branch contains the investigation and a reproducible comparison, not an accepted fix. No production rendering file is changed by this handoff commit.

The user wants Claude to take over this issue. Investigate the flickering in the normal Aspiring Champion website preview, prove the result on that normal page, and preserve the original MDX, textures, native particles, team glow, and ordinary mouse rotation. Do not deploy either rejected candidate below as a fix.

## Reproduce

From the repository root of a checkout of this branch, using Node 18 or newer:

```sh
git fetch origin gh-pages
node investigations/champion-flicker/depth-server.mjs
```

Open `http://127.0.0.1:4189/model/aspiring/?depth-test=1` in the affected Chrome. Let Stand play, zoom close, and rotate to the wrapped weapon shaft, cloak, and armour. The two buttons below the canvas switch clipping without resetting the camera or animation. The HUD reports the active clipping, zoom, near plane, and camera distance. The current live canvas also records camera and playback values in `data-depth-audit`.

The server reads the site assets from the tested gh-pages commit `098be1b3b095e4bc661fae2294b7c72e0a3674d8`, serves the archived `published-viewer.js` with diagnostic instrumentation, and proxies the public catalogue request to avoid local CORS failures. These changes are test-only. It writes `depth-viewer.js` and `normal-audit-viewer.js` next to the script at startup. No dependency installation or site build is needed. Stop it with Ctrl+C when the test ends.

`http://127.0.0.1:4189/__depth` is the earlier standalone comparison. It forces a camera position and zoom, so a smooth result there is insufficient evidence for the normal page. The normal page without `?depth-test=1` uses the archived published clipping unchanged.

## User-observed results

- Flicker affects the cloak, armour, and other parts. It stops when animation is paused with the camera still.
- Both the MDLxL main viewport and its Animations preview are smooth, according to the user.
- Disabling effects in the initial standalone comparison appeared smooth. An effects-enabled candidate also appeared smooth there, but still flickered on the normal page.
- Those initial tests moved the camera much nearer. Website wheel zoom changes projection zoom while leaving camera distance unchanged. This was a confounder, so the apparent effects fix was rejected.
- A corrected standalone test used camera distance 988.455 and zoom 6.67, with animation and effects enabled. The user said Published clipping flickered and the option labelled MDLxL clipping did not.
- Applying that clipping change to the normal page still flickered at close zoom. It was reverted in the local source and rejected for publication.
- The user supplied a close-up marking both edges of the wrapped weapon shaft and said it flickers. The latest normal-page comparison is available, but no user result comparing its two buttons has been received. The issue remains unresolved.

## Rejected candidates

1. `prepare-bindings.mjs` generates the former separate particle/ribbon vertex-array binding candidate from `published-viewer.js`. It preserves effects, but the user reported flicker on the normal page. The earlier smooth standalone view was confounded by physical camera distance.
2. The clipping candidate replaced

   ```js
   updateDepthClipping(camera,center,radius,clipRadius);
   ```

   with

   ```js
   updateDepthClipping(camera,center,row.id==='aspiring'?clipRadius:radius,clipRadius);
   ```

   At distance 988.455 this changed near from 0.473835 to 1.784952 and far from 2250.607 to 3665.884. It improved the standalone comparison, but failed the normal-page acceptance test. The UI label MDLxL clipping describes this isolated radius substitution; it does not prove that the entire camera setup matches the desktop app.

The existing published Champion bracer offset `gl.polygonOffset(-1,-8)` is unrelated prior work and remains in the archived renderer. Do not strip it or generalize it without evidence.

## Evidence and source pointers

- `verification.json`: test results and rejection status.
- `normal-depth-state.json`: one captured normal-page state, with zoom 13.151375, radius 236.917491, clipRadius 892.476215, distance 988.455, active animation, and effects enabled.
- `normal-depth-comparison.png`: normal-page comparison screenshot; a still image cannot prove temporal flicker.
- `published-viewer.js`, `published-adapter.js`, `published-playback.js`: archived source snapshots used during the investigation. Production source lives under `dist/` on main; gh-pages uses the root paths.
- `pose-audit.mjs`, `loader.mjs`, `pose-audit.json`: two Stand loops sampled at 60 fps using the native renderer and MDLxL pose evaluator. Maximum matrix difference was 0.000121737, consistent with Float32 rounding. No abnormal pose discontinuity was established. This does not prove rendering correctness.

To rerun the pose audit from the repository root:

```sh
node --experimental-loader ./investigations/champion-flicker/loader.mjs investigations/champion-flicker/pose-audit.mjs
```

Relevant current owners: `dist/viewer.js`, `dist/viewer-effects.js`, `dist/website-camera-controls.js`, and vendored MDLxL `app/viewport-math.js`, `app/editor-camera-controls.js`, `app/warcraft-preview-adapter.js`, and `app/showcase-playback.js`. Inspect current code before editing; imported libraries must remain unchanged under the project instructions.

The desktop reference inspected on this machine was MDLxL 0.20.0 at `D:/MDLxLVisButton/MDLxL-win32-x64-0.20.0/MDLxL.exe`. Its saved graphics settings had particles disabled; the user's report that both desktop views are smooth is stronger evidence than assumptions about an unrelated source checkout. The desktop GamePreview source passes clipRadius as the clipping radius and also includes grid extent, so the web substitution above is only a partial comparison.

Model identity: catalogue id `aspiring`, file `WH_WOC_Aspiring12.mdx`, 21 geosets, 15 animations. SHA-256 of the supplied, local, and published model was verified as:

```text
7d3d9b3911a061c5bf9c7d7af5a3beaa0cd93eea2c28d963973b767bc5034acf
```

The original recording remains local at `C:/Users/PC/Documents/ShareX/Screenshots/2026-10/chrome_hRdvirck8K.mp4`. It is not included in this Git handoff. The screenshot marking the shaft was also supplied in the chat; its browser chrome is not uploaded here.

The shared working checkout contains many unrelated dirty files and is older than current remote source. This handoff branch starts from remote main `961b759a0d87288446fb6dc36120fc9e812c29af` and adds only this investigation directory. Continue from a clean checkout of this branch. Publication to main/gh-pages is a separate action; this request authorizes the handoff push only.
