// Records the POSE tutorial clips (pose-on, pose-arms, pose-legs) from the real MDLxL app, one locale per run.
// One pose, no animation: a charge stance on the Footman (sword forward, shield out to the side, Body lower, one foot stepped
// forward on the ground). Nothing is played and the timeline is only clicked once, to choose the frame.
// Run through MDLxL's scripts/hidden-run.ps1 (see run.cjs): the app window opens on an invisible desktop.
process.env.LPW_MODEL ||= 'Footman.mdx';
const { openSession, sleep, WORK } = require('./recorder.cjs');
const { prepare } = require('./common.cjs');
const LOCALE = process.env.LPW_LOCALE || 'en';
const OUT = WORK + '/captures/pose-' + LOCALE;
// The Footman's Stand - 1 (167-1667 ms); the frame only decides which pose of the animation is edited.
const FRAME = 683;
// Handles by POSE chain key (the sword hand, the shield hand, the foot that steps), and the bones that carry the keys.
const RIG = { sequence: 'Stand - 1', pan: 'Bone_Chest', zoom: 3, azimuth: 65, swordHand: 'limb:38', shieldHand: 'limb:42', foot: 'limb:29',
  armBones: ['Bone_Arm1_L', 'Bone_Arm1_R'], legBones: ['Bone_Leg1_L', 'Bone_Leg1_R'] };

(async () => {
  const s = await openSession({ locale: LOCALE, out: OUT, debug: process.env.LPW_DEBUG === '1' });
  const { page, check, begin, end, phase, cue, ping, glide, shot } = s;
  try {
    const c = await prepare(s, { sequenceName: RIG.sequence, panBone: RIG.pan, zoom: RIG.zoom, azimuth: RIG.azimuth });
    await shot('setup');
    const worldOf = async key => (await c.handle(key)).world;
    // Presses a handle and drags it by a screen offset, as one left-button gesture; Escape then clears the selection.
    const drag = async (h, dx, dy, ms = 1300) => {
      await page.mouse.click(h.x, h.y); await sleep(300);
      await glide({ x: h.x, y: h.y }, { x: h.x + dx, y: h.y + dy }, ms, 'left'); await sleep(600);
      await page.keyboard.press('Escape'); await sleep(350);
    };
    const chest = (await c.bones(['Bone_Chest'])).Bone_Chest.w;

    // Clip 1: the frame is chosen; POSE shows the hand, foot and Body handles.
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
    check(H.config.chains.filter(x => x.kind === 'arm').length === 2 && H.config.chains.filter(x => x.kind === 'leg').length === 2 && kinds.some(h => h.kind === 'body'), 'two hand handles, two foot handles and a Body handle', kinds.map(h => h.label));
    check(kinds.filter(h => h.kind === 'endpoint').length === 4, 'all four limb handles are visible');
    s.proof.handles = kinds.map(h => ({ kind: h.kind, label: h.label, key: h.key, id: h.id }));
    s.proof.display = await c.display();
    await shot('pose-on');
    await sleep(1800);
    await end(900);

    // Clip 2: the sword hand forward at chest height, then the shield hand out to the side.
    const w0 = { sword: await worldOf(RIG.swordHand), shield: await worldOf(RIG.shieldHand), body: await worldOf('body'), foot: await worldOf(RIG.foot) };
    await begin('pose-arms');
    phase('sword-hand');
    let h = await c.handle(RIG.swordHand);
    await page.mouse.move(h.x, h.y);
    await ping({ x: h.x, y: h.y, name: 'hand handle' }, 1300);
    await cue('LMB', () => drag(h, -120, -40), 300);
    const sword = await worldOf(RIG.swordHand);
    check(sword[0] > chest[0] + 15 && sword[0] > w0.sword[0] + 20, 'the sword hand is in front of the chest and forward', { chest, before: w0.sword, after: sword });
    check(Math.abs(sword[2] - chest[2]) <= 15, 'the sword hand is at chest height', { chest, after: sword });
    check(sword[1] > -5 && sword[1] < 25, 'the sword hand stays on its own side of the body', sword);
    await sleep(600);
    phase('shield-hand');
    const cam0 = await c.cam();
    await cue('Alt + LMB', () => c.orbitDrag(-45, 0, 1100), 500);
    const cam1 = await c.cam();
    check(Math.abs(cam1.az - cam0.az) > 15, 'the camera turned with Alt + left mouse', { cam0, cam1 });
    await sleep(500);
    h = await c.handle(RIG.shieldHand);
    await page.mouse.move(h.x, h.y);
    await ping({ x: h.x, y: h.y, name: 'hand handle' }, 1300);
    await cue('LMB', () => drag(h, -110, 10), 300);
    const shield = await worldOf(RIG.shieldHand);
    const bodyNow = await worldOf('body');
    check(Math.abs(shield[1] - bodyNow[1]) > 30 && shield[1] < sword[1] - 30, 'the shield hand is out to the side', { shield, body: bodyNow, sword });
    s.proof.arms = { before: { sword: w0.sword, shield: w0.shield }, after: { sword, shield }, camera: { cam0, cam1 }, keyedBones: await c.keyedBones(frame) };
    check(RIG.armBones.every(n => s.proof.arms.keyedBones.includes(n)), 'Rotation keys written on the arm bones at frame ' + frame, s.proof.arms.keyedBones);
    await shot('arms');
    await end(1500);

    // Clip 3: Body lower, one foot stepped forward on the ground (from the side), then the camera turns around the pose.
    await begin('pose-legs');
    phase('body');
    h = await c.handle('body');
    await page.mouse.move(h.x, h.y);
    await ping({ x: h.x, y: h.y, name: 'body handle' }, 1300);
    await cue('LMB', () => drag(h, 0, 30, 1000), 300);
    const body = await worldOf('body');
    check(body[2] < w0.body[2] - 5, 'Body is lower, the knees bend', { before: w0.body, after: body });
    await sleep(500);
    phase('foot');
    const camA = await c.cam();
    await cue('Alt + LMB', () => c.orbitDrag(65, 0, 1100), 500);
    await sleep(400);
    h = await c.handle(RIG.foot);
    await page.mouse.move(h.x, h.y);
    await ping({ x: h.x, y: h.y, name: 'foot handle' }, 1300);
    await cue('LMB', () => drag(h, -60, 0, 1000), 300);
    const foot = await worldOf(RIG.foot);
    check(foot[2] <= w0.foot[2] + 2, 'the foot stays at ground height', { before: w0.foot, after: foot });
    check(foot[0] >= w0.foot[0] + 8, 'the foot moved forward, not back', { before: w0.foot, after: foot });
    s.proof.legs = { bodyBefore: w0.body, bodyAfter: body, footBefore: w0.foot, footAfter: foot, keyedBones: await c.keyedBones(frame) };
    check(RIG.legBones.every(n => s.proof.legs.keyedBones.includes(n)), 'Rotation keys written on the leg bones at frame ' + frame, s.proof.legs.keyedBones);
    await shot('legs');
    await sleep(900);
    phase('camera');
    const camB0 = await c.cam();
    await cue('Alt + LMB', () => c.orbitDrag(-40, 0, 1200), 500);
    const camB1 = await c.cam();
    check(Math.abs(camB1.az - camB0.az) > 15, 'the camera turned around the finished pose', { camB0, camB1 });
    s.proof.camera = { camA, camB0, camB1 };
    s.proof.noPlayback = { frameAtEnd: await c.frame(), chosenFrame: frame };
    check(s.proof.noPlayback.frameAtEnd === frame, 'the frame never changed: nothing was played or scrubbed', s.proof.noPlayback);
    await sleep(900);
    await shot('turned');
    await end(1800);
    await s.close();
  } catch (e) { await s.close(e); }
})();
