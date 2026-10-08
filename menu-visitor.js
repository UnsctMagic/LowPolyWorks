const sheet = new URL('./ui/visitor/0.png', import.meta.url).href;
const wings = new URL('./ui/visitor/1.png', import.meta.url).href;
const between = (low, high) => low + Math.random() * (high - low);
const ease = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * ease(t);
// Match the head/body across the two authored sprite sheets, excluding wings.
const bodyScale = 1.1, bodyWidth = 120 * bodyScale, bodyHeight = 130 * bodyScale;
const flightScale = .9, flightSize = 240 * flightScale, footOffset = 59.375 * bodyScale;
const scale = bodyWidth / 144;
const edges = [
  {side:'top', nx:0, ny:-1, turn:0},
  {side:'right', nx:1, ny:0, turn:90},
  {side:'bottom', nx:0, ny:1, turn:180},
  {side:'left', nx:-1, ny:0, turn:-90},
];
const overlaps = (a, b, pad = 0) => a.left < b.right + pad && a.right > b.left - pad &&
  a.top < b.bottom + pad && a.bottom > b.top - pad;

export function startMenuVisitor() {
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL('./menu-visitor.css', import.meta.url).href;
  document.head.append(css);
  const layer = document.createElement('div');
  layer.className = 'menu-visitor-layer'; layer.setAttribute('aria-hidden', 'true');
  const bird = document.createElement('div'); bird.className = 'menu-visitor';
  bird.style.width = `${bodyWidth}px`; bird.style.height = `${bodyHeight}px`;
  const picture = document.createElement('div'); picture.className = 'menu-visitor-frame';
  bird.append(picture); layer.append(bird); document.body.append(layer);
  const art = new Image(), flightArt = new Image(); art.src = sheet; flightArt.src = wings;
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
  const pointer = {x:-10000, y:-10000, moved:0, sampled:0, speed:0};
  let frame, phase = 'rest', perch, previousElement, started = 0, last = performance.now();
  let perchSize, lastWalkPoint;
  let next = last + between(8000, 12000), deadline = 0, exposure = -72 * bodyScale, fromExposure = -72 * bodyScale;
  let actionAge = 0, peck = false, offset = 0, direction = 1, speed = 0, steps = 0;
  let pauseAt = 0, pauseUntil = 0, pauseStarted = 0, hurryUntil = 0;
  let flight, escapeSpeed = 420;
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
    if (!walking && surroundings.frames.some(item => item.element !== candidate.element && overlaps(area, item.rect, candidate.ny ? 0 : 8))) return false;
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

  function choose(now) {
    const choices = perches(scene());
    if (!choices.length) { next = now + 250; return; }
    // Each group of visits includes both behaviors, without fixing their order.
    if (!visitModes.length) visitModes.push('peek', 'peek', 'walk');
    const mode = visitModes.splice(Math.floor(Math.random() * visitModes.length), 1)[0];
    let eligible = choices.filter(choice => choice.mode === mode);
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
    phase = perch.mode; started = now;
    deadline = now + between(16000, 22000);
    // Walking visits fly to the platform before showing the standing body.
    // A new peek starts with a visible crown, so the cooldown includes its entrance.
    exposure = fromExposure = perch.mode === 'walk' ? footOffset : -17 * bodyScale;
    actionAge = 0; peck = Math.random() < .55;
    speed = steps = 0; escapeSpeed = 420; pauseAt = now + between(3500, 5500); pauseUntil = hurryUntil = 0;
    if (perch.mode === 'walk') {
      const point = pointFor(perch, rectFor(perch.element), offset);
      const x = direction > 0 ? 0 : layer.clientWidth;
      const y = Math.max(100, Math.min(layer.clientHeight - 100, point.y - footOffset - 180));
      flight = {x, y, duration:Math.max(900, Math.hypot(point.x - x, point.y - footOffset - y) / 420 * 1000)};
      phase = 'arrive';
    }
  }

  function rest(now) {
    phase = 'rest'; bird.style.visibility = 'hidden';
    // Draw a fresh cooldown only after this visit has disappeared.
    next = now + between(8000, 12000);
  }

  function change(nextPhase, now) {
    fromExposure = exposure; phase = nextPhase; started = now;
  }

  function track(event) {
    if (event.pointerType === 'touch') return;
    const now = performance.now(), elapsed = now - pointer.sampled;
    const distance = Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y);
    pointer.speed = pointer.sampled && elapsed > 0 && elapsed < 180 ? Math.min(3000, distance * 1000 / elapsed) : 0;
    if (distance > 2) pointer.moved = now;
    pointer.sampled = now;
    pointer.x = event.clientX; pointer.y = event.clientY;
  }
  function leave() { pointer.x = pointer.y = -10000; pointer.speed = pointer.sampled = 0; }
  window.addEventListener('pointermove', track, {passive:true});
  window.addEventListener('pointerdown', track, {passive:true});
  document.addEventListener('pointerleave', leave);

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

  function paint(x, y, row, column, turn = 0, flying = false) {
    bird.style.visibility = phase === 'rest' || phase === 'peek-hidden' ? 'hidden' : 'visible';
    bird.style.transform = `translate(${x - bodyWidth / 2}px, ${y - bodyHeight / 2}px) rotate(${turn}deg)`;
    picture.style.backgroundImage = `url("${flying ? wings : sheet}")`;
    picture.style.backgroundSize = flying ? '400% 200%' : '800% 1100%';
    picture.style.width = picture.style.height = flying ? `${flightSize}px` : '100%';
    // Flight cells include the extended wings; the body retains its standing size and centre.
    picture.style.left = flying ? `${bodyWidth / 2 - 120 * flightScale}px` : '0';
    picture.style.top = flying ? `${bodyHeight / 2 - 101 * flightScale}px` : '0';
    picture.style.transform = flying ? `scaleX(${direction})` : 'none';
    picture.style.backgroundPosition = `${-column * (flying ? flightSize : bodyWidth)}px ${-row * (flying ? flightSize : bodyHeight)}px`;
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
    const progress = Math.min(1, age / flight.duration);
    if (progress >= 1) {
      phase = 'walk'; deadline += age; pauseAt += age; started = now;
      return;
    }
    layer.style.clipPath = 'none';
    paint(mix(flight.x, point.x, progress), mix(flight.y, point.y - footOffset, progress) - Math.sin(progress * Math.PI) * 60,
      Math.floor(age / 120) % 8 >= 4 ? 1 : 0, Math.floor(age / 120) % 4, 0, true);
  }

  function tick(now) {
    const dt = Math.min(40, now - last); last = now;
    if (!document.hidden && phase === 'rest' && now >= next && art.complete && art.naturalWidth && flightArt.complete && flightArt.naturalWidth) choose(now);
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
    if (phase === 'fly') {
      paintFlight(now);
    } else if (phase !== 'rest' && phase !== 'arrive') {
      const rect = rectFor(perch.element);
      // Existing visits stay attached to their host even when scrolled out of view.
      // Viewport and obstacle checks belong to spawning, not scrolling.
      if (!rect) rest(now);
      else {
        let point = pointFor(perch, rect, offset), row = 0, column = 0, turn = perch.turn;
        const head = {x:point.x + perch.nx * 28 * bodyScale, y:point.y + perch.ny * 28 * bodyScale};
        const distance = Math.hypot(pointer.x - head.x, pointer.y - head.y);
        const inView = head.x >= 0 && head.x <= layer.clientWidth && head.y >= 0 && head.y <= layer.clientHeight;
        const near = inView && distance < 88;
        if (phase === 'walk') {
          exposure = footOffset;
          const walkingDistance = inView ? Math.hypot(pointer.x - point.x, pointer.y - (point.y - 44 * bodyScale)) : Infinity;
          const pointerSpeed = now - pointer.moved < 120 ? pointer.speed : 0;
          const walkingNear = walkingDistance < 180 + Math.min(140, pointerSpeed * .1);
          {
            if (walkingNear) {
              direction = pointer.x < point.x ? 1 : -1;
              escapeSpeed = Math.max(420, Math.min(1200, pointerSpeed * 1.35 + 260));
              if (speed * direction < 360) speed = direction * 420;
              hurryUntil = now + 2000; pauseUntil = 0; pauseAt = now + 4000;
            }
            if (now >= deadline - 2500) {
              pauseUntil = 0; pauseAt = Infinity;
              if (!walkingNear) direction = offset - perch.min < perch.max - offset ? -1 : 1;
              const remaining = direction < 0 ? offset - perch.min : perch.max - offset;
              escapeSpeed = Math.max(420, remaining / Math.max(.1, (deadline - now) / 1000));
              hurryUntil = deadline + 3000;
            }
            if (now >= pauseAt && now >= hurryUntil && !pauseUntil) {
              pauseStarted = now; pauseUntil = now + between(1300, 1900);
            }
            if (pauseUntil && now >= pauseUntil) { pauseUntil = 0; pauseAt = now + between(3500, 5500); }
            const target = pauseUntil ? 0 : direction * (now < hurryUntil ? escapeSpeed : 30);
            speed += (target - speed) * (1 - Math.exp(-dt / (now < hurryUntil ? 35 : 130)));
            const movement = speed * dt / 1000;
            offset += movement; steps += Math.abs(movement);
            point = pointFor(perch, rect, offset);
            if (pauseUntil && Math.abs(speed) < 4) { row = 5; column = Math.floor((now - pauseStarted) / 150) % 8; }
            else { row = speed < 0 ? 2 : 1; column = Math.floor(steps / 6) % 8; }
            if (walkingDistance < 62 || offset <= perch.min || offset >= perch.max) takeOff(point, now, walkingDistance < 62);
          }
        } else {
          if (phase === 'peek' && near) change('duck', now);
          if (now >= deadline && phase !== 'duck') change('duck', now);
          const age = now - started;
          if (phase === 'peek') {
            exposure = mix(fromExposure, 10 * bodyScale, age / 900);
            actionAge += dt;
            if (actionAge > 11500) { actionAge = 0; peck = Math.random() < .55; }
            const action = pose(actionAge); row = action.row; column = action.column;
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
        else {
          if (phase === 'walk') lastWalkPoint = {x:point.x, y:point.y};
          paint(point.x + perch.nx * exposure, point.y + perch.ny * exposure, row, column, turn);
        }
      }
    }
    bird.dataset.phase = phase;
    bird.dataset.mode = perch?.mode || '';
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('pointermove', track); window.removeEventListener('pointerdown', track);
    document.removeEventListener('pointerleave', leave);
    layer.remove(); css.remove();
  };
}
