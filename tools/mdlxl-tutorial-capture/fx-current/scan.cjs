// Exploration only: opens FX on the tutorial model and writes each geoset highlighted, plus model facts, to <work>/scan-<locale>.
const fs = require('node:fs');
const { openSession, sleep, WORK } = require('./recorder.cjs');
const LOCALE = process.env.LPW_LOCALE || 'en', OUT = WORK + '/scan-' + LOCALE;
(async () => {
  const s = await openSession({ locale: LOCALE, out: OUT, debug: true });
  const { page } = s;
  const fx = page.locator('.sfx-window');
  const ready = () => page.waitForFunction(() => { const p = mdlxlProbe('.sfx-stage .game-preview-root'); return p?.runtime?.captureApi.isReady && p.runtime.particleSourceModel === p.props.model && !document.querySelector('.sfx-apply')?.disabled; }, null, { timeout: 60000 });
  const info = {};
  try {
    await page.screenshot({ path: OUT + '/main.png' });
    info.model = await page.evaluate(() => { const m = mdlxlProbe().session.doc.model; return { geosets: m.Geosets.map((g, i) => ({ i, verts: g.Vertices.length / 3, mat: g.MaterialID, tex: m.Materials[g.MaterialID]?.Layers.map(l => m.Textures[l.TextureID]?.Image || ('#' + m.Textures[l.TextureID]?.ReplaceableId)), min: Array.from(g.MinimumExtent || []).map(Math.round), max: Array.from(g.MaximumExtent || []).map(Math.round) })), seqs: m.Sequences.map(s => s.Name + ' ' + s.Interval.join('-')), ribbons: (m.RibbonEmitters || []).length, emitters: (m.ParticleEmitters2 || []).length, bones: m.Bones.length }; });
    await page.locator('[data-hotkey="surfaceEffects"]').click();
    await ready();
    info.options = await fx.locator('.sfx-target select').first().evaluate(s => [...s.options].map(o => [o.value, o.textContent]));
    await page.screenshot({ path: OUT + '/fx-open.png' });
    const st = await fx.locator('.sfx-stage').boundingBox();
    info.cams = [];
    for (const [k, dx, dy, wheel] of [[0, 0, 0, 0], [1, 100, 0, 0], [2, 100, 0, 0], [3, 100, 0, 0], [4, 100, 0, 0], [5, 0, 40, 0], [6, 0, 0, 3]]) {
      if (dx || dy) await s.glide({ x: st.x + st.width * .5, y: st.y + st.height * .8 }, { x: st.x + st.width * .5 + dx, y: st.y + st.height * .8 + dy }, 600, 'left');
      if (wheel) { await page.mouse.move(st.x + st.width / 2, st.y + st.height / 2); for (let i = 0; i < wheel; i++) { await page.mouse.wheel(0, 120); await sleep(150); } }
      await sleep(1200);
      info.cams.push(await page.evaluate(() => mdlxlProbe('.sfx-stage .game-preview-root').runtime.controls.object.position.toArray().map(Math.round)));
      await fx.locator('.sfx-stage').screenshot({ path: OUT + '/cam-' + k + '.png' });
    }
    fs.writeFileSync(OUT + '/info.json', JSON.stringify(info, null, 1));
    await s.close();
  } catch (e) { fs.writeFileSync(OUT + '/info.json', JSON.stringify(info, null, 1)); await s.close(e); }
})();
