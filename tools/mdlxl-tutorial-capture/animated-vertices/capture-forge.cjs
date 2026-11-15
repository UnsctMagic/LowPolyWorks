// Records the Call Upon Forge tutorial (one locale per run): open the toolset; isolate the Footman's shield and its
// red team-colour layer as their own geosets; bevel the shield's outline in Left view and Wireframe; Bend the shield so
// it curves toward the body and show it on the whole Footman; check it. Every step is checked against the model data.
// Run through MDLxL's scripts/hidden-run.ps1 (see run.cjs).
const { openSession, sleep, WORK } = require('./recorder.cjs');
const LOCALE = process.env.LPW_LOCALE || 'en';
const OUT = WORK + '/captures/forge-' + LOCALE;
// The shield in Footman geoset 0: plate 253-266, boss 425-434, rim 225-231 (as in MDLxL's forge-shield tests),
// and its red team-colour layer, geoset 1 vertices 0-11.
const SHIELD = [...Array.from({ length: 7 }, (_, i) => 225 + i), ...Array.from({ length: 14 }, (_, i) => 253 + i), ...Array.from({ length: 10 }, (_, i) => 425 + i)];

const LAYER = Array.from({ length: 12 }, (_, i) => i);
const E = (name, fallback) => Number(process.env[name] ?? fallback);
const TURN = E('LPW_TURN', 30), ZOOM = E('LPW_ZOOM', 4), BEVEL = E('LPW_BEVEL', -80), BEND = E('LPW_BEND', -70);

(async () => {
  const s = await openSession({ locale: LOCALE, out: OUT, debug: process.env.LPW_DEBUG === '1' });
  const { page, check, begin, end, phase, cue, ping, glide, shot, verticesDiffer } = s;
  const drawer = '.forge-vertex-tools';
  const sel = () => page.evaluate(() => Object.fromEntries(Object.entries(lpwSelection()).filter(([, v]) => v.length).map(([g, v]) => [g, [...v].sort((a, b) => a - b)])));
  const geosets = () => page.evaluate(() => lpwProps().model.Geosets.map(g => ({ vertices: Array.from(g.Vertices), faces: g.Faces.length / 3, material: g.MaterialID })));
  const shown = () => page.evaluate(() => lpwState().entries.map((e, i) => e.group.visible === false ? -1 : i).filter(i => i >= 0));
  const all = n => Array.from({ length: n }, (_, i) => i);
  const key = (v, i) => [0, 1, 2].map(a => v[i * 3 + a].toFixed(3)).join();
  const orbit = async (dx, dy = 0, ms = 900, caption = true) => {
    const r = await s.hostBox(), c = { x: r.x + r.width * .55, y: r.y + r.height * .55 };
    const go = async () => { await page.keyboard.down('Alt'); await glide(c, { x: c.x + dx, y: c.y + dy }, ms, 'left'); await page.keyboard.up('Alt'); };
    if (caption) await cue('Alt + LMB', go, 200); else await go();
  };
  const handle = id => page.evaluate(id => {
    const st = lpwState(), p = lpwProps(), r = st.renderer.domElement.getBoundingClientRect();
    const op = findFiberState('.forge-vertex-tools', s => s?.kind && s?.draft, { current: true }), dir = op?.mold?.direction ?? 0;
    const proj = q => { const v = st.camera.position.clone().fromArray(q).project(st.camera); return { x: r.x + (v.x + 1) * r.width / 2, y: r.y + (1 - v.y) * r.height / 2 }; };
    const hd = (p.editHandles?.points || []).find(h => h.id === id);
    return hd && { at: proj(hd.position), end: proj(hd.position.map((n, i) => n + (i === dir ? 10 : 0))) };
  }, id);
  const dragHandle = async (px, ms = 1400) => {
    await page.waitForFunction(() => lpwProps()?.editHandles?.points?.length > 0, null, { timeout: 5000 });
    const h = await handle('amount'), dx = h.end.x - h.at.x, dy = h.end.y - h.at.y, l = Math.hypot(dx, dy) || 1;
    await glide(h.at, { x: h.at.x + dx / l * px, y: h.at.y + dy / l * px }, ms, 'left');
  };
  const keep = async () => {
    const button = drawer + ' button[data-hotkey="forge:shape:commit"]';
    await ping(button, 1200);
    await page.locator(button).click();
    await page.waitForFunction(() => !lpwProps()?.editHandles, null, { timeout: 5000 });
  };
  const frameButton = async which => {
    const button = `button[data-hotkey="${which}"]`, t = await page.evaluate(() => lpwState().controls.target.toArray().join());
    await ping(button, 1100);
    await page.locator(button).click();
    await page.waitForFunction(t => lpwState().controls.target.toArray().join() !== t, t, { timeout: 5000 }).catch(() => {});
    await sleep(900);
  };
  const choose = async (select, value) => {
    await ping(select, 1100);
    await page.locator(select).selectOption(value);
    await sleep(800);
  };
  const viewMenu = '[data-hotkey="viewDirection"]', renderMenu = '[data-hotkey="viewDirection"] + select';
  const geosetBox = i => `input[data-hotkey="geoset:${i}"]`;
  const tick = async (i, on) => { await page.locator(geosetBox(i)).scrollIntoViewIfNeeded(); await ping(geosetBox(i), 1000); if (on) await page.locator(geosetBox(i)).check(); else await page.locator(geosetBox(i)).uncheck(); await sleep(300); };
  const selectAll = async () => { await page.evaluate(() => lpwHost().focus()); await cue('Ctrl + A', () => page.keyboard.press('Control+a'), 400); };
  const shieldCentre = async () => { const p = await page.evaluate(ids => lpwScreen(0, ids), SHIELD); return { x: p.reduce((n, q) => n + q.x, 0) / p.length, y: p.reduce((n, q) => n + q.y, 0) / p.length }; };
  try {
    await s.setup(3);
    const start = await geosets();
    check(start.length === 5, 'the Footman has five geosets', start.length);

    // 1. Right-click Forge > Call Upon Forge.
    await begin('forge-open');
    phase('menu');
    await ping('button[data-hotkey="forge"]', 1300);
    await cue('RMB', () => page.locator('button[data-hotkey="forge"]').click({ button: 'right' }), 300);
    const callItem = '.learn-menu [role="menuitem"]:nth-of-type(2)';
    await page.locator(callItem).waitFor();
    await ping(callItem, 1400);
    phase('tools');
    await page.locator(callItem).click();
    await page.locator(drawer).waitFor();
    await sleep(900);
    await ping(drawer + ' header', 1400);
    check(JSON.stringify(await geosets()) === JSON.stringify(start), 'opening the tools changes no geometry');
    await shot('open');
    await end(1200);

    // 2. Isolate the shield: select it and its red layer (geoset 2), Detach as new geoset, show only those geosets.
    await begin('forge-isolate');
    phase('layer');
    await tick(1, true);
    check(await page.locator(geosetBox(1)).isChecked(), 'geoset 2 (the red layer) can be selected');
    phase('view');
    const centre = await shieldCentre();
    await page.mouse.move(centre.x, centre.y);
    for (let i = 0; i < ZOOM; i++) { await page.mouse.wheel(0, -120); await sleep(140); }
    await sleep(300);
    // A click box of ±3 px also catches vertex markers that overlap it, so keep other vertices 9 px away.
    const clickable = () => page.evaluate(([ids, layer]) => {
      const all = lpwAllScreen(), pts = [...lpwScreen(0, ids).map(p => ({ ...p, g: 0 })), ...lpwScreen(1, layer).map(p => ({ ...p, g: 1 }))];
      const uniq = pts.filter((p, i) => pts.findIndex(q => Math.hypot(p.x - q.x, p.y - q.y) < .01) === i);
      const ok = q => (q.g === 0 && ids.includes(q.i)) || (q.g === 1 && layer.includes(q.i));
      return { uniq, bad: uniq.filter(p => all.some(q => Math.abs(q.x - p.x) <= 9 && Math.abs(q.y - p.y) <= 9 && !ok(q))).map(p => p.g + ':' + p.i) };
    }, [SHIELD, LAYER]);
    await orbit(TURN, 0, 800);
    let points = await clickable();
    for (let k = 0; points.bad.length && k < 40; k++) { await orbit(10, 0, 160, false); points = await clickable(); }
    check(!points.bad.length, 'every shield vertex can be clicked without catching other vertices', points.bad);
    phase('click');
    points.uniq.sort((a, b) => Math.round(a.y / 12) - Math.round(b.y / 12) || a.x - b.x);
    await page.evaluate(() => lpwHost().focus());
    await page.keyboard.press('Escape');
    await cue('A', () => page.keyboard.press('a'), 200);
    await cue('Shift + LMB', async () => {
      for (const [i, p] of points.uniq.entries()) {
        if (i) await page.keyboard.down('Shift');
        await page.mouse.move(p.x - 3, p.y - 3); await page.mouse.down(); await page.mouse.move(p.x + 3, p.y + 3, { steps: 2 }); await page.mouse.up();
        if (i) await page.keyboard.up('Shift');
        await sleep(80);
      }
    }, 300);
    const picked = await sel();
    check(JSON.stringify(picked) === JSON.stringify({ 0: [...SHIELD].sort((a, b) => a - b), 1: LAYER }), 'only the shield and its red layer are selected', picked);
    phase('detach');
    const detach = 'button[data-hotkey="Detach"]';
    await ping(detach, 1200);
    await page.locator(detach).click();
    await page.waitForFunction(n => lpwProps().model.Geosets.length === n + 2, start.length, { timeout: 5000 });
    const split = await geosets();
    const fresh = [start.length, start.length + 1], plateG = fresh.find(i => split[i].material === start[0].material), layerG = fresh.find(i => i !== plateG);
    check(split[plateG].vertices.length / 3 === SHIELD.length && split[layerG].vertices.length / 3 === LAYER.length, 'Detach makes one geoset for the shield and one for its red layer', fresh.map(i => split[i].vertices.length / 3));
    check(split[0].faces < start[0].faces && split[1].faces < start[1].faces, 'the shield faces leave the body geosets', [start[0].faces, split[0].faces, start[1].faces, split[1].faces]);
    await sleep(600);
    phase('show');
    await page.locator('[data-hotkey="geosetsClear"]').scrollIntoViewIfNeeded();
    await ping('[data-hotkey="geosetsClear"]', 1000);
    await page.locator('[data-hotkey="geosetsClear"]').click();
    for (const g of [layerG, plateG].sort((a, b) => a - b)) await tick(g, true);
    await ping('input[data-hotkey="showAllGeosets"]', 1100);
    await page.locator('input[data-hotkey="showAllGeosets"]').uncheck();
    await sleep(500);
    const visible = await shown();
    check(JSON.stringify(visible) === JSON.stringify([plateG, layerG].sort((a, b) => a - b)), 'only the shield geosets are shown', visible);
    await selectAll();
    check(JSON.stringify(await sel()) === JSON.stringify({ [Math.min(plateG, layerG)]: all(split[Math.min(plateG, layerG)].vertices.length / 3), [Math.max(plateG, layerG)]: all(split[Math.max(plateG, layerG)].vertices.length / 3) }), 'Ctrl + A selects the whole shield');
    await frameButton('fitSelection');
    await shot('isolate');
    await end(1000);

    // 3. Bevel: Left view and Wireframe, only the shield plate selected (Ctrl + A with the red layer unticked).
    await begin('forge-bevel');
    phase('view');
    await choose(viewMenu, 'left');
    await page.waitForFunction(() => lpwState()?.appliedView === 'left', null, { timeout: 5000 }).catch(() => {});
    await choose(renderMenu, 'wireframe');
    phase('plate');
    await tick(layerG, false);
    await selectAll();
    await frameButton('fitSelection');
    phase('bevel');
    const before3 = await geosets();
    const bevel = drawer + ' button[data-hotkey="forge:shape:mold:Bevel"]';
    await ping(bevel, 1200);
    await page.locator(bevel).click();
    await sleep(600);
    await dragHandle(BEVEL, 1300);
    s.proof.bevelAmount = await page.evaluate(() => document.querySelector('.forge-mold-bar span')?.textContent);
    await verticesDiffer(plateG, before3[plateG].vertices);
    await sleep(900);
    await keep();
    const after3 = await geosets();
    check(after3[plateG].vertices.length > before3[plateG].vertices.length && after3[plateG].faces > before3[plateG].faces, 'Bevel adds rim vertices and faces', [before3[plateG].vertices.length / 3, after3[plateG].vertices.length / 3, before3[plateG].faces, after3[plateG].faces]);
    for (const a of [0, 2]) { const span = v => { const n = all(v.length / 3).map(i => v[i * 3 + a]); return Math.max(...n) - Math.min(...n); }; check(Math.abs(span(after3[plateG].vertices) - span(before3[plateG].vertices)) < .01, 'the outline stays (axis ' + a + ')'); }
    await sleep(1200);
    await shot('bevel');
    await end(1000);

    // 4. Bend the shield (and its red layer) so it curves toward the body, then show it on the whole Footman.
    const before4 = await geosets();
    await begin('forge-bend');
    phase('textured');
    await choose(viewMenu, 'perspective');
    await choose(renderMenu, 'textured');
    await tick(layerG, true);
    await selectAll();
    phase('bend');
    const bend = drawer + ' button[data-hotkey="forge:shape:mold:Bend"]';
    await ping(bend, 1200);
    await page.locator(bend).click();
    await page.locator('.forge-mold-bar').waitFor();
    // Bend along Across (X), curving in Depth (Y): the left and right edges turn toward the body.
    const across = '.forge-mold-bar button[aria-pressed]:nth-of-type(1)';
    await ping(across, 1100);
    await page.locator(across).click();
    const mold = () => page.evaluate(() => { const m = findFiberState('.forge-vertex-tools', s => s?.kind && s?.draft, { current: true })?.mold; return m && { axis: m.axis, direction: m.direction }; });
    if ((await mold()).direction !== 1) {
      const turn = '.forge-mold-bar button:not([aria-pressed]):not([data-hotkey])';
      await ping(turn, 1000);
      await page.locator(turn).first().click();
    }
    check(JSON.stringify(await mold()) === JSON.stringify({ axis: 0, direction: 1 }), 'Bend along Across, curving in Depth', await mold());
    await sleep(400);
    await dragHandle(BEND, 1600);
    s.proof.bendAmount = await page.evaluate(() => document.querySelector('.forge-mold-bar span')?.textContent);
    await verticesDiffer(plateG, before4[plateG].vertices);
    await sleep(800);
    await keep();
    const after4 = await geosets();
    // Depth (Y) of the shield front's left and right ends against its middle (the same vertices before and after):
    // the ends turn toward the body (+Y) relative to the middle.
    const b = before4[plateG].vertices, n4 = b.length / 3, front = all(n4).filter(i => b[i * 3 + 1] > -31 && b[i * 3 + 1] < -22);
    const fx = front.map(i => b[i * 3]), lo = Math.min(...fx), hi = Math.max(...fx), w = hi - lo;
    const sides = { left: front.filter(i => b[i * 3] < lo + w * .2), right: front.filter(i => b[i * 3] > hi - w * .2), middle: front.filter(i => Math.abs(b[i * 3] - (lo + hi) / 2) < w * .2) };
    const depth = v => Object.fromEntries(Object.entries(sides).map(([k, ids]) => [k, ids.reduce((t, i) => t + v[i * 3 + 1], 0) / ids.length]));
    const c0 = depth(b), c1 = depth(after4[plateG].vertices), curl = c => (c.left - c.middle) + (c.right - c.middle);
    s.proof.bend = { before: c0, after: c1, curl: [curl(c0), curl(c1)] };
    check(curl(c1) - curl(c0) > 4 && c1.left - c1.middle > c0.left - c0.middle && c1.right - c1.middle > c0.right - c0.middle, 'both sides curve toward the body', s.proof.bend);
    s.proof.bendVertices = { plate: [before4[plateG].vertices.length / 3, after4[plateG].vertices.length / 3], layer: [before4[layerG].vertices.length / 3, after4[layerG].vertices.length / 3] };
    check(JSON.stringify(after4[layerG].vertices) !== JSON.stringify(before4[layerG].vertices), 'the red layer bends too', s.proof.bendVertices);
    await sleep(700);
    phase('show-all');
    await ping('input[data-hotkey="showAllGeosets"]', 1100);
    await page.locator('input[data-hotkey="showAllGeosets"]').check();
    await sleep(400);
    check((await shown()).length === after4.length, 'Show all shows the whole Footman again', await shown());
    await frameButton('fit');
    const plateMid = await page.evaluate(g => { const p = lpwScreen(g, Array.from({ length: lpwVertices(g).length / 3 }, (_, i) => i)); return { x: p.reduce((n, q) => n + q.x, 0) / p.length, y: p.reduce((n, q) => n + q.y, 0) / p.length }; }, plateG);
    await page.mouse.move(plateMid.x, plateMid.y);
    for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, -120); await sleep(160); }
    await orbit(-40, 0, 1000);
    await shot('bend');
    await end(1200);

    // 5. Check it: turn the camera, Undo and Redo the bend.
    const final = await geosets();
    await begin('forge-check');
    phase('orbit');
    await orbit(-110, 0, 1500);
    await sleep(400);
    await orbit(110, 0, 1500);
    await sleep(500);
    phase('undo');
    await cue('Ctrl + Z', () => page.keyboard.press('Control+z'), 900);
    await page.waitForFunction(([g, v]) => JSON.stringify(lpwVertices(g)) !== JSON.stringify(v), [plateG, final[plateG].vertices]);
    check(JSON.stringify((await geosets())[plateG].vertices) === JSON.stringify(before4[plateG].vertices), 'Undo takes the bend back');
    await cue('Ctrl + Y', () => page.keyboard.press('Control+y'), 900);
    await page.waitForFunction(([g, v]) => JSON.stringify(lpwVertices(g)) === JSON.stringify(v), [plateG, final[plateG].vertices]);
    check(JSON.stringify(await geosets()) === JSON.stringify(final), 'Redo restores the bent shield');
    await shot('check');
    await end(1300);

    // Card: the bent shield on the Footman, textured, no selection and no vertex markers.
    await page.evaluate(() => lpwHost().focus());
    await page.keyboard.press('Escape');
    await page.keyboard.press('Shift+C');
    await page.waitForFunction(() => !Object.values(lpwSelection()).some(v => v.length), null, { timeout: 5000 });
    await sleep(900);
    await page.screenshot({ path: OUT + '/card.png', clip: { x: 0, y: 0, width: 1264, height: 760 } });

    // Nothing else changed: the body keeps every other vertex position, geosets 3-5 are untouched.
    const rest = (v, drop) => all(v.length / 3).filter(i => !drop.includes(i)).map(i => key(v, i)).sort();
    const remain = v => all(v.length / 3).map(i => key(v, i)).sort();
    check(remain(final[0].vertices).every(p => rest(start[0].vertices, SHIELD).includes(p)) && rest(start[0].vertices, SHIELD).every(p => remain(final[0].vertices).includes(p)), 'geoset 1 keeps every non-shield vertex in place');
    check(rest(start[1].vertices, LAYER).every(p => remain(final[1].vertices).includes(p)), 'geoset 2 keeps every non-shield vertex in place');
    for (const g of [2, 3, 4]) check(JSON.stringify(final[g]) === JSON.stringify(start[g]), 'geoset ' + (g + 1) + ' untouched');
    s.proof.shield = { geosets: { plate: plateG + 1, layer: layerG + 1 } };
    await s.close();
  } catch (e) { await s.close(e); }
})();
