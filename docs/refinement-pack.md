# LowPolyWorks — BG1 Refinement Pack (technical)

Branch: `claude/bg1-refinement-pack` · Date: 2026-10-15 · Visual work: see `docs/codex-art-contract.md`

The site's look is a late-1990s Infinity Engine menu (Baldur's Gate 1): carved stone panels, gold trim, hand-painted low-resolution textures. That style is cheap to render, but the current files are not: the UI ships multi-megabyte, 1254 px "low-res looking" textures, and every page boots the full 3D stack. This pack fixes the engineering under the look without changing a single visible pixel, and sets up a clean intake path for the new art.

## 1. Done in this branch

| Change | Why | Result |
|---|---|---|
| Catalogue survives a publishing-service outage | `app.js` rendered `Failed to fetch` for every army and model page whenever the Cloudflare Worker was unreachable. The static `catalogue.json` is now the baseline; uploaded cards, hidden models and edits are layered on when the Worker answers (6 s timeout). | Armies, model pages and the 3D viewer work with the Worker down |
| 3D viewer loads on demand | `viewer.js` was a static import, so Three.js, war3-model and the 0.9 MB `textures.json` loaded on the feed, MDLxL and army pages. It is now a dynamic import on model pages only. | Feed 15.1 → 8.3 MB; MDLxL page 16.3 → 8.3 MB |
| Card thumbnails as WebP | 1024 px PNG renders (≈ 600 KB each) were used for 250 px cards and 34 px variant tabs. `tools/optimize-ui.py` builds q92 WebP copies; PNGs stay the capture masters and the Discord/OG image. | Thumbnails 44 MB → 6 MB; armies overview ≈ 20 → 10 MB |
| Thumbnail staleness guard | `dist/thumbs/webp-manifest.json` stores the SHA-256 of each PNG; `check-project` fails if a card is recaptured without rebuilding its WebP. | No silent stale cards |
| UI art as lossless WebP | Same pixels, smaller files, for the stone, frame, chain, portrait-stone and header art. Masters stay in `dist/ui/*.png`. | ≈ 3 MB saved per first visit |
| 256 px MDLxL icon | The 1254 px, 1.2 MB icon was used as a 48 px nav icon and favicon. | 1.2 MB → 46 KB |
| Card images: `width`/`height`, `loading="lazy"`, `decoding="async"` | No layout shift; off-screen cards don't download. | |
| `server.mjs` MIME types | `.webp`, `.gif`, `.woff2`, `.jpg`, `.ico`, `.xml` were served as `application/octet-stream`. | |
| Cache keys | `style.css`, `app.js`, `menu-visitor.js`, `mdlxl.js` bumped to `20261015-bg1-refinement`; model pages regenerated. | |

`node tools/check-project.mjs` and all `tools/*.test.mjs` pass. Measured locally with headless Chromium, Worker unreachable in both runs.

**New step after capturing cards or replacing UI art:** `python tools/optimize-ui.py` (needs Pillow), then `node tools/model-pages.mjs` and `node tools/check-project.mjs`. Add this to the portrait workflow in `AGENTS.md` before merging.

## 2. Next technical steps (priority order)

1. **Native-resolution UI art (biggest remaining win).** Remaining feed weight is mostly art: `blue-stone-v1` 1.9 MB, `ui/visitor/*` ≈ 2 MB, header type ≈ 1 MB, portrait stone 1.2 MB. Real 1998 UI was authored at 640×480; textures of 128–256 px rendered at 2× with `image-rendering: pixelated` look *more* authentic and weigh kilobytes. Covered by the Codex contract.
2. **Pixel-exact frames.** Every panel uses `border-image: url(slate-frame) 180 stretch` on a 1254 px image shown at 10–20 px borders — a 9–18× non-integer downsample that smears the carving. Replace with a native 9-slice (24 px slices) drawn at exactly 1× or 2× with `round`. Integration CSS is in the contract.
3. **Self-hosted fonts.** Cinzel and IM Fell English come from `fonts.googleapis.com` via a render-blocking `@import`. That is a GDPR exposure for EU visitors (IP sent to Google; LG München 2022) and a white-flash risk. Drop the `.woff2` files (OFL licensed) into `dist/fonts/` and replace the `@import` with `@font-face` + `font-display: swap`. Snippet in the contract §6.
4. **Reduced motion for Shredder.** The global `prefers-reduced-motion` rule stops CSS animation, but `menu-visitor.js` drives flight with `requestAnimationFrame`, so it still flies. Gate start-up (or switch to perched-only) on `matchMedia('(prefers-reduced-motion: reduce)')`.
5. **One fetch per session for the publishing catalogue.** It is re-requested on every route change. Cache the promise for the session and retry only after a failure plus back-off.
6. **Split `textures.json` (0.9 MB).** The viewer needs only entries for the open model. Emit one small index per model during `model-pages.mjs`.
7. **Content-hashed asset names.** Hand-edited `?v=` keys are spread over `index.html`, `app.js` imports and generated pages; one missed key means visitors keep stale code. A small step in `model-pages.mjs` that stamps `?v=<sha-8>` from file contents removes the manual step.
8. **Compression on the local server.** GitHub Pages already gzips; `server.mjs` does not, so local timings overstate costs. Optional.

## 3. What stays as is

- MDX bytes, native texture paths and team-colour rendering rules from `AGENTS.md`.
- `dist/thumbs/*.png` remain the capture outputs and OG images.
- No build step for the site itself; `optimize-ui.py` is an authoring tool, its outputs are committed.
