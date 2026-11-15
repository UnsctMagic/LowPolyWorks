// Exploration only: tries the snowman steps on the Great Unclean One and writes preview pictures to <work>/explore.
const fs = require('node:fs');
const { openSession, sleep, WORK } = require('./recorder.cjs');
const OUT = WORK + '/explore';
const STEP = process.env.LPW_STEP || 'all';
(async () => {
  const s = await openSession({ locale: 'en', out: OUT, debug: true });
  const { page } = s;
  const fx = page.locator('.sfx-window'), stage = fx.locator('.sfx-stage');
  const ready = () => page.waitForFunction(() => { const p = mdlxlProbe('.sfx-stage .game-preview-root'); return p?.runtime?.captureApi.isReady && p.runtime.particleSourceModel === p.props.model && !document.querySelector('.sfx-apply')?.disabled; }, null, { timeout: 60000 });
  const info = { log: [] };
  const log = (...a) => { info.log.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); fs.writeFileSync(OUT + '/info.json', JSON.stringify(info, null, 1)); };
  const cam = () => page.evaluate(() => { const r = mdlxlProbe('.sfx-stage .game-preview-root').runtime, p = r.controls.object.position, t = r.controls.target, d = [p.x - t.x, p.y - t.y, p.z - t.z], h = Math.hypot(d[0], d[1]); return { az: Math.atan2(d[1], d[0]) * 180 / Math.PI, el: Math.atan2(d[2], h) * 180 / Math.PI, dist: Math.hypot(...d), target: [t.x, t.y, t.z].map(Math.round) }; });
  const wrap = a => ((a + 540) % 360) - 180;
  // Turns the preview to an azimuth/elevation with real drags, measuring the response of each drag.
  const orbitTo = async (az, el) => {
    const b = await stage.boundingBox(); let kx = -0.8, ky = 0.5;
    for (let i = 0; i < 5; i++) {
      const c = await cam(), ea = wrap(az - c.az), ee = el - c.el;
      if (Math.abs(ea) < 4 && Math.abs(ee) < 4) return c;
      const dx = Math.max(-260, Math.min(260, ea / kx)), dy = Math.max(-150, Math.min(150, ee / ky));
      const from = { x: b.x + b.width / 2 - dx / 2, y: b.y + b.height / 2 - dy / 2 };
      await s.glide(from, { x: from.x + dx, y: from.y + dy }, 700, 'left'); await sleep(250);
      const n = await cam(); const ma = wrap(n.az - c.az), me = n.el - c.el;
      if (Math.abs(dx) > 10 && Math.abs(ma) > 1) kx = ma / dx; if (Math.abs(dy) > 10 && Math.abs(me) > 1) ky = me / dy;
    }
    return cam();
  };
  const facePoints = gi => page.evaluate(gi => {
    const p = mdlxlProbe('.sfx-stage .game-preview-root'), n = p.runtime.native, g = n.model.Geosets[gi], cam = p.runtime.controls.object, box = document.querySelector('.sfx-stage').getBoundingClientRect();
    const tf = (v, m) => [0, 1, 2].map(i => m[i] * v[0] + m[4 + i] * v[1] + m[8 + i] * v[2] + m[12 + i]);
    const pts = Array.from({ length: g.Vertices.length / 3 }, (_, v) => { const pos = Array.from(g.Vertices.slice(v * 3, v * 3 + 3)), bones = g.Groups[g.VertexGroup[v]], w = [0, 0, 0]; for (const id of bones) tf(pos, n.rendererData.nodes[id].matrix).forEach((x, i) => w[i] += x / bones.length); const view = tf(w, cam.matrixWorldInverse.elements), m = cam.projectionMatrix.elements, h = m[3] * view[0] + m[7] * view[1] + m[11] * view[2] + m[15], sc = tf(view, m); return [box.x + (1 + sc[0] / h) * box.width / 2, box.y + (1 - sc[1] / h) * box.height / 2]; });
    const out = []; for (let i = 0; i < g.Faces.length; i += 3) { const [a, b, c] = [0, 1, 2].map(j => pts[g.Faces[i + j]]), area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2, x = (a[0] + b[0] + c[0]) / 3, y = (a[1] + b[1] + c[1]) / 3; if (x > box.x + 20 && x < box.right - 20 && y > box.y + 20 && y < box.bottom - 20 && document.elementFromPoint(x, y)?.tagName === 'CANVAS') out.push({ x, y, area }); }
    return out.sort((a, b) => b.area - a.area).slice(0, 12);
  }, gi);
  const geoset = () => fx.locator('.sfx-target select').first().inputValue();
  const pickPart = async gi => {
    for (const f of await facePoints(gi)) { await page.mouse.dblclick(f.x, f.y); await sleep(700); if (await geoset() === String(gi)) { await ready(); return f; } }
    log('could not double-click geoset', gi); await fx.locator('.sfx-target select').first().selectOption(String(gi)); await ready(); return null;
  };
  const folder = name => fx.locator('.sfx-cards section').filter({ has: page.locator('.gf-row.folder', { hasText: new RegExp('^' + name) }) });
  const look = async (folderName, lookName) => { const f = folder(folderName).locator('.gf-row.folder'); if (await f.getAttribute('aria-expanded') !== 'true') await f.click(); await folder(folderName).locator(`.sfx-card[aria-label="${lookName} global animation"]`).click(); await ready(); };
  const variation = async name => { const v = fx.getByLabel('Variation', { exact: true }); const val = await v.locator('option').evaluateAll((o, n) => o.find(x => x.textContent === n)?.value, name); await v.selectOption(val); await ready(); };
  const shot = async name => { await sleep(1800); await stage.screenshot({ path: OUT + '/' + name + '.png' }); };
  const layers = () => fx.locator('.fx-layer-list button').allTextContents();
  const controlsText = () => fx.locator('.sfx-controls').innerText();
  const open = async () => { await page.locator('[data-hotkey="surfaceEffects"]').click(); await ready(); await orbitTo(50, 10); };
  const apply = async () => { await fx.locator('.sfx-apply').click(); await fx.waitFor({ state: 'hidden' }); };
  const addLayer = async name => { await fx.locator('.fx-add-row .fx-picker > button').nth(1).click(); const r = fx.locator('.fx-picker-row').filter({ has: page.locator('.fx-picker-name', { hasText: new RegExp('^' + name + '$') }) }).first(); await r.scrollIntoViewIfNeeded(); await r.click(); await ready(); };
  const toggle = async name => { await fx.locator('.fx-layer-row').filter({ has: page.locator('button', { hasText: new RegExp('^' + name) }) }).locator('input').click(); await ready(); };
  const mainShot = async name => { await sleep(1500); await page.screenshot({ path: OUT + '/' + name + '.png' }); };
  try {
    await open(); await pickPart(5); await look('Ice', 'Frost'); await apply();
    await open(); await orbitTo(-130, 35); await shot('back');
    log('pus pick', await pickPart(24)); await look('Ice', 'Crystal'); await variation('Crystal growth'); await shot('pus-back-growth');
    await addLayer('Crystal facets'); await shot('pus-back-facets'); await apply();
    await open(); await pickPart(8); await look('Ice', 'Frost'); await variation('Dark ice'); await toggle('Falling mist'); await addLayer('Crystal glints'); await apply();
    await open(); await pickPart(9); await look('Ice', 'Frost'); await variation('Ice spikes'); await apply();
    // Sweep: select the blade in the Vertex editor, EMTR, Add ribbon, Frost.
    await page.locator('[data-hotkey="geosetsClear"]').click(); await sleep(300);
    await page.locator('[data-hotkey="geoset:9"]').check(); await sleep(300);
    const showAll = page.locator('[data-hotkey="showAllGeosets"]'); log('show all', await showAll.isChecked());
    await mainShot('main-geoset9');
    const host = await s.hostBox(); await page.mouse.click(host.x + host.width * .5, host.y + 10); await page.keyboard.press('Control+a'); await sleep(800);
    log('selection', Object.fromEntries(Object.entries(await page.evaluate(() => lpwSelection())).map(([k, v]) => [k, v.length])));
    await mainShot('main-selected');
    await page.locator('[data-hotkey="particles"]').click(); await sleep(4000);
    await mainShot('emtr-open');
    await page.locator('[data-hotkey="particles:add-ribbon"]').click(); await sleep(3000);
    await mainShot('ribbon-begin');
    const seqs = page.locator('.pe-ribbon-sequences input'); log('seq checked', await seqs.evaluateAll(l => l.map(i => i.checked)));
    log('pe text', (await page.locator('.pe-placement').innerText()).slice(0, 800));
    await page.locator('.pe-placement select[aria-label="Sweep"]').selectOption('frost'); await sleep(3000);
    await mainShot('ribbon-frost');
    await seqs.nth(4).check(); await sleep(3000); await mainShot('ribbon-attack');
    await page.getByRole('button', { name: 'Create', exact: true }).click(); await sleep(3000); await mainShot('ribbon-created');
    log('ribbons', await page.evaluate(() => mdlxlProbe().session.doc.model.RibbonEmitters.map(r => r.Name)));
    await page.getByRole('button', { name: 'Close Particle Editor', exact: true }).click(); await sleep(1000);
    await page.locator('.classic-mode-tabs, body').getByRole('button', { name: 'Showcase', exact: true }).first().click(); await sleep(5000);
    await page.locator('.showcase-list li').first().click(); await sleep(800); await mainShot('showcase-edit');
    await page.getByLabel('Animation', { exact: true }).selectOption({ label: 'Attack - 1' }); await sleep(300);
    log('dialog buttons', await page.locator('[role=dialog] button').allTextContents());
    await page.locator('[role=dialog] button[type=submit], [role=dialog] .dialog-ok').first().click().catch(e => log('ok', String(e))); await sleep(800);
    await page.locator('.showcase-sequence-preview').click(); await sleep(3000); await mainShot('showcase-attack');
    await s.close();
  } catch (e) { log('ERROR', String(e)); await s.close(e); }
})();
