// Records the six FX tutorial clips on the Great Unclean One, one build carried across the clips: the skin turns to snow,
// the pus on the back grows crystals, the horns turn to dark ice, the weapon grows ice spikes, the weapon swing gets a Frost
// sweep, and the finished snowman is shown turning in Showcase. One locale per run, through MDLxL's scripts/hidden-run.ps1.
// Every step is checked against the model data; the checks are written to <work>/captures/<locale>/proof.json.
const fs = require('node:fs');
const { openSession, sleep, WORK } = require('./recorder.cjs');
const APP = process.env.LPW_APP || 'D:/Claude/MDLxL/.claude/worktrees/fx-tutorial-app';
const LOCALE = process.env.LPW_LOCALE || 'en';
const OUT = WORK + '/captures/' + LOCALE;
// Control names are the app's own labels from src/locales/<language>.json (English is the source text).
const dict = LOCALE === 'en' ? {} : JSON.parse(fs.readFileSync(APP + '/src/locales/' + LOCALE + '.json', 'utf8'));
const T = text => dict[text] ?? text;
const esc = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// The model's parts, found by inspecting WH_DOC_GreatUCO1C.mdx: skin, pus on the back, horns, the sword blade.
// The blade is drawn twice on the same surface (geosets 10 and 11 in the menu); a double-click may land on either.
const SKIN = 5, PUS = 24, HORNS = 8, BLADES = [9, 10];
const ATTACK = ['Attack - 1', 'Attack - 2'];
const HORN_LAYER = 'Ice facets';
const ONLY = (process.env.LPW_ONLY || '').split(',').filter(Boolean);

(async () => {
  const s = await openSession({ locale: LOCALE, out: OUT, debug: process.env.LPW_DEBUG === '1' });
  const { page, check, begin, end, phase, cue, ping, glide, shot } = s;
  const fx = page.locator('.sfx-window'), stage = fx.locator('.sfx-stage'), controls = fx.locator('.sfx-controls');
  const ready = () => page.waitForFunction(() => { const p = mdlxlProbe('.sfx-stage .game-preview-root'); return p?.runtime?.captureApi.isReady && p.runtime.particleSourceModel === p.props.model && !document.querySelector('.sfx-apply')?.disabled; }, null, { timeout: 60000 });
  const docStack = g => page.evaluate(g => JSON.parse(JSON.stringify(mdlxlProbe().session.doc.model.Geosets[g]._FxStack || null)), g);
  const stack = g => page.evaluate(g => JSON.parse(JSON.stringify(mdlxlProbe('.sfx-stage .game-preview-root').props.model.Geosets[g]._FxStack || null)), g);
  const geoset = () => fx.locator('.sfx-target select').first().inputValue();
  const centre = async locator => { const b = await locator.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  // Preview camera as azimuth/elevation around its target.
  const cam = (root = '.sfx-stage .game-preview-root') => page.evaluate(root => { const r = mdlxlProbe(root).runtime, p = r.controls.object.position, t = r.controls.target, d = [p.x - t.x, p.y - t.y, p.z - t.z], h = Math.hypot(d[0], d[1]); return { az: Math.atan2(d[1], d[0]) * 180 / Math.PI, el: Math.atan2(d[2], h) * 180 / Math.PI, dist: Math.hypot(...d) / (r.controls.object.zoom || 1) }; }, root);
  const wrap = a => ((a + 540) % 360) - 180;
  // Turns a preview to an azimuth/elevation with real left-button drags, learning how far each drag turned it.
  const orbitTo = async (area, az, el, root, ms = 900) => {
    const b = await area.boundingBox(); let kx = -0.75, ky = 0.5;
    for (let i = 0; i < 4; i++) {
      const c = await cam(root), ea = wrap(az - c.az), ee = el - c.el;
      if (Math.abs(ea) < 5 && Math.abs(ee) < 5) break;
      const dx = Math.max(-280, Math.min(280, ea / kx)), dy = Math.max(-160, Math.min(160, ee / ky));
      const from = { x: b.x + b.width / 2 - dx / 2, y: b.y + b.height * .55 - dy / 2 };
      await glide(from, { x: from.x + dx, y: from.y + dy }, ms, 'left'); await sleep(200);
      const n = await cam(root), ma = wrap(n.az - c.az), me = n.el - c.el;
      if (Math.abs(dx) > 10 && Math.abs(ma) > 1) kx = ma / dx; if (Math.abs(dy) > 10 && Math.abs(me) > 1) ky = me / dy;
    }
    return cam(root);
  };
  const orbitCue = async (az, el) => { let c; await cue('LMB', async () => { c = await orbitTo(stage, az, el); }, 150); return c; };
  // Wheel steps over a point (zoom in a preview, or step a closed menu).
  const wheel = async (point, notches, settle = ready) => {
    await page.mouse.move(point.x, point.y);
    await cue(T('Wheel'), async () => { for (let i = 0; i < Math.abs(notches); i++) { await page.mouse.wheel(0, notches < 0 ? -120 : 120); await sleep(260); await settle(); } }, 200);
  };
  // Screen centres of a geoset's largest triangles in the FX preview that no nearer triangle of another geoset covers.
  const facePoints = gi => page.evaluate(gi => {
    const p = mdlxlProbe('.sfx-stage .game-preview-root'), n = p.runtime.native, cam = p.runtime.controls.object, box = document.querySelector('.sfx-stage').getBoundingClientRect();
    const tf = (v, m) => [0, 1, 2].map(i => m[i] * v[0] + m[4 + i] * v[1] + m[8 + i] * v[2] + m[12 + i]);
    const project = g => Array.from({ length: g.Vertices.length / 3 }, (_, v) => { const pos = Array.from(g.Vertices.slice(v * 3, v * 3 + 3)), bones = g.Groups[g.VertexGroup[v]] || [], w = [0, 0, 0]; for (const id of bones) tf(pos, n.rendererData.nodes[id].matrix).forEach((x, i) => w[i] += x / bones.length); const view = tf(w, cam.matrixWorldInverse.elements), m = cam.projectionMatrix.elements, h = m[3] * view[0] + m[7] * view[1] + m[11] * view[2] + m[15], sc = tf(view, m); return [box.x + (1 + sc[0] / h) * box.width / 2, box.y + (1 - sc[1] / h) * box.height / 2, -view[2]]; });
    const tris = [];
    // The app's own double-click pick (preview-selection.js) tests every shown geoset, whatever its alpha.
    n.model.Geosets.forEach((g, i) => { if (!g.Faces?.length) return; const pts = project(g); for (let f = 0; f < g.Faces.length; f += 3) tris.push({ g: i, a: pts[g.Faces[f]], b: pts[g.Faces[f + 1]], c: pts[g.Faces[f + 2]] }); });
    const depthAt = (t, x, y) => { const { a, b, c } = t, d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(d) < 1e-9) return null; const u = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d, v = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d, w = 1 - u - v; return u < 0 || v < 0 || w < 0 ? null : u * a[2] + v * b[2] + w * c[2]; };
    const out = [];
    for (const t of tris) {
      if (t.g !== gi) continue;
      const area = Math.abs((t.b[0] - t.a[0]) * (t.c[1] - t.a[1]) - (t.b[1] - t.a[1]) * (t.c[0] - t.a[0])) / 2, x = (t.a[0] + t.b[0] + t.c[0]) / 3, y = (t.a[1] + t.b[1] + t.c[1]) / 3, z = (t.a[2] + t.b[2] + t.c[2]) / 3;
      if (area < 40 || x < box.x + 40 || x > box.right - 40 || y < box.y + 40 || y > box.bottom - 40 || document.elementFromPoint(x, y)?.tagName !== 'CANVAS') continue;
      // The centre and four points 5 px around it must all show this geoset, so a little motion does not change the pick.
      const clear = [[0, 0], [5, 0], [-5, 0], [0, 5], [0, -5]].every(([dx, dy]) => { const px = x + dx, py = y + dy; let nearest = { g: -1, z: Infinity }; for (const o of tris) { const d = depthAt(o, px, py); if (d != null && d > 0 && d < nearest.z) nearest = { g: o.g, z: d }; } return nearest.g === gi; });
      if (clear) out.push({ x, y, area });
    }
    return out.sort((a, b) => b.area - a.area).slice(0, 25);
  }, gi);
  // Double-clicks the part in the preview, like the user. The face is found first in a step left out of the clip: each
  // candidate is double-clicked and the previous part chosen again, until one selects the part (the app's own pick).
  const pickPart = async (part, name, optional = false) => {
    const parts = [].concat(part).map(String), before = await geoset(), tried = [];
    let faces = [];
    for (const gi of [].concat(part)) faces.push(...(await facePoints(gi)).map(f => ({ ...f, gi })));
    faces.sort((a, b) => b.area - a.area);
    if (!faces.length && optional) { check(true, 'no clear point on the ' + name + ' from this side'); return null; }
    check(faces.length > 0, name + ' is visible in the preview', faces.length);
    // A face counts when four double-clicks over about three seconds of the animation all select the part.
    const face = await s.cut(async () => {
      for (const f of faces.slice(0, 30)) {
        let hits = 0;
        for (let k = 0; k < 4; k++) {
          await page.mouse.dblclick(f.x, f.y);
          await page.waitForFunction(v => v.includes(document.querySelector('.sfx-target select').value), parts, { timeout: 2500 }).catch(() => {});
          const got = await geoset(); tried.push(got);
          if (got !== before) { await fx.locator('.sfx-target select').first().selectOption(before); await page.waitForFunction(v => document.querySelector('.sfx-target select').value === v, before); await ready(); await sleep(700); }
          if (parts.includes(got)) hits++; else break;
        }
        if (hits === 4) return f;
      }
      return null;
    });
    if (!face && optional) { check(true, 'no steady double-click point on the ' + name + ' from this side', tried); return null; }
    check(face, 'a double-click point selects the ' + name, tried);
    await ping({ x: face.x, y: face.y, name }, 1300);
    for (let k = 0; k < 3 && !parts.includes(await geoset()); k++) {
      await cue('LMB × 2', () => page.mouse.dblclick(face.x, face.y), 250);
      await page.waitForFunction(v => v.includes(document.querySelector('.sfx-target select').value), parts, { timeout: 5000 }).catch(() => {});
      if (!parts.includes(await geoset())) check(true, 'a double-click on the ' + name + ' needed another try', await geoset());
    }
    const got = await geoset();
    check(parts.includes(got), 'double-click selects the ' + name, got);
    await ready(); await sleep(700);
    return { ...face, gi: Number(got) };
  };
  const folderRow = name => fx.locator('.sfx-cards .gf-row.folder').filter({ hasText: new RegExp('^' + esc(T(name)) + '\\d*$') }).first();
  const cardRow = name => fx.locator('.sfx-cards .sfx-card').filter({ hasText: new RegExp('^' + esc(T(name)) + '$') }).first();
  const chooseLook = async (folder, look, lookId, g) => {
    const f = folderRow(folder);
    if (await f.getAttribute('aria-expanded') !== 'true') { await ping(f, 1100); await f.click(); await sleep(500); }
    const c = cardRow(look); await c.waitFor(); await ping(c, 1000); await c.click(); await ready();
    const st = await stack(g);
    check(st?.look === lookId && await c.getAttribute('aria-pressed') === 'true', look + ' is on the part', st?.look);
    await sleep(1400);
  };
  const variationSelect = () => fx.getByLabel(T('Variation'), { exact: true });
  // The mouse wheel over the closed Variation menu steps to the wanted version.
  const chooseVariation = async (name, g) => {
    const v = variationSelect(), names = await v.locator('option').allTextContents(), want = names.indexOf(T(name)), at = names.indexOf(await v.locator('option:checked').textContent());
    check(want >= 0, 'Variation offers ' + name, names);
    await ping(v, 1100);
    await wheel(await centre(v), want - at);
    check(await v.locator('option:checked').textContent() === T(name), 'Variation is ' + name, await v.locator('option:checked').textContent());
    await sleep(1600);
    return stack(g);
  };
  const layerRow = name => fx.locator('.fx-layer-list .fx-layer-row').filter({ has: page.locator('button', { hasText: new RegExp('^' + esc(T(name))) }) }).first();
  const rangeField = label => controls.locator('label.range-field').filter({ hasText: new RegExp('^' + esc(T(label))) }).first();
  // Brings a control in the scrolling controls column into view with the mouse wheel, like a user.
  const wheelTo = async locator => {
    const col = await controls.boundingBox();
    for (let i = 0; i < 30; i++) {
      const b = await locator.boundingBox();
      if (b && b.y >= col.y + 8 && b.y + b.height <= col.y + col.height - 8) return b;
      await page.mouse.move(col.x + col.width / 2, col.y + col.height / 2);
      await page.mouse.wheel(0, !b || b.y > col.y + col.height / 2 ? 100 : -100);
      await sleep(160);
    }
    throw Error('Cannot scroll to ' + locator);
  };
  // Scrolls the panel that holds a control with the mouse wheel until the control is on screen.
  const wheelIntoView = async locator => {
    for (let i = 0; i < 30; i++) {
      const b = await locator.boundingBox(), vh = await page.evaluate(() => innerHeight);
      if (b && b.y >= 4 && b.y + b.height <= vh - 4) return b;
      const area = await locator.evaluate(e => { let n = e.parentElement, outer = null; for (; n; n = n.parentElement) if (n.scrollHeight > n.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(n).overflowY)) outer = n; const r = (outer || document.body).getBoundingClientRect(); return { x: r.x + r.width / 2, y: Math.max(r.y + 40, 200) }; });
      await page.mouse.move(area.x, area.y);
      await page.mouse.wheel(0, !b || b.y > vh / 2 ? 100 : -100);
      await sleep(160);
    }
    throw Error('Cannot scroll to ' + locator);
  };
  // Drags a range input's thumb to a fraction of its track with the real mouse.
  const dragRange = async (input, to, ms = 900) => {
    const b = await input.boundingBox(), v = await input.evaluate(e => (e.value - e.min) / (e.max - e.min));
    const thumb = 8, x = k => b.x + thumb + k * (b.width - 2 * thumb), y = b.y + b.height / 2;
    await glide({ x: x(v), y }, { x: x(to), y }, ms, 'left');
  };
  const slider = async (label, to, g, field) => {
    const input = rangeField(label).locator('input');
    await wheelTo(input); await ping(input, 1000);
    const before = (await stack(g)).layers;
    await dragRange(input, to); await ready();
    const after = (await stack(g)).layers;
    check(JSON.stringify(after) !== JSON.stringify(before), label + ' changes the layer', field ? after.map(l => l[field]) : undefined);
    await sleep(900);
  };
  const openFx = async () => {
    await page.locator('[data-hotkey="surfaceEffects"]').click();
    await fx.waitFor(); await ready(); await sleep(600);
  };
  const applyFx = async (g, lookId, extra) => {
    const apply = fx.locator('.sfx-apply');
    const want = await stack(g);
    await ping(apply, 1100); await apply.click(); await fx.waitFor({ state: 'hidden' });
    const got = await docStack(g);
    check(got?.look === lookId && got.layers.length === want.layers.length && (!extra || extra(got)), 'Apply effect puts the look on geoset ' + g, got && { look: got.look, variation: got.variation, layers: got.layers.map(l => [l.label, l.enabled !== false]) });
  };
  const run = name => !ONLY.length || ONLY.includes(name);
  try {
    await s.setup(0);
    await shot('setup');
    let st;

    // 1. Skin: open FX, turn to the front, double-click the skin, Ice > Frost, Variation, Apply effect.
    await begin('fx-skin');
    phase('open');
    await ping('[data-hotkey="surfaceEffects"]', 1300);
    await openFx();
    phase('turn');
    const front = await orbitCue(50, 10);
    check(Math.abs(wrap(front.az - 50)) < 8, 'the preview turns to the front', front);
    await sleep(500);
    phase('part');
    await ping('.sfx-target select', 1100);
    await pickPart(SKIN, 'skin');
    phase('look');
    await chooseLook('Ice', 'Frost', 'frost-blade', SKIN);
    phase('variation');
    st = await chooseVariation('Frosted steel', SKIN);
    check(st.layers.some(l => l.label === 'Cold sheen'), 'the skin is Frosted steel', st.layers.map(l => l.label));
    phase('apply');
    await applyFx(SKIN, 'frost-blade');
    await sleep(1600);
    await shot('clip1-end');
    await end(600);

    // 2. Pus on the back: Ice > Crystal, Variation Crystal growth, sliders on the crystals, Apply.
    await begin('fx-pus');
    phase('open');
    await openFx();
    phase('turn');
    const back = await orbitCue(-125, 32);
    check(Math.abs(wrap(back.az + 125)) < 8, 'the preview turns to the back', back);
    phase('part');
    await pickPart(PUS, 'pus');
    phase('look');
    await chooseLook('Ice', 'Crystal', 'fx-lit-crystal', PUS);
    phase('variation');
    st = await chooseVariation('Crystal growth', PUS);
    check(st.layers.some(l => l.type === 'Growth'), 'Crystal growth grows crystals on the pus', st.layers.map(l => [l.label, l.type]));
    phase('sliders');
    const crystals = st.layers.findIndex(l => l.type === 'Growth');
    check(await fx.locator('.fx-layer-list .fx-layer-row').nth(crystals).locator('button').getAttribute('aria-pressed') === 'true', 'the crystal layer is selected');
    await slider('Size', .32, PUS, 'size');
    await slider('Length', .45, PUS, 'long');
    await slider('Count', .3, PUS, 'count');
    await slider('Glow', .8, PUS, 'glow');
    phase('apply');
    await applyFx(PUS, 'fx-lit-crystal', s => s.layers.some(l => l.type === 'Growth'));
    await sleep(1400);
    await shot('clip2-end');
    await end(500);

    // 3. Horns: Ice > Frost, Variation Dark ice, Falling mist off, Add layer Crystal glints, Apply.
    await begin('fx-horns');
    phase('open');
    await openFx();
    phase('turn');
    const head = await orbitCue(40, 22);
    check(Math.abs(wrap(head.az - 40)) < 8, 'the preview turns to the head', head);
    phase('part');
    await pickPart(HORNS, 'horns');
    phase('look');
    await chooseLook('Ice', 'Frost', 'frost-blade', HORNS);
    phase('variation');
    st = await chooseVariation('Dark ice', HORNS);
    phase('layer-off');
    const mist = layerRow('Falling mist').locator('input[type=checkbox]');
    await ping(mist, 1100); await mist.click(); await ready();
    st = await stack(HORNS);
    check(st.layers.find(l => l.label === 'Falling mist')?.enabled === false, 'the checkbox turns Falling mist off', st.layers.map(l => [l.label, l.enabled]));
    await sleep(1200);
    phase('add-layer');
    const addLayer = controls.locator('.fx-add-row .fx-picker > button').nth(1);
    await wheelTo(addLayer); await ping(addLayer, 1000); await addLayer.click();
    const search = controls.locator('.fx-picker-pop input');
    await search.waitFor(); await sleep(300);
    await search.pressSequentially(T(HORN_LAYER), { delay: 70 });
    const row = controls.locator('.fx-picker-row').filter({ has: page.locator('.fx-picker-name', { hasText: new RegExp('^' + esc(T(HORN_LAYER)) + '$') }) }).first();
    await row.waitFor(); await sleep(400);
    const countBefore = st.layers.length;
    await row.click(); await ready();
    st = await stack(HORNS);
    check(st.layers.length === countBefore + 1 && st.layers.at(-1).label === HORN_LAYER && !/flash|flicker/i.test(st.layers.at(-1).pulse || ''), 'Add layer adds ' + HORN_LAYER + ' (no flashing rhythm)', st.layers.map(l => [l.label, l.pulse]));
    await sleep(1400);
    phase('apply');
    await applyFx(HORNS, 'frost-blade', s => s.layers.some(l => l.label === HORN_LAYER) && s.layers.find(l => l.label === 'Falling mist')?.enabled === false);
    await sleep(1400);
    await shot('clip3-end');
    await end(500);

    // 4. Weapon: Ice > Frost, Variation Ice spikes, Count and Length of the spikes, Apply.
    await begin('fx-weapon');
    phase('open');
    await openFx();
    phase('turn');
    let picked = null;
    // From the side the blade is usually clear of the horns; if no point picks it steadily, turn a little further.
    for (const az of [-30, -50, -12, -70]) {
      phase('turn');
      const side = await orbitCue(az, 22);
      check(Math.abs(wrap(side.az - az)) < 8, 'the preview turns to the weapon', side);
      phase('part');
      picked = await pickPart(BLADES, 'blade', az !== -70);
      if (picked) break;
    }
    const BLADE = picked.gi;
    // Fit selection frames the chosen part (the FX preview's wheel does not zoom).
    const fit = fx.locator('.sfx-transport button').filter({ hasText: new RegExp('^' + esc(T('Fit selection')) + '$') });
    const far = (await cam()).dist;
    await ping(fit, 1000); await fit.click(); await sleep(1500);
    check((await cam()).dist < far * .8, 'Fit selection frames the blade', { far, near: (await cam()).dist });
    phase('look');
    await chooseLook('Ice', 'Frost', 'frost-blade', BLADE);
    phase('variation');
    st = await chooseVariation('Ice spikes', BLADE);
    const spikes = st.layers.findIndex(l => l.type === 'Growth');
    check(spikes >= 0, 'Ice spikes grows spikes on the blade', st.layers.map(l => [l.label, l.type]));
    phase('sliders');
    const spikeName = fx.locator('.fx-layer-list .fx-layer-row').nth(spikes).locator('button');
    await wheelTo(spikeName); await ping(spikeName, 1000); await spikeName.click(); await ready();
    check(await spikeName.getAttribute('aria-pressed') === 'true', 'the Ice spikes layer is selected');
    await slider('Size', .55, BLADE, 'size');
    await slider('Count', .45, BLADE, 'count');
    await slider('Length', .6, BLADE, 'long');
    phase('apply');
    await applyFx(BLADE, 'frost-blade', s => s.layers.some(l => l.type === 'Growth'));
    await sleep(1400);
    await shot('clip4-end');
    await end(500);

    // 5. Sweep: select the blade in the Vertex editor, Emitter Editor, Add ribbon, Sweep Frost, the attacks, Create.
    await begin('fx-sweep');
    phase('select');
    const clear = page.locator('[data-hotkey="geosetsClear"]'), blade = page.locator(`[data-hotkey="geoset:${BLADE}"]`);
    await wheelIntoView(clear);
    await ping(clear, 900); await clear.click(); await sleep(400);
    await wheelIntoView(blade);
    await ping(blade, 900); await blade.check(); await sleep(500);
    const host = await s.hostBox();
    await page.mouse.click(host.x + host.width * .5, host.y + 14);
    await cue('Ctrl + A', () => page.keyboard.press('Control+a'), 300);
    await page.waitForFunction(g => (lpwSelection()[g] || []).length > 0, BLADE, { timeout: 5000 });
    const sel = await page.evaluate(() => lpwSelection());
    check(Object.keys(sel).filter(k => sel[k].length).join() === String(BLADE), 'only the blade is selected', Object.fromEntries(Object.entries(sel).map(([k, v]) => [k, v.length])));
    await sleep(900);
    phase('emtr');
    await ping('[data-hotkey="particles"]', 1100);
    await page.locator('[data-hotkey="particles"]').click();
    const addRibbon = page.locator('[data-hotkey="particles:add-ribbon"]');
    await addRibbon.waitFor(); await sleep(1500);
    await ping(addRibbon, 1100); await addRibbon.click();
    const sweep = page.locator('.pe-placement select').first();
    await sweep.waitFor(); await sleep(1200);
    const pe = page.locator('.pe-preview');
    await wheel(await centre(pe), -3, () => sleep(80));
    phase('sweep');
    await ping(sweep, 1100);
    const sweepIndex = await sweep.locator('option').evaluateAll(o => o.findIndex(x => x.value === 'frost'));
    await sweep.click(); await sleep(400);
    await page.keyboard.press('Home');
    for (let i = 0; i < sweepIndex; i++) { await page.keyboard.press('ArrowDown'); await sleep(150); }
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.pe-placement select')?.value === 'frost', null, { timeout: 5000 });
    await page.waitForFunction(() => (mdlxlProbe('.pe-preview .game-preview-root').runtime?.native?.model.ParticleEmitters2 || []).some(e => e.Name.startsWith('Frost sweep')), null, { timeout: 30000 });
    await sleep(1200);
    phase('attacks');
    const boxes = page.locator('.pe-ribbon-sequences label');
    const names = await boxes.allTextContents();
    const walk = boxes.nth(names.indexOf('Walk')).locator('input');
    if (await walk.isChecked()) { await walk.click(); await sleep(300); }
    for (const a of ATTACK) { const b = boxes.nth(names.indexOf(a)).locator('input'); await ping(b, 800); await b.click(); await sleep(500); }
    await page.waitForFunction(() => { const p = mdlxlProbe('.pe-preview .game-preview-root'), n = p.runtime?.native; return n && /Attack/.test(p.props.model.Sequences[n.getSequence()]?.Name || ''); }, null, { timeout: 10000 });
    await sleep(2600);
    phase('create');
    const create = page.locator('.pe-placement button').filter({ hasText: new RegExp('^' + esc(T('Create')) + '$') });
    await ping(create, 1000); await create.click();
    await page.waitForFunction(() => mdlxlProbe().session.doc.model.RibbonEmitters.some(r => r.Name === 'Frost sweep'), null, { timeout: 15000 });
    const made = await page.evaluate(attacks => { const m = mdlxlProbe().session.doc.model, r = m.RibbonEmitters.find(r => r.Name === 'Frost sweep'), v = r.Visibility; const on = q => !v || typeof v === 'number' ? v !== 0 : v.Keys.some(k => k.Frame >= q.Interval[0] && k.Frame <= q.Interval[1] && k.Vector[0] > 0); return { parent: m.Nodes[r.Parent]?.Name, emitters: m.ParticleEmitters2.filter(e => e.Name.startsWith('Frost sweep')).length, visible: m.Sequences.filter(on).map(q => q.Name) }; }, ATTACK);
    check(made.emitters === 2 && ATTACK.every(a => made.visible.includes(a)) && !made.visible.includes('Walk'), 'Create adds the Frost sweep to the weapon for the attacks', made);
    await sleep(3600);
    await shot('clip5-end');
    await end(400);
    await page.locator('.particle-editor .re-caption-close').first().click();
    await page.locator('.pe-preview').waitFor({ state: 'hidden' });

    // 6. Result: Showcase, Attack - 1, Preview animation, turn the camera around the snowman.
    await begin('fx-result');
    phase('showcase');
    const tab = page.locator('button').filter({ has: page.locator('.editor-name', { hasText: new RegExp('^' + esc(T('Showcase')) + '$') }) }).first();
    await ping(tab, 1000); await tab.click();
    const preview = page.locator('.showcase-sequence-preview');
    await preview.waitFor(); await sleep(2500);
    phase('animation');
    const rowItem = page.locator('.showcase-list li').first();
    await ping(rowItem, 900); await rowItem.click();
    const dialog = page.locator('[role=dialog]').filter({ has: page.getByLabel(T('Animation'), { exact: true }) });
    const animation = dialog.getByLabel(T('Animation'), { exact: true });
    await animation.waitFor(); await sleep(500);
    const wanted = await animation.locator('option').evaluateAll(o => o.find(x => x.textContent === 'Attack - 1')?.value);
    const optionsNow = await animation.locator('option').evaluateAll(o => o.map(x => x.value)), from = optionsNow.indexOf(await animation.inputValue()), to = optionsNow.indexOf(wanted);
    await animation.click(); await sleep(300);
    for (let i = from; i < to; i++) { await page.keyboard.press('ArrowDown'); await sleep(120); }
    await page.keyboard.press('Enter'); await sleep(400);
    check(await animation.inputValue() === wanted, 'Attack - 1 is chosen', await animation.inputValue());
    const ok = dialog.locator('button').filter({ hasText: new RegExp('^' + esc(T('OK')) + '$') });
    await ping(ok, 700); await ok.click(); await dialog.waitFor({ state: 'hidden' }); await sleep(500);
    await ping(preview, 900); await preview.click();
    await page.waitForFunction(() => document.querySelector('.showcase-sequence-preview')?.getAttribute('aria-pressed') === 'true', null, { timeout: 5000 });
    check(true, 'Showcase plays Attack - 1');
    const view = page.locator('.showcase-preview').first();
    const vb = await view.boundingBox();
    phase('turn');
    await wheel({ x: vb.x + vb.width / 2, y: vb.y + vb.height / 2 }, -3, () => sleep(60));
    await sleep(1500);
    for (const dx of [240, 240, 200]) { await cue('LMB', () => glide({ x: vb.x + vb.width * .3, y: vb.y + vb.height * .75 }, { x: vb.x + vb.width * .3 + dx, y: vb.y + vb.height * .75 }, 2200, 'left'), 100); await sleep(1600); }
    phase('hold');
    await sleep(2500);
    await shot('clip6-end');
    await end(300);
    await s.close();
  } catch (e) { await s.close(e); }
})();
