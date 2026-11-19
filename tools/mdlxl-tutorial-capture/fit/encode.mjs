// Turns one locale's recorded compositor frames into 25 fps H.264 MP4s, the card PNG and animation-index records.
// Usage: node encode.mjs <locale>   (en, es, ru, zh, fr, de)
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process';
const WORK = process.env.LPW_WORK || 'D:/Claude/fit-tutorial-work';
const SITE = process.env.LPW_SITE || 'D:/Claude/LowPolyWorks-fit-tutorial/dist/mdlxl/tutorials';
const FFMPEG = 'D:/Claude/MDLxL/electron/ffmpeg/ffmpeg.exe', FPS = 25, STEP = 1000 / FPS, W = 1920, H = 1008, FH = 1009;
const locale = process.argv[2];
if (!['en', 'es', 'ru', 'zh', 'fr', 'de'].includes(locale)) throw Error('Expected a locale');
const out = WORK + '/captures/' + locale, manifest = JSON.parse(fs.readFileSync(out + '/manifest.json', 'utf8'));
const target = locale === 'en' ? SITE : SITE + '/' + locale, urlBase = '/mdlxl/tutorials/' + (locale === 'en' ? '' : locale + '/');
const indexFile = target + '/animation-index.json', index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
const insideWork = p => { const r = path.resolve(p); if (!r.startsWith(path.resolve(WORK) + path.sep)) throw Error('Outside work folder: ' + p); return r; };
const report = { locale, clips: {} };
for (const [name, raw] of Object.entries(manifest)) {
  // Steps recorded with s.cut() are left out: every later time moves back by the length of the cuts before it.
  const cuts = (raw.cuts || []).sort((a, b) => a.t0 - b.t0);
  const shift = t => { let d = 0; for (const c of cuts) { if (t >= c.t1) d += c.t1 - c.t0; else if (t > c.t0) d += t - c.t0; } return t - d; };
  const clip = { ...raw, t1: shift(raw.t1), frames: raw.frames.filter(f => !cuts.some(c => f.t > c.t0 && f.t < c.t1)).map(f => ({ ...f, t: shift(f.t) })),
    cues: raw.cues.map(c => ({ ...c, t0: shift(c.t0), t1: shift(c.t1) })), pings: raw.pings.map(p => ({ ...p, t0: shift(p.t0), t1: shift(p.t1) })), phases: raw.phases.map(p => ({ ...p, t: shift(p.t) })) };
  const frames = clip.frames.filter(f => f.w === W && f.h >= H).sort((a, b) => a.t - b.t);
  if (!frames.length) throw Error('No full-size frames ' + name);
  const count = Math.round((clip.t1 - clip.t0) * FPS);
  const encode = insideWork(out + '/encode/' + name);
  fs.rmSync(encode, { recursive: true, force: true }); fs.mkdirSync(encode, { recursive: true });
  // Each output frame shows the newest compositor frame painted by its time; held frames are hard links.
  let k = 0;
  for (let n = 0; n < count; n++) {
    const t = clip.t0 + n / FPS;
    while (k + 1 < frames.length && frames[k + 1].t <= t) k++;
    fs.linkSync(frames[k].file, encode + '/' + String(n).padStart(5, '0') + '.jpg');
  }
  const file = target + '/' + name + '.mp4';
  const result = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', encode + '/%05d.jpg',
    '-vf', `crop=${W}:${H}:0:0,format=yuv420p`, '-c:v', 'libopenh264', '-b:v', '2600k', '-g', '50', '-movflags', '+faststart', '-an', file], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw Error(result.stderr);
  const at = t => Math.max(0, Math.min(count, Math.round((t - clip.t0) * FPS)));
  const ranges = [];
  const phases = clip.phases.length ? clip.phases : [{ name: 'clip', t: clip.t0 }];
  phases.forEach((p, i) => { const start = i ? at(p.t) : 0, end = i + 1 < phases.length ? at(phases[i + 1].t) : count; if (end > start) ranges.push({ start, end, phase: p.name }); });
  // Keyboard captions stay up for at least HOLD frames so they can be read, until the next caption starts.
  const HOLD = 35;
  const cues = clip.cues.map(c => ({ startFrame: at(c.t0), endFrame: Math.max(at(c.t0) + 1, at(c.t1)), key: c.key })).filter(c => c.startFrame < count);
  cues.forEach((c, i) => { c.endFrame = Math.min(Math.max(c.endFrame, c.startFrame + HOLD), cues[i + 1]?.startFrame ?? count, count); });
  // A key pressed just before the next one (A, then Shift + click) still shows for MIN frames; the next caption waits.
  const MIN = 12;
  cues.forEach((c, i) => { const next = cues[i + 1]; if (next && c.endFrame - c.startFrame < MIN && next.endFrame - (c.startFrame + MIN) >= MIN) { c.endFrame = c.startFrame + MIN; next.startFrame = c.endFrame; } });
  const pings = clip.pings.map(p => ({ startFrame: at(p.t0), endFrame: at(p.t1), x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, selector: p.selector }));
  // Card: the last frame of fit-move, the snake's UVs inside the area with the model in the live preview.
  const cards = { 'fit-move': ['fit-card.png'] };
  if (cards[name]) {
    const [cardName] = cards[name]; const card = target + '/' + cardName, frame = Math.max(0, count - 12);
    const c = spawnSync('python', ['-I', '-c', `from PIL import Image;Image.open(r'${encode}/${String(frame).padStart(5, '0')}.jpg').crop((0,0,${W},${H})).resize((960,504),Image.LANCZOS).convert('RGB').quantize(256,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.FLOYDSTEINBERG).save(r'${card}',optimize=True)`], { encoding: 'utf8', windowsHide: true });
    if (c.status !== 0) throw Error(c.stderr);
    report.cards = { ...report.cards, [cardName]: urlBase + cardName + '?v=' + hash(card) };
    report.cardFrame = frame;
  }
  index[name] = { durations: Array(count).fill(STEP), ranges, cues, url: urlBase + name + '.mp4?v=' + hash(file) };
  report.clips[name] = { frames: count, durationMs: count * STEP, sourceFrames: frames.length, bytes: fs.statSync(file).size, mp4: hash(file), cues, pings, ranges };
  fs.rmSync(encode, { recursive: true });
  console.log(locale + '/' + name + ': ' + count + ' frames from ' + frames.length + ' compositor frames, ' + Math.round(fs.statSync(file).size / 1024) + ' KB');
}
fs.writeFileSync(indexFile, JSON.stringify(index) + '\n');
fs.writeFileSync(out + '/encoded.json', JSON.stringify(report, null, 1));
