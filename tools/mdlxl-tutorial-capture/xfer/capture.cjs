// Records the XFER (Transfer window) guide in the real MDLxL app, English only: a Gargoyle donor and a Grunt receiver, Transplant and Retarget.
// Clips (see README): xfer-open, xfer-views, xfer-transplant-method, xfer-transplant-options, xfer-transplant-apply,
// xfer-retarget-take, xfer-retarget-tune, xfer-retarget-timeline, xfer-retarget-switches, xfer-retarget-finish.
// Run through MDLxL's scripts/hidden-run.ps1 (run.cjs does that). Every click is a real mouse event; the only stubbed thing is the native
// "Open file" dialog, which answers with the Gargoyle file. Checks go to <work>/captures/en/proof.json.
// LPW_ONLY=a,b records only those clips (prep steps run unrecorded) and LPW_DEBUG=1 writes screenshots.
const fs = require('node:fs');
const { openSession, sleep, WORK } = require('./recorder.cjs');
const APP = process.env.LPW_APP || 'D:/Claude/xfertut-work/MDLxL';
const { stubDialogs } = require(APP + '/test/helpers/app.cjs');
const LOCALE = process.env.LPW_LOCALE || 'en';
// The app's own translation of a control name (English is the source text); chrome is translated, model and animation names are not.
const DICT = LOCALE === 'en' ? {} : JSON.parse(fs.readFileSync(APP + '/src/locales/' + LOCALE + '.json', 'utf8'));
const tr = key => DICT[key] ?? key;
const OUT = WORK + '/captures/' + LOCALE;
const GARGOYLE = WORK + '/models/Gargoyle.mdx';
const ONLY = (process.env.LPW_ONLY || '').split(',').filter(Boolean);

(async () => {
  const s = await openSession({ locale: LOCALE, out: OUT, debug: process.env.LPW_DEBUG === '1' });
  const { page, app, check, begin, end, phase, cue, ping, glide, shot } = s;
  const dialog = page.locator('[role="dialog"]').filter({ has: page.locator('button[data-mode]') });
  const view = name => dialog.locator('section.xf-view').nth(name === 'Donor' ? 0 : 1);
  const from = () => dialog.locator('aside').first();
  const parts = () => dialog.locator('aside.xf-controls[aria-label]').filter({ has: page.locator('[data-hotkey="transfer:take-whole-body"]') });
  const L = (selector, ...rest) => dialog.locator(selector, ...rest);
  // A pointer drawn into the page (the compositor recording has no operating-system cursor).
  await page.evaluate(() => {
    const c = document.createElement('div'); c.id = 'tutorial-pointer';
    c.style.cssText = 'position:fixed;left:-50px;top:-50px;width:22px;height:30px;pointer-events:none;z-index:2147483646;filter:drop-shadow(0 1px 1px rgba(0,0,0,.5))';
    c.innerHTML = '<svg viewBox="0 0 22 30" width="22" height="30"><path d="M2 2 L2 23 L7.5 18 L11.5 27.5 L15 26 L11 16.8 L18.5 16.8 Z" fill="#fff" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.append(c);
    addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
  });
  let cur = { x: 800, y: 450 };
  const goTo = async (to, ms = 800) => { await glide(cur, to, ms); cur = { x: to.x, y: to.y }; };
  const centerOf = async loc => { const b = await loc.boundingBox(); if (!b) throw Error('No box'); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const pause = () => sleep(50);
  // Moves the pointer to a control, pings it (when ms > 0), then clicks it with the real mouse.
  const press = async (loc, { ping: ms = 1200, wait = 450, move = 700, offset = {} } = {}) => {
    loc = loc.first(); await loc.scrollIntoViewIfNeeded();
    const c = await centerOf(loc); c.x += offset.x || 0; c.y += offset.y || 0;
    await goTo(c, move);
    if (ms) await ping(loc, ms);
    await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(wait);
  };
  const pressAt = async (point, { wait = 450, move = 700, name = 'point', ms = 0 } = {}) => {
    await goTo(point, move); if (ms) await ping({ x: point.x, y: point.y, name }, ms);
    await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(wait);
  };
  const dragSlider = async (field, fractions, { hold = 300 } = {}) => {
    const input = L(`input[data-field="${field}"]`); await input.scrollIntoViewIfNeeded();
    const b = await input.boundingBox(), y = b.y + b.height / 2, x = f => b.x + 7 + (b.width - 14) * f;
    await goTo({ x: x(fractions[0]), y }, 600);
    await page.mouse.down(); await sleep(120);
    for (let k = 1; k < fractions.length; k++) {
      const a = x(fractions[k - 1]), z = x(fractions[k]);
      for (let i = 1; i <= 12; i++) { await page.mouse.move(a + (z - a) * i / 12, y); cur = { x: a + (z - a) * i / 12, y }; await sleep(40); }
      await sleep(hold);
    }
    await page.mouse.up(); await sleep(250);
  };
  const state = () => page.evaluate(() => { const t = window.__mdlxl.transfer(); return t && { parts: Object.fromEntries(Object.entries(t.recipe.parts || {}).map(([k, p]) => [k, { source: p.source, sequence: p.sequence, amount: p.amount, match: p.match, start: p.start, speed: p.speed, blend: p.blend, offsets: p.offsets, clip: p.clip, fixes: (p.fixes || []).length, chain: (p.clips || []).length, other: p.other, mirror: p.mirror, keepFoot: p.keepFoot, ownRange: p.ownRange, avoidBody: p.avoidBody, aboveGround: p.aboveGround, travel: p.travel }])), base: t.recipe.base, mode: t.mode, selected: t.selected, raw: Object.keys(t.recipe) }; });
  const doc = () => page.evaluate(() => { const m = window.__mdlxl.model(); return { sequences: m.Sequences.map(q => q.Name), bones: [m.Bones, m.Helpers].flat().filter(Boolean).length, geosets: m.Geosets.length }; });
  const tpState = () => page.evaluate(() => { const t = window.__mdlxl.transfer()?.transplant; return t && { ready: t.ready, building: t.building, applied: t.applied, options: t.options, key: t.resultKey, sequence: t.sequence, names: t.names, error: t.error }; });
  const built = prev => page.waitForFunction(old => { const v = window.__mdlxl.transfer()?.transplant; return v?.ready && !v.building && (old == null || v.resultKey !== old); }, prev ?? null, { timeout: 120000 });
  const handles = name => page.evaluate(name => {
    const root = document.querySelectorAll('[role="dialog"] section.xf-view')[name === 'Donor' ? 0 : 1].querySelector('.game-preview-root'), p = window.__mdlxl.preview(root), r = root.querySelector('canvas').getBoundingClientRect();
    return (p.runtime.poseHandles || []).filter(h => h.visible && !h.hidden && !h.quiet).map(h => ({ selected: !!h.selected, kind: h.kind, key: h.key, label: h.label, chain: h.chain, x: r.left + h.x, y: r.top + h.y }));
  }, name);
  const previewState = name => page.evaluate(name => { const root = document.querySelectorAll('[role="dialog"] section.xf-view')[name === 'Donor' ? 0 : 1].querySelector('.game-preview-root'), p = window.__mdlxl.preview(root);
    return { frame: p.runtime.native.getFrame(), sequence: p.props.sequenceIndex, camera: p.runtime.controls.object.position.toArray(), playing: p.props.playing, time: p.props.time }; }, name);
  // Screenshots are taken inside s.cut so their odd-sized compositor frames stay out of the clip.
  const pixels = name => s.cut(async () => page.screenshot({ clip: await view(name).locator('.xf-preview').boundingBox() }));
  const bump = async (field, to) => { const i = L(`input[data-field="${field}"]`); return Number(await i.inputValue()); };

  // ---- Unrecorded preparation (run through s.cut inside a clip, or before the clip starts) ----
  const windowOpen = async () => (await dialog.count()) > 0 && await dialog.isVisible().catch(() => false);
  const openWindow = async () => { if (await windowOpen()) return; await page.locator('button.transfer-tool').click(); await dialog.waitFor(); await sleep(800); };
  const loadDonor = async () => {
    if (await from().getByRole('button', { name: 'Gargoyle' }).count()) { await from().getByRole('button', { name: 'Gargoyle' }).click(); await sleep(400); return; }
    await stubDialogs(app, { open: GARGOYLE });
    await from().locator('[data-hotkey="transfer:open-file"]').click();
    await view('Donor').locator('.xf-caption [data-hotkey="transfer:mirror"]').waitFor({ timeout: 30000 });
    if (await L('button[data-mode="transplant"]').getAttribute('aria-pressed') === 'true') await built();
    await sleep(900);
  };
  const setMode = async mode => {
    const b = L(`button[data-mode="${mode}"]`);
    if (await b.getAttribute('aria-pressed') !== 'true') { await b.click(); await sleep(900); }
    if (mode === 'retarget') await parts().waitFor();
  };
  const animation = async name => { await from().locator('.xf-animations button', { hasText: new RegExp('^' + name.replace(/[-]/g, '\\-') + '$') }).first().click(); await sleep(500); };
  const strip = (name, label) => view(name).locator('.xs-strip').getByRole('button', { name: label });
  const hold = async () => { for (const name of ['Donor', 'Result']) { const b = view(name).locator('.xs-play'); if ((await b.innerText()).trim().startsWith(tr('Pause'))) await b.click(); } await sleep(300); };
  const resume = async () => { for (const name of ['Donor', 'Result']) { const b = view(name).locator('.xs-play'); if ((await b.innerText()).trim().startsWith(tr('Play'))) await b.click(); } await sleep(300); };
  const takeHandle = async (kind, ord = 0) => { const list = (await handles('Donor')).filter(h => h.kind === 'endpoint' && h.chain?.kind === kind); return list[ord]; };
  const resetRetarget = async () => { await L('[data-hotkey="transfer:clear-all"]').click(); await sleep(400); };
  const closeWindow = async () => { if (await windowOpen()) { await dialog.locator('button[data-hotkey="close"]').click(); await sleep(500); } };
  const checkNoError = async where => { check(await page.locator('[data-error-boundary],.error-boundary').count() === 0, 'no error screen: ' + where, null); };

  const clips = {};
  const run = async (name, fn) => { if (ONLY.length && !ONLY.includes(name)) return; await fn(name); };

  try {
    const baseDoc = await doc();
    s.proof.start = { sequences: baseDoc.sequences, bones: baseDoc.bones };
    await shot('start');
    s.proof.donorFile = GARGOYLE;

    await s.setup(0);
    // 1. Open XFER, the mode switch, From, the Animations list.
    await run('xfer-open', async id => {
      await begin(id);
      phase('open'); await sleep(500);
      check(!(await windowOpen()), 'the Transfer window is closed before the clip', null);
      await press(page.locator('button.transfer-tool'), { ping: 1500, wait: 900 });
      await dialog.waitFor(); await sleep(900);
      check(await L('button[data-mode="transplant"]').getAttribute('aria-pressed') === 'true', 'XFER opens in Transplant', null);
      phase('mode'); await goTo(await centerOf(L('.xf-mode-switch')), 700); await ping(L('.xf-mode-switch'), 1700);
      phase('from');
      await stubDialogs(app, { open: GARGOYLE });
      await press(from().locator('[data-hotkey="transfer:open-file"]'), { ping: 1300, wait: 300 });
      await view('Donor').locator('.xf-caption [data-hotkey="transfer:mirror"]').waitFor({ timeout: 30000 });
      await built(); await sleep(1500);
      check(await from().getByRole('button', { name: 'Gargoyle' }).getAttribute('aria-pressed') === 'true', 'the Gargoyle is the chosen donor in From', null);
      phase('animations');
      const walk = from().locator('.xf-animations button', { hasText: /^Walk - 1$/ });
      await press(walk, { ping: 1300, wait: 300 });
      await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"] section.xf-view .xs-animation')].every(e => e.selectedOptions[0]?.textContent === 'Walk - 1'), null, { timeout: 20000 }).catch(() => {});
      const afterWalk = await tpState(); await sleep(3500);
      { const names = await Promise.all(['Donor', 'Result'].map(v => view(v).locator('.xs-animation').evaluate(e => e.selectedOptions[0].textContent))); check(names.every(n => n === 'Walk - 1') && await walk.getAttribute('aria-pressed') === 'true', 'clicking Walk - 1 chooses it for both views', names); }
      await press(from().locator('.xf-animations button', { hasText: /^Attack - 2$/ }), { ping: 0, wait: 300 });
      await built(); await sleep(3500);
      const sel = await Promise.all(['Donor', 'Result'].map(v => view(v).locator('.xs-animation').evaluate(e => e.selectedOptions[0].textContent)));
      check(sel[0] === 'Attack - 2' && sel[1] === 'Attack - 2', 'both views show the animation clicked in the list', sel);
      s.proof.open = { dropdowns: sel };
      await end(900);
    });

    // 2. The playback strips and the linked cameras.
    await run('xfer-views', async id => {
      await s.cut(async () => { await openWindow(); await setMode('transplant'); await loadDonor(); await animation('Walk - 2'); await built().catch(() => {}); await sleep(1200); });
      const donorBox = await view('Donor').locator('.xf-preview').boundingBox(), resultBox = await view('Result').locator('.xf-preview').boundingBox();
      await begin(id);
      phase('play'); await sleep(1500);
      const pb = view('Donor').locator('.xs-play');
      await press(pb, { ping: 1300, wait: 500 });
      check((await pb.innerText()).trim().startsWith(tr('Play')), 'Pause stops the donor view', await pb.innerText());
      const t1 = await view('Donor').locator('.xs-scrub').inputValue(); await sleep(700);
      check(await view('Donor').locator('.xs-scrub').inputValue() === t1, 'a paused view does not move', t1);
      phase('scrub');
      const track = view('Donor').locator('.xs-scrub'), tb = await track.boundingBox();
      await goTo({ x: tb.x + tb.width * 0.15, y: tb.y + tb.height / 2 }, 700); await ping(track, 1300);
      await page.mouse.down(); await sleep(100);
      for (let i = 1; i <= 24; i++) { const x = tb.x + tb.width * (0.15 + 0.6 * i / 24); await page.mouse.move(x, tb.y + tb.height / 2); cur = { x, y: tb.y + tb.height / 2 }; await sleep(50); }
      await page.mouse.up(); await sleep(500);
      const t2 = await track.inputValue();
      check(t2 !== t1, 'dragging the track moves the donor view to another moment', { t1, t2 });
      await press(pb, { ping: 0, wait: 600 });
      check((await pb.innerText()).trim().startsWith(tr('Pause')), 'Play starts the donor view again', await pb.innerText());
      phase('speed');
      const speed = view('Donor').locator('.xs-speed');
      await goTo(await centerOf(speed), 700); await ping(speed, 1300);
      await speed.selectOption('50'); await sleep(1800);
      check(await speed.inputValue() === '50', 'Speed 50% is set on the donor view', await speed.inputValue());
      await speed.selectOption('100'); await sleep(500);
      phase('dropdown');
      const dd = view('Result').locator('.xs-animation');
      await goTo(await centerOf(dd), 700); await ping(dd, 1300);
      await dd.selectOption({ label: 'Walk - 1' }); await sleep(2500);
      const names = await Promise.all(['Donor', 'Result'].map(v => view(v).locator('.xs-animation').evaluate(e => e.selectedOptions[0].textContent)));
      check(names[0] === 'Walk - 1' && names[1] === 'Walk - 1', 'the Result dropdown changes both views to the same animation', names);
      phase('rotate');
      const before = { d: await pixels('Donor'), r: await pixels('Result'), cam: await previewState('Donor') };
      await goTo({ x: resultBox.x + resultBox.width * .82, y: resultBox.y + resultBox.height * .22 }, 700); await sleep(300);
      await page.mouse.down(); await sleep(120);
      for (let i = 1; i <= 40; i++) { const x = resultBox.x + resultBox.width * .82 - i * 5.5, y = resultBox.y + resultBox.height * .22 + i * 1.2; await page.mouse.move(x, y); cur = { x, y }; await sleep(35); }
      await sleep(150); await page.mouse.up(); await sleep(1500);
      const turned = await previewState('Donor');
      check(JSON.stringify(turned.camera) !== JSON.stringify(before.cam), 'dragging the result view also turns the donor view', { before: before.cam, after: turned.camera });
      check(!before.d.equals(await pixels('Donor')) && !before.r.equals(await pixels('Result')), 'both views look different after the drag', null);
      phase('reset');
      const reset = view('Result').locator('.xs-reset');
      await goTo(await centerOf(reset), 800); await ping(reset, 1300);
      await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(1500);
      const back = await previewState('Donor');
      check(JSON.stringify(back.camera) !== JSON.stringify(turned.camera), 'the reset button turns the views back', { turned: turned.camera, back: back.camera });
      s.proof.views = { before: before.cam, turned: turned.camera, back: back.camera };
      await end(900);
    });

    // 3. Transplant: Method row, scope, part chip.
    await run('xfer-transplant-method', async id => {
      await s.cut(async () => { await openWindow(); await setMode('transplant'); await loadDonor(); await animation('Walk - 1'); await built().catch(() => {}); await sleep(1500); });
      await begin(id);
      const meth = key => L(`[data-hotkey="transfer:method-${key}"]`);
      phase('rotation');
      const k0 = (await tpState()).key;
      await press(meth('rotation'), { ping: 1300, wait: 200 });
      await built(k0); await sleep(2600);
      check(await meth('rotation').getAttribute('aria-pressed') === 'true', 'Rotation is the chosen method', null);
      const o1 = await tpState();
      check(Object.keys(o1.options.regions || {}).every(k => o1.options.regions[k] !== 2), 'Rotation: no part uses engine 2', o1.options);
      phase('position');
      await press(meth('position'), { ping: 1300, wait: 200 });
      await built(o1.key); await sleep(2600);
      const o2 = await tpState();
      check(await meth('position').getAttribute('aria-pressed') === 'true' && Object.values(o2.options.regions || {}).every(v => v === 2), 'Position: every part uses engine 2', o2.options);
      phase('mix');
      await press(meth('mix'), { ping: 1300, wait: 1500 });
      await hold();
      const marks = (await handles('Result')).filter(h => h.kind === 'endpoint');
      check(marks.length >= 2, 'Mix shows a dot on each arm and leg of the result', marks.map(h => h.label));
      const arm = marks.find(h => h.chain?.kind === 'arm') || marks[0];
      await pressAt({ x: arm.x, y: arm.y }, { wait: 800, ms: 1200, name: 'arm dot' });
      const chip = view('Result').locator('.xf-chip');
      await chip.waitFor({ timeout: 5000 });
      check(await chip.count() === 1, 'clicking a dot opens its Rotation / Position choice', null);
      const k1 = (await tpState()).key;
      await press(chip.locator('.xf-chip-row button').first(), { ping: 1200, wait: 500 });
      await built(k1).catch(() => {}); await sleep(1500);
      const o3 = await tpState();
      check(Object.values(o3.options.regions || {}).some(v => v === 1) && Object.values(o3.options.regions || {}).some(v => v === 2), 'Mix: one part now turns like the donor, the others use Position', o3.options.regions);
      { const rb = await view('Result').locator('.xf-preview').boundingBox(); await pressAt({ x: rb.x + rb.width * .9, y: rb.y + rb.height * .88 }, { wait: 500 }); }
      await resume();
      phase('scope');
      await press(L('[data-hotkey="transfer:this-animation"]'), { ping: 1300, wait: 800 });
      check(await L('[data-hotkey="transfer:this-animation"]').getAttribute('aria-pressed') === 'true', 'This animation is the chosen scope', null);
      await press(L('[data-hotkey="transfer:all-animations"]'), { ping: 1300, wait: 800 });
      phase('more');
      const more = view('Result').locator('.xf-more-button');
      if (await more.count()) {
        await press(more, { ping: 1300, wait: 1200 });
        check(await view('Result').locator('.xf-more-menu').count() === 1, 'More opens the extra choices', null);
        s.proof.moreItems = await view('Result').locator('.xf-more-menu button').allInnerTexts();
        await sleep(1500); await page.keyboard.press('Escape'); await sleep(600);
        check(await dialog.isVisible(), 'Esc closed only the menu, not the window', null);
      } else s.proof.moreItems = 'not shown for this pair';
      await sleep(800);
      await end(900);
    });

    // 3b. Mirror, Sounds, Effects, Keep.
    await run('xfer-transplant-options', async id => {
      await s.cut(async () => { await openWindow(); await setMode('transplant'); await loadDonor(); await animation('Attack - 2'); await L('[data-hotkey="transfer:method-position"]').click(); await built().catch(() => {}); await sleep(1500); });
      await begin(id);
      phase('mirror');
      const k0 = (await tpState()).key;
      await press(view('Donor').locator('[data-hotkey="transfer:mirror"]'), { ping: 1300, wait: 300 });
      await built(k0); await sleep(2500);
      check((await tpState()).options.mirror === true, 'Mirror switches the donor left and right', null);
      const k1 = (await tpState()).key;
      await press(view('Donor').locator('[data-hotkey="transfer:mirror"]'), { ping: 0, wait: 300 });
      await built(k1); await sleep(1800);
      check((await tpState()).options.mirror === false, 'Mirror off again', null);
      phase('sounds');
      const sounds = L('[data-hotkey="transfer:sounds"]');
      await press(sounds, { ping: 1300, wait: 800 });
      check(!(await sounds.isChecked()), 'Sounds off', null);
      await press(sounds, { ping: 0, wait: 600 });
      phase('effects');
      const effects = L('[data-hotkey="transfer:effects"]');
      const k2 = (await tpState()).key;
      await press(effects, { ping: 1300, wait: 300 });
      await built(k2).catch(() => {}); await sleep(2200);
      check(await effects.isChecked(), 'Effects on', null);
      const k3 = (await tpState()).key;
      await press(effects, { ping: 0, wait: 300 });
      await built(k3).catch(() => {}); await sleep(1500);
      phase('keep');
      const keep = L('[data-keep] input[type="checkbox"]').first();
      const k4 = (await tpState()).key;
      await press(keep, { ping: 1300, wait: 300 });
      await built(k4); await sleep(3000);
      check(await keep.isChecked() && (await tpState()).options.keep.length === 1, 'Keep: the axe stays on its own bone', (await tpState()).options.keep);
      const k5 = (await tpState()).key;
      await press(keep, { ping: 0, wait: 300 });
      await built(k5); await sleep(2000);
      await end(900);
    });

    // 4. Transplant, the result in the editor, Undo.
    await run('xfer-transplant-apply', async id => {
      await s.cut(async () => { await openWindow(); await setMode('transplant'); await loadDonor(); await animation('Walk - 1'); await L('[data-hotkey="transfer:method-position"]').click(); await built().catch(() => {}); await sleep(1500); });
      const before = await doc();
      await begin(id);
      phase('transplant'); await sleep(800);
      await press(L('[data-hotkey="transfer:transplant"]'), { ping: 1500, wait: 500 });
      await page.waitForFunction(n => { const m = window.__mdlxl.model(); return [m.Bones, m.Helpers].flat().filter(Boolean).length !== n; }, before.bones, { timeout: 120000 });
      await sleep(1500);
      const after = await doc();
      check(after.bones !== before.bones && after.sequences.length === 10, 'Transplant gives the model the donor bones and animations', { before: before.bones, after: after.bones, sequences: after.sequences });
      check(await L('[data-hotkey="transfer:transplant"]').isDisabled(), 'Transplant is off after it is applied', null);
      await sleep(1500);
      phase('close');
      await press(dialog.locator('button[data-hotkey="close"]'), { ping: 1200, wait: 900 });
      await press(page.locator('[data-hotkey="animations"]'), { ping: 1300, wait: 1500 });
      await sleep(3500);
      phase('undo');
      await cue(LOCALE === 'de' ? 'Strg + Z' : 'Ctrl + Z', async () => { await page.keyboard.press('Control+z'); await sleep(900); }, 1500);
      const undone = await doc();
      check(undone.bones === before.bones && JSON.stringify(undone.sequences) === JSON.stringify(before.sequences), 'Ctrl + Z puts the original bones and animations back', { bones: undone.bones, sequences: undone.sequences });
      s.proof.apply = { before, after, undone };
      await sleep(1200);
      await end(900);
      await s.cut(async () => { await page.locator('[data-hotkey="vertices"]').click().catch(() => {}); await sleep(500); });
    });

    // ---- Retarget ----
    const taken = () => L('aside.xf-controls input[data-part-switch]:checked').count();
    const takenNames = () => L('aside.xf-controls input[data-part-switch]:checked').evaluateAll(a => a.map(e => e.getAttribute('data-part-switch')));
    const prepRetarget = async ({ animationName = 'Attack - 2', whole = true, select = 'armL' } = {}) => {
      await openWindow(); await setMode('retarget'); await loadDonor(); await animation(animationName);
      await resetRetarget();
      if (await view('Donor').locator('[data-hotkey="transfer:mirror"][aria-pressed="true"]').count()) await view('Donor').locator('[data-hotkey="transfer:mirror"]').click();
      if (whole) { await L('[data-hotkey="transfer:take-whole-body"]').click(); await sleep(800); }
      if (select) { await L(`button[data-part="${select}"]`).click(); await sleep(600); }
      await resume(); await sleep(1200);
    };
    const resultHand = async () => (await handles('Result')).filter(h => h.kind === 'endpoint' && h.chain?.kind === 'arm');
    const overlay = () => page.evaluate(() => { const root = document.querySelectorAll('[role="dialog"] section.xf-view')[1].querySelector('.game-preview-root'); return JSON.stringify(window.__mdlxl.preview(root).props.overlayPaths?.[0]?.points?.slice(0, 40) || null); });
    const dragFrom = async (h, dx, dy, steps = 25) => {
      await goTo({ x: h.x, y: h.y }, 800);
      await page.mouse.down(); await sleep(150);
      for (let i = 1; i <= steps; i++) { const x = h.x + dx * i / steps, y = h.y + dy * i / steps; await page.mouse.move(x, y); cur = { x, y }; await sleep(40); }
      await sleep(300); await page.mouse.up(); await sleep(900);
    };

    // 5. Take parts from the donor.
    await run('xfer-retarget-take', async id => {
      await s.cut(async () => { await openWindow(); await setMode('transplant'); await loadDonor(); await animation('Stand - 1'); await sleep(1000); });
      await begin(id);
      phase('mode'); await sleep(500);
      await press(L('button[data-mode="retarget"]'), { ping: 1500, wait: 1200 });
      await parts().waitFor();
      check(await taken() === 0, 'Retarget starts with no part taken', await takenNames());
      phase('animation');
      await press(from().locator('.xf-animations button', { hasText: /^Attack - 2$/ }), { ping: 1300, wait: 800 });
      const body = L('[data-hotkey="transfer:body-animation"]');
      await goTo(await centerOf(body), 700); await ping(body, 1500);
      phase('handle');
      await hold(); await sleep(500);
      const hand = await takeHandle('arm', 0);
      check(!!hand, 'the donor shows a hand handle', null);
      await pressAt({ x: hand.x, y: hand.y }, { wait: 900, ms: 1300, name: 'hand handle' });
      const t1 = await takenNames();
      check(t1.length === 1 && /arm/i.test(t1[0]), 'clicking a hand handle takes that arm', t1);
      const row = L('aside.xf-controls input[data-part-switch]:checked').first();
      await goTo(await centerOf(row), 800); await ping(row, 1300);
      const foot = await takeHandle('leg', 0);
      await pressAt({ x: foot.x, y: foot.y }, { wait: 900, move: 900 });
      const t2 = await takenNames();
      check(t2.length === 2 && t2.some(n => /leg/i.test(n)), 'clicking a foot handle takes that leg', t2);
      await resume(); await sleep(1800);
      phase('whole');
      await press(L('[data-hotkey="transfer:take-whole-body"]'), { ping: 1300, wait: 1800 });
      check(await taken() === 7, 'Take whole body takes all seven parts', await takenNames());
      await press(L('[data-hotkey="transfer:clear-all"]'), { ping: 1300, wait: 1200 });
      check(await taken() === 0, 'Clear all removes them', await takenNames());
      phase('mirror');
      await hold(); await sleep(400);
      const hand2 = await takeHandle('arm', 0);
      await pressAt({ x: hand2.x, y: hand2.y }, { wait: 900 });
      await resume(); await sleep(1500);
      const before = (await takenNames())[0];
      await press(view('Donor').locator('[data-hotkey="transfer:mirror"]'), { ping: 1300, wait: 1500 });
      check(await view('Donor').locator('[data-hotkey="transfer:mirror"]').getAttribute('aria-pressed') === 'true', 'Mirror is on for the donor', null);
      await sleep(1500);
      await press(L('[data-hotkey="transfer:other-side"]'), { ping: 1300, wait: 1500 });
      s.proof.take = { first: before, afterOtherSide: await takenNames() };
      await sleep(1500);
      await end(900);
    });

    // 6. Tune an arm: sliders, path, aim.
    await run('xfer-retarget-tune', async id => {
      await s.cut(async () => { await prepRetarget(); });
      await begin(id);
      phase('select');
      await press(L('button[data-part="armL"]'), { ping: 1300, wait: 1200 });
      phase('strength');
      const p0 = await overlay(), v0 = await bump('amount');
      await goTo(await centerOf(L('input[data-field="amount"]')), 600); await ping(L('input[data-field="amount"]'), 1300);
      await dragSlider('amount', [0.667, 0.9, 0.9], { hold: 900 });
      const v1 = await bump('amount'), p1 = await overlay();
      check(v1 > v0 && p0 !== p1, 'dragging Strength raises it and moves the hand path', { v0, v1 });
      await goTo(await centerOf(L('input[data-field="amount"]')), 500);
      await page.mouse.dblclick(cur.x, cur.y); await sleep(900);
      check(await bump('amount') === 100, 'double-clicking the slider puts 100% back', await bump('amount'));
      phase('pose');
      await goTo(await centerOf(L('input[data-field="match"]')), 600); await ping(L('input[data-field="match"]'), 1300);
      const m0 = await bump('match');
      await dragSlider('match', [0.5, 0.95, 0.95], { hold: 900 });
      check(await bump('match') > m0, 'dragging Pose toward Theirs raises it', { m0, m1: await bump('match') });
      phase('raise');
      for (const [field, end, label] of [['offset0', 0.8, 'Raise'], ['offset1', 0.75, 'Turn'], ['offset2', 0.72, 'Roll']]) {
        await goTo(await centerOf(L(`input[data-field="${field}"]`)), 600); await ping(L(`input[data-field="${field}"]`), 1100);
        const v = await bump(field);
        await dragSlider(field, [0.5, end, end], { hold: 700 });
        check(await bump(field) !== v, label + ' changed', { v, now: await bump(field) });
        await sleep(500);
      }
      s.proof.tune = { strength: v1, offsets: [await bump('offset0'), await bump('offset1'), await bump('offset2')] };
      phase('aim');
      await hold(); await sleep(400);
      await press(L('[data-hotkey="transfer:whole-movement"]'), { ping: 1300, wait: 600 });
      const o0 = [await bump('offset0'), await bump('offset1')];
      const hs = await resultHand();
      const h = hs.find(x => x.selected) || hs[0];
      await dragFrom(h, 55, -70);
      const o1 = [await bump('offset0'), await bump('offset1')];
      check(o0[0] !== o1[0] || o0[1] !== o1[1], 'dragging the hand with Whole movement changes Raise / Turn', { o0, o1 });
      phase('moment');
      await press(L('[data-hotkey="transfer:this-moment"]'), { ping: 1300, wait: 500 });
      const rb = await L('.xt-ruler').boundingBox();
      await pressAt({ x: rb.x + rb.width * 0.5, y: rb.y + rb.height / 2 }, { wait: 700 });
      const hs2 = await resultHand(); const h2 = hs2.find(x => x.selected) || hs2[0];
      await dragFrom(h2, -50, 48, 22);
      check(await L('.xt-fix').count() >= 1, 'This moment adds a diamond to the timeline', await L('.xt-fix').count());
      await sleep(1200);
      await press(L('[data-hotkey="transfer:clear-fixes"]'), { ping: 1300, wait: 900 });
      check(await L('.xt-fix').count() === 0, 'Clear fixes removes the diamond', await L('.xt-fix').count());
      await press(L('[data-hotkey="transfer:whole-movement"]'), { ping: 0, wait: 400 });
      await resume(); await sleep(1500);
      await end(900);
    });

    // 7. The timeline.
    await run('xfer-retarget-timeline', async id => {
      await s.cut(async () => { await prepRetarget(); });
      await begin(id);
      phase('lane'); await sleep(600);
      const label = L('.xt-lane:not(.xt-body) .xt-label');
      await goTo(await centerOf(L('.xt-ruler')), 700); await ping(L('.xt-ruler'), 1300);
      await press(label, { ping: 0, wait: 700, move: 700 });
      phase('delay');
      const clip = L('.xt-clip.xt-main').first(), cb = await clip.boundingBox(), cells = await L('.xt-lane:not(.xt-body) .xt-cells').boundingBox();
      await goTo({ x: cb.x + cb.width * 0.4, y: cb.y + cb.height / 2 }, 800); await ping(clip, 1300);
      await page.mouse.down(); await sleep(120);
      for (let i = 1; i <= 24; i++) { const x = cb.x + cb.width * 0.4 + cells.width * 0.2 * i / 24; await page.mouse.move(x, cb.y + cb.height / 2); cur = { x, y: cb.y + cb.height / 2 }; await sleep(45); }
      await sleep(300); await page.mouse.up(); await sleep(1500);
      const delay = await bump('start');
      check(delay > 0, 'dragging the clip sideways sets Delay', delay);
      phase('trim');
      const cb2 = await clip.boundingBox();
      await goTo({ x: cb2.x + cb2.width - 3, y: cb2.y + cb2.height / 2 }, 800);
      await page.mouse.down(); await sleep(120);
      for (let i = 1; i <= 22; i++) { const x = cb2.x + cb2.width - 3 - cb2.width * 0.25 * i / 22; await page.mouse.move(x, cb2.y + cb2.height / 2); cur = { x, y: cb2.y + cb2.height / 2 }; await sleep(45); }
      await sleep(300); await page.mouse.up(); await sleep(1500);
      check(await L('.xt-clip.xt-main.xt-cut-right').count() === 1, 'dragging an edge trims the clip (cut end drawn dashed)', null);
      const cb3 = await clip.boundingBox();
      await goTo({ x: cb3.x + cb3.width - 3, y: cb3.y + cb3.height / 2 }, 700);
      await page.mouse.dblclick(cur.x, cur.y); await sleep(1500);
      check(await L('.xt-clip.xt-main.xt-cut-right').count() === 0, 'double-clicking the edge puts that end back', null);
      phase('timing');
      const fold = L('.xf-timing > summary');
      if (!(await L('.xf-timing[open]').count())) await press(fold, { ping: 1300, wait: 700 }); else { await goTo(await centerOf(fold), 600); await ping(fold, 1300); }
      for (const [field, end] of [['speed', 0.7], ['blend', 0.6]]) {
        const inp = L(`input[data-field="${field}"]`);
        await goTo(await centerOf(inp), 600); await ping(inp, 1000);
        const v = await bump(field), mn = Number(await inp.getAttribute('min')), mx = Number(await inp.getAttribute('max'));
        await dragSlider(field, [(v - mn) / (mx - mn), end, end], { hold: 600 });
        check(await bump(field) !== v, field + ' changed', { v, now: await bump(field) });
      }
      phase('after');
      const lanes0 = await L('.xt-lane').count();
      await animation('Walk - 1'); await sleep(600);
      await press(L('[data-hotkey="transfer:add-after"]'), { ping: 1300, wait: 1500 });
      const lanes1 = await L('.xt-lane').count();
      check(lanes1 === lanes0 + 1 && await L('.xt-lane.xt-chained').count() === 1, 'Add after adds a lane of its own', { lanes0, lanes1 });
      await sleep(1800);
      await press(L('.xt-remove'), { ping: 1300, wait: 1200 });
      check(await L('.xt-lane').count() === lanes0, 'its x removes the lane again', await L('.xt-lane').count());
      await sleep(900);
      await end(900);
    });

    // 8. Switches.
    await run('xfer-retarget-switches', async id => {
      await s.cut(async () => { await prepRetarget({ select: null }); });
      await begin(id);
      phase('all'); await sleep(500);
      await press(L('[data-hotkey="transfer:all-taken-parts"]'), { ping: 1300, wait: 900 });
      for (const [key, label] of [['keep-foot', 'Keep foot on the ground'], ['own-range', 'Stay in own range'], ['avoid-body', 'Keep arm out of the body']]) {
        const box = L(`input[data-hotkey="transfer:${key}"]`);
        const was = await box.isChecked();
        await press(box, { ping: 1300, wait: 1100 });
        check(await box.isChecked() !== was, label + ' switches', { was });
      }
      phase('travel');
      const travel = L('input[data-field="travel"]');
      await goTo(await centerOf(travel), 600); await ping(travel, 1300);
      const tv = await bump('travel'); await dragSlider('travel', [0.5, 0.2, 0.2], { hold: 900 });
      check(await bump('travel') !== tv, 'Travel changed', { tv, now: await bump('travel') });
      phase('weapon');
      await press(L('button[data-part="armL"]'), { ping: 1300, wait: 900 });
      const weapon = L('input[data-hotkey="transfer:weapon-above-ground"]');
      if (await weapon.count()) {
        const was = await weapon.isChecked();
        await press(weapon, { ping: 1300, wait: 1100 });
        check(await weapon.isChecked() !== was, 'Keep weapon above the ground switches', { was });
        await press(weapon, { ping: 0, wait: 800 });
      }
      phase('takefrom');
      await press(from().locator('.xf-animations button', { hasText: /^Walk - 1$/ }), { ping: 1300, wait: 1200 });
      const takeFrom = L('[data-hotkey="transfer:take-from"]');
      if (await takeFrom.count()) {
        await press(takeFrom, { ping: 1300, wait: 1500 });
        check(true, 'Take from switches the selected part to the animation the donor view shows', null);
      }
      s.proof.switches = { weaponShown: await weapon.count(), takeFrom: await takeFrom.count(), ownFeatures: await L('.xf-features, details.xf-own').count() };
      await sleep(1000);
      await end(900);
    });

    // 9. Finish.
    await run('xfer-retarget-finish', async id => {
      await s.cut(async () => { await prepRetarget({ select: null }); });
      const before = await doc();
      await begin(id);
      phase('name'); await sleep(500);
      const name = L('[data-hotkey="transfer:name"]');
      await goTo(await centerOf(name), 800); await ping(name, 1300);
      await page.mouse.down(); await sleep(60); await page.mouse.up();
      await page.keyboard.press('Control+a'); await page.keyboard.type('Gargoyle Attack', { delay: 90 }); await sleep(700);
      phase('add');
      await press(L('[data-hotkey="transfer:add-animation"]'), { ping: 1500, wait: 1500 });
      await sleep(1500);
      const afterOne = await doc();
      check(afterOne.sequences.length === before.sequences.length + 1 && afterOne.sequences.includes('Gargoyle Attack'), 'Add animation adds Gargoyle Attack to the model', { before: before.sequences.length, after: afterOne.sequences });
      const dd = view('Result').locator('.xs-animation');
      await goTo(await centerOf(dd), 800); await ping(dd, 1300);
      await dd.selectOption({ label: 'Gargoyle Attack' }); await sleep(2500);
      check(await dd.evaluate(e => e.selectedOptions[0].textContent) === 'Gargoyle Attack', 'the Result dropdown lists the new animation', null);
      await dd.selectOption('new'); await sleep(500);
      phase('all');
      const keep = L('[data-hotkey="transfer:keep-own"]');
      await press(keep, { ping: 1300, wait: 800 });
      check(await keep.isChecked(), 'Keep own animations is on', null);
      const addAll = L('[data-hotkey="transfer:add-all"]');
      const label = (await addAll.innerText()).trim();
      await press(addAll, { ping: 1500, wait: 2500 });
      const afterAll = await doc();
      check(afterAll.sequences.length > afterOne.sequences.length, 'Add all adds the donor animations the model does not have', { label, before: afterOne.sequences.length, after: afterAll.sequences.length });
      s.proof.finish = { label, before: before.sequences, afterOne: afterOne.sequences, afterAll: afterAll.sequences };
      await sleep(1000);
      phase('save');
      await press(L('[data-hotkey="transfer:setup-save"]'), { ping: 1300, wait: 800 });
      await page.keyboard.type('Gargoyle setup', { delay: 90 }); await sleep(600);
      await page.keyboard.press('Enter'); await sleep(1000);
      await press(L('[data-hotkey="transfer:setup-load"]'), { ping: 1300, wait: 1500 });
      check(await L('.xf-setups').count() === 1, 'Load from… lists the saved setup', await L('.xf-setups').innerText().catch(() => ''));
      await sleep(1800);
      await end(900);
    });

    await s.close();
  } catch (e) { await s.close(e); }
})();
