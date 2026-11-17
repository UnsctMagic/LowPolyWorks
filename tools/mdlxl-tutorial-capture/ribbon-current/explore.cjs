// Exploration only: looks at the Footman, selects the sword vertices, opens EMTR and Add ribbon; pictures go to <work>/explore.
const fs = require('node:fs');
const { openSession, sleep, WORK } = require('./recorder.cjs');
const OUT = WORK + '/explore';
(async () => {
  const s = await openSession({ locale: 'en', out: OUT, debug: true });
  const { page } = s; const info = { log: [] };
  const log = (...a) => { info.log.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); fs.writeFileSync(OUT + '/info.json', JSON.stringify(info, null, 1)); };
  try {
    await s.setup(0); await s.shot('a-open');
    log('selection before', Object.keys(await page.evaluate(() => lpwSelection())));
    await page.evaluate(() => lpwProps().onSelectionChange({ 0: [295,296,297,298,299,300,301,302,303,304,305,306,307,308] }));
    await sleep(800); await s.shot('b-selected');
    log('hotkeys', await page.evaluate(() => [...document.querySelectorAll('[data-hotkey]')].map(e => e.dataset.hotkey).join(' ')));
    await page.locator('[data-hotkey="particles"]').click(); await sleep(1500); await s.shot('c-emtr');
    await page.locator('[data-hotkey="particles:add-ribbon"]').click(); await sleep(2500); await s.shot('d-add');
    log('sweep options', await page.locator('.pe-placement select').first().locator('option').evaluateAll(o => o.map(x => x.value + ':' + x.textContent)));
    log('placement', await page.locator('.pe-placement').innerText());
    log('seqs', await page.locator('.pe-ribbon-sequences label').allTextContents());
    const sw = page.locator('.pe-placement select').first();
    await sw.selectOption('fire'); await sleep(3000); await s.shot('e-fire');
    const boxes = page.locator('.pe-ribbon-sequences label'); const names = await boxes.allTextContents();
    await boxes.nth(names.indexOf('Stand - 1')).locator('input').click(); await sleep(300);
    await boxes.nth(names.indexOf('Attack - 1')).locator('input').click(); await sleep(3000); await s.shot('f-attack');
    await page.locator('.pe-placement button', { hasText: /^Create$/ }).click(); await sleep(3000); await s.shot('g-created');
    log('after create', await page.evaluate(() => { const m = mdlxlProbe().session.doc.model; return { rib: m.RibbonEmitters.map(r => [r.Name, r.Parent, JSON.stringify(r.Visibility), r.LifeSpan]), pe2: m.ParticleEmitters2.map(e => [e.Name, JSON.stringify(e.Visibility)]), seqs: m.Sequences.map(q => [q.Name, Array.from(q.Interval)]) }; }));
    log('controls', await page.evaluate(() => [...document.querySelectorAll('.particle-editor [data-hotkey], .particle-editor [aria-label]')].map(e => (e.dataset.hotkey || '') + '/' + (e.getAttribute('aria-label')||'') + '/' + e.className).join(' | ')));
    log('text', await page.locator('.particle-editor').innerText());
  } catch (e) { log('ERR', String(e.stack)); }
  await s.close();
})();
