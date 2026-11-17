// Shared steps of the Focused Skeleton and POSE recordings: opening Movement on a standing animation, a fixed
// front three-quarter camera, and page helpers that read the live model (bone positions, selection, keys, POSE handles).
// Every control is found without translated labels (data-hotkey and position), so the same code runs in all languages.
const { pathToFileURL } = require('node:url');
const APP = process.env.LPW_APP || 'D:/Claude/MDLxL/.claude/worktrees/tut-app';
const sleep = ms => new Promise(r => setTimeout(r, ms));
// The frame the guides work on: the Stand animation (1167-2733 ms). The Focused Skeleton guide picks the middle,
// POSE a frame whose neighbouring keys are far away, so the finished pose stays visible while it plays.
const TIMELINE = { left: 36, width: 1100, y: 692 };

async function load() {
  const three = await import(pathToFileURL(APP + '/node_modules/three/build/three.module.js').href);
  const pose = await import(pathToFileURL(APP + '/app/pose-overlay.js').href);
  return { ObjectLoader: three.ObjectLoader, projectPoseHandles: pose.projectPoseHandles };
}

async function prepare(s, { azimuth = 35, elevation = 8, zoom = 7, sequenceName = 'Stand' } = {}) {
  const { page } = s, { ObjectLoader, projectPoseHandles } = await load();
  const c = { page, sleep, TIMELINE };
  await page.locator('[data-hotkey="animation"]').click();
  await page.locator('select[data-hotkey="animationSequence"]').waitFor({ timeout: 30000 });
  const sequence = await page.evaluate(name => window.__mdlxl.model().Sequences.findIndex(q => q.Name === name), sequenceName);
  s.check(sequence >= 0, sequenceName + ' exists', sequence);
  await page.locator('select[data-hotkey="animationSequence"]').selectOption(String(sequence));
  const interval = await page.evaluate(i => Array.from(window.__mdlxl.model().Sequences[i].Interval), sequence);
  Object.assign(c, { sequence, interval });
  await page.locator('select[data-hotkey="viewDirection"]').selectOption('perspective');
  await page.locator('select[data-hotkey="viewDirection"] + select').selectOption('textured');
  c.toggle = key => page.locator(`input[data-hotkey="${key}"]`);
  c.label = key => page.locator(`label:has(> input[data-hotkey="${key}"])`);
  for (const key of ['display:bones', 'display:skeleton', 'display:focusedSkeleton', 'showVertices', 'display:objects'])
    if (await c.toggle(key).count()) await c.toggle(key).setChecked(false);
  await page.locator('button[data-hotkey="fit"]').click();
  await sleep(1800);
  // Page helpers: a bone's pivot on screen and in the world, a world point on screen, the camera angles.
  await page.evaluate(() => {
    const probe = () => mdlxlProbe('.game-preview-root'), canvasBox = () => document.querySelector('canvas[data-clean-model-canvas]').getBoundingClientRect();
    window.cleanBox = () => { const r = canvasBox(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    window.bonePts = names => {
      const p = probe(), n = p.runtime.native, m = n.model, cam = p.runtime.controls.object, box = canvasBox(), all = [...m.Bones, ...m.Helpers], out = {};
      for (const name of names) {
        const nd = all.find(x => x.Name === name), el = n.rendererData.nodes[nd.ObjectId].matrix, pv = nd.PivotPoint || m.PivotPoints[nd.ObjectId];
        const w = [0, 1, 2].map(i => el[i] * pv[0] + el[4 + i] * pv[1] + el[8 + i] * pv[2] + el[12 + i]);
        const v = new cam.position.constructor(w[0], w[1], w[2]).project(cam);
        out[name] = { x: box.x + (v.x + 1) * box.width / 2, y: box.y + (1 - v.y) * box.height / 2, w };
      }
      return out;
    };
    window.projW = w => { const cam = probe().runtime.controls.object, box = canvasBox(), v = new cam.position.constructor(w[0], w[1], w[2]).project(cam); return { x: box.x + (v.x + 1) * box.width / 2, y: box.y + (1 - v.y) * box.height / 2 }; };
    window.camAngles = () => { const r = probe().runtime, p = r.controls.object.position, t = r.controls.target, d = [p.x - t.x, p.y - t.y, p.z - t.z], h = Math.hypot(d[0], d[1]); return { az: Math.atan2(d[1], d[0]) * 180 / Math.PI, el: Math.atan2(d[2], h) * 180 / Math.PI, dist: Math.hypot(...d) }; };
    window.posePlain = v => ArrayBuffer.isView(v) ? Array.from(v) : Array.isArray(v) ? v.map(posePlain) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, posePlain(x)])) : v;
  });
  c.bones = names => page.evaluate(n => bonePts(n), names);
  c.box = () => page.evaluate(() => cleanBox());
  c.cam = () => page.evaluate(() => camAngles());
  const wrap = a => ((a + 540) % 360) - 180;
  // Alt + left drag turns the camera; the response of each drag is measured so later drags can be sized from it.
  c.k = { x: -0.5, y: 0.5 };
  c.orbitStart = async () => { const b = await c.box(); return { x: b.x + b.width * .12, y: b.y + b.height * .78 }; };
  c.orbitDrag = async (dAz, dEl, ms = 900) => {
    const from = await c.orbitStart(), dx = dAz / c.k.x, dy = dEl / c.k.y;
    await page.keyboard.down('Alt');
    await s.glide(from, { x: from.x + dx, y: from.y + dy }, ms, 'left');
    await page.keyboard.up('Alt');
  };
  c.orbitTo = async (az, el) => {
    for (let i = 0; i < 6; i++) {
      const a = await c.cam(), ea = wrap(az - a.az), ee = el - a.el;
      if (Math.abs(ea) < 2.5 && Math.abs(ee) < 2.5) return a;
      const dx = Math.max(-260, Math.min(260, ea / c.k.x)), dy = Math.max(-150, Math.min(150, ee / c.k.y));
      const from = await c.orbitStart();
      await page.keyboard.down('Alt'); await s.glide(from, { x: from.x + dx, y: from.y + dy }, 700, 'left'); await page.keyboard.up('Alt'); await sleep(300);
      const n = await c.cam(), ma = wrap(n.az - a.az), me = n.el - a.el;
      if (Math.abs(dx) > 10 && Math.abs(ma) > 1) c.k.x = ma / dx;
      if (Math.abs(dy) > 10 && Math.abs(me) > 1) c.k.y = me / dy;
    }
    return c.cam();
  };
  // The right mouse button pans: drag until the chest sits at the goal point.
  c.panChest = async (fx = .5, fy = .5) => {
    const b = await c.box(), goal = { x: b.x + b.width * fx, y: b.y + b.height * fy };
    for (let k = 0; k < 5; k++) {
      const p = (await c.bones(['Chest'])).Chest, dx = goal.x - p.x, dy = goal.y - p.y;
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return p;
      await page.mouse.move(b.x + b.width * .62, b.y + b.height * .5); await page.mouse.down({ button: 'right' });
      for (let i = 1; i <= 10; i++) { await page.mouse.move(b.x + b.width * .62 + dx * i / 10, b.y + b.height * .5 + dy * i / 10); await sleep(25); }
      await page.mouse.up({ button: 'right' }); await sleep(450);
    }
    return (await c.bones(['Chest'])).Chest;
  };
  c.orbitAngles = await c.orbitTo(azimuth, elevation);
  const b0 = await c.box();
  await page.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2 + 30);
  for (let i = 0; i < zoom; i++) { await page.mouse.wheel(0, -120); await sleep(150); }
  await sleep(600);
  await c.panChest(.5, .52);
  await sleep(900);

  // Selection, display and animation state read from the live app.
  c.names = () => page.evaluate(() => { const m = window.__mdlxl.model(), all = [...m.Bones, ...m.Helpers]; return [...window.__mdlxl.selection().selectedNodeIds].map(i => all.find(n => n.ObjectId === i)?.Name); });
  c.checked = key => c.toggle(key).isChecked();
  c.display = async () => ({ bones: await c.checked('display:bones'), skeleton: await c.checked('display:skeleton'), focusedSkeleton: await c.checked('display:focusedSkeleton') });
  c.frame = async () => Number(await page.locator('input[data-hotkey="keyframe:time"]').inputValue());
  // The timeline track's own rectangle (its width changes with the language's labels).
  const track = await page.locator('.classic-reel-track').boundingBox();
  c.TIMELINE = { left: track.x, width: track.width, y: track.y + track.height / 2 };
  c.timelineX = frame => c.TIMELINE.left + (frame - interval[0]) / (interval[1] - interval[0]) * c.TIMELINE.width;
  c.rotationKey = (name, frame) => page.evaluate(([name, frame]) => { const m = window.__mdlxl.model(), b = [...m.Bones, ...m.Helpers].find(n => n.Name === name), k = b.Rotation?.Keys?.find(k => k.Frame === frame); return k ? Array.from(k.Vector) : null; }, [name, frame]);
  c.keyedBones = frame => page.evaluate(frame => { const m = window.__mdlxl.model(); return [...m.Bones, ...m.Helpers].filter(n => n.Rotation?.Keys?.some(k => k.Frame === frame)).map(n => n.Name); }, frame);
  // A point on the part between two bones (a fraction of the way from the first pivot to the second), in page coordinates.
  c.partPoint = async (a, b, t = .5) => { const p = await c.bones([a, b]); return { x: p[a].x + (p[b].x - p[a].x) * t, y: p[a].y + (p[b].y - p[a].y) * t }; };
  c.waitNames = async (want, label) => {
    await page.waitForFunction(want => { const m = window.__mdlxl.model(), all = [...m.Bones, ...m.Helpers]; return JSON.stringify([...window.__mdlxl.selection().selectedNodeIds].map(i => all.find(n => n.ObjectId === i)?.Name)) === JSON.stringify(want); }, want, { timeout: 5000 }).catch(() => {});
    s.check(JSON.stringify(await c.names()) === JSON.stringify(want), label + ' selects ' + want.join(', '), await c.names());
  };
  // POSE handles as the app draws them, from the live model and camera (positions are relative to the viewport canvas).
  c.handles = async () => {
    const d = await page.evaluate(() => {
      const p = mdlxlProbe('.game-preview-root'), cv = document.querySelector('canvas[data-clean-model-canvas]'), m = window.__mdlxl.model();
      return { model: posePlain({ ...m, Geosets: [], Textures: [], Materials: [] }), config: p.props.poseConfig, frame: p.runtime.native.getFrame(), sequence: p.props.sequenceIndex, camera: p.runtime.controls.object.toJSON(), w: cv.clientWidth, h: cv.clientHeight };
    });
    const camera = new ObjectLoader().parse(d.camera); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    const list = projectPoseHandles(d.model, d.config, d.frame, d.sequence, camera, d.w, d.h), box = await c.box();
    return { config: d.config, list: list.map(h => ({ kind: h.kind, key: h.key, id: h.id, label: h.label, visible: h.visible, quiet: h.quiet, x: box.x + h.x, y: box.y + h.y, world: h.world.toArray() })) };
  };
  c.handle = async key => { const H = await c.handles(), h = H.list.find(x => !x.quiet && (x.kind === 'endpoint' ? x.key === key : x.kind === key)); if (!h?.visible) throw Error('No visible POSE handle ' + key); return h; };
  return c;
}
module.exports = { prepare, sleep, TIMELINE };
