const fs = require('node:fs');
const { openSession, sleep, WORK } = require('./recorder.cjs');
const OUT = WORK + '/explore';
(async () => {
  const s = await openSession({ locale: 'en', out: OUT, debug: true });
  const { page } = s; const info = { log: [] };
  const log = (...a) => { info.log.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); fs.writeFileSync(OUT + '/info.json', JSON.stringify(info, null, 1)); };
  const mark = () => page.evaluate(() => document.querySelector('[data-anchor-overlay]')?.dataset.cut ?? null);
  try {
    await page.locator('[data-hotkey="viewDirection"]').selectOption('left');
    await page.locator('[data-hotkey="viewDirection"] + select').selectOption('wireframe');
    await page.locator('[data-hotkey="geosetsClear"]').click(); await sleep(250);
    await page.locator('[data-hotkey="geoset:1"]').click(); await sleep(300);
    await page.locator('[data-hotkey="showAllGeosets"]').uncheck(); await sleep(400);
    await page.evaluate(sel => lpwProps().onSelectionChange(sel), { 1: [3,4,5,6,7,8,9,10,11] }); await sleep(500);
    await page.locator('[data-hotkey="fitSelection"]').click(); await sleep(1800);
    const host = await s.hostBox();
    await page.mouse.click(host.x + host.width - 40, host.y + host.height - 40); await sleep(500);
    await page.locator('[data-hotkey="cut"]').scrollIntoViewIfNeeded();
    await page.locator('[data-hotkey="cut"]').click(); await sleep(400);
    const pts = Object.fromEntries((await page.evaluate(() => lpwScreen(1, [3,4,5,6,7,8,9,10,11]))).map(p => [p.i, p]));
    await page.mouse.move(pts[6].x, pts[6].y); await sleep(300); await page.mouse.click(pts[6].x, pts[6].y); await sleep(500);
    log('near 5', await page.evaluate(p5 => lpwAllScreen().filter(v => Math.hypot(v.x - p5.x, v.y - p5.y) < 12).map(v => [v.g, v.i, v.x|0, v.y|0]), pts[5]));
    log('near 11', await page.evaluate(p5 => lpwAllScreen().filter(v => Math.hypot(v.x - p5.x, v.y - p5.y) < 12).map(v => [v.g, v.i, v.x|0, v.y|0]), pts[11]));
    for (const c of [5, 11, 4, 7, 8]) { await page.mouse.move(pts[c].x, pts[c].y, { steps: 6 }); await sleep(400); log('fresh hover', c, await mark()); }
  } catch (e) { log('ERR', String(e.stack)); }
  await s.close();
})();
