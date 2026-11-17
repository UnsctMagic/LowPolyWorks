// Records the Focused Skeleton tutorial clips (fskel-pick, fskel-animate) from the real MDLxL app, one locale per run.
// Run through MDLxL's scripts/hidden-run.ps1 (see run.cjs): the app window opens on an invisible desktop.
const { openSession, sleep, WORK } = require('./recorder.cjs');
const { prepare } = require('./common.cjs');
const LOCALE = process.env.LPW_LOCALE || 'en';
const OUT = WORK + '/captures/fskel-' + LOCALE;
const MIDDLE = 1950;

(async () => {
  const s = await openSession({ locale: LOCALE, out: OUT, debug: process.env.LPW_DEBUG === '1' });
  const { page, check, begin, end, phase, cue, ping, glide, shot } = s;
  try {
    const c = await prepare(s);
    await shot('setup');
    const off = await c.display();
    check(!off.bones && !off.skeleton && !off.focusedSkeleton, 'Bones, Skeleton and Focused Skeleton start off', off);
    const click = async key => { await c.label(key).click(); await sleep(250); };
    const arm = () => c.partPoint('Should_L', 'Elbow_L', .4), leg = () => c.partPoint('Hip_L', 'Knee_L', .5);
    const doubleClick = async (point, name, bone) => {
      await page.mouse.move(point.x, point.y);
      await ping({ x: point.x, y: point.y, name }, 1300);
      await cue('LMB × 2', () => page.mouse.dblclick(point.x, point.y), 450);
      await c.waitNames([bone], 'double-click on the ' + name);
    };

    // Clip 1: Skeleton shows every bone; a double-click on a part selects its bones and turns Focused Skeleton on.
    await begin('fskel-pick');
    phase('skeleton');
    await ping(c.label('display:skeleton'), 1400);
    await click('display:skeleton');
    check(await c.checked('display:skeleton'), 'Skeleton on');
    await sleep(1700);
    await click('display:skeleton');
    check(!(await c.checked('display:skeleton')), 'Skeleton off again');
    await sleep(900);
    phase('arm');
    const armPoint = await arm();
    await doubleClick(armPoint, 'upper arm', 'Should_L');
    await sleep(500);
    await ping(c.label('display:focusedSkeleton'), 1500);
    const afterArm = await c.display();
    check(afterArm.focusedSkeleton && !afterArm.bones && !afterArm.skeleton, 'Focused Skeleton on, Bones and Skeleton still off', afterArm);
    s.proof.arm = { names: await c.names(), display: afterArm };
    await sleep(800);
    phase('leg');
    const legPoint = await leg();
    await doubleClick(legPoint, 'leg', 'Hip_L');
    await sleep(1700);
    const afterLeg = await c.display();
    check(afterLeg.focusedSkeleton && !afterLeg.bones && !afterLeg.skeleton, 'the focus moved to the leg, Bones and Skeleton off', afterLeg);
    s.proof.leg = { names: await c.names(), display: afterLeg };
    await shot('pick-end');
    await end(1400);

    // Clip 2: the same double-click, a frame in the middle, Rotate, and the arm swings up; play it.
    await begin('fskel-animate');
    phase('arm');
    await doubleClick(await arm(), 'upper arm', 'Should_L');
    await sleep(700);
    phase('frame');
    const fx = c.timelineX(MIDDLE), fy = c.TIMELINE.y;
    await page.mouse.move(fx, fy);
    await ping({ x: fx, y: fy, name: 'timeline' }, 1200);
    await cue('LMB', () => page.mouse.click(fx, fy), 350);
    const frame = await c.frame();
    check(Math.abs(frame - MIDDLE) <= 6, 'a frame in the middle of the animation', frame);
    s.proof.frame = frame;
    await sleep(600);
    phase('plane');
    await ping(c.label('plane:yz'), 1300);
    await c.label('plane:yz').click();
    check(await c.toggle('plane:yz').isChecked(), 'workplane YZ');
    await sleep(400);
    phase('rotate');
    await ping(page.locator('.movement-tools button[data-hotkey="rotate"]'), 1300);
    const before = await c.bones(['Should_L', 'Elbow_L', 'Wrist_L']);
    const keyBefore = await c.rotationKey('Should_L', frame);
    const from = { x: before.Should_L.x + 110, y: before.Should_L.y };
    await cue('R + LMB', async () => {
      await page.keyboard.press('r'); await sleep(350);
      check(await page.locator('.movement-tools button[data-hotkey="rotate"]').getAttribute('aria-pressed') === 'true', 'Rotate is on');
      await glide(from, { x: from.x, y: from.y - 130 }, 1500, 'left');
    }, 500);
    await sleep(500);
    const after = await c.bones(['Should_L', 'Elbow_L', 'Wrist_L']);
    const keyAfter = await c.rotationKey('Should_L', frame);
    check(keyAfter && JSON.stringify(keyAfter) !== JSON.stringify(keyBefore), 'a Rotation key was written on Should_L at frame ' + frame, { keyBefore, keyAfter });
    check(after.Wrist_L.w[2] > before.Wrist_L.w[2] + 25 && after.Wrist_L.w[2] > before.Should_L.w[2], 'the arm swung up: the hand is above the shoulder', { before: before.Wrist_L.w, after: after.Wrist_L.w, shoulder: before.Should_L.w });
    check(JSON.stringify(await c.names()) === JSON.stringify(['Should_L']), 'only the upper arm bone is selected', await c.names());
    const display = await c.display();
    check(display.focusedSkeleton && !display.bones && !display.skeleton, 'Focused Skeleton on, Bones and Skeleton off', display);
    s.proof.rotate = { frame, shoulder: before.Should_L.w, handBefore: before.Wrist_L.w, handAfter: after.Wrist_L.w, keyBefore, keyAfter, keyedBonesAtFrame: await c.keyedBones(frame) };
    await shot('animate-rotated');
    await sleep(900);
    phase('play');
    await cue('Space', () => page.keyboard.press('Space'), 300);
    const f0 = await c.frame();
    await sleep(3700);
    const f1 = await c.frame();
    check(f0 !== f1, 'the animation is playing', { f0, f1 });
    await page.keyboard.press('Space');
    await sleep(300);
    await shot('animate-end');
    await end(700);
    await s.close();
  } catch (e) { await s.close(e); }
})();
