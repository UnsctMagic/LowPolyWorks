const fs = require('node:fs');
const { openSession, sleep, WORK } = require('./recorder.cjs');
const { prepare } = require('./common.cjs');
const OUT = WORK + '/captures/explore-' + (process.env.LPW_LOCALE || 'en');
(async () => {
  const s = await openSession({ locale: process.env.LPW_LOCALE || 'en', out: OUT });
  const info = {};
  try {
    const c = await prepare(s);
    info.els = await s.page.evaluate(() => [...document.querySelectorAll('.classic-keyframe-reel *')].map(e => e.tagName + '.' + (e.className?.baseVal ?? e.className) + ' ' + JSON.stringify(['x','width'].map(k => Math.round(e.getBoundingClientRect()[k])))));
  } catch (e) { info.error = e.stack; }
  fs.writeFileSync(OUT + '/info.json', JSON.stringify(info, null, 1));
  await s.close();
})();
