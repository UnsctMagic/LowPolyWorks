"""Build web copies of the UI art in dist/ui and the card thumbnails in dist/thumbs.

PNG files in dist/ui stay the masters (what artists and Codex deliver).
This writes a pixel-identical lossless WebP next to each referenced master,
plus small derivatives for images that are only ever displayed small.

Card thumbnails (thumbs/unit-*.png, thumbs/formation-*.png) get a high-quality WebP
used by the army and card pages. The PNG stays the capture master and the Discord/OG image.
dist/thumbs/webp-manifest.json records the SHA-256 of each PNG a WebP was made from;
node tools/check-project.mjs fails when a PNG is recaptured without rebuilding its WebP.

Usage:  python tools/optimize-ui.py          (needs Pillow: pip install pillow)
        python tools/optimize-ui.py --check  (fails if a web copy is missing)
"""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image

DIST = Path(__file__).resolve().parent.parent / 'dist'
UI = DIST / 'ui'
THUMBS = DIST / 'thumbs'
MANIFEST = THUMBS / 'webp-manifest.json'
THUMB_QUALITY = 92

# Masters served as lossless WebP (same pixels, smaller file).
LOSSLESS = [
    'blue-stone-v1', 'slate-frame-v2', 'iron-chain-v2', 'portrait-stone-classic-v3',
    'lowpolyworks-type-source', 'lowpolyworks-header-source', 'lowpolyworks-cleaned-source',
    'warhammercraft-header-source',
]
# Masters that are only shown small: name -> (derivative suffix, edge length in px).
DERIVED = {
    'mdlxl-icon': [('256', 256)],
}


def outputs():
    for name in LOSSLESS:
        yield UI / f'{name}.png', UI / f'{name}.webp', None
    for name, sizes in DERIVED.items():
        for suffix, edge in sizes:
            yield UI / f'{name}.png', UI / f'{name}-{suffix}.webp', edge
            yield UI / f'{name}.png', UI / f'{name}-{suffix}.png', edge


def build(src, dst, edge):
    image = Image.open(src)
    if edge:
        image = image.copy()
        image.thumbnail((edge, edge), Image.LANCZOS)
    if dst.suffix == '.webp':
        image.save(dst, 'WEBP', lossless=True, quality=100, method=6, exact=True)
    else:
        image.save(dst, 'PNG', optimize=True)


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def thumbs(check):
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    stale = []
    sources = sorted([*THUMBS.glob('unit-*.png'), *THUMBS.glob('formation-*.png')])
    for src in sources:
        dst = src.with_suffix('.webp')
        digest = sha256(src)
        if dst.exists() and manifest.get(src.name) == digest:
            continue
        if check:
            stale.append(dst.name)
            continue
        Image.open(src).save(dst, 'WEBP', quality=THUMB_QUALITY, alpha_quality=100, method=6)
        manifest[src.name] = digest
        print(f'{dst.name}: {src.stat().st_size // 1024} KB -> {dst.stat().st_size // 1024} KB')
    if not check:
        names = {src.name for src in sources}
        MANIFEST.write_text(json.dumps({k: v for k, v in sorted(manifest.items()) if k in names}, indent=1) + '\n')
    return stale


def main():
    check = '--check' in sys.argv
    stale = []
    for src, dst, edge in outputs():
        if check:
            if not dst.exists():
                stale.append(dst.name)
            continue
        build(src, dst, edge)
        print(f'{dst.name}: {src.stat().st_size // 1024} KB -> {dst.stat().st_size // 1024} KB')
    stale += thumbs(check)
    if stale:
        sys.exit('Missing UI web copies: ' + ', '.join(stale) + '. Run python tools/optimize-ui.py')


if __name__ == '__main__':
    main()
