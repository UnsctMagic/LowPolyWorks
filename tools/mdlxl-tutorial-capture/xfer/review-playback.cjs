// Page-size playback check for the XFER tutorial, run as an Electron main script through MDLxL's
// scripts/hidden-run.ps1. Serve the site first (PORT=4197 node server.mjs).
// It clicks/scrolls the real tutorial pages with CDP mouse input and only observes the players: every clip must
// play two complete loops with its keyboard captions, at desktop and mobile widths, without page overflow.
// LPW_QA_LANGS=en,es,... chooses pages (default: en). Writes <work>/report/playback-<lang>.json.
const fs = require('node:fs'), { app, BrowserWindow } = require('electron');
const WORK = process.env.LPW_WORK || 'D:/Claude/xfertut-work', base = process.env.LPW_QA_BASE || 'http://127.0.0.1:4197';
const pages = (process.env.LPW_QA_LANGS || 'en').split(',');
const SITE = process.env.LPW_SITE || 'D:/Claude/LowPolyWorks-xfer-tutorial/dist/mdlxl/tutorials';
const TUTORIALS = [
  { key: 'xfer', slug: 'xfer', clips: ['xfer-open','xfer-views','xfer-transplant-method','xfer-transplant-options','xfer-transplant-apply','xfer-retarget-take','xfer-retarget-tune','xfer-retarget-timeline','xfer-retarget-switches','xfer-retarget-finish'] },
];
const sizes = [{ name: 'desktop', width: 1600, height: 1100, mobile: false }, { name: 'mobile', width: 390, height: 844, mobile: true }];
const out = WORK + '/report', sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(out, { recursive: true });
// A main-process error would open a dialog on the invisible desktop; record it and quit instead.
const fail = e => { fs.writeFileSync(out + '/playback-startup-error.txt', e?.stack || String(e)); app.exit(1); };
process.on('uncaughtException', fail); process.on('unhandledRejection', fail);
app.setPath('userData', WORK + '/qa-profile-' + pages.join('-') + '-' + Date.now());
app.setPath('temp', WORK + '/tmp');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.whenReady().then(async () => {
  for (const page of pages) {
    const result = { page, passed: false, sizes: [] }, errors = [], badResources = [];
    const progress = step => fs.writeFileSync(out + '/playback-' + page + '-progress.txt', new Date().toISOString() + ' ' + step);
    const win = new BrowserWindow({ show: false, x: -3000, y: 0, width: 1600, height: 1100, webPreferences: { offscreen: true, backgroundThrottling: false } });
    const wc = win.webContents;
    wc.setFrameRate(30);
    wc.on('console-message', (_e, level, message) => { if (level >= 2 && !message.includes('Electron Security Warning') && !message.includes('ResizeObserver loop completed')) errors.push(message); });
    // The ResizeObserver notice comes from the site's frame-snap.js on main, not from this guide (the POSE guide shows it too).
    wc.session.webRequest.onCompleted(d => { if (d.url.startsWith(base) && d.statusCode >= 400) badResources.push({ url: d.url, status: d.statusCode }); });
    const js = s => wc.executeJavaScript(s);
    const wait = async (s, timeout = 30000) => { const t = Date.now(); while (Date.now() - t < timeout) { if (await js(s)) return; await sleep(50); } throw Error('Timeout ' + s); };
    const frame = () => js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true))))');
    async function wheelTo(selector) {
      for (let i = 0; i < 40; i++) {
        const r = await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,vw:innerWidth,vh:innerHeight}})()`);
        if (r.y >= 0 && r.y + r.height <= r.vh) return r;
        const delta = r.y + r.height / 2 - r.vh / 2;
        await wc.debugger.sendCommand('Input.dispatchMouseEvent', { type: 'mouseWheel', x: r.vw / 2, y: r.vh / 2, deltaX: 0, deltaY: Math.max(-800, Math.min(800, delta)) });
        await frame(); await sleep(60);
      }
      throw Error('Cannot scroll to ' + selector);
    }
    async function click(selector) {
      const r = await wheelTo(selector), x = r.x + r.width / 2, y = r.y + r.height / 2;
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await wc.debugger.sendCommand('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
    }
    try {
      const prefix = page === 'en' ? '' : page + '/';
      const index = JSON.parse(fs.readFileSync(SITE + '/' + prefix + 'animation-index.json', 'utf8'));
      wc.debugger.attach('1.3');
      for (const size of sizes) {
        // CDP metrics emulation crashes offscreen windows; the window itself takes the page size.
        win.setContentSize(size.width, size.height);
        const tutorials = [];
        for (const tutorial of TUTORIALS) {
          const { key, slug } = tutorial, tab = '#tab-' + key, panel = '#tutorial-' + key;
          progress(size.name + ' load');
          await win.loadURL(base + '/mdlxl/tutorials/?lang=' + page);
          progress(size.name + ' loaded');
          await wait(`[...document.querySelectorAll('.tutorial-card-media img')].every(i=>i.complete&&i.naturalWidth>0) && !!document.querySelector('${tab}')`);
          const viewport = await js('({width:innerWidth,height:innerHeight})');
          if (viewport.width !== size.width) throw Error('Viewport ' + JSON.stringify(viewport));
          const gallery = await js(`({cards:document.querySelectorAll(".tutorial-card").length,overflow:document.documentElement.scrollWidth>innerWidth+1,ours:${JSON.stringify(TUTORIALS.map(t => t.key))}.map(k=>document.querySelectorAll('#tab-'+k).length),title:document.querySelector("${tab} .tutorial-card-title").textContent,card:document.querySelector("${tab} img").naturalWidth})`);
          if (gallery.overflow) throw Error(size.name + ' gallery overflows');
          if (gallery.ours.some(n => n !== 1)) throw Error('Each new card must appear once ' + gallery.ours);
          progress(size.name + ' open ' + key);
          await click(tab);
          await wait(`location.pathname==='/mdlxl/tutorials/${slug}/' && !!document.querySelector('${panel}:not([hidden]) video')`);
          await frame();
          if (page === 'en' || page === 'de') fs.writeFileSync(out + `/page-${page}-${key}-${size.name}.png`, (await win.capturePage()).toPNG());
          const layout = await js(`(()=>{const v=[...document.querySelectorAll('${panel} video')];return{overflow:document.documentElement.scrollWidth>innerWidth+1,widths:v.map(e=>Math.round(e.getBoundingClientRect().width)),ratios:v.map(e=>+(e.getBoundingClientRect().width/e.getBoundingClientRect().height).toFixed(3))}})()`);
          if (layout.overflow) throw Error(size.name + ' tutorial overflows');
          if (new Set(layout.widths).size !== 1) throw Error('Clip widths differ ' + layout.widths);
          if (layout.ratios.some(r => Math.abs(r - 1600 / 900) > .02)) throw Error('Clip aspect ratio ' + layout.ratios);
          const clips = [];
          for (const clip of tutorial.clips) {
            const sel = `${panel} [data-animation="${clip}"] video`;
            progress(size.name + ' ' + clip);
            await wheelTo(sel);
            await wait(`(()=>{const v=document.querySelector(${JSON.stringify(sel)});return v.readyState>=3&&!v.paused&&v.currentTime>0})()`, 30000);
            const duration = index[clip].durations.length * 40 / 1000;
            // Observe only: three wrap-arounds of currentTime enclose two complete loops; collect the captions shown.
            const seen = await js(`(async()=>{const v=document.querySelector(${JSON.stringify(sel)}),track=v.textTracks[0];const start=performance.now(),texts=new Set();let last=v.currentTime,wraps=0,maxTime=0,cueLine=track?.cues?.[0]?.line;
              return await new Promise((resolve,reject)=>{const limit=setTimeout(()=>reject(Error('Loop timeout ${clip}')),${Math.round(duration * 1000 * 4 + 15000)});
              const tick=()=>{const t=v.currentTime;if(t+0.5<last)wraps++;last=t;maxTime=Math.max(maxTime,t);for(const c of track?.activeCues||[])texts.add(c.text);
                if(wraps>=3&&performance.now()-start>${Math.round(duration * 2000)}){clearTimeout(limit);const r=v.getBoundingClientRect();resolve({wraps,elapsed:Math.round(performance.now()-start),maxTime:+maxTime.toFixed(2),duration:+v.duration.toFixed(2),captions:[...texts],cueCount:track?.cues?.length||0,trackMode:track?.mode,cueLine,width:Math.round(r.width),visible:r.y>=-1&&r.bottom<=innerHeight+1,paused:v.paused,muted:v.muted,loop:v.loop,controls:v.controls});return}
                requestAnimationFrame(tick)};requestAnimationFrame(tick)})})()`);
            const wanted = [...new Set(index[clip].cues.map(c => c.key))];
            if (seen.cueCount !== index[clip].cues.length || (index[clip].cues.length && seen.trackMode !== 'showing')) throw Error(clip + ' caption track ' + JSON.stringify(seen));
            if (wanted.some(k => !seen.captions.includes(k))) throw Error(clip + ' captions not shown ' + JSON.stringify({ wanted, seen: seen.captions }));
            if (Math.abs(seen.duration - duration) > .1 || !seen.muted || !seen.loop || !seen.controls) throw Error(clip + ' player ' + JSON.stringify(seen));
            if (index[clip].cues.length && seen.cueLine !== (size.mobile ? 63 : 78)) throw Error(clip + ' caption line ' + seen.cueLine);
            clips.push({ clip, ...seen });
          }
          tutorials.push({ key, title: gallery.title, cards: gallery.cards, layout, clips });
        }
        result.sizes.push({ size: size.name, viewport: await js('({width:innerWidth,height:innerHeight})'), tutorials });
      }
      if (errors.length || badResources.length) throw Error(JSON.stringify({ errors, badResources }));
      result.passed = true;
    } catch (e) { result.error = e.stack || String(e); result.errors = errors; result.badResources = badResources; }
    fs.writeFileSync(out + '/playback-' + page + '.json', JSON.stringify(result, null, 1));
    win.destroy();
  }
  app.exit(0);
});
