# Decodes every Fit tutorial MP4 completely and checks it against its animation-index record and the
# capture's recorded ping positions. Usage: python -I verify-media.py  (writes <work>/report/media.json)
import json, os, subprocess, sys, glob, shutil, hashlib
from pathlib import Path
from PIL import Image
SITE = Path(os.environ.get('LPW_SITE', 'D:/Claude/LowPolyWorks-fit-tutorial/dist/mdlxl/tutorials'))
WORK = Path(os.environ.get('LPW_WORK', 'D:/Claude/fit-tutorial-work'))
FFMPEG = 'D:/Claude/MDLxL/electron/ffmpeg/ffmpeg.exe'
CLIPS = {'': ['fit-area', 'fit-move']}
CARDS = ['fit-card.png']
PAGES = ['en', 'es', 'ru', 'zh', 'fr', 'de', 'mordor']
W, H = 1264, 760
report = {'clips': []}
tmp = WORK / 'verify-frames'
for page in PAGES:
    folder = SITE if page == 'en' else SITE / page
    index = json.loads((folder / 'animation-index.json').read_text(encoding='utf8'))
    html = (folder / 'content.html').read_text(encoding='utf8')
    source = 'en' if page == 'mordor' else page
    assert html.count('id="tab-fit"') == 1 and html.count('id="tutorial-fit"') == 1, (page, 'Fit card/article missing or doubled')
    assert 'PLACEHOLDER' not in html and 'data-placeholder' not in html, (page, 'placeholder left over')
    # The Mordor page shows the English card from the English folder, like the other vertex guides.
    cardFolder = SITE if page in ('en', 'mordor') else folder
    rel = '/mdlxl/tutorials/' + ('' if page in ('en', 'mordor') else page + '/') + 'fit-card.png?v=' + hashlib.sha256((cardFolder / 'fit-card.png').read_bytes()).hexdigest()[:16]
    assert '<img src="' + rel + '" width="1264" height="760"' in html, (page, 'card picture')
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
            # A moment of plain view is real (Showcase draws its background before the model); a mostly plain clip is not.
            sampled = len(range(0, count, 10)) + 1
            assert len(blank) <= max(1, sampled // 20), (page, clip, 'blank viewport frames', blank[:5])
            # Each green ping: in the middle of its interval, green ring pixels surround the recorded control centre.
            pings = []
            for p in encoded['clips'][clip]['pings']:
                mid = (p['startFrame'] + p['endFrame']) // 2
                # Green already on screen just before the ping (green icon text such as OPXL/EMTR) is not ring.
                with Image.open(frames[max(0, p['startFrame'] - 2)]) as before:
                    pre = before.convert('RGB')
                green = lambda c: c[1] > 200 and c[0] < 140 and c[2] < 170 and c[1] - c[0] > 90
                with Image.open(frames[mid]) as im:
                    rgb = im.convert('RGB')
                    xs, ys = [], []
                    for y in range(max(0, int(p['y']) - 45), min(H, int(p['y']) + 46)):
                        for x in range(max(0, int(p['x']) - 45), min(W, int(p['x']) + 46)):
                            if green(rgb.getpixel((x, y))) and not green(pre.getpixel((x, y))): xs.append(x); ys.append(y)
                    assert len(xs) > 120, (page, clip, 'ping not drawn', p, len(xs))
                    # Keep the ring's own span: stray green pixels separated from it by a gap are other content.
                    def span(values):
                        runs, run = [], []
                        for v in sorted(set(values)):
                            if run and v - run[-1] > 4: runs.append(run); run = []
                            run.append(v)
                        runs.append(run)
                        return max(runs, key=len)
                    sx, sy = span(xs), span(ys)
                    keep = [(x, y) for x, y in zip(xs, ys) if sx[0] <= x <= sx[-1] and sy[0] <= y <= sy[-1]]
                    xs, ys = [k[0] for k in keep], [k[1] for k in keep]
                    # A ring cut off by the frame edge is measured from its uncut side, using the other axis' radius.
                    hx, hy = (max(xs) - min(xs)) / 2, (max(ys) - min(ys)) / 2
                    cx = max(xs) - hy if min(xs) == 0 else min(xs) + hy if max(xs) == W - 1 else min(xs) + hx
                    cy = max(ys) - hx if min(ys) == 0 else min(ys) + hx if max(ys) == H - 1 else min(ys) + hy
                    # A ring cut by the frame edge is measured from its other side; allow that estimate 2 px more.
                    tol = 5 if min(xs) == 0 or max(xs) == W - 1 or min(ys) == 0 or max(ys) == H - 1 else 3
                    assert abs(cx - p['x']) <= tol and abs(cy - p['y']) <= tol, (page, clip, 'ping off centre', p, cx, cy)
                    pings.append({'selector': p['selector'], 'frame': mid, 'control': [p['x'], p['y']], 'ringCentre': [cx, cy], 'greenPixels': len(xs)})
            report['clips'].append({'page': page, 'clip': clip, 'bytes': len(data), 'frames': count, 'durationMs': count * 40, 'cues': rec['cues'], 'pings': pings})
            shutil.rmtree(tmp)
    for name in CARDS:
        card = (SITE if page in ('en', 'mordor') else folder) / name
        with Image.open(card) as im: assert im.size == (W, H), (page, name, 'card size')
(WORK / 'report').mkdir(exist_ok=True)
(WORK / 'report' / 'media.json').write_text(json.dumps(report, indent=1), encoding='utf8')
n = len(report['clips'])
print(f"PASS: {n} MP4s fully decoded ({sum(c['frames'] for c in report['clips'])} frames, {W}x{H}, 40 ms); hashes, players, cues, phases and {sum(len(c['pings']) for c in report['clips'])} green pings centred within 3 px (5 px for a ring cut by the frame edge).")
