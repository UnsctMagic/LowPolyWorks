// Records the two vertex-editor Cut clips (cut-line, cut-corner) on the Footman's round fan (geoset 1, vertices 3-11) from the real
// MDLxL app, one locale per run, through MDLxL's scripts/hidden-run.ps1. Cut, a vertex, a point on the far line (the triangle and the
// one behind the line split), then Ctrl + Z, a vertex and the far corner (the middle line turns). Every step is checked against the
// model data; the checks are written to <work>/captures/<locale>/proof.json.
const fs = require('node:fs');
const { openSession, sleep, WORK } = require('./recorder.cjs');
const APP = process.env.LPW_APP || 'D:/Claude/MDLxL/.claude/worktrees/cut-tutorial-app';
const LOCALE = process.env.LPW_LOCALE || 'en';
const OUT = WORK + '/captures/' + LOCALE;
// Geoset 1 (button 2 in the Geosets list): a round fan, centre vertex 3 and a ring of eight. The first point is the top vertex 6;
// its far lines are 3-4 and 3-7; the far corners 5 (behind 3-4; it shares its spot with vertex 2, which the pointer picks first, so it is not used) and 11 (behind 3-7).
const GEOSET = 1, FAN = [3, 4, 5, 6, 7, 8, 9, 10, 11], START = 6, LINE = [3, 7], CORNER = 11;

(async () => {
  const s = await openSession({ locale: LOCALE, out: OUT, debug: process.env.LPW_DEBUG === '1' });
  const { page, check, begin, end, phase, cue, ping, glide, shot } = s;
  const geo = () => page.evaluate(g => { const m = mdlxlProbe().session.doc.model.Geosets[g], f = Array.from(m.Faces), edges = new Set();
    for (let i = 0; i < f.length; i += 3) for (let c = 0; c < 3; c++) { const a = f[i + c], b = f[i + (c + 1) % 3]; edges.add(Math.min(a, b) + '-' + Math.max(a, b)); }
    return { vertices: m.Vertices.length / 3, triangles: f.length / 3, edges: [...edges], faces: f, positions: Array.from(m.Vertices) }; }, GEOSET);
  const screen = async ids => { const r = await page.evaluate(([g, ids]) => lpwScreen(g, ids), [GEOSET, ids]); return Object.fromEntries(r.map(p => [p.i, { x: p.x, y: p.y }])); };
  const cutMark = () => page.evaluate(() => document.querySelector('[data-anchor-overlay]')?.dataset.cut ?? null);
  const lerp = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  const mark = async (kind, ms = 3000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await cutMark() === kind) return true; await sleep(60); } return false; };
  try {
    // The Cut lesson starts on one geoset in Wireframe, framed on the fan, with nothing selected.
    await page.locator('[data-hotkey="viewDirection"]').selectOption('left');
    await page.locator('[data-hotkey="viewDirection"] + select').selectOption('wireframe');
    await page.locator('[data-hotkey="geosetsClear"]').click(); await sleep(250);
    await page.locator('[data-hotkey="geoset:' + GEOSET + '"]').click(); await sleep(300);
    await page.locator('[data-hotkey="showAllGeosets"]').uncheck(); await sleep(400);
    await page.evaluate(sel => lpwProps().onSelectionChange(sel), { [GEOSET]: FAN });
    await sleep(500);
    await page.locator('[data-hotkey="fitSelection"]').click(); await sleep(1800);
    const host = await s.hostBox();
    await page.mouse.click(host.x + host.width - 40, host.y + host.height - 40); await sleep(500);
    const none = await page.evaluate(() => lpwSelection());
    check(Object.values(none).every(v => !v.length), 'nothing is selected', none);
    const cutButton = page.locator('[data-hotkey="cut"]');
    await cutButton.scrollIntoViewIfNeeded(); await sleep(400);
    const base = await geo(), original = JSON.stringify(base.faces);
    s.proof.before = { vertices: base.vertices, triangles: base.triangles };
    const pts = await screen([...FAN]);
    const free = { x: pts[START].x + 120, y: pts[START].y - 90 };
    const lineA = lerp(pts[LINE[0]], pts[LINE[1]], .22), lineB = lerp(pts[LINE[0]], pts[LINE[1]], .52);
    await shot('start');

    // 1. Cut, a vertex, a point on the far line.
    await begin('cut-line');
    phase('tool');
    await sleep(800);
    await ping(cutButton, 1300); await cutButton.click(); await sleep(500);
    phase('vertex');
    const bc = await cutButton.boundingBox();
    await glide({ x: bc.x + bc.width / 2, y: bc.y + bc.height / 2 }, pts[START], 1000); await sleep(700);
    check(await mark('start', 1500), 'hovering a vertex marks it', await cutMark());
    await page.mouse.click(pts[START].x, pts[START].y); await sleep(900);
    phase('line');
    await glide(pts[START], lineA, 900); await sleep(300);
    await glide(lineA, lineB, 1500); await sleep(900);
    check(await mark('edge', 1500), 'the far line lights up under the pointer', await cutMark());
    await shot('hover');
    phase('click');
    await page.mouse.click(lineB.x, lineB.y); await sleep(1300);
    const cutDone = await geo();
    s.proof.cut = { vertices: cutDone.vertices, triangles: cutDone.triangles };
    check(cutDone.vertices === base.vertices + 1 && cutDone.triangles === base.triangles + 2, 'one point and two triangles were added', { before: [base.vertices, base.triangles], after: [cutDone.vertices, cutDone.triangles] });
    const created = base.vertices;
    const sel = await page.evaluate(() => lpwSelection());
    check(JSON.stringify(sel[GEOSET]) === JSON.stringify([created]), 'the new point stays selected', sel);
    // The new point is on the line 3-7 where the dot was.
    const pos = i => cutDone.positions.slice(i * 3, i * 3 + 3), a = pos(LINE[0]), b = pos(LINE[1]), n = pos(created);
    const k = [0, 1, 2].reduce((best, c) => Math.abs(b[c] - a[c]) > Math.abs(b[best] - a[best]) ? c : best, 0), u = (n[k] - a[k]) / (b[k] - a[k]);
    const off = Math.hypot(...[0, 1, 2].map(c => n[c] - (a[c] + (b[c] - a[c]) * u)));
    check(off < .01 && u > .3 && u < .7, 'the new point lies on the line 3-7, near its middle', { u, off });
    check(cutDone.edges.includes('3-' + created) && cutDone.edges.includes('7-' + created) && !cutDone.edges.includes('3-7'), 'the line 3-7 is now split by the new point', cutDone.edges.filter(e => /^(3|7)-/.test(e)));
    check(cutDone.edges.includes('6-' + created) && cutDone.edges.includes('11-' + created), 'both triangles beside the line were split', { six: cutDone.edges.includes('6-' + created), eleven: cutDone.edges.includes('11-' + created) });
    await glide(lineB, free, 900); await sleep(2300);
    await shot('cut');
    await end(600);

    // 2. Ctrl + Z, a vertex, the far corner.
    await begin('cut-corner');
    phase('undo');
    await sleep(700);
    await cue('Ctrl + Z', async () => { await page.keyboard.press('Control+z'); await sleep(500); }, 500);
    await sleep(900);
    const undone = await geo();
    check(undone.vertices === base.vertices && undone.triangles === base.triangles && JSON.stringify(undone.faces) === original, 'Ctrl + Z undid the cut in one step', { vertices: undone.vertices, triangles: undone.triangles });
    const pts2 = await screen([START, CORNER]);
    phase('vertex');
    await glide(free, pts2[START], 1000); await sleep(600);
    await page.mouse.click(pts2[START].x, pts2[START].y); await sleep(900);
    phase('corner');
    const mid = lerp(pts2[START], pts2[CORNER], .55);
    await glide(pts2[START], mid, 900); await sleep(300);
    await glide(mid, pts2[CORNER], 900); await sleep(900);
    check(await mark('corner', 1500), 'the far corner is marked with a line to it', await cutMark());
    await shot('corner-hover');
    phase('click');
    await page.mouse.click(pts2[CORNER].x, pts2[CORNER].y); await sleep(1300);
    const turned = await geo();
    s.proof.corner = { vertices: turned.vertices, triangles: turned.triangles };
    check(turned.vertices === base.vertices && turned.triangles === base.triangles, 'no point was added', { vertices: turned.vertices, triangles: turned.triangles });
    check(turned.edges.includes(START + '-' + CORNER) && !turned.edges.includes('3-7') && !base.edges.includes(START + '-' + CORNER), 'the middle line turned to end at the corner', { had: base.edges.includes('3-7'), now: turned.edges.includes(START + '-' + CORNER) });
    await glide(pts2[CORNER], free, 900); await sleep(2300);
    await shot('turned');
    await end(600);
    await s.close();
  } catch (e) { await s.close(e); }
})();
