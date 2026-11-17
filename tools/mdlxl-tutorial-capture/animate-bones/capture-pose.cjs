// Records the POSE tutorial clips (pose-on, pose-arms, pose-legs) from the real MDLxL app, one locale per run.
// Run through MDLxL's scripts/hidden-run.ps1 (see run.cjs): the app window opens on an invisible desktop.
const { openSession, sleep, WORK } = require('./recorder.cjs');
const { prepare } = require('./common.cjs');
process.env.LPW_MODEL ||= 'Footman.mdx';
const LOCALE = process.env.LPW_LOCALE || 'en';
const OUT = WORK + '/captures/pose-' + LOCALE;
// The Footman's Stand - 1 (167-1667 ms): frame 683 lies in the longest gap between keys (467 and 900),
// so the finished pose stays visible while the animation plays.
const FRAME = 683;
// Handles by POSE chain key; the shoulders the hands are aimed from; the bones that must carry keys.
const RIG = { sequence: 'Stand - 1', pan: 'Bone_Chest', zoom: 3, azimuth: 45, rightHand: 'limb:42', leftHand: 'limb:38', leftFoot: 'limb:29',
  rightShoulder: 'Bone_Arm1_R', leftShoulder: 'Bone_Arm1_L', armBones: ['Bone_Arm1_R', 'Bone_Arm1_L'], legBones: ['Bone_Leg1_L', 'Bone_Leg2_L'] };

(async () => {
  const s = await openSession({ locale: LOCALE, out: OUT, debug: process.env.LPW_DEBUG === '1' });
  const { page, check, begin, end, phase, cue, ping, glide, shot } = s;
  try {
    const c = await prepare(s, { sequenceName: RIG.sequence, panBone: RIG.pan, zoom: RIG.zoom, azimuth: RIG.azimuth });
    await shot('setup');
    const worldOf = async key => (await c.handle(key)).world;
    // Drags a handle from where it is to a point (page coordinates), as one left-button gesture.
    const drag = async (handle, to, ms = 1500) => { await page.mouse.move(handle.x, handle.y); await glide({ x: handle.x, y: handle.y }, to, ms, 'left'); await sleep(600); };
    const shoulderTarget = async (shoulder, side) => { const w = (await c.bones([shoulder]))[shoulder].w; return page.evaluate(p => projW(p), [w[0], w[1] + side * 14, w[2] + 38]); };

    // Clip 1: animation and frame chosen; POSE shows the hand, foot and body handles.
    await begin('pose-on');
    phase('frame');
    await ping('select[data-hotkey="animationSequence"]', 1300);
    const fx = c.timelineX(FRAME), fy = c.TIMELINE.y;
    await page.mouse.move(fx, fy);
    await ping({ x: fx, y: fy, name: 'timeline' }, 1200);
    await cue('LMB', () => page.mouse.click(fx, fy), 350);
    const frame = await c.frame();
    check(Math.abs(frame - FRAME) <= 6, 'a frame chosen on the timeline', frame);
    s.proof.frame = frame;
    await sleep(600);
    phase('pose');
    await ping('button[data-hotkey="pose:mode"]', 1400);
    await page.locator('button[data-hotkey="pose:mode"]').click();
    await sleep(1200);
    const H = await c.handles();
    check(H.config.enabled, 'POSE is on');
    const kinds = H.list.filter(h => h.visible && !h.quiet);
    const arms = H.config.chains.filter(x => x.kind === 'arm'), legs = H.config.chains.filter(x => x.kind === 'leg');
    check(arms.length === 2 && legs.length === 2 && kinds.some(h => h.kind === 'body'), 'two hand handles, two foot handles and a Body handle', kinds.map(h => h.label));
    check(kinds.filter(h => h.kind === 'endpoint').length === 4, 'all four limb handles are visible');
    s.proof.handles = kinds.map(h => ({ kind: h.kind, label: h.label, key: h.key, id: h.id }));
    s.proof.display = await c.display();
    await shot('pose-on');
    await sleep(1800);
    await end(900);

    // Clip 2: both hands up and out.
    const keys = { rightHand: RIG.rightHand, leftHand: RIG.leftHand, leftFoot: RIG.leftFoot };
    const w0 = { rh: await worldOf(keys.rightHand), lh: await worldOf(keys.leftHand), lf: await worldOf(keys.leftFoot), body: await worldOf('body') };
    await begin('pose-arms');
    phase('right-hand');
    let h = await c.handle(keys.rightHand);
    await page.mouse.move(h.x, h.y);
    await ping({ x: h.x, y: h.y, name: 'hand handle' }, 1300);
    await cue('LMB', async () => { await page.mouse.click(h.x, h.y); await sleep(300); await drag(h, await shoulderTarget(RIG.rightShoulder, -1)); }, 300);
    const rh = await worldOf(keys.rightHand);
    check(rh[2] > w0.rh[2] + 30, 'the right hand rose above the head', { before: w0.rh, after: rh });
    await sleep(500);
    phase('left-hand');
    h = await c.handle(keys.leftHand);
    await cue('LMB', async () => { await page.mouse.click(h.x, h.y); await sleep(300); await drag(h, await shoulderTarget(RIG.leftShoulder, 1)); }, 300);
    const lh = await worldOf(keys.leftHand);
    check(lh[2] > w0.lh[2] + 30, 'the left hand rose above the head', { before: w0.lh, after: lh });
    check(rh[1] < lh[1] - 20, 'the hands form a V', { right: rh, left: lh });
    s.proof.arms = { before: { right: w0.rh, left: w0.lh }, after: { right: rh, left: lh }, keyedBones: await c.keyedBones(frame) };
    check(RIG.armBones.every(n => s.proof.arms.keyedBones.includes(n)), 'Rotation keys written on the arm bones at frame ' + frame, s.proof.arms.keyedBones);
    await shot('arms');
    await end(1500);

    // Clip 3: one knee up, Body lower, the camera turns, the animation plays into the pose.
    await begin('pose-legs');
    phase('foot');
    h = await c.handle(keys.leftFoot);
    await page.mouse.move(h.x, h.y);
    await ping({ x: h.x, y: h.y, name: 'foot handle' }, 1300);
    await cue('LMB', async () => { await page.mouse.click(h.x, h.y); await sleep(300); await drag(h, { x: h.x - 55, y: h.y - 135 }); }, 300);
    const lf = await worldOf(keys.leftFoot);
    check(lf[2] > w0.lf[2] + 12, 'the left foot rose', { before: w0.lf, after: lf });
    await sleep(500);
    phase('body');
    await page.keyboard.press('Escape'); await sleep(400);
    h = await c.handle('body');
    await cue('LMB', async () => { await page.mouse.click(h.x, h.y); await sleep(300); await drag(h, { x: h.x, y: h.y + 24 }, 1000); }, 300);
    const body = await worldOf('body');
    check(body[2] < w0.body[2] - 2, 'Body is lower, the standing knee bends', { before: w0.body, after: body });
    s.proof.legs = { footBefore: w0.lf, footAfter: lf, bodyBefore: w0.body, bodyAfter: body, keyedBones: await c.keyedBones(frame) };
    check(RIG.legBones.every(n => s.proof.legs.keyedBones.includes(n)), 'Rotation keys written on the leg bones at frame ' + frame, s.proof.legs.keyedBones);
    await page.keyboard.press('Escape'); await sleep(400);
    await shot('legs');
    await sleep(1100);
    phase('camera');
    const cam0 = await c.cam();
    await cue('Alt + LMB', () => c.orbitDrag(40, 0, 1300), 500);
    const cam1 = await c.cam();
    check(Math.abs(cam1.az - cam0.az) > 15, 'the camera turned with Alt + left mouse', { cam0, cam1 });
    s.proof.camera = { cam0, cam1 };
    await sleep(700);
    await shot('turned');
    phase('play');
    await cue('Space', () => page.keyboard.press('Space'), 300);
    const f0 = await c.frame();
    await sleep(3700);
    const f1 = await c.frame();
    check(f0 !== f1, 'the animation is playing', { f0, f1 });
    await page.keyboard.press('Space');
    await sleep(300);
    await end(700);
    await s.close();
  } catch (e) { await s.close(e); }
})();
