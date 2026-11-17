// Exploration only: tries POSE drags on the Footman and writes pictures to <work>/captures/explore-<lang>.
const fs = require('node:fs');
process.env.LPW_MODEL ||= 'Footman.mdx';
const { openSession, sleep, WORK } = require('./recorder.cjs');
const { prepare } = require('./common.cjs');
const OUT = WORK + '/captures/explore-' + (process.env.LPW_LOCALE || 'en');
(async () => {
  const s = await openSession({ locale: 'en', out: OUT, debug: true });
  const info = { log: [] };
  try {
    const c = await prepare(s, { sequenceName: 'Stand - 1', panBone: 'Bone_Chest', zoom: 3, azimuth: Number(process.env.LPW_AZ || 65) });
    const { page } = s;
    await page.mouse.click(c.timelineX(683), c.TIMELINE.y); await sleep(500);
    await page.locator('button[data-hotkey="pose:mode"]').click(); await sleep(1200);
    const steps = JSON.parse(process.env.LPW_STEPS || '[]');
    const world = async key => (await c.handle(key)).world.map(Math.round);
    info.start = { sword: await world('limb:38'), shield: await world('limb:42'), body: await world('body'), footL: await world('limb:29'), footR: await world('limb:32') };
    info.bones = await c.bones(['Bone_Arm1_L', 'Bone_Arm1_R', 'Bone_Chest', 'Bone_Pelvis']);
    await s.shot('s0');
    for (const [i, st] of steps.entries()) {
      const [kind, key, dx, dy, extra] = st;
      if (kind === 'orbit') { await c.orbitDrag(dx, dy, 900); await sleep(500); }
      else if (kind === 'key') { await page.keyboard.press(key); await sleep(300); }
      else {
        const h = await c.handle(key); await page.mouse.click(h.x, h.y); await sleep(300);
        await s.glide({ x: h.x, y: h.y }, { x: h.x + dx, y: h.y + dy }, 1200, 'left'); await sleep(600);
      }
      await page.keyboard.press('Escape').catch(() => {}); await sleep(300);
      info.log.push({ i, st, cam: await c.cam(), sword: await world('limb:38'), shield: await world('limb:42'), body: await world('body'), footL: await world('limb:29') });
      await s.shot('s' + (i + 1));
    }
  } catch (e) { info.error = e.stack; }
  fs.writeFileSync(OUT + '/info.json', JSON.stringify(info, null, 1));
  await s.close();
})();
