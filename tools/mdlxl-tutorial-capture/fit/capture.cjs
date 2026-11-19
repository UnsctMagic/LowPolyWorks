// Copies the owner's screen recording (frames f000-f170 of his GIF) in the real MDLxL app at his window size, 1920x1009, one locale per run,
// through MDLxL's scripts/hidden-run.ps1: 85 of the 157 points of geoset 4 (a coiled snake of the statue, textured with the game's
// TempleOfTheTides.blp) selected, a wheel zoom, a map pan, Fit, nine polygon clicks, Enter, Fit, and a left-button drag that turns the 3D preview.
// Ctrl + Z is checked after the clips. Every step is checked against the model data; the checks are written to <work>/captures/<locale>/proof.json.
const fs = require('node:fs');
const { openSession, sleep, WORK } = require('./recorder.cjs');
const LOCALE = process.env.LPW_LOCALE || 'en';
const OUT = WORK + '/captures/' + LOCALE;
const GEOSET = 3;                       // geoset 4 in the app's lists (1-based)
// The owner's views of the map, measured in his frames (px in the map, top-left = 0,0; tile size S; u=0 at x=ox, v=0 at y=oy):
const VIEW_START = { S: 258, ox: 294, oy: 650 - 160 };       // f000, zoomed out
const VIEW_FIT = { S: 692, ox: -13.4, oy: 768 - 160 };       // f127-f170, the teal column large
const WHEEL_AT = { x: 555, y: 645 - 160 };                    // his cursor while zooming (f005)
const PAN_FROM = { x: 398, y: 650 - 160 };                    // his pan (f008-f012): the map moves 142 px right and 100 px down
// His left-button drag in the 3D preview (cursor read from his frames f150-f164, window px, one point per two frames of 88 ms), then the pointer rests at (1357, 625).
const ROTATE_PATH = [[1162, 517], [1192, 543], [1215, 565], [1245, 565], [1267, 565], [1279, 565], [1290, 561], [1302, 561]], ROTATE_REST = { x: 1357, y: 625 };
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
  // Sets the map's zoom and pan so that tile size, u=0 and v=0 are at the given map px (view state, as the app's own wheel and drag do).
  const setView = v => page.evaluate(({ S, ox, oy }) => { const st = uvs(), r = document.querySelector('.uv-editor canvas').getBoundingClientRect(), ts = uvp().textureSize || [1, 1], aspect = Math.max(.01, ts[0] / ts[1]),
    b = Math.max(20, Math.min((r.width - 40) / 2.7, (r.height - 40) / 2.3)), unit = b * (aspect >= 1 ? aspect : 1);
    st.zoom = S / unit; st.panX = ox - (r.width - S) / 2; st.panY = oy - (r.height - S) / 2; st.draw(); }, v);
  const toScreen = (m, [u, v]) => ({ x: m.x + u * m.sizeX, y: m.y + v * m.sizeY });
  const inside = (poly, [x, y], eps = 1e-4) => { let hit = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit; }
    if (hit) return true; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j], d = [b[0] - a[0], b[1] - a[1]], l = d[0] * d[0] + d[1] * d[1], t = Math.max(0, Math.min(1, ((x - a[0]) * d[0] + (y - a[1]) * d[1]) / l)); if (Math.hypot(x - a[0] - d[0] * t, y - a[1] - d[1] * t) <= eps) return true; } return false; };
  const uvPoints = a => Array.from({ length: a.length / 2 }, (_, i) => [a[i * 2], a[i * 2 + 1]]);
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const boundsOf = pts => [Math.min(...pts.map(q => q[0])), Math.min(...pts.map(q => q[1])), Math.max(...pts.map(q => q[0])), Math.max(...pts.map(q => q[1]))];
  try {
    // Setup (not part of a clip): geoset 4 chosen, the 85 points of the first UV piece selected like the owner's (Stats: 157 verts, 85 sel), the UV Wrapper open on it.
    await page.locator('[data-hotkey="geosetsClear"]').click(); await sleep(250);
    await page.locator('[data-hotkey="geoset:' + GEOSET + '"]').click(); await sleep(500);
    // Like the owner's panel: Highlight Geoset is on next to Show all.
    try { const box = page.locator('[data-hotkey="showAllGeosets"]').locator('xpath=following::input[@type="checkbox"][1]'); if (!(await box.isChecked({ timeout: 3000 }))) await box.check({ timeout: 3000 }); s.proof.highlightGeoset = await box.isChecked(); } catch (e) { s.proof.highlightGeoset = 'not set: ' + e.message; }
    await sleep(300);
    const base = await model();
    const baseUV = uvPoints(base.uv);
    const pickIndices = baseUV.map((p, i) => [i, p]).filter(([, p]) => p[1] < .3).map(([i]) => i);   // the piece at v -0.48..0, the red one in the owner's f000
    s.proof.before = { vertices: base.vertices, triangles: base.triangles, uvBounds: boundsOf(baseUV), selected: pickIndices.length };
    check(base.vertices === 157 && base.triangles === 247, 'geoset 4 has 157 points and 247 triangles', { vertices: base.vertices, triangles: base.triangles });
    check(pickIndices.length === 85, 'the first UV piece has 85 points', pickIndices.length);
    await page.evaluate(list => lpwProps().onSelectionChange({ 3: list }), pickIndices); await sleep(500);
    const picked = await page.evaluate(() => lpwSelection());
    check(picked[GEOSET]?.length === 85, '85 points of geoset 4 are selected', Object.keys(picked));
    await page.locator('[data-hotkey="uv"]').click();
    await page.locator('.uv-tab-window .uv-editor canvas').waitFor(); await sleep(2500);
    await page.evaluate(() => { window.uvp = () => findFiberProps('.uv-editor', p => p.geoset && p.onSelectVertices); window.uvs = () => findFiberState('.uv-editor', st => st.uv && st.draw, { last: true }); });
    await setView(VIEW_START); await sleep(600);
    const fitButton = page.locator('.uv-tab-window [data-hotkey="uv:fit"]');
    const fb = await fitButton.boundingBox();
    check(fb && fb.y + fb.height < 990, 'the Fit button is in view', fb);
    const c0 = await mapping(), L = c0.canvas.l, T = c0.canvas.t;
    const at = p => ({ x: L + p.x, y: T + p.y });
    s.proof.canvas = c0.canvas; s.proof.fitButton = fb;
    await shot('start');

    // 1. Zoom with the wheel, pan the map, Fit, the nine corners, Enter.
    await begin('fit-area');
    phase('zoom'); await sleep(500);
    await glide(at({ x: 650, y: 500 }), at(WHEEL_AT), 500);
    let m = await mapping();
    for (let i = 0; i < 40 && m.sizeX < 640; i++) { await page.mouse.wheel(0, -120); await sleep(110); m = await mapping(); }
    s.proof.zoomed = { sizeX: m.sizeX };
    await sleep(700);
    phase('pan');
    const dx = VIEW_FIT.ox - (m.x - L), dy = VIEW_FIT.oy - (m.y - T), pa = at(PAN_FROM);
    await glide(at(WHEEL_AT), pa, 300); await sleep(150);
    await glide(pa, { x: pa.x + dx, y: pa.y + dy }, 450, 'right'); await sleep(300);
    await setView(VIEW_FIT);                                 // the drag lands within a few px; the exact view is set so the outline clicks match the owner's
    await sleep(300);
    const m0 = await mapping();
    s.proof.view = { sizeX: m0.sizeX, x: m0.x - L, y: m0.y - T };
    const corners = AREA.map(p => toScreen(m0, p));
    phase('tool');
    await glide({ x: pa.x + dx, y: pa.y + dy }, { x: fb.x + fb.width / 2 - 40, y: fb.y + fb.height / 2 - 12 }, 1000); await sleep(200);
    await ping(fitButton, 1300); await fitButton.click(); await sleep(500);
    const bar = page.locator('.uv-tab-window .uv-fit-bar');
    check(await bar.count() === 1, 'the Fit bar is shown', await bar.count());
    const polygon = page.locator('.uv-tab-window [data-hotkey="uv-fit:polygon"]');
    check(await polygon.getAttribute('aria-pressed') === 'true', 'Polygon lasso is the active mode', await polygon.getAttribute('aria-pressed'));
    phase('mark');
    await ping(polygon, 1300); await sleep(200);
    const pb = await polygon.boundingBox();
    await glide({ x: pb.x + pb.width / 2, y: pb.y + pb.height / 2 }, corners[0], 900); await sleep(200);
    await page.mouse.click(corners[0].x, corners[0].y); await sleep(350);
    for (let i = 1; i < corners.length; i++) { await glide(corners[i - 1], corners[i], 420); await sleep(60); await page.mouse.click(corners[i].x, corners[i].y); await sleep(300); }
    await shot('corners');
    phase('enter');
    await sleep(500);
    await cue('Enter', async () => { await page.keyboard.press('Enter'); await sleep(400); }, 500);
    await sleep(900);
    await shot('area');
    const mid = await model();
    check(same(mid.uv, base.uv), 'Enter only closes the area: no UV has moved yet', null);
    await end(500);

    // 2. Fit again: the 85 selected UVs fill the area; the preview is turned with the left button.
    await begin('fit-move');
    phase('fit'); await sleep(700);
    await ping(fitButton, 1300); await fitButton.click(); await sleep(900);
    const done = await model();
    s.proof.fit = { vertices: done.vertices, triangles: done.triangles };
    check(await bar.count() === 0, 'the Fit bar closes after Fit', await bar.count());
    check(done.vertices === base.vertices && done.triangles === base.triangles && same(done.faces, base.faces) && same(done.positions, base.positions), 'Fit changed no point and no triangle: same counts, same triangles, same 3D positions', { vertices: done.vertices, triangles: done.triangles });
    const points = uvPoints(done.uv), picks = new Set(pickIndices);
    const movedSel = pickIndices.filter(i => Math.hypot(points[i][0] - baseUV[i][0], points[i][1] - baseUV[i][1]) > 1e-6).length;
    const others = points.map((p, i) => i).filter(i => !picks.has(i));
    check(others.every(i => points[i][0] === baseUV[i][0] && points[i][1] === baseUV[i][1]), 'the 72 unselected UVs did not move', null);
    check(movedSel === 85, 'all 85 selected UVs moved', movedSel);
    const outside = pickIndices.filter(i => !inside(AREA, points[i]));
    const bnd = boundsOf(pickIndices.map(i => points[i])), ab = boundsOf(AREA);
    s.proof.inside = { checked: 85, outside: outside.length, bounds: bnd, area: ab };
    check(outside.length === 0, 'all 85 UV points lie inside the marked area', { outside: outside.slice(0, 5) });
    check((bnd[2] - bnd[0]) > .85 * (ab[2] - ab[0]) && (bnd[3] - bnd[1]) > .85 * (ab[3] - ab[1]), 'the 85 UVs fill the marked area (at least 85% of its width and height)', { bnd, ab });
    await sleep(1000);
    await shot('fitted');
    phase('rotate');
    await glide(corners[0], { x: ROTATE_PATH[0][0], y: ROTATE_PATH[0][1] }, 700); await sleep(500);
    await page.mouse.down({ button: 'left' }); await sleep(90);
    for (let i = 1; i < ROTATE_PATH.length; i++) {
      const [x0, y0] = ROTATE_PATH[i - 1], [x1, y1] = ROTATE_PATH[i];
      for (let k = 1; k <= 5; k++) { await page.mouse.move(x0 + (x1 - x0) * k / 5, y0 + (y1 - y0) * k / 5); await sleep(35); }
    }
    await sleep(100); await page.mouse.up({ button: 'left' });
    await glide({ x: ROTATE_PATH.at(-1)[0], y: ROTATE_PATH.at(-1)[1] }, ROTATE_REST, 600); await sleep(700);
    await shot('rotated');
    await end(500);

    // Not part of a clip: Ctrl + Z puts every UV back.
    await page.keyboard.press('Control+z'); await sleep(800);
    const undone = await model();
    check(same(undone.uv, base.uv) && same(undone.faces, base.faces) && same(undone.positions, base.positions), 'Ctrl + Z restored every UV exactly', null);
    s.proof.undo = { restored: true };
    await s.close();
  } catch (e) { await s.close(e); }
})();
