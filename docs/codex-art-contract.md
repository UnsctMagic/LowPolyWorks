# Codex Art Contract — LowPolyWorks BG1 Visual Pass

**Owner of this contract:** Codex (all image generation and art edits)
**Specified by:** Claude, with `docs/refinement-pack.md` (technical side, already on branch `claude/bg1-refinement-pack`)
**Repo:** `UnsctMagic/LowPolyWorks` · work on a new branch from `claude/bg1-refinement-pack`, e.g. `codex/bg1-art-pass`
**Do not publish to `gh-pages`.** Deliver a branch plus a local test link; the owner approves publication.

---

## 1. Goal

Make LowPolyWorks read unmistakably as a **1998 Infinity Engine menu (Baldur's Gate 1)** while staying light enough to load fast. Today the site uses hi-res (1254 px) textures that only imitate low-res art; this pass replaces them with art authored **at native low resolution** and displayed at integer scale, which is both more authentic and a fraction of the size.

## 2. Style direction (applies to every asset)

The target is the *feel* of BG1's UI, not its files.

- **Original art only.** Do not extract, trace, upscale, or closely reproduce any Baldur's Gate / BioWare / Beamdog asset, logo, or screenshot. Do not put "Baldur's Gate" or any of its marks in images or prompts as the subject. Describe the qualities instead (see prompt base below). References may inform material and palette only.
- **Era:** late-1990s pre-rendered 2D isometric RPG, 640×480 interface, hand-painted then reduced to a small palette.
- **Materials:** carved grey-green and umber stone; dark slate recesses; aged brass/bronze fittings and rivets; warm parchment for reading surfaces; small gem or knob accents.
- **Light:** single soft top-left light baked into every asset. Same direction everywhere; no rim light, glow, bloom, or lens effects.
- **Rendering:** visible pixel clusters, slight dithering, painted chips and wear. No photographic texture, no glossy 3D bevels, no modern UI gradients, no vignette, no noise grain.
- **Palette:** keep within the existing site tokens so CSS needs no colour changes:
  `--ink #111414` · `--iron #282d2e` · `--edge #595345` · `--gold #b9a171` · `--bone #dfd5b9` · `--body #b8bcc3` · `--muted #8d95a2`. Accents allowed: verdigris `#5e7a6a`, ruby `#8e1b1b` (matches variant dots), parchment `#c8b48a`–`#e6d5a8`.
- **No baked text** in any texture or frame (text stays HTML for accessibility and translation), except the wordmarks listed in §4.F.

**Prompt base** (prepend to every generation; it matches the existing `*.prompt.txt` convention):

> Original hand-painted 2D game UI asset in the style of late-1990s isometric fantasy RPG interfaces (640×480 era, pre-rendered, low colour count, visible pixel clusters, light dithering). Single soft top-left light. Materials: carved grey-green and umber stone, aged brass fittings, worn parchment. Not photorealistic, no 3D bevel shading, no glow, no vignette, no text, no logos, no characters.

Generate large, then **reduce to the native size in §4 with a palette quantise (≤ 64 colours per asset, Floyd–Steinberg or ordered dither)** and clean the result by hand at native size. Native size is the deliverable.

## 3. Hard technical rules

1. **Format:** PNG, sRGB, 8-bit; RGBA only where transparency is required. No colour profile chunks other than sRGB.
2. **Native size is the master.** The site will scale every asset by exactly 1× or 2× with `image-rendering: pixelated`. Do not deliver pre-upscaled art.
3. **Tiles must be seamless** on all four edges. Verify by composing a 3×3 grid at native size and checking the seams by eye (save the check as `*-tilecheck.png` in the scratch area, not in `dist/`).
4. **Location and names:** `dist/ui/bg1/<name>.png`, lowercase kebab-case, version suffix when replacing (`-v1`, `-v2`). One `<name>.prompt.txt` beside each asset with the exact tool, references and prompt used (existing convention, see `dist/ui/blue-stone-v1.prompt.txt`).
5. **Size budgets** (per file, PNG master): tiles ≤ 120 KB, frames ≤ 40 KB, buttons ≤ 20 KB per sheet, cursor ≤ 4 KB, Shredder sheets ≤ 250 KB each. The whole `dist/ui/bg1/` folder ≤ 1.5 MB.
6. **After adding art:** add each new name to `LOSSLESS` in `tools/optimize-ui.py`, run `python tools/optimize-ui.py`, then wire the `.webp` copy in CSS (masters stay PNG). Run `node tools/model-pages.mjs` and `node tools/check-project.mjs`.
7. **Never touch** model files, `dist/textures/`, catalogue data, or `dist/thumbs/*.png` captures. Do not alter team-colour or team-glow rendering (`AGENTS.md`).
8. **Keep the old files** until the owner approves; switch CSS references, don't delete masters.

## 4. Deliverables

### A. Page background tile — replaces `ui/blue-stone-v1.png` (1254 px, 2.8 MB)
- `bg1/stone-ground-v1.png` — **256×256**, opaque, seamless.
- Dark weathered flagstone/slate, mostly `--ink`–`--iron`, very low contrast so body text stays readable over the recess gradient. Irregular blocks 40–80 px, thin dark mortar.
- Shown at 2× (512 px tile).

### B. Panel frame (9-slice) — replaces `ui/slate-frame-v2.png` for `.slab`, `.masthead`, `.side-menu`, nav buttons, tabs
- `bg1/frame-stone-v1.png` — **96×96**, RGBA, centre 48×48 fully transparent.
- Slice grid exactly **24 px** on every side. Corners: carved stone with a small brass rivet or boss. Edges: straight carved moulding that **tiles** along its length (the 48 px middle of each edge must repeat cleanly; it will use `round`).
- Thin gold inner bevel line (1 px `--gold`, 1 px darker below) on the inside edge.
- `bg1/frame-stone-active-v1.png` — same grid, inner line brighter and a faint warm inner shadow: used for the selected tab and current nav item.

### C. Reading surface — journal feed posts, Description/Credits/Updates panel
- `bg1/parchment-v1.png` — **256×256**, opaque, seamless. Warm aged parchment, faint fibres and stains, no torn edges (edges come from the frame). Must pass contrast: body text `#2a1f12` on it ≥ 7:1 everywhere.
- `bg1/parchment-frame-v1.png` — 96×96, 24 px 9-slice, dark leather or wooden binding with brass corners, centre transparent.

### D. Buttons — `.iron-button`, Download MDX, Confirm by email, Pause
- `bg1/button-stone-v1.png` — sprite sheet **4 states stacked vertically**, each **96×32** (sheet 96×128): normal, hover (slightly lit), pressed (inset, 1 px down), disabled (desaturated). 9-slice inside each state: 12 px left/right, 8 px top/bottom; middle stretches horizontally.
- Rounded-rectangle carved stone with brass end caps. No text.

### E. Cursor
- `bg1/cursor-gauntlet-v1.png` — **32×32** RGBA, armoured gauntlet pointing up-left. Hotspot at the fingertip, state it in the prompt file (expected `2 2`).
- `bg1/cursor-gauntlet-grab-v1.png` — closed fist, same size, for the 3D viewer drag state.

### F. Wordmarks and icons
- Keep the existing **LowPolyWorks** and **WarhammerCraft** header art; re-export only, no redesign: `bg1/lowpolyworks-header-v1.png` and `bg1/warhammercraft-header-v1.png` at **exactly 2× their displayed CSS size** (measure in the browser at 1440 px width) instead of the current 1695/1774 px sources. The three-layer SVG mask in `index.html` must keep working: if you flatten the layers into one image, say so and supply the flattened file; Claude/the owner will simplify the SVG.
- Favicon: `bg1/favicon-32.png` and `bg1/favicon-180.png` (apple-touch) from the existing MDLxL helmet or a small carved-stone LP monogram — owner's choice, ask once.

### G. Shredder (menu visitor) — `ui/visitor/0–3.png` (≈ 2 MB total)
- **Re-export, don't redesign.** Same frames, same layout and frame order as today so `menu-visitor.js` needs no change except scale. Reduce each sheet to the smallest integer divisor at which the bird is still displayed at ≥ 1× (check the CSS/JS size each sheet is drawn at). Deliver as `ui/visitor/<n>.png` on the branch; keep the originals as `ui/visitor/<n>-hires.png`.
- If any sheet's frame layout would need to change, stop and report instead.

### H. Optional, only if A–G are approved
- Drop-cap initials for post titles (A–Z sprite, 48×48 each, illuminated in gold on dark stone).
- Portrait-stone background for the 3D viewer (`portrait-stone-classic-v3`) at 256×256.

## 5. Integration (CSS Codex should apply)

```css
:root{
  --stone:url('ui/bg1/stone-ground-v1.webp');
  --frame:url('ui/bg1/frame-stone-v1.webp');
  --frame-active:url('ui/bg1/frame-stone-active-v1.webp');
  --parchment:url('ui/bg1/parchment-v1.webp');
}
body{background:#0b0e12 var(--stone) 0 0/512px 512px;image-rendering:pixelated}
/* 9-slice at exactly 1x (24px) or 2x (48px) — never in between */
.slab,.masthead,.side-menu{border:24px solid transparent;border-image:var(--frame) 24 round}
nav a,.iron-button,.tabs button{border:24px solid transparent;border-image:var(--frame) 24 round}
.tabs button[aria-selected=true],nav a[aria-current=page]{border-image-source:var(--frame-active)}
.tab-content,.journal .post{background:#d9c69a var(--parchment) 0 0/512px 512px;color:#2a1f12}
html{cursor:url('ui/bg1/cursor-gauntlet-v1.png') 2 2,auto}
a,button,select,[role=tab]{cursor:url('ui/bg1/cursor-gauntlet-v1.png') 2 2,pointer}
.viewport canvas:active{cursor:url('ui/bg1/cursor-gauntlet-grab-v1.png') 2 2,grabbing}
```

Border widths currently vary (10–20 px); unifying to 24 px will shift layout slightly. Check every page at 1440 px and 390 px wide and adjust padding, not the slice size.

## 6. Fonts (asset task, no generation)

Download the OFL `.woff2` files for **Cinzel** (400, 600, 700, 800, Latin subset) and **IM Fell English** (regular and italic) into `dist/fonts/` with their `OFL.txt`. Replace the Google Fonts `@import` on line 1 of `style.css` with:

```css
@font-face{font-family:Cinzel;src:url('fonts/cinzel-latin-wght-normal.woff2') format('woff2');font-weight:400 800;font-display:swap}
@font-face{font-family:'IM Fell English';src:url('fonts/im-fell-english-latin-400-normal.woff2') format('woff2');font-display:swap}
@font-face{font-family:'IM Fell English';src:url('fonts/im-fell-english-latin-400-italic.woff2') format('woff2');font-style:italic;font-display:swap}
```

(Adjust file names to what you download; a variable Cinzel file covers 400–800 in one request.) Add `<link rel="preload" as="font" type="font/woff2" crossorigin href="fonts/…">` for the Cinzel file in `index.html`, then regenerate model pages.

## 7. Acceptance criteria

Codex reports done only when all hold:

- [ ] Every asset in §4 A–G exists at the stated native size, under its budget, with a `.prompt.txt`.
- [ ] Tiles show no seams in a 3×3 check at 1× and 2×.
- [ ] Frames render crisp at 1× and 2× (no blur, no half-pixel smearing) in Chrome and Firefox at 100% and 200% zoom.
- [ ] No baked text; no BG1/BioWare assets or marks used.
- [ ] `python tools/optimize-ui.py --check`, `node tools/model-pages.mjs`, `node tools/check-project.mjs` and all `tools/*.test.mjs` pass.
- [ ] Feed page total transfer (cold cache) ≤ 3 MB; armies overview ≤ 8 MB (currently 8.3 MB and ≈ 10 MB).
- [ ] Body text over parchment ≥ 7:1 contrast; over stone recesses ≥ 4.5:1.
- [ ] 3D viewer, team colours, team glow, Shredder flight and peanuts behave exactly as before.
- [ ] Screenshots before/after of: feed, armies overview, one army page, one model page (desktop 1440 px and mobile 390 px), committed to the PR description, not to `dist/`.
- [ ] Local test link provided (`node server.mjs` → `http://127.0.0.1:4178/`), server started in the background.

## 8. Out of scope

Layout redesign, new pages, copy changes, model work, catalogue data, the Worker/tracker, and publishing. Raise anything else as a question before doing it.
