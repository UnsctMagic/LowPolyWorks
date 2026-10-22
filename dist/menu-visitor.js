const sheet = new URL('./ui/visitor/0.png' + new URL(import.meta.url).search, import.meta.url).href; // Shares the script's cache key.
const wings = new URL('./ui/visitor/1.png', import.meta.url).href;
const between = (low, high) => low + Math.random() * (high - low);
const ease = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * ease(t);
// Match the head/body across the two authored sprite sheets, excluding wings.
const bodyScale = 1.1, bodyWidth = 120 * bodyScale, bodyHeight = 130 * bodyScale;
const flightScale = .9, flightSize = 240 * flightScale, footOffset = 59.375 * bodyScale;
// Some walking stops are a head lean, one way and then the other, played once or twice (row 9 of the sheet).
// Steps are [column, beats]; the last two columns hold the original lean heads mirrored onto the body.
const LEAN = [[0, 2], [5, 1], [4, 3], [5, 1], [0, 2], [6, 1], [7, 3], [6, 1]], LEAN_BEAT = 220;
const LEAN_TIME = LEAN.reduce((total, [, beats]) => total + beats, 0) * LEAN_BEAT;
// Authored edge departure: standing launch cells and tucked-wing dive cells.
const moves = new URL('./ui/visitor/2.png' + new URL(import.meta.url).search, import.meta.url).href;
const diveArt = new URL('./ui/visitor/3.png' + new URL(import.meta.url).search, import.meta.url).href;
const sequence = (row, durations, dx = null) => ({row, durations, dx, duration:durations.reduce((total, ms) => total + ms, 0)});
const DIVE_START = sequence(7, [110, 150, 200, 90, 70, 70, 70, 70]);      // look over the edge, crouch, hop off
const DIVE_FALL = .8, DIVE_PULL = .35, DIVE_GRAVITY = 780; // seconds, seconds, px/s²
// Bird Attack dive: aim point down the unit's canvas and launch distance from it.
// Each attack picks its own heading anywhere around the circle, so he can come from below too.
const ATTACK_AIM = .55, ATTACK_RISE = 260;
const ATTACK_SPEED = 650, ATTACK_PUSH = 2400, ATTACK_FOLLOW = .18; // px/s, px/s², seconds past the unit
function frameOf(seq, age) {
  let left = Math.max(0, age);
  for (let column = 0; column < seq.durations.length; column++) {
    if (left < seq.durations[column]) return {column, fraction:left / seq.durations[column]};
    left -= seq.durations[column];
  }
  return {column:seq.durations.length - 1, fraction:1};
}
// His state survives a full page load in the same tab when the next page starts within this time.
const CARRY_OVER = 'lowpolyworks.shredderVisit', CARRY_OVER_MS = 15000;
function leanColumn(time) {
  let beat = Math.floor(time % LEAN_TIME / LEAN_BEAT);
  for (const [column, beats] of LEAN) { if (beat < beats) return column; beat -= beats; }
  return 0;
}
const scale = bodyWidth / 144;
const edges = [
  {side:'top', nx:0, ny:-1, turn:0},
  {side:'right', nx:1, ny:0, turn:90},
  {side:'bottom', nx:0, ny:1, turn:180},
  {side:'left', nx:-1, ny:0, turn:-90},
];
const overlaps = (a, b, pad = 0) => a.left < b.right + pad && a.right > b.left - pad &&
  a.top < b.bottom + pad && a.bottom > b.top - pad;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

// Peanut physics, in CSS pixels and seconds. Drag is linear, so steps are exact.
const GRAVITY = 351;
const AIR_DRAG = .65;               // thrown and dropped food: 540 px/s terminal fall
const FLUTTER_DRAG = 2.6;           // fresh food drifts at 135 px/s, slow enough to catch
const WALL_BOUNCE = .55, CEILING_BOUNCE = .45, FLOOR_BOUNCE = .35;
const SETTLE_SPEED = 55;            // gentler floor impacts stop instead of bouncing
const BREAK_SPEED = 650;            // harder floor impacts crack the shell
const FLOOR_FRICTION = 6;
const SIDE_MARGIN = 16, CEILING = 10, FLOOR_MARGIN = 18;
const ROLL_RADIUS = 10;             // rolling on the floor turns the shell by distance / radius
const SPIN_PER_SPEED = .45, MAX_SPIN = 720;
const HAND = {x:12, y:14};          // held food sits below-right of the cursor
const THROW_BOOST = 2;
// Throw sampling: motion over the last 50ms, forgotten after a 180ms pause.
// Slow hand movement (under 100 px/s) drops gently; strength is full from 250 px/s.
const THROW_WINDOW = 50, THROW_PAUSE = 180, MIN_THROW_MOTION = 12, MAX_THROW_SPEED = 1300;
const GENTLE_SPEED = 100, FULL_THROW_SPEED = 250;
const GRAB_REACH = 36, SCARE_REACH = 58, CONTEST_CLEAR = 160;

// Exact solution of v' = acceleration - drag * v over one step.
function integrate(position, velocity, drag, acceleration, seconds) {
  const damping = Math.exp(-drag * seconds), terminal = acceleration / drag;
  return [position + terminal * seconds + (velocity - terminal) * (1 - damping) / drag,
    terminal + (velocity - terminal) * damping];
}

// Moves free food inside the view. Returns true when a floor impact cracks the shell.
function moveFood(nut, seconds, width, height) {
  [nut.x, nut.vx] = integrate(nut.x, nut.vx, AIR_DRAG, 0, seconds);
  [nut.y, nut.vy] = integrate(nut.y, nut.vy, nut.state === 'falling' ? FLUTTER_DRAG : AIR_DRAG, GRAVITY, seconds);
  const right = Math.max(SIDE_MARGIN, width - SIDE_MARGIN), floor = height - FLOOR_MARGIN;
  if (nut.x < SIDE_MARGIN) { nut.x = SIDE_MARGIN; if (nut.vx < 0) nut.vx *= -WALL_BOUNCE; }
  if (nut.x > right) { nut.x = right; if (nut.vx > 0) nut.vx *= -WALL_BOUNCE; }
  if (nut.y < CEILING && nut.vy < 0) { nut.y = CEILING; nut.vy *= -CEILING_BOUNCE; }
  let cracked = false;
  if (nut.y >= floor) {
    nut.y = floor;
    if (!nut.broken && nut.vy > BREAK_SPEED) cracked = true;
    else if (nut.vy > 0) nut.vy = nut.vy > SETTLE_SPEED ? -nut.vy * FLOOR_BOUNCE : 0;
    nut.vx *= Math.exp(-FLOOR_FRICTION * seconds);
  }
  // Airborne food keeps tumbling; food on the floor rolls with its travel.
  if (nut.y >= floor && nut.vy === 0) nut.spin = nut.vx / ROLL_RADIUS * 180 / Math.PI;
  else nut.spin *= Math.exp(-AIR_DRAG * seconds);
  nut.angle = (nut.angle + nut.spin * seconds) % 360;
  return cracked;
}

// A 'lowpolyworks:bird-attack' window event ({element, onHit}) sends him diving through element;
// he cancels the event when he takes it, and calls onHit as he passes through.
// onInteraction(kind) hears how a visitor plays with him: 'peek', 'grab', 'feed', 'crack' or 'follow'.
export function startMenuVisitor({onInteraction} = {}) {
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL('./menu-visitor.css' + new URL(import.meta.url).search, import.meta.url).href; // Shares the script's cache key.
  document.head.append(css);
  const layer = document.createElement('div');
  layer.className = 'menu-visitor-layer'; layer.setAttribute('aria-hidden', 'true');
  const bird = document.createElement('div'); bird.className = 'menu-visitor';
  bird.style.width = `${bodyWidth}px`; bird.style.height = `${bodyHeight}px`;
  // Paint complete, decoded cells into one surface. CSS sheet/opacity swaps can
  // expose an unpainted texture for a frame when Chrome recomposites the bird.
  const picture = document.createElement('canvas'); picture.className = 'menu-visitor-frame';
  const incoming = document.createElement('canvas'), outgoing = document.createElement('canvas');
  for (const canvas of [picture, incoming, outgoing]) canvas.width = canvas.height = 480;
  picture.style.width = picture.style.height = `${flightSize}px`;
  picture.style.left = `${bodyWidth / 2 - 120 * flightScale}px`;
  picture.style.top = `${bodyHeight / 2 - 101 * flightScale}px`;
  const ink = picture.getContext('2d'), nextInk = incoming.getContext('2d'), oldInk = outgoing.getContext('2d');
  let paintedSheet = null, joinStarted = -Infinity;
  const beakPeanut = document.createElement('div'); beakPeanut.className = 'menu-visitor-beak-peanut';
  bird.append(picture, beakPeanut); layer.append(bird); document.body.append(layer);
  // Food remains visible outside the stone-edge mask used by a peeking bird.
  const foodLayer = document.createElement('div'); foodLayer.className = 'menu-peanut-layer';
  foodLayer.setAttribute('aria-hidden', 'true');
  const food = document.createElement('div'); food.className = 'menu-peanut';
  foodLayer.append(food); document.body.append(foodLayer);
  const peanutTest = new URLSearchParams(location.search).has('peanut-test');
  // The test view is the owner's own playground, so it never counts.
  const played = kind => { if (!peanutTest) onInteraction?.(kind); };
  const art = new Image(), flightArt = new Image(); art.src = sheet; flightArt.src = wings;
  const movesImage = new Image(), diveImage = new Image(); movesImage.src = moves; diveImage.src = diveArt;
  const trimArt = new Image();
  let trimEdges, peekMask;
  trimArt.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = trimArt.naturalWidth; canvas.height = trimArt.naturalHeight;
    const context = canvas.getContext('2d'); context.drawImage(trimArt, 0, 0);
    const {data} = context.getImageData(0, 0, canvas.width, canvas.height);
    const opaque = (x, y) => data[(y * canvas.width + x) * 4 + 3] >= 128;
    trimEdges = {width:canvas.width, height:canvas.height, left:[], right:[], top:[], bottom:[]};
    for (let y = 0; y < canvas.height; y++) {
      let left = 0, right = canvas.width - 1;
      while (left < 180 && !opaque(left, y)) left++;
      while (right >= canvas.width - 180 && !opaque(right, y)) right--;
      trimEdges.left[y] = left; trimEdges.right[y] = canvas.width - 1 - right;
    }
    for (let x = 0; x < canvas.width; x++) {
      let top = 0, bottom = canvas.height - 1;
      while (top < 180 && !opaque(x, top)) top++;
      while (bottom >= canvas.height - 180 && !opaque(x, bottom)) bottom--;
      trimEdges.top[x] = top; trimEdges.bottom[x] = canvas.height - 1 - bottom;
    }
  };
  trimArt.src = new URL('./ui/slate-frame-v2.png', import.meta.url).href;
  const pointer = {x:-10000, y:-10000, moved:0, sampled:0, speed:0, vx:0, vy:0, velocityAt:0};
  const throwSamples = [];
  let frame, phase = 'rest', perch, previousElement, started = 0, last = performance.now();
  let perchSize, lastWalkPoint;
  let next = last + between(8000, 12000), deadline = 0, exposure = -72 * bodyScale, fromExposure = -72 * bodyScale;
  let actionAge = 0, peck = false, offset = 0, direction = 1, speed = 0, steps = 0;
  let pauseAt = 0, pauseUntil = 0, pauseStarted = 0, hurryUntil = 0, chasedUntil = 0, leanCycles = 0;
  let flight, escapeSpeed = 420, dive = null, attack = null;
  // peanut.state: 'falling' (fresh drop), 'dropped' (released by the hand), 'held', or 'carried'.
  // contested: a hand reached for free food, so he keeps away until it moves off.
  let peanut = null, peanutRollAt = Infinity, chasePoint, paintedPoint, backOffUntil = 0, backOffTarget = 0;
  // Where he was on the previous page, when he flies over to this one.
  let resumeFrom = null;
  // A press that grabs or drops food also owns its click, but only briefly:
  // a press that never produces a click must not swallow a later one.
  let swallowClickUntil = 0;
  // While food is held across a menu change: {from} is where his flight to the new view starts.
  let follow = null;
  const isFree = nut => nut?.state === 'falling' || nut?.state === 'dropped';
  const holding = () => peanut?.state === 'held';
  const shellFragments = [];
  const visitModes = [], regionVisits = new Map();
  const pictureSurfaces = () => [...new Set([...document.querySelectorAll('#app img, #app canvas, #app video, #app iframe')]
    .map(media => media.closest('.army-picture, .card-portrait, .model-stage, .post-media, .post-inline-image, .post-video') || media))];

  function rectFor(element) {
    if (!element?.isConnected) return null;
    const box = element.getBoundingClientRect(), style = getComputedStyle(element);
    if (style.visibility !== 'visible' || box.width < 90 || box.height < 40) return null;
    const widths = ['Left', 'Right', 'Top', 'Bottom'].map(side => parseFloat(style[`border${side}Width`]) || 0);
    const inset = factor => ({left:box.left + widths[0] * factor, right:box.right - widths[1] * factor,
      top:box.top + widths[2] * factor, bottom:box.bottom - widths[3] * factor});
    const inner = inset(1);
    const caption = element.querySelector(':scope > .army-caption');
    // Feet sit on the stone below the caption, not on its inset outline.
    if (caption) inner.bottom = caption.getBoundingClientRect().bottom + 2;
    // The visible stone ridge is at the outside of the border image. A quarter-border
    // inset puts a bird below the stone overhang instead of on its exposed edge.
    return {left:box.left - 1, right:box.right + 1, top:box.top + 1, bottom:box.bottom + 1, inner, box, widths};
  }

  function peekSurface(candidate, rect, point) {
    const {box, widths} = rect, horizontal = !!candidate.ny;
    // Stone panels paint their background through the border-image margin.
    // Every edge belongs to that full visible frame, including newly added slabs.
    // Recessed side menus retain their accepted painted-metal silhouette.
    if (!candidate.element.matches('.side-menu')) {
      const inset = {top:0, right:0, bottom:0, left:0};
      if (candidate.side === 'top') inset.bottom = layer.clientHeight - box.top;
      if (candidate.side === 'bottom') inset.top = box.bottom;
      if (candidate.side === 'left') inset.right = layer.clientWidth - box.left;
      if (candidate.side === 'right') inset.left = box.right;
      return {edge:box[candidate.side], clip:`inset(${inset.top}px ${inset.right}px ${inset.bottom}px ${inset.left}px)`};
    }
    if (!trimEdges) return null;
    const start = horizontal ? box.left : box.top, length = horizontal ? box.width : box.height;
    const before = horizontal ? widths[0] : widths[2], after = horizontal ? widths[1] : widths[3];
    const sourceLength = horizontal ? trimEdges.width : trimEdges.height;
    const border = widths[{left:0, right:1, top:2, bottom:3}[candidate.side]];
    const edgeAt = coordinate => {
      const position = Math.max(0, Math.min(length - .001, coordinate - start));
      const source = position < before ? position / before * 180 : position >= length - after ?
        sourceLength - 180 + (position - length + after) / after * 180 :
        180 + (position - before) / (length - before - after) * (sourceLength - 360);
      const inset = trimEdges[candidate.side][Math.min(sourceLength - 1, Math.floor(source))] * border / 180;
      return box[candidate.side] - (candidate.side === 'right' || candidate.side === 'bottom' ? inset : -inset);
    };
    const width = layer.clientWidth, height = layer.clientHeight;
    const key = [candidate.side, box.left, box.top, box.width, box.height, ...widths, width, height].join(',');
    if (peekMask?.element !== candidate.element || peekMask.key !== key) {
      const trace = [];
      const extent = horizontal ? width : height;
      for (let coordinate = 0; coordinate <= extent; coordinate++) {
        const edge = coordinate < start || coordinate > start + length ? rect[candidate.side] : edgeAt(coordinate);
        trace.push(horizontal ? `${coordinate}px ${edge}px` : `${edge}px ${coordinate}px`);
      }
      const outside = candidate.side === 'top' ? [`${width}px 0px`, '0px 0px'] :
        candidate.side === 'bottom' ? [`${width}px ${height}px`, `0px ${height}px`] :
        candidate.side === 'left' ? [`0px ${height}px`, '0px 0px'] : [`${width}px ${height}px`, `${width}px 0px`];
      peekMask = {element:candidate.element, key, clip:`polygon(${[...trace, ...outside].join(',')})`};
    }
    return {edge:edgeAt(horizontal ? point.x : point.y), clip:peekMask.clip};
  }

  function scene() {
    const frames = [...document.querySelectorAll('.masthead, .side-menu, .slab, .model-card, .post')]
      .map(element => ({element, rect:rectFor(element)})).filter(item => item.rect);
    const obstacles = [...document.querySelectorAll('.lowpolyworks-art, .chain, .masthead nav, #app .controls, #app button, #app input, #app select, .army-caption h2, .caption-meta, .card-text, .model-title h1, .model-title .byline, .tab-footer, .facts small, .facts strong, .mdlxl-identity, .mdlxl-download, .post-meta, .post-tags, .post-poll'), ...pictureSurfaces()]
      .map(element => {
        let rect = element.getBoundingClientRect();
        if (element.matches('.army-caption h2, .caption-meta, .model-title h1, .model-title .byline, .tab-footer, .facts small, .facts strong, .post-tags')) {
          const text = document.createRange(); text.selectNodeContents(element);
          rect = text.getBoundingClientRect();
        }
        const scrollPanel = element.closest('.tab-content');
        if (scrollPanel) {
          const clip = scrollPanel.getBoundingClientRect();
          const left = Math.max(rect.left, clip.left), right = Math.min(rect.right, clip.right);
          const top = Math.max(rect.top, clip.top), bottom = Math.min(rect.bottom, clip.bottom);
          rect = {left, right, top, bottom, width:Math.max(0, right-left), height:Math.max(0, bottom-top)};
        }
        return {left:rect.left, right:rect.right, top:rect.top, bottom:rect.bottom,
          width:rect.width, height:rect.height, element,
          text:element.matches('.army-caption h2, .caption-meta, .card-text, .model-title h1, .model-title .byline, .tab-footer, .facts small, .facts strong, .mdlxl-identity, .post-tags')};
      }).filter(rect => rect.width && rect.height);
    for (const element of document.querySelectorAll('.mdlxl-content h2, .mdlxl-content h3, .mdlxl-content p, .mdlxl-content li, .post h2, .post-body p, .post-body li, .post-link')) {
      const text = document.createRange(); text.selectNodeContents(element);
      obstacles.push(...[...text.getClientRects()].map(rect => ({left:rect.left, right:rect.right,
        top:rect.top, bottom:rect.bottom, text:true, element})));
    }
    return {frames, obstacles};
  }

  function pointFor(candidate, rect, position) {
    const boundary = candidate.inward ? rect.inner : rect;
    return {
      x:candidate.side === 'left' ? boundary.left : candidate.side === 'right' ? boundary.right : boundary.left + position,
      y:candidate.side === 'top' ? boundary.top : candidate.side === 'bottom' ? boundary.bottom : boundary.top + position,
    };
  }

  function clearAt(candidate, rect, position, surroundings) {
    const point = pointFor(candidate, rect, position);
    const walking = candidate.mode === 'walk';
    // Clearance follows the rendered body size, including head tilt and pecking.
    const x = point.x + (walking ? 0 : candidate.nx * 22 * bodyScale);
    const y = point.y + (walking ? -43 : candidate.ny * 22) * bodyScale;
    const halfWidth = (walking || candidate.ny ? 37 : 22) * bodyScale;
    const halfHeight = (walking ? 44 : candidate.ny ? 22 : 37) * bodyScale;
    const area = {left:x-halfWidth, right:x+halfWidth, top:y-halfHeight, bottom:y+halfHeight};
    if (candidate.element.matches('.masthead')) {
      const navigation = candidate.element.querySelector('nav');
      if (navigation && point.x < navigation.getBoundingClientRect().right + 16) return false;
    }
    if (!walking && !candidate.ny) {
      // The accepted maps exclude facing sides and keep only the lower outward
      // menu band. Centre-panel sides start below the neighbouring menu.
      if (candidate.element.matches('.side-menu')) {
        const rightMenu = candidate.element.matches('.side-right');
        if (candidate.side !== (rightMenu ? 'right' : 'left')) return false;
        if (rightMenu ? point.y < rect.top + 45 || point.y > rect.bottom - 25 :
          point.y < rect.bottom - 100 || point.y > rect.bottom - 22) return false;
      } else {
        const menu = surroundings.frames.find(item => item.element.matches(candidate.side === 'left' ? '.side-left' : '.side-right'));
        if (menu && point.y < menu.rect.bottom + 60) return false;
      }
    }
    if (surroundings.frames.some(item => item.element !== candidate.element && overlaps(area, item.rect, candidate.ny ? 0 : 8))) return false;
    if (area.left < 8 || area.right > layer.clientWidth - 8 || area.top < 8 || area.bottom > layer.clientHeight - 8) return false;
    if (Math.hypot(pointer.x - x, pointer.y - y) < (walking ? 200 : 135)) return false;
    if (surroundings.obstacles.some(rect => {
      if (walking && rect.text) return false;
      // The viewer's lower stone ledge is explicitly a walking platform in the
      // accepted map; its own control panel does not cancel that platform.
      if (walking && candidate.inward && candidate.element.matches('.viewer') &&
        rect.element?.closest('.controls') && candidate.element.contains(rect.element)) return false;
      return overlaps(area, rect, walking && candidate.inward ? 10 : 4);
    })) return false;
    return true;
  }

  function perches(surroundings) {
    const choices = [];
    for (const {element, rect} of surroundings.frames) {
      if (rect.bottom < 0 || rect.top > innerHeight) continue;
      const style = getComputedStyle(element);
      // Thin news separators and inset lines are not stone platforms.
      const framedEdges = edges.filter(edge => parseFloat(style[`border${edge.side[0].toUpperCase()+edge.side.slice(1)}Width`]) >= 8);
      // Arrows authorize outside peeks; boxes authorize walks. No inner-lip peeks.
      let peekEdges = framedEdges;
      if (element.matches('.masthead')) peekEdges = framedEdges.filter(edge => edge.side === 'bottom');
      else if (element.matches('.side-menu')) peekEdges = framedEdges.filter(edge => edge.side === (element.matches('.side-right') ? 'right' : 'left'));
      else if (element.matches('.mdlxl-content')) peekEdges = framedEdges.filter(edge => edge.side === 'top');
      const candidates = peekEdges.map(edge => ({...edge, element, mode:'peek', inward:false}));
      if (!element.matches('.side-menu, .mdlxl-content') && framedEdges.some(edge => edge.side === 'bottom')) {
        candidates.push({...edges[2], element, mode:'walk', inward:true, ny:-1, turn:0});
      }
      if (!element.matches('.masthead, .side-menu') && framedEdges.some(edge => edge.side === 'top')) {
        candidates.push({...edges[0], element, mode:'walk', inward:false});
      }
      for (const candidate of candidates) {
        const boundary = candidate.inward ? rect.inner : rect;
        const length = candidate.ny ? boundary.right - boundary.left : boundary.bottom - boundary.top;
        let first = null, end = null;
        const finish = () => {
          if (first !== null && end - first >= (candidate.mode === 'walk' ? 140 : 12)) choices.push({...candidate, min:first, max:end});
          first = end = null;
        };
        // Sampling finds clear stretches; the actual starting position is continuous and random.
        for (let position = 44 * bodyScale; position <= length - 44 * bodyScale; position += 12) {
          if (clearAt(candidate, rect, position, surroundings)) { if (first === null) first = position; end = position; }
          else finish();
        }
        finish();
      }
    }
    return choices;
  }

  function choose(now, requestedMode, arrival = null) {
    const choices = perches(scene());
    if (!choices.length) { next = now + 250; return; }
    // Each group of visits includes both behaviors, without fixing their order.
    if (!visitModes.length) visitModes.push('peek', 'peek', 'walk');
    const mode = arrival ? 'walk' : requestedMode || visitModes.splice(Math.floor(Math.random() * visitModes.length), 1)[0];
    let eligible = choices.filter(choice => choice.mode === mode);
    if (arrival && !eligible.length) { next = now + 250; return; }
    if (!eligible.length) eligible = choices;
    // Choose the page region first: extra card edges must not crowd out the menus.
    const regionFor = choice => choice.element.matches('.masthead') ? 'header' :
      choice.element.matches('.side-left') ? 'left-menu' :
      choice.element.matches('.side-right') ? 'right-menu' :
      choice.element.matches('.side-menu') ? 'menu' : 'cards';
    const regions = [...new Set(eligible.map(regionFor))];
    const fewest = Math.min(...regions.map(region => regionVisits.get(region) || 0));
    const freshRegions = regions.filter(region => (regionVisits.get(region) || 0) === fewest);
    const region = freshRegions[Math.floor(Math.random() * freshRegions.length)];
    eligible = eligible.filter(choice => regionFor(choice) === region);
    const fresh = eligible.filter(choice => choice.element !== previousElement);
    if (fresh.length) eligible = fresh;
    perch = eligible[Math.floor(Math.random() * eligible.length)];
    regionVisits.set(region, (regionVisits.get(region) || 0) + 1);
    previousElement = perch.element;
    offset = between(perch.min, perch.max); direction = Math.random() < .5 ? -1 : 1;
    if (perch.mode === 'walk') {
      const margin = (perch.max - perch.min) * .35;
      offset = between(perch.min + margin, perch.max - margin);
      direction = offset < (perch.min + perch.max) / 2 ? 1 : -1;
    }
    const selectedRect = rectFor(perch.element);
    perchSize = [selectedRect.box.width, selectedRect.box.height, layer.clientWidth, layer.clientHeight].join(',');
    lastWalkPoint = null;
    paintedPoint = null;
    phase = perch.mode; started = now;
    // Preserve the current published 25% find on either kind of visit.
    peanutRollAt = now + 1400;
    backOffUntil = 0;
    deadline = now + between(16000, 22000);
    // Walking visits fly to the platform before showing the standing body.
    // A new peek starts with a visible crown, so the cooldown includes its entrance.
    exposure = fromExposure = perch.mode === 'walk' ? footOffset : -17 * bodyScale;
    actionAge = 0; peck = Math.random() < .55;
    speed = steps = 0; escapeSpeed = 420; pauseAt = now + between(3500, 5500); pauseUntil = hurryUntil = chasedUntil = 0; dive = null;
    if (perch.mode === 'walk' || arrival) {
      const point = pointFor(perch, rectFor(perch.element), offset);
      const end = perch.mode === 'walk' ? {x:point.x, y:point.y-footOffset} :
        {x:point.x+perch.nx*10*bodyScale, y:point.y+perch.ny*10*bodyScale};
      const x = arrival?.from?.x ?? (direction > 0 ? 0 : layer.clientWidth);
      const y = arrival?.from?.y ?? Math.max(100, Math.min(layer.clientHeight - 100, end.y - 180));
      flight = {x, y, following:!!arrival, duration:Math.max(900, Math.hypot(end.x - x, end.y - y) / 420 * 1000)};
      phase = 'arrive';
    }
    return true;
  }

  function rest(now) {
    // A follow flight whose landing surface vanished (the new view is still rendering) tries again.
    if (phase === 'arrive' && flight?.following) {
      const from = paintedPoint ? {...paintedPoint} : {x:flight.x, y:flight.y};
      if (holding()) follow = {from};
      else resumeFrom = from;
    }
    phase = 'rest'; bird.style.visibility = 'hidden'; dive = attack = null;
    if (peanut?.state === 'carried') peanut = null;
    if (isFree(peanut)) peanut.contested = false;
    beakPeanut.style.display = 'none';
    // Draw a fresh cooldown only after this visit has disappeared. Food left lying around brings him back sooner.
    next = follow || resumeFrom ? now : now + (isFree(peanut) ? between(2500, 4000) : between(8000, 12000));
  }

  function change(nextPhase, now) {
    fromExposure = exposure; phase = nextPhase; started = now;
  }

  function track(event) {
    if (event.pointerType === 'touch') return;
    const now = performance.now(), x = event.clientX, y = event.clientY;
    const elapsed = now - pointer.sampled, recent = pointer.sampled && elapsed < THROW_PAUSE;
    const distance = Math.hypot(x - pointer.x, y - pointer.y);
    pointer.speed = recent && elapsed > 0 ? Math.min(3000, distance * 1000 / elapsed) : 0;
    if (distance > 2) pointer.moved = now;
    if (distance > 0) {
      // A pause starts a new gesture; otherwise the previous sample anchors this one.
      if (!recent) throwSamples.length = 0;
      else if (!throwSamples.length) throwSamples.push({x:pointer.x, y:pointer.y, time:pointer.sampled});
      throwSamples.push({x, y, time:now});
      while (throwSamples.length > 1 && throwSamples[1].time <= now - THROW_WINDOW) throwSamples.shift();
      const first = throwSamples[0], dx = x - first.x, dy = y - first.y, motion = Math.hypot(dx, dy);
      // Tiny adjustments and closely spaced events should not become full-power throws.
      const measured = motion >= MIN_THROW_MOTION ? Math.min(MAX_THROW_SPEED, motion * 1000 / Math.max(24, now - first.time)) : 0;
      const strength = measured * clamp((measured - GENTLE_SPEED) / (FULL_THROW_SPEED - GENTLE_SPEED), 0, 1);
      pointer.vx = motion ? dx / motion * strength : 0;
      pointer.vy = motion ? dy / motion * strength : 0;
      pointer.velocityAt = now;
    }
    pointer.sampled = now;
    pointer.x = x; pointer.y = y;
  }
  function leave() {
    pointer.x = pointer.y = -10000;
    pointer.speed = pointer.sampled = pointer.vx = pointer.vy = pointer.velocityAt = 0;
    throwSamples.length = 0;
  }
  window.addEventListener('pointermove', track, {passive:true});
  window.addEventListener('pointerdown', grabOrDrop, true);
  window.addEventListener('click', consumeFoodClick, true);
  window.addEventListener('hashchange', followMenu);
  window.addEventListener('lowpolyworks:bird-attack', birdAttack);
  if (peanutTest) window.addEventListener('keydown', testPeanut);
  document.addEventListener('pointerleave', leave);

  // Relaxed walking uses the dive at either end of a ledge, including inward rails.
  function startDive(point, now) {
    dive = {x:point.x, y:point.y - footOffset, dir:offset >= perch.max ? 1 : -1};
    direction = dive.dir; phase = 'dive'; started = now;
  }
  // Look over the edge and hop off, plummet with wings tucked, snap them open, then fly away.
  function paintDive(now) {
    const age = now - started, {dir} = dive;
    layer.style.clipPath = 'none';
    if (age < DIVE_START.duration) {
      const {column} = frameOf(DIVE_START, age);
      paint(dive.x + dir * Math.max(0, column - 3) * 3, dive.y, DIVE_START.row, column, 0, false, dir < 0, 'moves');
      return;
    }
    const t = (age - DIVE_START.duration) / 1000, x0 = dive.x + dir * 12, y0 = dive.y - 20;
    const fallY = y0 + DIVE_GRAVITY * DIVE_FALL * DIVE_FALL / 2;
    if (t < DIVE_FALL) {
      paint(x0 + dir * 90 * t, y0 + DIVE_GRAVITY * t * t / 2, 0, Math.floor(t * 1000 / 90) % 3, 0, false, false, 'dive');
    } else if (t < DIVE_FALL + DIVE_PULL) {
      const p = (t - DIVE_FALL) / DIVE_PULL;
      paint(x0 + dir * (90 * DIVE_FALL + 200 * (t - DIVE_FALL)), fallY + 18 * Math.sin(p * Math.PI), 0, p < .26 ? 3 : p < .57 ? 4 : 5, 0, false, false, 'dive');
    } else {
      // The ordinary flight cycle takes over and carries him off screen.
      takeOff({x:x0 + dir * (90 * DIVE_FALL + 200 * DIVE_PULL), y:fallY + footOffset}, now);
      paintFlight(now);
      return;
    }
    if (paintedPoint.y - bodyHeight > layer.clientHeight) rest(now);
  }

  // Bird Attack: from wherever he is, he gets into position on a random heading and dives straight through the unit:
  // down, up from below, across, or anything between. A visible bird flies to the launch point first;
  // an absent one starts the dive just off screen along that heading.
  function birdAttack(event) {
    const {element, onHit} = event.detail || {};
    if (!element?.isConnected || !art.complete || !flightArt.complete || !diveImage.complete) return;
    event.preventDefault();
    const now = performance.now(), heading = between(-Math.PI, Math.PI);
    const visible = phase !== 'rest' && bird.style.visibility === 'visible' && paintedPoint;
    if (peanut?.state === 'carried') peanut = null;
    follow = resumeFrom = dive = null; beakPeanut.style.display = 'none';
    // ux, uy: unit vector of his travel through the unit.
    attack = {element, onHit, ux:Math.sin(heading), uy:Math.cos(heading), hit:false, from:visible ? {...paintedPoint} : null};
    direction = attack.ux < 0 ? -1 : 1; phase = 'attack'; started = now;
  }
  function attackPath() {
    const box = attack.element.getBoundingClientRect(), {ux, uy} = attack;
    const target = {x:box.left + box.width / 2, y:box.top + box.height * ATTACK_AIM};
    // Back along the heading to the nearest screen edge, plus a body so he starts unseen.
    const exit = (position, size, unit) => unit > 0 ? Math.max(0, position) / unit : unit < 0 ? Math.max(0, size - position) / -unit : Infinity;
    const rise = attack.from ? ATTACK_RISE :
      Math.min(exit(target.x, layer.clientWidth, ux), exit(target.y, layer.clientHeight, uy)) + bodyHeight;
    return {target, launch:{x:target.x - ux * rise, y:target.y - uy * rise}};
  }
  function paintAttack(now) {
    layer.style.clipPath = 'none';
    if (!attack.element.isConnected) { takeOff({x:paintedPoint?.x ?? 0, y:(paintedPoint?.y ?? 0) + footOffset}, now, true); return; }
    const {target, launch} = attackPath();
    let age = now - started;
    if (attack.from) {
      const climb = Math.max(350, Math.hypot(launch.x - attack.from.x, launch.y - attack.from.y) / 900 * 1000);
      if (age < climb) {
        direction = launch.x >= attack.from.x ? 1 : -1;
        paint(mix(attack.from.x, launch.x, age / climb), mix(attack.from.y, launch.y, age / climb),
          Math.floor(age / 90) % 8 >= 4 ? 1 : 0, Math.floor(age / 90) % 4, 0, true);
        return;
      }
      age -= climb;
    }
    const {ux, uy} = attack;
    direction = ux < 0 ? -1 : 1;
    const t = age / 1000, length = Math.hypot(target.x - launch.x, target.y - launch.y);
    const travel = ATTACK_SPEED * t + ATTACK_PUSH * t * t / 2;
    if (!attack.hit && travel >= length) { attack.hit = true; attack.onHit?.(); attack.through = t; }
    // Tucked cells already lean 25° towards his heading; turn the rest of the way.
    const turn = direction * 25 - Math.atan2(ux, uy) * 180 / Math.PI;
    const x = launch.x + ux * travel, y = launch.y + uy * travel;
    const after = attack.hit ? t - attack.through : 0;
    if (after < ATTACK_FOLLOW) { paint(x, y, 0, Math.floor(t * 1000 / 70) % 3, turn, false, false, 'dive'); return; }
    // Snap the wings open beyond the unit, braking, as at the end of his ledge dive, and level out of the dive's tilt.
    const open = attack.through + ATTACK_FOLLOW, braking = Math.min(DIVE_PULL, after - ATTACK_FOLLOW), p = braking / DIVE_PULL;
    const reach = ATTACK_SPEED * open + ATTACK_PUSH * open * open / 2 + (ATTACK_SPEED + ATTACK_PUSH * open) * braking * (1 - p / 2);
    const bx = launch.x + ux * reach, by = launch.y + uy * reach;
    if (p < 1) { paint(bx, by, 0, p < .26 ? 3 : p < .57 ? 4 : 5, turn * (1 - ease(p)), false, false, 'dive'); return; }
    attack = null;
    takeOff({x:bx, y:by + footOffset}, now, true);
    paintFlight(now);
  }

  function rollForPeanut(now) {
    peanutRollAt = Infinity;
    if (!peanut && Math.random() < .25) spawnPeanut(now);
  }

  function spawnPeanut(now) {
    const width = foodLayer.clientWidth;
    const x = peanutTest && pointer.x >= 60 && pointer.x <= width - 60 ? pointer.x : between(60, Math.max(60, width - 60));
    peanut = {state:'falling', x, y:-24, vx:0, vy:85, angle:between(-30, 30), spin:between(-40, 40),
      ready:false, contested:false, broken:false};
    peanutRollAt = Infinity;
    if (phase === 'rest') { next = now; choose(now, 'peek'); }
  }

  // A hand reaching for his food sends him away from it.
  function fleeFromGrab(now) {
    const flyFrom = point => {
      direction = pointer.x < point.x ? 1 : -1;
      takeOff({x:point.x, y:point.y + footOffset}, now, true);
    };
    if (phase === 'chase') flyFrom(chasePoint);
    else if ((phase === 'walk' || phase === 'arrive') && paintedPoint) flyFrom(paintedPoint);
    else if (phase === 'peek') change('duck', now);
  }

  function grab() {
    played('grab');
    peanut.state = 'held'; peanut.contested = false;
    peanut.x = pointer.x + HAND.x; peanut.y = pointer.y + HAND.y;
  }

  // A click at the same position must retain the preceding mouse movement.
  const throwing = now => now - pointer.velocityAt < 250 && Math.hypot(pointer.vx, pointer.vy) > 10;

  function releasePeanut(now) {
    peanut.state = 'dropped'; peanut.x = pointer.x + HAND.x; peanut.y = pointer.y + HAND.y;
    const moving = throwing(now);
    peanut.vx = moving ? pointer.vx * THROW_BOOST : 0; peanut.vy = moving ? pointer.vy * THROW_BOOST : 85;
    peanut.spin = clamp(peanut.vx * SPIN_PER_SPEED, -MAX_SPIN, MAX_SPIN);
    peanut.ready = true; peanut.contested = false;
    if (phase === 'rest') chaseFromOffscreen(now);
    if (paintedPoint && ['peek', 'peek-hidden', 'duck', 'walk', 'arrive', 'fly'].includes(phase)) startChase(now);
  }

  function grabOrDrop(event) {
    track(event);
    swallowClickUntil = 0;
    if (event.button !== 0 || event.pointerType === 'touch' || !peanut) return;
    const now = performance.now();
    if (holding()) {
      // A still click on a menu link keeps the food in hand; the click handler follows it.
      // A flick throws wherever it is released, links included.
      if (!throwing(now) && navigationTarget(event) !== null) return;
      releasePeanut(now);
    } else if (isFree(peanut)) {
      const distance = Math.hypot(pointer.x - peanut.x, pointer.y - peanut.y);
      if (distance > SCARE_REACH) return;
      // A near miss is still a grab attempt: it scares him off this food.
      peanut.contested = true;
      fleeFromGrab(now);
      if (distance <= GRAB_REACH) grab();
    } else return;
    swallowClickUntil = now + 1000;
    event.preventDefault(); event.stopImmediatePropagation();
  }

  function consumeFoodClick(event) {
    if (performance.now() < swallowClickUntil) {
      swallowClickUntil = 0; event.preventDefault(); event.stopImmediatePropagation();
      return;
    }
    if (!holding() || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const destination = navigationTarget(event);
    if (destination !== null) {
      // Use the site's existing hash routes so the held food and visitor survive.
      event.preventDefault(); location.hash = destination;
    }
  }

  // The hash route for a same-site link, or null for anything that would leave this page.
  function navigationTarget(event) {
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || link.target && link.target !== '_self' ||
      link.getAttribute('aria-disabled') === 'true') return null;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return null;
    if (url.pathname === '/') return url.hash || '#feed';
    if (/^\/mdlxl\/?$/.test(url.pathname)) return url.hash || '#project/mdlxl';
    const model = url.pathname.match(/^\/model\/([a-z0-9-]+)\/?$/);
    return model && !url.hash ? '#model/' + model[1] : null;
  }

  function followMenu() {
    if (!holding()) return;
    played('follow');
    follow = {from:bird.style.visibility === 'visible' && paintedPoint ? {...paintedPoint} : null};
    next = performance.now();
  }

  function breakShell() {
    peanut.broken = true;
    for (const side of [-1, 1]) {
      const fragment = document.createElement('div');
      fragment.className = 'menu-peanut-shell-fragment ' + (side < 0 ? 'shell-left' : 'shell-right');
      fragment.style.transform = `translate(${peanut.x-16}px, ${peanut.y-10}px)`;
      foodLayer.append(fragment);
      shellFragments.push({element:fragment, x:peanut.x, y:peanut.y, side, age:0});
    }
    peanut.vx *= .35; peanut.vy = -80;
  }

  function tickShells(dt) {
    for (let i = shellFragments.length - 1; i >= 0; i--) {
      const fragment = shellFragments[i]; fragment.age += dt / 1000;
      const t = fragment.age;
      if (t >= .5) { fragment.element.remove(); shellFragments.splice(i, 1); continue; }
      fragment.element.style.opacity = String(1 - t / .5);
      fragment.element.style.transform = `translate(${fragment.x-16+fragment.side*85*t}px, ${fragment.y-10-80*t+350*t*t}px) rotate(${fragment.side*(25+100*t)}deg)`;
    }
  }

  function testPeanut(event) {
    if (event.code !== 'KeyL' || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
      event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    const now = performance.now();
    if (holding()) releasePeanut(now);
    else if (!['chase', 'carry-land', 'carry'].includes(phase)) spawnPeanut(now);
  }

  function tickPeanut(dt) {
    tickShells(dt);
    if (!peanut) { food.style.display = 'none'; food.dataset.state = ''; return; }
    if (holding()) {
      if (pointer.x >= 0 && pointer.y >= 0) { peanut.x = pointer.x + HAND.x; peanut.y = pointer.y + HAND.y; }
    } else if (isFree(peanut)) {
      if (moveFood(peanut, dt / 1000, foodLayer.clientWidth, foodLayer.clientHeight)) {
        if (peanut.state === 'dropped') played('crack');
        breakShell();
      }
      if (peanut.y >= foodLayer.clientHeight / 2) peanut.ready = true;
      // Once the hand has moved away from contested food, he may try for it again.
      if (peanut.contested && Math.hypot(pointer.x - peanut.x, pointer.y - peanut.y) > CONTEST_CLEAR) peanut.contested = false;
    }
    food.dataset.state = peanut.state;
    food.dataset.broken = String(peanut.broken);
    food.style.display = peanut.state === 'carried' ? 'none' : 'block';
    food.style.transform = `translate(${peanut.x - 36}px, ${peanut.y - 36}px) rotate(${peanut.angle.toFixed(1)}deg)`;
  }

  function startChase(now) {
    if (!paintedPoint || !peanut || peanut.state === 'held' || peanut.state === 'carried') return;
    chasePoint = {...paintedPoint}; phase = 'chase'; started = now;
    layer.style.clipPath = 'none';
  }

  // While he is away he has no position on screen, so he flies in from the side nearer the food.
  function chaseFromOffscreen(now) {
    const fromLeft = peanut.x < layer.clientWidth / 2;
    paintedPoint = {x:fromLeft ? -bodyWidth : layer.clientWidth + bodyWidth, y:Math.max(bodyHeight, peanut.y - 220)};
    direction = fromLeft ? 1 : -1;
    startChase(now);
  }

  function paintChase(now, dt) {
    const carrying = phase === 'carry-land';
    if (!carrying && Math.abs(peanut.x - chasePoint.x) > 46) direction = peanut.x > chasePoint.x ? 1 : -1;
    const target = carrying ? {x:chasePoint.x, y:layer.clientHeight - footOffset - 3} :
      {x:peanut.x - direction * 43, y:peanut.y + 2};
    const dx = target.x - chasePoint.x, dy = target.y - chasePoint.y, distance = Math.hypot(dx, dy);
    const movement = Math.min(distance, (carrying ? 760 : 680) * dt / 1000);
    if (distance) { chasePoint.x += dx / distance * movement; chasePoint.y += dy / distance * movement; }
    const age = now - started;
    layer.style.clipPath = 'none';
    paint(chasePoint.x, chasePoint.y, Math.floor(age / 100) % 8 >= 4 ? 1 : 0, Math.floor(age / 100) % 4, 0, true);
    if (distance - movement <= 12) {
      if (carrying) { phase = 'carry'; started = now; steps = 0; direction = chasePoint.x < layer.clientWidth / 2 ? -1 : 1; }
      else {
        if (peanut.state === 'dropped') played('feed');
        peanut.state = 'carried'; phase = 'carry-land'; started = now;
      }
    }
  }

  function paintCarry(now, dt) {
    const movement = 620 * dt / 1000;
    chasePoint.x += direction * movement; steps += movement;
    layer.style.clipPath = 'none';
    paint(chasePoint.x, layer.clientHeight - footOffset - 3, direction < 0 ? 2 : 1, Math.floor(steps / 6) % 8);
    if (chasePoint.x < -bodyWidth || chasePoint.x > layer.clientWidth + bodyWidth) rest(now);
  }

  // Use the authored looking frames, in the local coordinates of each peek edge.
  function peanutLook(point, turn, peekSide = null) {
    const angle = turn * Math.PI / 180, dx = peanut.x - point.x, dy = peanut.y - point.y;
    const x = dx * Math.cos(angle) + dy * Math.sin(angle), y = -dx * Math.sin(angle) + dy * Math.cos(angle);
    if (peekSide === 'left' || peekSide === 'right') {
      // Keep the side-peek style, with the authored head tilt facing the food.
      if (y < -Math.abs(x) * .55 - 35) return {row:9, column:x < 0 ? 1 : 3, mirrored:x < 0};
      if (y > Math.abs(x) * .55 + 35) return {row:10, column:2, mirrored:x > 0};
      return {row:6, column:x < 0 ? 1 : 4, mirrored:false};
    }
    if (peekSide) {
      // A mild authored head tilt, including when the bottom-edge peek is inverted.
      if (y < -Math.abs(x) * .55 - 35) return {row:10, column:7, mirrored:x > 0};
      if (y > Math.abs(x) * .55 + 35) return {row:9, column:5, mirrored:x < 0};
      return {row:6, column:x < 0 ? 1 : 4, mirrored:false};
    }
    // The centre frames look straight up/down. Row 9's angled frames all
    // face right, so mirror the same authored pose when the food is to the left.
    if (Math.abs(x) <= 24 && Math.abs(y) > 40) return {row:y < 0 ? 9 : 10, column:0, mirrored:false};
    if (y < -Math.abs(x) * .55 - 35) return {row:9, column:1, mirrored:x < 0};
    if (y > Math.abs(x) * .55 + 35) return {row:9, column:7, mirrored:x < 0};
    return {row:9, column:4, mirrored:x < 0};
  }

  function hungryMovement(point, rect, now, dt, walking) {
    const center = walking ? {x:point.x, y:point.y - footOffset} :
      {x:point.x + perch.nx * exposure, y:point.y + perch.ny * exposure};
    const distance = Math.hypot(pointer.x - center.x, pointer.y - center.y);
    const boundary = perch.inward ? rect.inner : rect;
    const coordinate = perch.ny ? peanut.x - boundary.left : peanut.y - boundary.top;
    const away = (perch.ny ? pointer.x < center.x : pointer.y < center.y) ? 1 : -1;
    if (distance < 52) {
      if (walking) { direction = away; takeOff(point, now, true); }
      else change('duck', now);
      return;
    }
    if (distance < 115 && now >= backOffUntil) {
      backOffTarget = Math.max(perch.min, Math.min(perch.max, offset + away * 65));
      backOffUntil = now + 850;
    }
    const desired = now < backOffUntil ? backOffTarget : Math.abs(coordinate - offset) <= 165 ? offset :
      Math.max(perch.min, Math.min(perch.max, coordinate - Math.sign(coordinate - offset) * 165));
    const gap = desired - offset;
    // Approach in small steps, then stay outside the hand's reach.
    const target = now < backOffUntil ? Math.sign(gap) * Math.min(105, Math.abs(gap) * 3) :
      distance > 175 ? Math.sign(gap) * Math.min(32, Math.abs(gap) * 2) : 0;
    speed += (target - speed) * (1 - Math.exp(-dt / 130));
    const movement = speed * dt / 1000;
    offset = Math.max(perch.min, Math.min(perch.max, offset + movement)); steps += Math.abs(movement);
    if (Math.abs(speed) > 2) direction = Math.sign(speed);
  }

  function pose(age) {
    if (peck && age >= 7200 && age < 9300) {
      const tap = (age - 7200) % 1100, dip = tap < 650 ? Math.sin(tap / 650 * Math.PI) : 0;
      return {row:dip > .7 ? 10 : 0, column:dip > .7 ? 0 : dip > .15 ? 3 : 0, dip};
    }
    if (peck && age >= 9300 && age < 10300) return {row:8, column:3, dip:0};
    if (age >= 2600 && age < 5200) return {row:10, column:4, dip:0};
    if (age >= 5200 && age < 7200) return {row:9, column:4, dip:0};
    return {row:0, column:Math.floor(age / 440) % 6, dip:0};
  }

  function paint(x, y, row, column, turn = 0, flying = false, mirroredLook = false, moveArt = null) {
    paintedPoint = {x, y};
    const flightCell = flying || moveArt === 'dive';
    const mirroredWalk = !flightCell && !moveArt && row === 2;
    const groundedLook = !flightCell && !moveArt && phase === 'walk' && (row === 9 || row === 10);
    bird.style.visibility = phase === 'rest' || phase === 'peek-hidden' ? 'hidden' : 'visible';
    bird.style.transform = `translate(${x - bodyWidth / 2}px, ${y - bodyHeight / 2}px) rotate(${turn}deg)`;
    const image = moveArt === 'dive' ? diveImage : flying ? flightArt : moveArt === 'moves' ? movesImage : art;
    if (!image.complete || !image.naturalWidth) return;
    const key = moveArt || (flying ? 'flight' : 'standing');
    const facing = flightCell ? direction : mirroredWalk || mirroredLook ? -1 : 1;
    const cellWidth = flightCell ? 240 : 192, cellHeight = flightCell ? 240 : 208;
    const sourceRow = mirroredWalk ? 1 : row;
    nextInk.setTransform(1, 0, 0, 1, 0, 0);
    nextInk.clearRect(0, 0, incoming.width, incoming.height);
    const density = incoming.width / flightSize;
    nextInk.setTransform(density, 0, 0, density, 120 * flightScale * density, 101 * flightScale * density);
    nextInk.save();
    if (groundedLook) {
      // Preserve the accepted walking gaze scale and foot rail.
      const feet = row === 9 ? 169 : 170;
      nextInk.translate(0, 197 / 208 * bodyHeight - bodyHeight / 2);
      nextInk.scale(1.1 * facing, 1.1);
      nextInk.drawImage(image, column * cellWidth, sourceRow * cellHeight, cellWidth, cellHeight,
        -bodyWidth / 2, -feet / 208 * bodyHeight, bodyWidth, bodyHeight);
    } else {
      nextInk.scale(facing, 1);
      nextInk.drawImage(image, column * cellWidth, sourceRow * cellHeight, cellWidth, cellHeight,
        flightCell ? -120 * flightScale : -bodyWidth / 2,
        flightCell ? -101 * flightScale : -bodyHeight / 2,
        flightCell ? flightSize : bodyWidth, flightCell ? flightSize : bodyHeight);
    }
    nextInk.restore();
    const now = performance.now();
    if (paintedSheet && key !== paintedSheet &&
        ([key, paintedSheet].some(name => name === 'moves' || name === 'dive'))) {
      oldInk.clearRect(0, 0, outgoing.width, outgoing.height);
      oldInk.drawImage(picture, 0, 0);
      joinStarted = now;
    }
    paintedSheet = key;
    const blend = ease((now - joinStarted) / 120);
    ink.clearRect(0, 0, picture.width, picture.height);
    ink.globalAlpha = blend;
    ink.drawImage(incoming, 0, 0);
    if (blend < 1) {
      // Add premultiplied colours: ordinary source-over fades darken the overlap.
      ink.globalCompositeOperation = 'lighter';
      ink.globalAlpha = 1 - blend;
      ink.drawImage(outgoing, 0, 0);
    }
    ink.globalAlpha = 1; ink.globalCompositeOperation = 'source-over';
    // One carrying variant: the original walking/flight frame with a kernel at its beak.
    const carrying = peanut?.state === 'carried';
    beakPeanut.dataset.broken = String(Boolean(peanut?.broken));
    beakPeanut.style.display = carrying ? 'block' : 'none';
    if (carrying) {
      const facing = flying ? direction : mirroredWalk ? -1 : 1;
      beakPeanut.style.left = `${bodyWidth / 2 + facing * (flying ? 43 : 32)}px`;
      beakPeanut.style.top = `${bodyHeight / 2 - (flying ? 2 : 9)}px`;
    }
  }

  function takeOff(point, now, urgent = false) {
    flight = {x:point.x, y:point.y - footOffset, speed:Math.max(urgent ? 720 : 420, Math.abs(speed)), lift:urgent ? 420 : 200};
    phase = 'fly'; started = now;
  }

  function paintFlight(now) {
    const t = (now - started) / 1000;
    layer.style.clipPath = 'none';
    paint(flight.x + direction * (flight.speed*t + 240*t*t), flight.y - flight.lift*t - 280*t*t,
      Math.floor(t * 1000 / 120) % 8 >= 4 ? 1 : 0, Math.floor(t * 1000 / 120) % 4, 0, true);
    const bounds = picture.getBoundingClientRect();
    if (bounds.right <= 0 || bounds.left >= layer.clientWidth || bounds.bottom <= 0 || bounds.top >= layer.clientHeight || t >= 2.8) rest(now);
  }

  function paintArrival(now) {
    const rect = rectFor(perch.element);
    if (!rect) { rest(now); return; }
    const point = pointFor(perch, rect, offset), age = now - started;
    const end = perch.mode === 'walk' ? {x:point.x, y:point.y-footOffset} :
      {x:point.x+perch.nx*10*bodyScale, y:point.y+perch.ny*10*bodyScale};
    const progress = Math.min(1, age / flight.duration);
    if (progress >= 1) {
      phase = perch.mode; deadline += age; pauseAt += age; started = now;
      return;
    }
    layer.style.clipPath = 'none';
    const walkDirection = direction; direction = end.x >= flight.x ? 1 : -1;
    paint(mix(flight.x, end.x, progress), mix(flight.y, end.y, progress) - Math.sin(progress * Math.PI) * 60,
      Math.floor(age / 120) % 8 >= 4 ? 1 : 0, Math.floor(age / 120) % 4, 0, true);
    direction = walkDirection;
  }

  function tick(now) {
    const dt = Math.min(40, now - last); last = now;
    tickPeanut(document.hidden ? 0 : dt);
    const canAppear = !document.hidden && now >= next && art.complete && art.naturalWidth && flightArt.complete && flightArt.naturalWidth;
    if (follow && !holding()) follow = null;
    // Following food into a new view: fly there from wherever he is, retrying until it has a perch.
    if (follow && canAppear && phase !== 'attack') {
      if (choose(now, 'walk', follow)) follow = null;
    }
    if (phase === 'rest' && canAppear && !follow) {
      if (isFree(peanut) && peanut.ready && !peanut.contested) chaseFromOffscreen(now);
      else {
        // After a page change he flies over from where he was on the previous page.
        if (choose(now, peanut && !holding() ? 'peek' : undefined, resumeFrom && {from:resumeFrom})) resumeFrom = null;
      }
    }
    if ((phase === 'peek' || phase === 'walk') && now >= peanutRollAt) rollForPeanut(now);
    if (isFree(peanut) && peanut.ready && !peanut.contested &&
      ['peek', 'walk', 'peek-hidden', 'duck', 'arrive'].includes(phase)) startChase(now);
    if (phase === 'peek' || phase === 'peek-hidden' || phase === 'walk' || phase === 'arrive') {
      const rect = rectFor(perch.element);
      if (rect) {
        const size = [rect.box.width, rect.box.height, layer.clientWidth, layer.clientHeight].join(',');
        if (size !== perchSize) {
          perchSize = size;
          // Reuse the same shared rules after responsive/content resizing.
          // Scrolling alone keeps the visit attached to its original surface.
          const valid = perches(scene()).find(c => c.element === perch.element && c.mode === perch.mode &&
            c.side === perch.side && c.inward === perch.inward && offset >= c.min && offset <= c.max);
          if (valid) { perch.min = valid.min; perch.max = valid.max; }
          else if (phase === 'walk' && lastWalkPoint) takeOff(lastWalkPoint, now);
          else rest(now);
        }
      }
    }
    if (phase === 'arrive') paintArrival(now);
    if (phase === 'chase' || phase === 'carry-land') {
      paintChase(now, dt);
    } else if (phase === 'carry') {
      paintCarry(now, dt);
    } else if (phase === 'fly') {
      paintFlight(now);
    } else if (phase === 'dive') {
      paintDive(now);
    } else if (phase === 'attack') {
      paintAttack(now);
    } else if (phase !== 'rest' && phase !== 'arrive') {
      const rect = rectFor(perch.element);
      // Existing visits stay attached to their host even when scrolled out of view.
      // Viewport and obstacle checks belong to spawning, not scrolling.
      if (!rect) rest(now);
      else {
        let point = pointFor(perch, rect, offset), row = 0, column = 0, turn = perch.turn, mirroredLook = false;
        const head = {x:point.x + perch.nx * 28 * bodyScale, y:point.y + perch.ny * 28 * bodyScale};
        const distance = Math.hypot(pointer.x - head.x, pointer.y - head.y);
        const inView = head.x >= 0 && head.x <= layer.clientWidth && head.y >= 0 && head.y <= layer.clientHeight;
        const freePeanut = isFree(peanut) && !peanut.contested;
        const heldPeanut = holding();
        const near = inView && distance < 88 && !freePeanut;
        if (phase === 'walk') {
          exposure = footOffset;
          const walkingDistance = inView ? Math.hypot(pointer.x - point.x, pointer.y - (point.y - 44 * bodyScale)) : Infinity;
          const pointerSpeed = now - pointer.moved < 120 ? pointer.speed : 0;
          const walkingNear = walkingDistance < 180 + Math.min(140, pointerSpeed * .1);
          if (heldPeanut && now >= hurryUntil && now < deadline - 2500) {
            hungryMovement(point, rect, now, dt, true);
            point = pointFor(perch, rect, offset);
            if (Math.abs(speed) > 4) { row = speed < 0 ? 2 : 1; column = Math.floor(steps / 6) % 8; }
            else { const look = peanutLook({x:point.x, y:point.y - footOffset}, 0); row = look.row; column = look.column; mirroredLook = look.mirrored; }
          } else {
            if (walkingNear && !freePeanut) {
              direction = pointer.x < point.x ? 1 : -1;
              escapeSpeed = Math.max(420, Math.min(1200, pointerSpeed * 1.35 + 260));
              if (speed * direction < 360) speed = direction * 420;
              chasedUntil = now + 2000; hurryUntil = chasedUntil; pauseUntil = 0; pauseAt = now + 4000;
            }
            if (now >= deadline - 2500) {
              pauseUntil = 0; pauseAt = Infinity;
              if (!walkingNear) direction = offset - perch.min < perch.max - offset ? -1 : 1;
              const remaining = direction < 0 ? offset - perch.min : perch.max - offset;
              escapeSpeed = Math.max(420, remaining / Math.max(.1, (deadline - now) / 1000));
              hurryUntil = deadline + 3000;
            }
            if (now >= pauseAt && now >= hurryUntil && !pauseUntil) {
              // Half the stops are his usual look around; the rest lean once or twice.
              leanCycles = Math.random() < .5 ? (Math.random() < .5 ? 1 : 2) : 0;
              pauseStarted = now; pauseUntil = now + (leanCycles ? leanCycles * LEAN_TIME : between(1300, 1900));
            }
            if (pauseUntil && now >= pauseUntil) { pauseUntil = 0; pauseAt = now + between(3500, 5500); }
            const target = pauseUntil ? 0 : direction * (now < hurryUntil ? escapeSpeed : 30);
            speed += (target - speed) * (1 - Math.exp(-dt / (now < hurryUntil ? 35 : 130)));
            const movement = speed * dt / 1000;
            offset = clamp(offset + movement, perch.min, perch.max); steps += Math.abs(movement);
            point = pointFor(perch, rect, offset);
            if (pauseUntil && Math.abs(speed) < 4) {
              if (leanCycles) { row = 8; column = leanColumn(now - pauseStarted); }
              else { row = 5; column = Math.floor((now - pauseStarted) / 150) % 8; }
            }
            else { row = speed < 0 ? 2 : 1; column = Math.floor(steps / 6) % 8; }
            const atEnd = offset <= perch.min || offset >= perch.max;
            if ((!freePeanut && walkingDistance < 62) || atEnd) {
              const chased = (!freePeanut && walkingNear) || now < chasedUntil;
              if (atEnd && !chased) startDive(point, now);
              else takeOff(point, now, walkingDistance < 62);
            }
          }
        } else {
          if (phase === 'peek' && near && !heldPeanut) { change('duck', now); played('peek'); }
          if (now >= deadline && phase !== 'duck' && !freePeanut) change('duck', now);
          const age = now - started;
          if (phase === 'peek') {
            exposure = mix(fromExposure, 10 * bodyScale, age / 900);
            actionAge += dt;
            if (actionAge > 11500) { actionAge = 0; peck = Math.random() < .55; }
            if (heldPeanut) { hungryMovement(point, rect, now, dt, false); point = pointFor(perch, rect, offset); }
            const action = holding() || isFree(peanut) ?
              {...peanutLook({x:point.x + perch.nx * exposure, y:point.y + perch.ny * exposure}, turn, perch.side), dip:0} : pose(actionAge);
            row = action.row; column = action.column;
            mirroredLook = action.mirrored || false;
            turn += action.dip * 5;
            point.x -= perch.nx * action.dip * 4 * scale; point.y -= perch.ny * action.dip * 4 * scale;
          } else if (phase === 'duck') {
            exposure = mix(fromExposure, -72 * bodyScale, age / 180);
            if (exposure <= -36 * bodyScale || age >= 180) {
              if (now >= deadline) rest(now);
              else { exposure = -72 * bodyScale; change('peek-hidden', now); }
            }
          } else if (phase === 'peek-hidden' && !near && age >= 350) {
            // Mouse avoidance stays within this visit and never extends its deadline.
            change('peek', now);
          }
        }
        // Clip to this edge only, so a hidden body cannot leak through another side of a small panel.
        // Fixed layers exclude the scrollbar; window.innerWidth includes it.
        // Use the layer's own size so every mask meets its chosen trim exactly.
        const width = layer.clientWidth, height = layer.clientHeight;
        const mask = perch.inward ? {...rect.inner} : {left:0, right:width, top:0, bottom:height};
        if (!perch.inward) {
          if (perch.side === 'top') mask.bottom = rect.top;
          if (perch.side === 'bottom') mask.top = rect.bottom;
          if (perch.side === 'left') mask.right = rect.left;
          if (perch.side === 'right') mask.left = rect.right;
        }
        layer.style.clipPath = `inset(${mask.top}px ${width-mask.right}px ${height-mask.bottom}px ${mask.left}px)`;
        if (perch.mode === 'peek') {
          // Follow the painted stone silhouette, including its transparent outer
          // margin. Rectangular clipping leaves a visible strip beside the head.
          const surface = peekSurface(perch, rect, pointFor(perch, rect, offset));
          if (surface) {
            if (perch.ny) point.y += surface.edge - rect[perch.side];
            else point.x += surface.edge - rect[perch.side];
            layer.style.clipPath = surface.clip;
          }
        }
        if (phase === 'fly') paintFlight(now);
        else if (phase === 'dive') paintDive(now);
        else {
          if (phase === 'walk') lastWalkPoint = {x:point.x, y:point.y};
          paint(point.x + perch.nx * exposure, point.y + perch.ny * exposure, row, column, turn, false, mirroredLook);
        }
      }
    }
    bird.dataset.phase = phase;
    bird.dataset.mode = perch?.mode || '';
    frame = requestAnimationFrame(tick);
  }
  // Carry on across full page loads in this tab: save him on the way out and pick him up on the next page.
  function saveVisit() {
    const point = bird.style.visibility === 'visible' && paintedPoint ? {...paintedPoint} : null;
    const saved = {savedAt:Date.now(), phase, direction, point, peanut:peanut && {...peanut},
      restIn:phase === 'rest' ? Math.max(0, next - performance.now()) : null};
    try { sessionStorage.setItem(CARRY_OVER, JSON.stringify(saved)); } catch {}
  }
  function forgetVisit(event) { if (event.persisted) try { sessionStorage.removeItem(CARRY_OVER); } catch {} }
  function restoreVisit(now) {
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(CARRY_OVER) || 'null'); sessionStorage.removeItem(CARRY_OVER); } catch { return; }
    if (!saved || !(Date.now() - saved.savedAt < CARRY_OVER_MS)) return;
    const point = saved.point;
    if (['held', 'falling', 'dropped', 'carried'].includes(saved.peanut?.state)) peanut = {...saved.peanut, contested:false};
    if (peanut?.state === 'carried') {
      // Still carrying it away: finish the walk off with it.
      if (point) { chasePoint = {...point}; direction = saved.direction; phase = 'carry-land'; started = now; return; }
      peanut = null;
    }
    if (holding()) { follow = {from:point}; next = now; return; }
    if (point && isFree(peanut) && peanut.ready) { paintedPoint = {...point}; startChase(now); return; }
    if (point && ['peek', 'walk', 'arrive', 'chase'].includes(saved.phase)) { resumeFrom = point; next = now; return; }
    // Away, hiding, or leaving: keep his remaining wait.
    next = now + (saved.phase === 'rest' && saved.restIn !== null ? saved.restIn : between(3000, 6000));
  }
  window.addEventListener('pagehide', saveVisit);
  window.addEventListener('pageshow', forgetVisit);
  restoreVisit(performance.now());

  frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('pagehide', saveVisit); window.removeEventListener('pageshow', forgetVisit);
    window.removeEventListener('pointermove', track); window.removeEventListener('pointerdown', grabOrDrop, true);
    window.removeEventListener('click', consumeFoodClick, true);
    window.removeEventListener('hashchange', followMenu);
    window.removeEventListener('lowpolyworks:bird-attack', birdAttack);
    window.removeEventListener('keydown', testPeanut);
    document.removeEventListener('pointerleave', leave);
    layer.remove(); foodLayer.remove(); css.remove();
  };
}
