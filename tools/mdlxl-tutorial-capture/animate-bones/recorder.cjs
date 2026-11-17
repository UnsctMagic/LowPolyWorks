// Shared recording session for the Focused Skeleton and POSE tutorials.
// Opens MDLxL (hidden, off-screen) on the Footman copy in one language and records clips from the
// Chromium compositor (CDP screencast). Input is real Playwright mouse and keyboard.
const fs = require('node:fs');
const APP = process.env.LPW_APP || 'D:/Claude/MDLxL/.claude/worktrees/tut-app';
const WORK = process.env.LPW_WORK || 'D:/Claude/animtut2-work';
const { launchApp, closeApp } = require(APP + '/test/helpers/app.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function openSession({ locale, out, debug = false }) {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out + '/raw', { recursive: true });
  const { app, page } = await launchApp({ fixture: WORK + '/models/' + (process.env.LPW_MODEL || 'WH_VC_LahmianVampire01.mdx'), out, show: 'inactive',
    bounds: { x: -3000, y: 0, width: 1280, height: 800 }, env: { MDLVIS_GAME_DATA: 'D:/Warcraft III' },
    settings: { preferences: { language: locale, showHotkeys: false, graphics: { pauseWhenHidden: false } } } });
  const manifest = {}, proof = { locale, checks: [] };
  const cdp = await page.context().newCDPSession(page);
  let rec = null, frameNo = 0;
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    if (!rec) return;
    const file = out + '/raw/' + rec.id + '/' + String(frameNo++).padStart(5, '0') + '.jpg';
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    rec.frames.push({ file, t: metadata.timestamp, w: metadata.deviceWidth, h: metadata.deviceHeight });
  });
  const now = () => Date.now() / 1000;
  const s = { app, page, proof, manifest, sleep, now };
  s.shot = async name => { if (debug) await page.screenshot({ path: out + '/debug-' + name + '.png' }); };
  s.check = (ok, message, data) => { proof.checks.push({ ok: !!ok, message, data }); if (!ok) throw Error(message + ' ' + JSON.stringify(data ?? '')); };
  s.begin = async id => {
    if (rec) throw Error('Already recording');
    fs.mkdirSync(out + '/raw/' + id, { recursive: true });
    frameNo = 0;
    rec = { id, frames: [], cues: [], pings: [], phases: [], t0: now() };
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await sleep(700);
  };
  s.end = async (hold = 900) => {
    await sleep(hold);
    rec.t1 = now();
    await cdp.send('Page.stopScreencast');
    await sleep(150);
    manifest[rec.id] = rec;
    fs.writeFileSync(out + '/manifest.json', JSON.stringify(manifest, null, 1));
    rec = null;
  };
  s.phase = name => rec?.phases.push({ name, t: now() });
  // A keyboard cue shown as a caption while the key (or key + mouse) action runs.
  s.cue = async (key, action, after = 350) => {
    const item = { key, t0: now() };
    rec?.cues.push(item);
    await action();
    await sleep(after);
    item.t1 = now();
  };
  // The standard green ring + crosshair, centred on a control, drawn into the app while it is recorded.
  s.ping = async (selector, ms = 1700) => {
    const point = selector && typeof selector === 'object' && 'x' in selector;
    const target = point ? null : typeof selector === 'string' ? page.locator(selector).first() : selector;
    const box = point ? { x: selector.x, y: selector.y, width: 0, height: 0 } : await target.boundingBox();
    if (typeof selector !== 'string') selector = point ? (selector.name || 'point') : String(selector);
    if (!box) throw Error('No control for ping ' + selector);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.evaluate(({ x, y }) => {
      document.getElementById('tutorial-cue')?.remove();
      const e = document.createElement('div');
      e.id = 'tutorial-cue';
      e.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:80px;height:80px;transform:translate(-50%,-50%);pointer-events:none;z-index:2147483647`;
      e.innerHTML = '<svg viewBox="0 0 96 96" style="overflow:visible"><path fill="none" stroke="#001807" stroke-width="6"/><path fill="none" stroke="#30ff70" stroke-width="3"/></svg>';
      document.body.append(e);
      const start = performance.now();
      const draw = t => {
        if (!e.isConnected) return;
        const age = (t - start) % 1600, r = 27 + 5 * Math.sin(age / 75);
        let d = 'M ' + (48 + r) + ' 48 a ' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0 a ' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0';
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) d += ' M ' + (48 + dx * (r - 7)) + ' ' + (48 + dy * (r - 7)) + ' L ' + (48 + dx * (r + 11)) + ' ' + (48 + dy * (r + 11));
        for (const p of e.querySelectorAll('path')) p.setAttribute('d', d);
        requestAnimationFrame(draw);
      };
      requestAnimationFrame(draw);
    }, { x, y });
    const item = { selector, x, y, t0: now() };
    rec?.pings.push(item);
    await sleep(ms);
    await page.evaluate(() => document.getElementById('tutorial-cue')?.remove());
    item.t1 = now();
    return { x, y };
  };
  s.glide = async (from, to, ms = 900, button = null) => {
    await page.mouse.move(from.x, from.y);
    if (button) { await page.mouse.down({ button }); await sleep(120); }
    const steps = Math.max(8, Math.round(ms / 33));
    for (let i = 1; i <= steps; i++) {
      const k = i / steps, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      await page.mouse.move(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
      await sleep(ms / steps);
    }
    if (button) { await sleep(120); await page.mouse.up({ button }); }
  };
  await page.locator('canvas[data-clean-model-canvas], [data-hotkey="animation"]').first().waitFor({ timeout: 60000 });
  s.check(await page.evaluate(() => document.documentElement.lang) === locale || locale === 'en', 'UI language', await page.evaluate(() => document.documentElement.lang));
  s.close = async error => {
    rec = null;
    if (error) {
      fs.writeFileSync(out + '/error.txt', (error.stack || String(error)) + '\n' + JSON.stringify(proof.checks.slice(-3)));
      await page.screenshot({ path: out + '/failure.png' }).catch(() => {});
    } else fs.writeFileSync(out + '/done.json', JSON.stringify({ passed: true, locale, clips: Object.keys(manifest) }));
    fs.writeFileSync(out + '/proof.json', JSON.stringify(proof, null, 1));
    await closeApp(app).catch(() => {});
  };
  return s;
}
module.exports = { openSession, sleep, WORK };
