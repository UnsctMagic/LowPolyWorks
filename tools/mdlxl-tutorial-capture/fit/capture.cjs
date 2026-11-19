// Records the UV Wrapper Fit clips from the real MDLxL app, one locale per run, through MDLxL's scripts/hidden-run.ps1, on geoset 4 of the
// statue (a coiled snake, 157 points, textured with the game's TempleOfTheTides.blp). Fit, a polygon around the snake column of the texture,
// Enter, Fit again: the snake's UVs move into the area. Ctrl + Z is checked after the clips. Every step is checked against the
// model data; the checks are written to <work>/captures/<locale>/proof.json.
const fs = require('node:fs');
const { openSession, sleep, WORK } = require('./recorder.cjs');
const LOCALE = process.env.LPW_LOCALE || 'en';
const OUT = WORK + '/captures/' + LOCALE;
const GEOSET = 3;                       // geoset 4 in the app's lists (1-based)
const CENTER = [.531, -.312];            // the owner's view: centred here (u, v), the tile is 1/1.312 of the map's width, so the red and teal columns fill it
const TILE_PER_WIDTH = 1 / 1.312;
// The polygon: the owner's nine clicks around the teal scaly column right of the dark red one (u, v), read from his recording.
const AREA = [[0.8036, -0.5019], [0.9587, -0.5029], [0.9548, -0.1368], [0.9721, -0.0415], [0.9048, 0.0004], [0.8247, 0.0039], [0.7776, -0.0525], [0.7958, -0.0993], [0.8238, -0.1146]];

(async () => {
  const s = await openSession({ locale: LOCALE, out: OUT, debug: process.env.LPW_DEBUG === '1' });
  const { page, check, begin, end, phase, cue, ping, glide, shot } = s;
  const model = () => page.evaluate(g => { const m = mdlxlProbe().session.doc.model.Geosets[g];
    return { vertices: m.Vertices.length / 3, triangles: m.Faces.length / 3, faces: Array.from(m.Faces), positions: Array.from(m.Vertices), uv: Array.from(m.TVertices[0]) }; }, GEOSET);
  const mapping = () => page.evaluate(() => { const c = document.querySelector('.uv-editor canvas'), r = c.getBoundingClientRect(), st = uvs(), ts = uvp().textureSize || [1, 1], aspect = Math.max(.01, ts[0] / ts[1]),
    base = Math.max(20, Math.min((r.width - 40) / 2.7, (r.height - 40) / 2.3)), sizeX = base * (aspect >= 1 ? aspect : 1) * st.zoom, sizeY = base * (aspect >= 1 ? 1 : 1 / aspect) * st.zoom;
    return { x: r.left + (r.width - sizeX) / 2 + st.panX, y: r.top + (r.height - sizeY) / 2 + st.panY, sizeX, sizeY, canvas: { l: r.left, t: r.top, w: r.width, h: r.height } }; });
  const toScreen = (m, [u, v]) => ({ x: m.x + u * m.sizeX, y: m.y + v * m.sizeY });
  const inside = (poly, [x, y], eps = 1e-4) => { let hit = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit; }
    if (hit) return true; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j], d = [b[0] - a[0], b[1] - a[1]], l = d[0] * d[0] + d[1] * d[1], t = Math.max(0, Math.min(1, ((x - a[0]) * d[0] + (y - a[1]) * d[1]) / l)); if (Math.hypot(x - a[0] - d[0] * t, y - a[1] - d[1] * t) <= eps) return true; } return false; };
  const uvPoints = a => Array.from({ length: a.length / 2 }, (_, i) => [a[i * 2], a[i * 2 + 1]]);
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const boundsOf = pts => [Math.min(...pts.map(q => q[0])), Math.min(...pts.map(q => q[1])), Math.max(...pts.map(q => q[0])), Math.max(...pts.map(q => q[1]))];
  try {
    // Setup (not part of a clip): geoset 4 chosen, all its points selected, the UV Wrapper open on it.
    await page.locator('[data-hotkey="geosetsClear"]').click(); await sleep(250);
    await page.locator('[data-hotkey="geoset:' + GEOSET + '"]').click(); await sleep(500);
    const base = await model();
    s.proof.before = { vertices: base.vertices, triangles: base.triangles, uvBounds: boundsOf(uvPoints(base.uv)) };
    check(base.vertices === 157 && base.triangles === 247, 'geoset 4 has 157 points and 247 triangles', { vertices: base.vertices, triangles: base.triangles });
    await page.evaluate(n => lpwProps().onSelectionChange({ 3: Array.from({ length: n }, (_, i) => i) }), base.vertices); await sleep(500);
    const picked = await page.evaluate(() => lpwSelection());
    check(picked[GEOSET]?.length === base.vertices, 'all points of geoset 4 are selected', Object.keys(picked));
    await page.locator('[data-hotkey="uv"]').click();
    await page.locator('.uv-tab-window .uv-editor canvas').waitFor(); await sleep(2500);
    await page.evaluate(() => { window.uvp = () => findFiberProps('.uv-editor', p => p.geoset && p.onSelectVertices); window.uvs = () => findFiberState('.uv-editor', st => st.uv && st.draw, { last: true }); });
    await page.evaluate(([center, perWidth]) => { const st = uvs(), r = document.querySelector('.uv-editor canvas').getBoundingClientRect(), ts = uvp().textureSize || [1, 1], aspect = Math.max(.01, ts[0] / ts[1]),
      b = Math.max(20, Math.min((r.width - 40) / 2.7, (r.height - 40) / 2.3)), unit = b * (aspect >= 1 ? aspect : 1), tile = r.width * perWidth;
      st.zoom = tile / unit; st.panX = (.5 - center[0]) * tile; st.panY = (.5 - center[1]) * tile; st.draw(); }, [CENTER, TILE_PER_WIDTH]);
    await sleep(600);
    const fitButton = page.locator('.uv-tab-window [data-hotkey="uv:fit"]');
    await fitButton.scrollIntoViewIfNeeded(); await sleep(500);
    const preview = await page.locator('.uv-tab-window .uv-preview-canvas').boundingBox();
    const fb = await fitButton.boundingBox();
    check(fb && fb.y + fb.height < 755, 'the Fit button is in view', fb);
    const m0 = await mapping();
    const corners = AREA.map(p => toScreen(m0, p));
    const free = { x: m0.canvas.l + m0.canvas.w - 60, y: m0.canvas.t + 60 };
    await shot('start');

    // 1. Fit, Polygon lasso, the owner's nine corners, Enter, Fit.
    await begin('fit-area');
    phase('tool'); await sleep(800);
    await ping(fitButton, 1300); await fitButton.click(); await sleep(600);
    const bar = page.locator('.uv-tab-window .uv-fit-bar');
    check(await bar.count() === 1, 'the Fit bar is shown', await bar.count());
    const polygon = page.locator('.uv-tab-window [data-hotkey="uv-fit:polygon"]');
    check(await polygon.getAttribute('aria-pressed') === 'true', 'Polygon lasso is the active mode', await polygon.getAttribute('aria-pressed'));
    phase('mark');
    await ping(polygon, 1300); await sleep(300);
    const pb = await polygon.boundingBox();
    await glide({ x: pb.x + pb.width / 2, y: pb.y + pb.height / 2 }, corners[0], 1100); await sleep(500);
    await page.mouse.click(corners[0].x, corners[0].y); await sleep(700);
    for (let i = 1; i < corners.length; i++) { await glide(corners[i - 1], corners[i], 650); await sleep(150); await page.mouse.click(corners[i].x, corners[i].y); await sleep(450); }
    await shot('corners');
    phase('enter');
    await glide(corners[corners.length - 1], free, 700); await sleep(300);
    await cue('Enter', async () => { await page.keyboard.press('Enter'); await sleep(400); }, 500);
    await sleep(1100);
    await shot('area');
    const mid = await model();
    check(same(mid.uv, base.uv), 'Enter only closes the area: no UV has moved yet', null);
    await sleep(1500);
    await end(600);

    // 2. Fit again: the snake's UVs move into the area.
    await begin('fit-move');
    phase('fit'); await sleep(900);
    await ping(fitButton, 1300); await fitButton.click(); await sleep(1000);
    const done = await model();
    s.proof.fit = { vertices: done.vertices, triangles: done.triangles };
    check(await bar.count() === 0, 'the Fit bar closes after Fit', await bar.count());
    check(done.vertices === base.vertices && done.triangles === base.triangles && same(done.faces, base.faces) && same(done.positions, base.positions), 'Fit changed no point and no triangle: same counts, same triangles, same 3D positions', { vertices: done.vertices, triangles: done.triangles });
    check(!same(done.uv, base.uv), 'the UVs moved', null);
    const points = uvPoints(done.uv), outside = points.map((p, i) => [i, p]).filter(([, p]) => !inside(AREA, p));
    s.proof.inside = { checked: points.length, outside: outside.length, bounds: boundsOf(points) };
    check(outside.length === 0, 'all ' + points.length + ' UV points lie inside the marked area', { outside: outside.slice(0, 5) });
    s.proof.moved = uvPoints(base.uv).filter((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]) > 1e-6).length;
    await sleep(2200);
    await shot('fitted');
    // Turn the 3D preview with a real left-button drag so the snake shows its new texture around the base.
    phase('rotate');
    const pv = await page.locator('.uv-tab-window .uv-preview-canvas').boundingBox();
    const from = { x: pv.x + pv.width * .5, y: pv.y + pv.height * .5 };
    await glide(free, from, 700); await sleep(300);
    await glide(from, { x: from.x + (+process.env.LPW_DX || -90), y: from.y + (+process.env.LPW_DY || 20) }, 1500, 'left');
    await sleep(2500);
    await shot('rotated');
    await end(600);

    // Not part of a clip: Ctrl + Z puts every UV back.
    await page.keyboard.press('Control+z'); await sleep(800);
    const undone = await model();
    check(same(undone.uv, base.uv) && same(undone.faces, base.faces) && same(undone.positions, base.positions), 'Ctrl + Z restored every UV exactly', null);
    s.proof.undo = { restored: true };
    await s.close();
  } catch (e) { await s.close(e); }
})();
