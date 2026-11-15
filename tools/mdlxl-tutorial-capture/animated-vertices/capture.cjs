// Records the Animated tutorial clips (animated-pose, animated-edit) and the Each Piece clip
// (animated-each-piece) from the real MDLxL app, one locale per run.
// Run through MDLxL's scripts/hidden-run.ps1 (see run.cjs): the app window opens on an invisible desktop.
const { openSession, sleep, WORK } = require('./recorder.cjs');
const LOCALE = process.env.LPW_LOCALE || 'en';
const OUT = WORK + '/captures/' + LOCALE;
// Base-pose vertex sets on the Footman copy (geoset 0). The sword: the blade's far end and the tip piece.
const SWORD_TIP = { geoset: 0, minX: 48 };
// Each Piece turns the whole selected Footman this many pixels (about one degree per pixel at 1×).
const SPIN = Number(process.env.LPW_SPIN || 70);

(async () => {
  const s = await openSession({ locale: LOCALE, out: OUT, debug: process.env.LPW_DEBUG === '1' });
  const { page, check, begin, end, phase, cue, ping, glide, shot, vertices, verticesDiffer, verticesEqual } = s;
  try {
    await s.setup(3);
    await shot('setup');
    const baseSword = await page.evaluate(({ geoset, minX }) => { const v = lpwVertices(geoset), out = []; for (let i = 0; i < v.length / 3; i++) if (v[i * 3] > minX) out.push(i); return out; }, SWORD_TIP);
    check(baseSword.length >= 4, 'sword tip vertices', baseSword);
    const painted = (sequence, frame) => page.waitForFunction(([sequence, frame]) => { const s = lpwState(); return s?.sampledSequence === sequence && s.sampledFrame === frame; }, [sequence, frame], { timeout: 10000 });
    const animatedButton = 'button[data-hotkey="vertexAnimated"]', picker = '.vertex-animation-picker select', frameField = '.vertex-animation-frame input';
    const sequenceIndex = await page.evaluate(() => window.__mdlxl.model().Sequences.findIndex(s => s.Name === 'Attack - 1'));
    check(sequenceIndex >= 0, 'Attack - 1 exists');
    const FRAME = 12900;
    const startFrame = await page.evaluate(i => window.__mdlxl.model().Sequences[i].Interval[0], sequenceIndex);
    // A marquee around the target vertices as drawn now; fails if any other drawn vertex falls inside it.
    const selectBox = async (geoset, ids, label) => {
      const pts = await page.evaluate(([g, ids]) => lpwScreen(g, ids), [geoset, ids]);
      const all = await page.evaluate(() => lpwAllScreen());
      const b = { minX: Math.min(...pts.map(p => p.x)) - 8, maxX: Math.max(...pts.map(p => p.x)) + 8, minY: Math.min(...pts.map(p => p.y)) - 8, maxY: Math.max(...pts.map(p => p.y)) + 8 };
      const intruders = all.filter(p => p.x > b.minX - 14 && p.x < b.maxX && p.y > b.minY - 14 && p.y < b.maxY && !(p.g === geoset && ids.includes(p.i)));
      check(!intruders.length, label + ': marquee holds only the target vertices', intruders.slice(0, 6));
      await cue('A + LMB', async () => { await page.keyboard.press('a'); await sleep(250); await glide({ x: b.minX - 14, y: b.minY - 14 }, { x: b.maxX, y: b.maxY }, 900, 'left'); }, 250);
      const want = JSON.stringify([...ids].sort((a, c) => a - c));
      await page.waitForFunction(([g, want]) => JSON.stringify([...(lpwSelection()[g] || [])].sort((a, c) => a - c)) === want, [geoset, want], { timeout: 5000 }).catch(() => {});
      const sel = await page.evaluate(() => lpwSelection());
      check(JSON.stringify([...(sel[geoset] || [])].sort((a, c) => a - c)) === want && Object.entries(sel).every(([g, v]) => +g === geoset || !v.length), label + ' selected', sel);
    };
    const centre = pts => ({ x: pts.reduce((n, p) => n + p.x, 0) / pts.length, y: pts.reduce((n, p) => n + p.y, 0) / pts.length });

    // Animated 1: choose an animation and a frame; Shift+Space switches the posed view off and on.
    await begin('animated-pose');
    phase('base');
    await ping('.vertex-animation-picker');
    phase('choose-animation');
    await page.locator(picker).selectOption(String(sequenceIndex));
    await painted(sequenceIndex, startFrame);
    check(await page.locator(animatedButton).getAttribute('aria-pressed') === 'true', 'choosing an animation turns Animated on');
    await sleep(1000);
    await ping(animatedButton, 1300);
    phase('frame');
    await cue('RMB', () => page.locator(animatedButton).click({ button: 'right' }), 500);
    await page.locator(frameField).waitFor();
    await page.locator(frameField).press('Control+a');
    await page.locator(frameField).pressSequentially(String(FRAME), { delay: 140 });
    await sleep(300);
    await cue('Enter', () => page.locator(frameField).press('Enter'), 200);
    await painted(sequenceIndex, FRAME);
    await sleep(1100);
    phase('toggle-off');
    await cue('Shift + Space', () => page.keyboard.press('Shift+Space'), 300);
    await painted(-1, 0);
    await sleep(1100);
    phase('toggle-on');
    await cue('Shift + Space', () => page.keyboard.press('Shift+Space'), 300);
    await painted(sequenceIndex, FRAME);
    await shot('clip1-end');
    await end(1300);

    // Animated 2: select and move vertices on the posed model; the edit lands in the base pose.
    await begin('animated-edit');
    phase('select');
    await selectBox(SWORD_TIP.geoset, baseSword, 'sword tip');
    await sleep(700);
    phase('move');
    const before2 = await vertices(SWORD_TIP.geoset);
    const tip = centre(await page.evaluate(([g, ids]) => lpwScreen(g, ids), [SWORD_TIP.geoset, baseSword]));
    const hilt = centre(await page.evaluate(() => { const v = lpwVertices(0), ids = []; for (let i = 0; i < v.length / 3; i++) if (v[i * 3] > 10 && v[i * 3] < 30 && v[i * 3 + 1] > 15) ids.push(i); return lpwScreen(0, ids); }));
    const bl = Math.hypot(tip.x - hilt.x, tip.y - hilt.y) || 1;
    await cue('M', () => page.keyboard.press('m'), 250);
    await glide(tip, { x: tip.x + (tip.x - hilt.x) / bl * 55, y: tip.y + (tip.y - hilt.y) / bl * 55 }, 1300, 'left');
    await verticesDiffer(SWORD_TIP.geoset, before2);
    const after2 = await vertices(SWORD_TIP.geoset), changed = [];
    for (let i = 0; i < after2.length / 3; i++) if ([0, 1, 2].some(a => Math.abs(after2[i * 3 + a] - before2[i * 3 + a]) > 1e-4)) changed.push(i);
    check(JSON.stringify(changed) === JSON.stringify(baseSword), 'only the selected vertices moved, in the base pose', changed);
    await sleep(1000);
    phase('base-view');
    await cue('Shift + Space', () => page.keyboard.press('Shift+Space'), 300);
    await painted(-1, 0);
    await sleep(1400);
    await cue('Shift + Space', () => page.keyboard.press('Shift+Space'), 300);
    await painted(sequenceIndex, FRAME);
    await shot('clip2-end');
    await end(1100);

    // Each Piece: rotate the whole selection as one group, undo, then again with Each Piece on.
    await page.keyboard.press('Escape');
    await sleep(300);
    // Every separate piece of geoset 0 as Rotate counts them: joined by triangles or by vertices on the same spot.
    const pieces = await page.evaluate(() => {
      const g = lpwProps().model.Geosets[0], n = g.Vertices.length / 3, parent = Array.from({ length: n }, (_, i) => i), f = i => parent[i] === i ? i : (parent[i] = f(parent[i]));
      for (let i = 0; i < g.Faces.length; i += 3) { const a = f(g.Faces[i]); parent[f(g.Faces[i + 1])] = a; parent[f(g.Faces[i + 2])] = a; }
      const spots = new Map();
      for (let i = 0; i < n; i++) { const key = [0, 1, 2].map(a => Math.round(g.Vertices[i * 3 + a] * 1000)).join(); if (spots.has(key)) parent[f(i)] = f(spots.get(key)); else spots.set(key, i); }
      const groups = {}; for (let i = 0; i < n; i++) (groups[f(i)] ||= []).push(i);
      return Object.values(groups);
    });
    const rest = await vertices(0);
    const centres = v => pieces.map(ids => [0, 1, 2].map(a => ids.reduce((n, i) => n + v[i * 3 + a], 0) / ids.length));
    const shift = (a, b) => { const ca = centres(a), cb = centres(b); return ca.map((c, i) => Math.hypot(...c.map((n, k) => n - cb[i][k]))); };
    const spin = async () => { const r = await s.hostBox(), from = { x: r.x + r.width * .30, y: r.y + r.height * .86 }; await glide(from, { x: from.x + SPIN, y: from.y }, 1300, 'left'); };
    await begin('animated-each-piece');
    phase('select');
    await cue('Ctrl + A', () => page.keyboard.press('Control+a'), 300);
    await page.waitForFunction(n => (lpwSelection()[0] || []).length === n, rest.length / 3, { timeout: 5000 });
    await sleep(700);
    phase('rotate-group');
    await cue('R', () => page.keyboard.press('r'), 250);
    await spin();
    await verticesDiffer(0, rest);
    const grouped = await vertices(0);
    const groupedShift = shift(grouped, rest);
    check(groupedShift.filter(d => d > 1).length > pieces.length / 2, 'without Each Piece the pieces swing around their shared centre', groupedShift.filter(d => d > 1).length);
    await sleep(1000);
    phase('undo');
    await cue('Ctrl + Z', () => page.keyboard.press('Control+z'), 250);
    await verticesEqual(0, rest);
    await sleep(600);
    phase('each-piece');
    await ping('input[data-hotkey="eachPiece"]', 1400);
    await page.locator('input[data-hotkey="eachPiece"]').click();
    check(await page.locator('input[data-hotkey="eachPiece"]').isChecked(), 'Each Piece is on');
    await sleep(500);
    phase('rotate-each');
    await spin();
    await verticesDiffer(0, rest);
    const each = await vertices(0);
    const eachShift = shift(each, rest), mean = list => list.reduce((n, d) => n + d, 0) / list.length;
    check(mean(eachShift) < mean(groupedShift) / 5 && Math.max(...eachShift) < Math.max(...groupedShift) / 3, 'with Each Piece the pieces turn on their own spots', { each: [mean(eachShift), Math.max(...eachShift)], grouped: [mean(groupedShift), Math.max(...groupedShift)] });
    check(JSON.stringify(each) !== JSON.stringify(rest), 'with Each Piece the pieces turned');
    await shot('clip3-end');
    await end(1300);
    await s.close();
  } catch (e) { await s.close(e); }
})();
