const fs = require('node:fs');
const { openSession, sleep, WORK } = require('./recorder.cjs');
const { prepare } = require('./common.cjs');
const OUT = WORK + '/captures/explore-' + (process.env.LPW_LOCALE || 'en');
(async () => {
  const s = await openSession({ locale: process.env.LPW_LOCALE || 'en', out: OUT, debug: true });
  const info = {};
  try {
    const c = await prepare(s, { sequenceName: process.env.LPW_SEQ || 'Stand - 1', panBone: process.env.LPW_PAN || 'Bone_Chest', zoom: Number(process.env.LPW_ZOOM || 7), azimuth: Number(process.env.LPW_AZ || 35), elevation: Number(process.env.LPW_EL || 8) });
    await s.shot('framed');
    const f = c.timelineX(Number(process.env.LPW_FRAME || 683)); await s.page.mouse.click(f, c.TIMELINE.y); await sleep(500);
    info.frame = await c.frame();
    await s.page.locator('button[data-hotkey="pose:mode"]').click(); await sleep(1500);
    const H = await c.handles();
    info.chains = H.config.chains; info.body = H.config.body;
    info.handles = H.list.filter(h => h.visible && !h.quiet).map(h => ({ kind: h.kind, key: h.key, id: h.id, label: h.label, x: Math.round(h.x), y: Math.round(h.y), world: h.world.map(Math.round) }));
    info.cam = await c.cam(); info.box = await c.box();
    await s.shot('pose');
  } catch (e) { info.error = e.stack; }
  fs.writeFileSync(OUT + '/info.json', JSON.stringify(info, null, 1));
  await s.close();
})();
