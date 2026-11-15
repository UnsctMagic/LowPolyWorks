# Decodes every Animated, Each Piece and Call Upon Forge tutorial MP4 completely and checks it against its animation-index record and the
# capture's recorded ping positions. Usage: python -I verify-media.py  (writes <work>/report/media.json)
import json, os, subprocess, sys, glob, shutil, hashlib
from pathlib import Path
from PIL import Image
SITE = Path(os.environ.get('LPW_SITE', 'D:/Claude/LowPolyWorks-animated-tutorial/dist/mdlxl/tutorials'))
WORK = Path(os.environ.get('LPW_WORK', 'D:/Claude/animtut-work'))
FFMPEG = 'D:/Claude/MDLxL/electron/ffmpeg/ffmpeg.exe'
CLIPS = {'': ['animated-pose', 'animated-edit', 'animated-each-piece'], 'forge-': ['forge-open', 'forge-isolate', 'forge-bevel', 'forge-bend', 'forge-check']}
CARDS = ['animated-card.png', 'each-piece-card.png', 'forge-card.png']
PAGES = ['en', 'es', 'ru', 'zh', 'fr', 'de', 'mordor']
W, H = 1264, 760
report = {'clips': []}
tmp = WORK / 'verify-frames'
for page in PAGES:
    folder = SITE if page == 'en' else SITE / page
    index = json.loads((folder / 'animation-index.json').read_text(encoding='utf8'))
    html = (folder / 'content.html').read_text(encoding='utf8')
    source = 'en' if page == 'mordor' else page
    for key in ['animated', 'eachpiece', 'forge']:
        assert html.count('id="tab-' + key + '"') == 1 and html.count('id="tutorial-' + key + '"') == 1, (page, key, 'card/article missing or doubled')
    assert 'animated-forge' not in index and not (folder / 'animated-forge.mp4').exists() and 'animated-forge' not in html, (page, 'old combined clip left over')
    for prefix, clips in CLIPS.items():
      encoded = json.loads((WORK / 'captures' / (prefix + source) / 'encoded.json').read_text(encoding='utf8'))
      for clip in clips:
            rec = index[clip]
            mp4 = folder / (clip + '.mp4')
            data = mp4.read_bytes()
            assert rec['url'] == '/mdlxl/tutorials/' + ('' if page == 'en' else page + '/') + clip + '.mp4?v=' + hashlib.sha256(data).hexdigest()[:16], (page, clip, 'url hash')
            assert 'data-tutorial-video="' + rec['url'] + '"' in html, (page, clip, 'player missing')
            if tmp.exists(): shutil.rmtree(tmp)
            tmp.mkdir(parents=True)
            subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-i', str(mp4), str(tmp / '%05d.bmp')], check=True)
            frames = sorted(glob.glob(str(tmp / '*.bmp')))
            count = len(rec['durations'])
            assert len(frames) == count, (page, clip, 'decoded frames', len(frames), count)
            assert all(d == 40 for d in rec['durations']), (page, clip, 'frame timing')
            assert rec['ranges'][0]['start'] == 0 and rec['ranges'][-1]['end'] == count, (page, clip, 'phase coverage')
            for c in rec['cues']:
                assert 0 <= c['startFrame'] < c['endFrame'] <= count and c['endFrame'] - c['startFrame'] >= 8, (page, clip, 'cue', c)
            blank = []
            for i, f in enumerate(frames):
                with Image.open(f) as im:
                    assert im.size == (W, H), (page, clip, 'size', im.size)
                    if i % 10 == 0 or i == count - 1:
                        view = im.convert('RGB').crop((40, 160, 1000, 700)).resize((96, 54))
                        if len(view.getcolors(96 * 54) or []) < 40: blank.append(i)
            assert not blank, (page, clip, 'blank viewport frames', blank[:5])
            # Each green ping: in the middle of its interval, green ring pixels surround the recorded control centre.
            pings = []
            for p in encoded['clips'][clip]['pings']:
                mid = (p['startFrame'] + p['endFrame']) // 2
                with Image.open(frames[mid]) as im:
                    rgb = im.convert('RGB')
                    xs, ys = [], []
                    for y in range(max(0, int(p['y']) - 45), min(H, int(p['y']) + 46)):
                        for x in range(max(0, int(p['x']) - 45), min(W, int(p['x']) + 46)):
                            r, g, b = rgb.getpixel((x, y))
                            if g > 200 and r < 140 and b < 170 and g - r > 90: xs.append(x); ys.append(y)
                    assert len(xs) > 120, (page, clip, 'ping not drawn', p, len(xs))
                    # A ring cut off by the frame edge is measured from its uncut side, using the other axis' radius.
                    hx, hy = (max(xs) - min(xs)) / 2, (max(ys) - min(ys)) / 2
                    cx = max(xs) - hy if min(xs) == 0 else min(xs) + hy if max(xs) == W - 1 else min(xs) + hx
                    cy = max(ys) - hx if min(ys) == 0 else min(ys) + hx if max(ys) == H - 1 else min(ys) + hy
                    assert abs(cx - p['x']) <= 3 and abs(cy - p['y']) <= 3, (page, clip, 'ping off centre', p, cx, cy)
                    pings.append({'selector': p['selector'], 'frame': mid, 'control': [p['x'], p['y']], 'ringCentre': [cx, cy], 'greenPixels': len(xs)})
            report['clips'].append({'page': page, 'clip': clip, 'bytes': len(data), 'frames': count, 'durationMs': count * 40, 'cues': rec['cues'], 'pings': pings})
            shutil.rmtree(tmp)
    for name in CARDS:
        card = (folder if page != 'mordor' else SITE) / name
        with Image.open(card) as im: assert im.size == (W, H), (page, name, 'card size')
(WORK / 'report').mkdir(exist_ok=True)
(WORK / 'report' / 'media.json').write_text(json.dumps(report, indent=1), encoding='utf8')
n = len(report['clips'])
print(f"PASS: {n} MP4s fully decoded ({sum(c['frames'] for c in report['clips'])} frames, {W}x{H}, 40 ms); hashes, players, cues, phases and {sum(len(c['pings']) for c in report['clips'])} green pings centred within 3 px.")
