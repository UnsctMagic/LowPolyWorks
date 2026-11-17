// Records the three EMTR ribbon clips (ribbon-add, ribbon-timing, ribbon-play) on the Footman's sword from the real MDLxL app,
// one locale per run, through MDLxL's scripts/hidden-run.ps1. Add ribbon with the Fire sweep for the Attack - 1 animation only,
// then Lasts and the ribbon's blue diamonds (shows at 20% of the attack, hides at the end), then the whole attack played and
// the camera turned, and an animation that is not checked, which stays clean. Every step is checked against the model data;
// the checks are written to <work>/captures/<locale>/proof.json.
const fs = require('node:fs');
const { openSession, sleep, WORK } = require('./recorder.cjs');
const APP = process.env.LPW_APP || 'D:/Claude/MDLxL/.claude/worktrees/ribbon-app';
const LOCALE = process.env.LPW_LOCALE || 'en';
const OUT = WORK + '/captures/' + LOCALE;
const dict = LOCALE === 'en' ? {} : JSON.parse(fs.readFileSync(APP + '/src/locales/' + LOCALE + '.json', 'utf8'));
const T = text => dict[text] ?? text;
const esc = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// The Footman's sword: geoset 0, vertices 295-308; the Attack - 1 animation; the Fire sweep.
const BLADE = { 0: [295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308] };
const ATTACK = 'Attack - 1', OTHER = 'Stand - 1', SWEEP = 'fire', NAME = 'Fire sweep';
const START = .2, LASTS = .6;
const ROOT = '.pe-preview .game-preview-root';

(async () => {
  const s = await openSession({ locale: LOCALE, out: OUT, debug: process.env.LPW_DEBUG === '1' });
  const { page, check, begin, end, phase, cue, ping, glide, shot } = s;
  const pe = page.locator('.pe-preview');
  const centre = async locator => { const b = await locator.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const model = () => page.evaluate(([name, attack]) => {
    const m = mdlxlProbe().session.doc.model, r = m.RibbonEmitters.find(r => r.Name === name), q = m.Sequences.find(q => q.Name === attack);
    if (!r) return null;
    const v = r.Visibility, keys = v && typeof v === 'object' ? v.Keys.map(k => [k.Frame, k.Vector[0]]) : [];
    const on = q => !v || typeof v === 'number' ? v !== 0 : v.Keys.some(k => k.Frame >= q.Interval[0] && k.Frame <= q.Interval[1] && k.Vector[0] > 0);
    const emitters = m.ParticleEmitters2.filter(e => e.Name.startsWith(name));
    return { parent: m.Nodes[r.Parent]?.Name, parentId: r.Parent, lasts: r.LifeSpan, interval: Array.from(q.Interval), visible: m.Sequences.filter(on).map(q => q.Name), keys,
      attackKeys: keys.filter(k => k[0] >= q.Interval[0] && k[0] <= q.Interval[1]), emitters: emitters.map(e => e.Name),
      emitterAttackKeys: emitters.map(e => e.Visibility?.Keys ? e.Visibility.Keys.filter(k => k.Frame >= q.Interval[0] && k.Frame <= q.Interval[1]).map(k => [k.Frame, k.Vector[0]]) : null), ribbons: m.RibbonEmitters.length };
  }, [NAME, ATTACK]);
  const cam = () => page.evaluate(root => mdlxlProbe(root).runtime.controls.object.position.toArray(), ROOT);
  const wheel = async (point, notches) => {
    await page.mouse.move(point.x, point.y);
    await cue(T('Wheel'), async () => { for (let i = 0; i < Math.abs(notches); i++) { await page.mouse.wheel(0, notches < 0 ? -120 : 120); await sleep(260); } }, 250);
  };
  try {
    // The sword's faces are selected before the lesson starts; the main view is fitted to them.
    await s.setup(0);
    await page.evaluate(sel => lpwProps().onSelectionChange(sel), BLADE);
    await sleep(500);
    await page.locator('[data-hotkey="fitSelection"]').click(); await sleep(1600);
    const sel = await page.evaluate(() => lpwSelection());
    check(JSON.stringify(sel[0]) === JSON.stringify(BLADE[0]), 'the sword faces are selected', Object.keys(sel));
    await shot('selected');

    // 1. EMTR, Add ribbon, the Fire sweep, only the attack under Visibility, Create.
    await begin('ribbon-add');
    phase('open');
    await sleep(900);
    const emtr = page.locator('[data-hotkey="particles"]');
    await ping(emtr, 1200); await emtr.click();
    const addRibbon = page.locator('[data-hotkey="particles:add-ribbon"]');
    await addRibbon.waitFor(); await sleep(1300);
    await ping(addRibbon, 1100); await addRibbon.click();
    const sweep = page.locator('.pe-placement select').first();
    await sweep.waitFor(); await sleep(1200);
    await wheel(await centre(pe), -6);
    await sleep(700);
    phase('sweep');
    await ping(sweep, 1100);
    const sweepIndex = await sweep.locator('option').evaluateAll((o, v) => o.findIndex(x => x.value === v), SWEEP);
    check(sweepIndex > 0, 'the Sweep choice offers the element', sweepIndex);
    await sweep.click(); await sleep(400);
    await page.keyboard.press('Home');
    for (let i = 0; i < sweepIndex; i++) { await page.keyboard.press('ArrowDown'); await sleep(150); }
    await page.keyboard.press('Enter');
    await page.waitForFunction(v => document.querySelector('.pe-placement select')?.value === v, SWEEP, { timeout: 5000 });
    await page.waitForFunction(() => (mdlxlProbe('.pe-preview .game-preview-root').runtime?.native?.model.ParticleEmitters2 || []).some(e => e.Name.startsWith('Fire sweep')), null, { timeout: 30000 });
    await sleep(1500);
    phase('visibility');
    const boxes = page.locator('.pe-ribbon-sequences label');
    const names = await boxes.allTextContents();
    check(names.includes(ATTACK) && names.includes(OTHER), 'Visibility lists the animations', names);
    const other = boxes.nth(names.indexOf(OTHER)).locator('input');
    if (await other.isChecked()) { await ping(other, 800); await other.click(); await sleep(500); }
    const attackBox = boxes.nth(names.indexOf(ATTACK)).locator('input');
    await ping(attackBox, 800); await attackBox.click(); await sleep(500);
    const checkedNow = await boxes.evaluateAll(l => l.filter(x => x.querySelector('input').checked).map(x => x.textContent));
    check(checkedNow.length === 1 && checkedNow[0] === ATTACK, 'only the attack is checked under Visibility', checkedNow);
    await page.waitForFunction(() => { const p = mdlxlProbe('.pe-preview .game-preview-root'), n = p.runtime?.native; return n && /Attack/.test(p.props.model.Sequences[n.getSequence()]?.Name || ''); }, null, { timeout: 10000 });
    await sleep(3000);
    phase('create');
    const create = page.locator('.pe-placement button').filter({ hasText: new RegExp('^' + esc(T('Create')) + '$') });
    await ping(create, 1000); await create.click();
    await page.waitForFunction(n => mdlxlProbe().session.doc.model.RibbonEmitters.some(r => r.Name === n), NAME, { timeout: 15000 });
    await sleep(800);
    const made = await model();
    s.proof.created = made;
    check(made.ribbons === 1 && made.parentId === 19 && made.parent, 'the ribbon is created on the sword bone', { parent: made.parent, id: made.parentId });
    check(made.visible.length === 1 && made.visible[0] === ATTACK, 'Visibility is only ' + ATTACK, made.visible);
    check(made.emitters.length === 2, 'the Fire sweep adds its two particle emitters', made.emitters);
    await sleep(2800);
    await shot('created');
    await end(500);

    // 2. Lasts longer, the blue diamonds: shows at 20% of the attack, hides at the end.
    await begin('ribbon-timing');
    phase('zoom');
    await sleep(700);
    await wheel(await centre(pe), -4);
    await sleep(900);
    phase('lasts');
    const plus = page.locator(`.range-steps:has(input[aria-label="${T('Ribbon lasts')}"]) .range-step-up`);
    const before = (await model()).lasts;
    await ping(plus, 1200);
    const steps = Math.round((LASTS - before) / .05);
    for (let i = 0; i < steps; i++) { await plus.click(); await sleep(260); }
    await sleep(900);
    const lasts = (await model()).lasts;
    check(Math.abs(lasts - LASTS) < .001 && lasts > before, 'Lasts is longer', { before, lasts });
    s.proof.lasts = { before, after: lasts };
    phase('diamonds');
    const track = page.locator('.pe-key-track.ribbon');
    await track.waitFor();
    const m0 = await model();
    const [a, b] = m0.interval, span = b - a;
    const tb = async () => { const r = await track.boundingBox(); return { left: r.x + 6, width: r.width - 12, y: r.y + r.height / 2 }; };
    const xOf = async f => { const t = await tb(); return t.left + t.width * (f - a) / span; };
    const shows = page.locator('.pe-key-diamond.shows').first(), hides = page.locator('.pe-key-diamond.hides').first();
    const goalStart = a + Math.round(span * START);
    let pt = await centre(shows);
    await ping(shows, 1100);
    await glide(pt, { x: await xOf(goalStart + 14), y: pt.y }, 900, 'left'); await sleep(500);
    // The mouse lands near 20%: a short second drag corrects a miss to the left, then ArrowLeft (one frame each) settles the diamond on 20%.
    for (let guard = 0; guard < 40; guard++) {
      const at = (await model()).attackKeys.find(k => k[1] === 1)?.[0], d = goalStart - at;
      if (!d) break;
      if (d > 0) {
        const t = await tb(), here = await centre(shows);
        await glide(here, { x: here.x + (d + 8) * t.width / span, y: here.y }, 500, 'left'); await sleep(300);
        continue;
      }
      await shows.focus();
      await page.keyboard.press('ArrowLeft', { delay: 20 }); await sleep(250);
    }
    await sleep(500);
    s.proof.afterShows = (await model()).attackKeys;
    check(s.proof.afterShows.some(k => k[0] === goalStart && k[1] === 1), 'the first diamond sits on 20% of the attack', s.proof.afterShows);
    pt = await centre(hides);
    await ping(hides, 1100);
    await glide(pt, { x: await xOf(b) + 14, y: pt.y }, 1100, 'left'); await sleep(900);
    const m1 = await model();
    s.proof.diamonds = { before: m0.attackKeys, after: m1.attackKeys, emitters: m1.emitterAttackKeys };
    check(m1.attackKeys.some(k => k[0] === goalStart && k[1] === 1), 'the ribbon shows at 20% of the attack', { goalStart, keys: m1.attackKeys });
    check(m1.attackKeys.some(k => k[0] >= b - 1 && k[1] === 1) && !m1.attackKeys.some(k => k[0] > goalStart && k[0] < b - 1 && k[1] === 0), 'the ribbon stays shown until the end of the attack (hides at 100%)', m1.attackKeys);
    phase('seek');
    const seek = async p => { const t = await tb(); await page.mouse.click(t.left + t.width * p, t.y); };
    await seek(.1); await sleep(1500);
    await seek(.7); await sleep(2200);
    await shot('timing');
    await end(600);

    // 3. The whole attack, the camera turned with Alt + LMB, an animation that is not checked stays clean.
    await begin('ribbon-play');
    phase('ready');
    await sleep(700);
    const t0 = await tb();
    await page.mouse.click(t0.left + 1, t0.y); await sleep(700);
    const play = page.locator('[data-hotkey="particles:play"]');
    const label = (await play.innerText()).trim();
    phase('play');
    if (label === T('Pause')) { await ping(play, 800); } else { await ping(play, 1100); await play.click(); }
    await sleep(2600);
    phase('turn');
    const c0 = await cam(), view = await centre(pe);
    await cue('Alt + LMB', async () => {
      await page.keyboard.down('Alt');
      await glide({ x: view.x - 60, y: view.y + 90 }, { x: view.x + 140, y: view.y + 70 }, 1500, 'left');
      await page.keyboard.up('Alt');
    }, 400);
    const c1 = await cam();
    check(JSON.stringify(c0) !== JSON.stringify(c1), 'the preview camera turned with Alt + left mouse', { c0, c1 });
    s.proof.camera = { c0, c1 };
    await sleep(3600);
    await shot('turned');
    phase('clean');
    const animSelect = page.locator('[data-hotkey="particles:animation"]');
    const optIndex = await animSelect.locator('option').evaluateAll((o, n) => o.findIndex(x => x.textContent.trim() === n), OTHER);
    check(optIndex >= 0, OTHER + ' is in the animation list', optIndex);
    await ping(animSelect, 1000);
    await animSelect.selectOption({ label: OTHER }); await sleep(3200);
    const seq = await page.evaluate(() => { const p = mdlxlProbe('.pe-preview .game-preview-root'); return p.props.model.Sequences[p.runtime.native.getSequence()]?.Name; });
    check(seq === OTHER, 'the unchecked animation plays', seq);
    await shot('clean');
    await end(600);
    s.proof.final = await model();
    await s.close();
  } catch (e) { await s.close(e); }
})();
