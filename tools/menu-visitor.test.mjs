import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const source = fs.readFileSync(new URL('../dist/menu-visitor.js', import.meta.url), 'utf8');
// Inspect state in a test-only copy. The shipped visitor has no testing API.
const instrumented = source.replace('export function costumeAt(', 'function costumeAt(')
  .replace(/  const hatReady = import\([^\n]+/, '  const hatReady = null;')
  .replace('let directionalHats, disposed = false;', "let directionalHats = {poseFor:()=>({x:97,y:72,scale:1}),render:id=>({src:id==='halloween'?'witch-hat.png':id+'.png'}),dispose(){}}, disposed = false;")
  .replaceAll('import.meta.url', "'http://localhost/menu-visitor.js'")
  .replace('export function startMenuVisitor(', 'function startMenuVisitor(')
  .replace('  return () => {', `  globalThis.visitor = {
    state: () => ({phase, peanut:peanut && {...peanut}, point:paintedPoint && {...paintedPoint}, offset, deadline, speed, next,
      perch:perch && {inward:perch.inward, side:perch.side, min:perch.min, max:perch.max}, dive:dive && {...dive},
      art:paintedSheet === 'moves' ? moves : paintedSheet === 'dive' ? diveArt : sheet}),
    choose: mode => choose(performance.now(), mode),
    tick, tickPeanut, paint, peanutLook, rest, pose,
  };
  return () => {`) + '\nglobalThis.played = [];\nglobalThis.stopVisitor = startMenuVisitor({onInteraction:kind => globalThis.played.push(kind)});';

// extras adds globals such as sessionStorage, for pages that carry him over from a previous page.
function fixture(testMode = true, random = .6, extras = {}) {
  let now = 0, raf;
  let hash = '#project/warhammercraft';
  const nodes = [], listeners = new Map();
  const rect = {left:240, right:860, top:220, bottom:550, width:620, height:330};
  const element = (className = '') => {
    const node = {className, style:{}, dataset:{}, isConnected:true, clientWidth:1100, clientHeight:800,
      children:[], getContext(){return this.context ||= {calls:[], setTransform(...v){this.calls=[];this.calls.push(['setTransform',...v]);}, clearRect(){}, save(){}, restore(){}, translate(...v){this.calls.push(['translate',...v]);}, scale(...v){this.calls.push(['scale',...v]);}, rotate(...v){this.calls.push(['rotate',...v]);}, drawImage(...v){this.calls.push(['drawImage',...v]);}};}, setAttribute(){}, append(...children){this.children.push(...children);},
      remove(){this.isConnected = false;}, querySelector(){return null;}, closest(){return null;},
      matches(selector){return selector.split(',').some(s => s.trim() === '.' + this.className);},
      getBoundingClientRect(){return rect;}};
    nodes.push(node); return node;
  };
  const slab = element('slab');
  const events = {addEventListener(type, callback){listeners.set(type, callback);},
    removeEventListener(type, callback){if (listeners.get(type) === callback) listeners.delete(type);}};
  const document = {...events, hidden:false, head:element(), body:element(), createElement:()=>element(),
    querySelectorAll:selector=>selector === '.masthead, .side-menu, .slab, .model-card, .post' ? [slab] : []};
  const math = Object.create(Math); math.random = () => random;
  const location = {href:'http://localhost/', origin:'http://localhost', pathname:'/', search:testMode ? '?peanut-test=1' : '',
    get hash(){return hash;}, set hash(value){if(value!==hash){hash=value;listeners.get('hashchange')?.({});}}};
  const context = vm.createContext({document, window:events, location,
    URL, URLSearchParams, Math:math, performance:{now:()=>now}, innerHeight:800,
    Image:class {complete=true; naturalWidth=1536; naturalHeight=1098;},
    getComputedStyle:()=>({visibility:'visible',borderLeftWidth:'18',borderRightWidth:'18',borderTopWidth:'18',borderBottomWidth:'18'}),
    requestAnimationFrame:callback=>{raf=callback; return 1;}, cancelAnimationFrame:()=>{raf=null;}, ...extras});
  vm.runInContext(instrumented, context);
  const step = (ms=16) => {now += ms; raf(now);};
  const advance = ms => {for (let elapsed=0; elapsed<ms; elapsed+=16) step();};
  const emit = (type, extra={}) => {
    const event = {type, target:document.body, pointerType:'mouse', button:0, clientX:-10000, clientY:-10000,
      preventDefault(){this.prevented=true;}, stopImmediatePropagation(){this.stopped=true;}, ...extra};
    listeners.get(type)?.(event); return event;
  };
  const state = () => context.visitor.state();
  const key = () => {emit('keydown', {code:'KeyL'}); step();};
  const move = (x,y) => emit('pointermove', {clientX:x,clientY:y});
  const click = (x,y,extra={}) => {const event=emit('pointerdown', {clientX:x,clientY:y,...extra}); emit('click',extra); step(); return event;};
  return {context, nodes, listeners, step, advance, emit, state, key, move, click};
}

test('L is limited to the test view and ignores typing, modifiers, and repeat', () => {
  const normal=fixture(false); normal.key(); assert.equal(normal.state().peanut, null);
  const f=fixture();
  for (const extra of [{ctrlKey:true}, {altKey:true}, {metaKey:true}, {repeat:true}, {target:{closest:()=>({})}}])
    f.emit('keydown', {code:'KeyL', ...extra});
  assert.equal(f.state().peanut, null);
  f.key(); assert.equal(f.state().peanut.state, 'falling'); assert.equal(f.state().phase, 'peek');
});

test('falling food ignores the hand and does not trigger a chase before halfway', () => {
  const f=fixture(); f.key();
  let frames=0;
  while (f.state().peanut.y < 398) {
    const point=f.state().point; if(point) f.move(point.x, point.y);
    assert.equal(f.state().phase, 'peek'); f.step(); assert(++frames < 600);
  }
  while(f.state().phase !== 'chase') {f.step(); assert(++frames < 610);}
  assert(f.state().peanut.y >= 400);
  let carried=false, running=false;
  for(let i=0; i<250 && f.state().peanut; i++) {
    f.step(); carried ||= f.state().peanut?.state === 'carried'; running ||= f.state().phase === 'carry';
  }
  assert(carried); assert(running); assert.equal(f.state().peanut, null); assert.equal(f.state().phase, 'rest');
});

test('grabbing holds the kernel, flees, and suppresses underlying page clicks', () => {
  const f=fixture(); f.key(); f.advance(1300);
  const nut=f.state().peanut;
  const event=f.click(nut.x+24,nut.y); // Generous grab target, outside the visible artwork.
  assert(event.prevented && event.stopped);
  assert.equal(f.state().peanut.state, 'held'); assert(['duck','peek-hidden'].includes(f.state().phase));
  f.move(900,400); f.advance(600);
  assert.equal(f.state().peanut.x,912); assert.equal(f.state().peanut.y,414);
  assert.equal(f.state().phase,'peek');
});

test('a near miss is the grab attempt that scares him; unrelated clicks do not', () => {
  const f=fixture(); f.key(); f.advance(900);
  const nut=f.state().peanut; f.click(nut.x+100,nut.y);
  assert.equal(f.state().phase,'peek');
  f.click(nut.x+48,nut.y);
  assert.equal(f.state().peanut.state,'falling'); assert.equal(f.state().peanut.contested,true);
  assert(['duck','peek-hidden'].includes(f.state().phase));
});

test('held peanut draws him closer, keeps a gap, and permits a small retreat before full flight', () => {
  const f=fixture(); f.key(); f.advance(1200);
  const nut=f.state().peanut; f.click(nut.x,nut.y); f.move(900,480);
  f.context.visitor.choose('walk'); f.advance(2400);
  assert.equal(f.state().phase,'walk');
  const before=f.state().offset; f.advance(1800);
  assert(f.state().offset > before); assert.equal(f.state().phase,'walk');
  f.advance(6000);
  const point=f.state().point;
  assert(Math.hypot(900-point.x,480-point.y) > 150);
  const aligned=f.state().offset;
  f.move(point.x,point.y-250); f.advance(800);
  assert(Math.abs(f.state().offset-aligned)<8, 'Food directly above should not make him walk sideways');
  const retreatFrom=f.state().offset;
  f.move(point.x+95,point.y); f.advance(700);
  assert.equal(f.state().phase,'walk'); assert(f.state().offset < retreatFrom);
  const close=f.state().point; f.move(close.x+20,close.y); f.step();
  assert.equal(f.state().phase,'fly'); assert.equal(f.state().peanut.state,'held');
});

test('dropping commits immediately even with the hand over the peanut; he carries it away', () => {
  const f=fixture(); f.key(); f.advance(1400);
  const nut=f.state().peanut; f.click(nut.x,nut.y); f.move(700,300); f.advance(1000);
  f.click(700,300);
  assert.equal(f.state().phase,'chase'); assert.equal(f.state().peanut.state,'dropped');
  let carry=false;
  for(let i=0; i<300 && f.state().peanut; i++) {f.step(); carry ||= f.state().peanut?.state === 'carried';}
  assert(carry); assert.equal(f.state().peanut,null); assert.equal(f.state().phase,'rest');
});

test('random food appears during peeks; authored gaze frames track food across rotated edges', () => {
  const f=fixture(false,.2); f.context.visitor.choose('peek'); f.advance(1500);
  assert.equal(f.state().peanut.state,'falling');
  const point={x:f.state().peanut.x+100,y:f.state().peanut.y};
  assert.equal(f.context.visitor.peanutLook(point,0).column,4);
  assert.equal(f.context.visitor.peanutLook(point,0).mirrored,true);
  assert.equal(f.context.visitor.peanutLook(point,90).row,10);
});

test('vertical gaze looks directly at food and follows its side on every rotated peek edge', () => {
  const f=fixture(); f.key();
  const nut=f.state().peanut;
  for(const turn of [0,90,180,-90]) {
    const angle=turn*Math.PI/180;
    for(const [x,y,row,column,mirrored] of [
      [0,-160,9,0,false], [0,160,10,0,false],
      [-65,-160,9,1,true], [65,-160,9,1,false],
      [-65,160,9,7,true], [65,160,9,7,false],
    ]) {
      const point={x:nut.x-(x*Math.cos(angle)-y*Math.sin(angle)), y:nut.y-(x*Math.sin(angle)+y*Math.cos(angle))};
      const look=f.context.visitor.peanutLook(point,turn);
      assert.equal(look.row,row, `row for ${turn} degrees, ${x},${y}`);
      assert.equal(look.column,column, `column for ${turn} degrees, ${x},${y}`);
      assert.equal(look.mirrored,mirrored, `side for ${turn} degrees, ${x},${y}`);
      f.context.visitor.paint(500,400,look.row,look.column,turn,false,look.mirrored);
      assert.equal(f.nodes.filter(n=>n.context).find(n=>n.context.calls.some(c=>c[0]==='scale')).context.calls.find(c=>c[0]==='scale')[1], mirrored?-1:1);
    }
  }
});

test('stopping removes food, animation callbacks, and every event handler', () => {
  const f=fixture(); f.key(); f.context.stopVisitor(); assert.equal(f.listeners.size,0);
  assert(f.nodes.filter(n=>n.className.startsWith('menu-') && n.className.endsWith('layer')).every(n=>!n.isConnected));
});

test('side-peek tilts face the food; horizontal peeks retain their mild tilts', () => {
  const f=fixture(); f.key(); const nut=f.state().peanut;
  for(const side of ['left','right']) for(const [x,y,row,column,mirrored] of [
    [-60,-150,9,1,true], [60,-150,9,3,false], [-60,150,10,2,false], [60,150,10,2,true], [-150,0,6,1,false], [150,0,6,4,false],
  ]) {
    const look=f.context.visitor.peanutLook({x:nut.x-x,y:nut.y-y},0,side);
    assert.equal(look.row,row); assert.equal(look.column,column); assert.equal(look.mirrored,mirrored);
  }
  for(const [side,turn] of [['top',0],['bottom',180]]) {
    const angle=turn*Math.PI/180;
    for(const [x,y,row,column,mirrored] of [[60,-150,10,7,true],[-60,-150,10,7,false],[60,150,9,5,false],[-60,150,9,5,true]]) {
      const point={x:nut.x-(x*Math.cos(angle)-y*Math.sin(angle)),y:nut.y-(x*Math.sin(angle)+y*Math.cos(angle))};
      const look=f.context.visitor.peanutLook(point,turn,side);
      assert.equal(look.row,row); assert.equal(look.column,column); assert.equal(look.mirrored,mirrored);
    }
  }
});

// The frames shown at each walking stop, as row-9 column sequences (repeats collapsed), or 'look' for his usual stop.
function walkingStops(f, ms) {
  const picture=f.nodes.find(n=>n.className==='menu-visitor-frame'), stops=[];
  let current=null;
  for(let t=0;t<ms;t+=16) {
    f.step();
    const draw=f.nodes.filter(n=>n.context).flatMap(n=>n.context.calls).find(c=>c[0]==='drawImage' && typeof c[1]?.src==='string');
    const row=draw ? draw[3]/208 : 0, column=draw ? draw[2]/192 : 0;
    const stopped=f.state().phase==='walk' && (row===8 || row===5);
    if(!stopped) { current=null; continue; }
    if(!current) stops.push(current=[]);
    const frame=row===8 ? column : 'look';
    if(current.at(-1)!==frame) current.push(frame);
  }
  return stops;
}
const LEAN_ONCE=[0,5,4,5,0,6,7,6];

test('a walking stop can be the head lean, one way and then the other', () => {
  const f=fixture(true,.3); f.context.visitor.choose('walk');
  const stops=walkingStops(f,12000);
  assert(stops.length>=1);
  assert.deepEqual(stops[0],LEAN_ONCE);
});

test('walking stops mix his usual look around with leans played twice through', () => {
  const f=fixture(true,.6); let flip=false;
  // The visit's peanut and special-move rolls keep out of the alternation, so it only drives the stops.
  f.context.Math.random=()=>/rollFor(Peanut|Special)/.test(new Error().stack) ? .9 : (flip=!flip) ? .3 : .7;
  const seen=new Set();
  for(let visit=0;visit<6;visit++) {
    f.context.visitor.choose('walk');
    for(const stop of walkingStops(f,15000)) {
      if(stop.every(frame=>frame==='look')) { seen.add('look'); continue; }
      // A lean always plays whole cycles: once, or twice in a row.
      const twice=[...LEAN_ONCE,...LEAN_ONCE];
      assert(JSON.stringify(stop)===JSON.stringify(LEAN_ONCE) || JSON.stringify(stop)===JSON.stringify(twice), JSON.stringify(stop));
      seen.add(stop.length===LEAN_ONCE.length ? 'once' : 'twice');
    }
  }
  // Single leans are covered above; alternating draws here give usual stops and double leans.
  assert(seen.has('look') && seen.has('twice'), [...seen].join());
});

test('walking gaze frames use the walking foot rail and reset their scale on the next walk frame', () => {
  const f=fixture(); f.context.visitor.choose('walk'); f.advance(3000); assert.equal(f.state().phase,'walk');
  const picture=f.nodes.find(n=>n.className==='menu-visitor-frame');
  for(const row of [9,10]) {
    f.context.visitor.paint(500,400,row,0,0,false,false);
    const sourceFoot=row===9?169:170;
    const calls=f.nodes.filter(n=>n.context).flatMap(n=>n.context.calls);
    const shift=calls.find(c=>c[0]==='translate')[2];
    const draw=calls.find(c=>c[0]==='drawImage' && typeof c[1]?.src==='string');
    assert(Math.abs(shift + 143 / 2 - 197 / 208 * 143)<1e-9);
    assert(Math.abs(draw[7] + sourceFoot / 208 * 143)<1e-9);
    assert.deepEqual(calls.find(c=>c[0]==='scale').slice(1), [1.1,1.1]);
  }
  f.context.visitor.paint(500,400,1,0);
  const calls=f.nodes.filter(n=>n.context).flatMap(n=>n.context.calls);
  assert(!calls.some(c=>c[0]==='translate' && c[1]===0)); // No grounded-gaze foot-rail shift.
  assert.deepEqual(calls.find(c=>c[0]==='scale').slice(1), [1,1]);
});

function heldFixture() {
  const f=fixture(); f.key(); f.advance(800);
  const nut=f.state().peanut; f.click(nut.x,nut.y);
  f.move(500,400); f.advance(200);
  return f;
}

test('a small adjustment near Shredder drops gently instead of launching', () => {
  const f=heldFixture(), point=f.state().point;
  const x=point.x+75, y=point.y+35;
  f.move(x,y); f.advance(300); f.move(x,y); f.step(1);
  f.move(x-4,y-3); f.click(x-4,y-3);
  const released=f.state().peanut;
  assert.equal(released.state,'dropped'); assert.equal(f.state().phase,'chase');
  assert.equal(released.vx,0); assert(released.vy>0 && released.vy<100);
  f.context.visitor.tickPeanut(100);
  assert.equal(f.state().peanut.x,released.x);
});

test('a tiny adjustment clears the momentum of an earlier flick', () => {
  const f=heldFixture(); f.move(530,400); f.step(); f.move(580,400);
  f.advance(200); f.move(582,400); f.click(582,400);
  const released=f.state().peanut;
  assert.equal(released.vx,0); assert(released.vy>0 && released.vy<100);
});

test('a deliberate flick still throws when the browser reports many small movements', () => {
  const f=heldFixture(); f.move(501,400);
  for(let x=504;x<=531;x+=3) {f.step(2); f.move(x,400);}
  f.click(531,400);
  const released=f.state().peanut;
  assert(released.vx>1700); assert.equal(f.state().phase,'chase');
  f.context.visitor.tickPeanut(100);
  assert(f.state().peanut.x-released.x>150);
});

test('moving and clicking throws in the measured direction, retaining motion through the click', () => {
  for(const direction of [-1,1]) {
    const f=heldFixture();
    f.move(500+direction*25,385); f.step();
    f.move(500+direction*60,365); f.click(500+direction*60,365);
    const thrown=f.state().peanut;
    assert.equal(thrown.state,'dropped'); assert.equal(f.state().phase,'chase');
    assert(thrown.vx*direction>500); assert(thrown.vy < -250);
    const x=thrown.x,y=thrown.y;
    f.context.visitor.tickPeanut(100);
    assert((f.state().peanut.x-x)*direction>40); assert(f.state().peanut.y<y);
  }
});

test('pausing the hand releases a downward drop without stale throwing momentum', () => {
  const f=heldFixture(); f.move(530,390); f.step(); f.move(560,365); f.advance(300); f.click(560,365);
  assert.equal(f.state().peanut.vx,0); assert(f.state().peanut.vy>0);
});

test('a medium-speed flick keeps its swing instead of being damped', () => {
  for(const [dx,dy] of [[1,0],[-1,0],[0,-1]]) {
    const f=heldFixture(); let x=500,y=400; f.move(x,y);
    for(let i=0;i<6;i++) {f.step(); x+=dx*6; y+=dy*6; f.move(x,y);} // about 375 px/s
    f.click(x,y);
    const thrown=f.state().peanut, speed=Math.hypot(thrown.vx,thrown.vy);
    assert.equal(thrown.state,'dropped'); assert(speed>600, 'speed '+speed.toFixed(0));
  }
});

test('a medium-speed downward flick still cracks the shell', () => {
  const f=heldFixture(); let y=560; f.move(500,y);
  for(let i=0;i<6;i++) {f.step(); y+=6; f.move(500,y);}
  f.click(500,y);
  for(let i=0;i<60 && !f.state().peanut.broken;i++) f.context.visitor.tickPeanut(16);
  assert.equal(f.state().peanut.broken,true);
});

test('a small flick throws farther and survives the time needed to click', () => {
  const f=heldFixture(); f.move(514,395); f.step(); f.move(538,387); f.advance(160); f.click(538,387);
  const start=f.state().peanut;
  assert(start.vx>1700, 'The release should preserve and strengthen the recent flick');
  f.context.visitor.tickPeanut(150);
  assert(f.state().peanut.x-start.x>250, 'The throw should travel visibly instead of stalling near the hand');
});

test('the right-menu peek looks down-left toward the peanut, with matching directions on the left', () => {
  const f=fixture(); f.key(); const nut=f.state().peanut;
  for(const [side,turn,dx,dy,mirrored] of [
    ['right',90,-340,195,true], ['right',90,-340,-195,false],
    ['left',-90,340,195,false], ['left',-90,340,-195,true],
  ]) {
    const look=f.context.visitor.peanutLook({x:nut.x-dx,y:nut.y-dy},turn,side);
    assert.equal(look.row,10); assert.equal(look.column,2); assert.equal(look.mirrored,mirrored);
    // Authored row 10, column 2 points down-left before mirroring/edge rotation.
    const localX=mirrored?17:-17, localY=23, angle=turn*Math.PI/180;
    const gazeX=localX*Math.cos(angle)-localY*Math.sin(angle);
    const gazeY=localX*Math.sin(angle)+localY*Math.cos(angle);
    assert(gazeX*dx>0 && gazeY*dy>0, 'The rendered gaze must face the peanut on screen');
  }
});

test('gravity bends a throw downward and air resistance reduces its horizontal speed', () => {
  const f=heldFixture(); f.move(510,395); f.step(); f.move(530,385); f.click(530,385);
  const initial=f.state().peanut;
  let apex=initial.y;
  for(let i=0;i<80;i++) {f.context.visitor.tickPeanut(16); apex=Math.min(apex,f.state().peanut.y);}
  const later=f.state().peanut;
  assert(apex<initial.y); assert(later.y>apex); assert(later.vy>0);
  assert(Math.abs(later.vx)<Math.abs(initial.vx));
});

test('Shredder catches a moving throw and leaves with it', () => {
  const f=heldFixture(); f.move(530,390); f.step(); f.move(580,375); f.click(580,375);
  assert.equal(f.state().phase,'chase'); assert(f.state().peanut.vx>500);
  let carrying=false;
  for(let i=0;i<300 && f.state().peanut;i++) {f.step(); carrying ||= f.state().peanut?.state==='carried';}
  assert(carrying); assert.equal(f.state().peanut,null); assert.equal(f.state().phase,'rest');
});

test('throws bounce within the view and lose momentum on the floor', () => {
  const f=heldFixture(); f.move(530,430); f.step(); f.move(1090,760); f.click(1090,760);
  const thrown=f.state().peanut;
  assert(thrown.x<=1084); assert(thrown.vx<0, 'Right-wall impact should reverse the throw');
  let bounced=false;
  for(let i=0;i<180;i++) {
    f.context.visitor.tickPeanut(16); const nut=f.state().peanut;
    assert(nut.x>=16 && nut.x<=1084); assert(nut.y<=782);
    bounced ||= nut.y===782 && nut.vy<0;
  }
  assert(bounced); assert(Math.abs(f.state().peanut.vx)<20);
});

test('a fresh drop falls faster while keeping more than three seconds to grab before halfway', () => {
  const f=fixture(); f.key(); let elapsed=16;
  while(!f.state().peanut.ready) {f.step(); elapsed+=16; assert(elapsed<4300);}
  assert(elapsed>3000); assert(f.state().peanut.y>=400);
});

test('upward and downward throws retain vertical momentum', () => {
  for(const direction of [-1,1]) {
    const f=heldFixture(); f.move(500,400+direction*20); f.step();
    f.move(500,400+direction*60); f.click(500,400+direction*60);
    assert(f.state().peanut.vy*direction>2300);
    f.context.visitor.tickPeanut(100);
    assert(f.state().peanut.vy*direction>1900);
  }
});

function throwDown(f) {
  f.move(500,650); f.step(); f.move(500,700); f.click(500,700);
}

test('a hard downward floor impact breaks the shell and its fragments fade quickly', () => {
  const f=heldFixture(); throwDown(f);
  for(let i=0;i<30 && !f.state().peanut.broken;i++) f.context.visitor.tickPeanut(16);
  assert.equal(f.state().peanut.broken,true);
  const fragments=f.nodes.filter(n=>n.className.startsWith('menu-peanut-shell-fragment'));
  assert.equal(fragments.length,2); assert(fragments.every(n=>n.isConnected));
  assert.equal(f.nodes.find(n=>n.className==='menu-peanut').dataset.broken,'true');
  f.context.visitor.tickPeanut(250);
  assert(fragments.every(n=>Number(n.style.opacity)<=.5));
  f.context.visitor.tickPeanut(260);
  assert(fragments.every(n=>!n.isConnected)); assert.equal(f.state().peanut.broken,true);
});

test('ordinary downward drops bounce without breaking the shell', () => {
  const f=heldFixture(); f.move(500,700); f.advance(300); f.click(500,700);
  for(let i=0;i<180;i++) f.context.visitor.tickPeanut(16);
  assert.equal(f.state().peanut.broken,false);
  assert.equal(f.nodes.filter(n=>n.className.startsWith('menu-peanut-shell-fragment')).length,0);
});

test('Shredder collects the exposed kernels after a hard impact', () => {
  const f=heldFixture(); throwDown(f);
  let broken=false, carriedKernels=false;
  for(let i=0;i<300 && f.state().peanut;i++) {
    f.step(); broken ||= f.state().peanut?.broken===true;
    carriedKernels ||= f.state().peanut?.state==='carried' && f.nodes.find(n=>n.className==='menu-visitor-beak-peanut').dataset.broken==='true';
  }
  assert(broken); assert(carriedKernels); assert.equal(f.state().peanut,null); assert.equal(f.state().phase,'rest');
});

function navigationAnchor(href) {
  const anchor={href,target:'',hasAttribute:()=>false,getAttribute:()=>null};
  return {closest:selector=>selector==='a[href]'?anchor:null};
}

test('menu navigation keeps the peanut held and starts a flight into the new view', () => {
  for(const [href,hash] of [
    ['http://localhost/#army/vampire-counts','#army/vampire-counts'],
    ['http://localhost/mdlxl/','#project/mdlxl'],
    ['http://localhost/mdlxl/#project/mdlxl/credits','#project/mdlxl/credits'],
    ['http://localhost/model/graveguard/','#model/graveguard'],
  ]) {
    const f=heldFixture(); f.click(160,300,{target:navigationAnchor(href)});
    assert.equal(f.state().peanut.state,'held'); assert.equal(f.context.location.hash,hash);
    assert.equal(f.state().phase,'arrive'); f.advance(4000);
    assert.equal(f.state().peanut.state,'held'); assert.equal(f.state().phase,'walk');
  }
});

test('menu flight can be redirected by another menu click while food stays held', () => {
  const f=heldFixture(); f.click(160,300,{target:navigationAnchor('http://localhost/#army/vampire-counts')});
  f.advance(400);
  f.click(160,360,{target:navigationAnchor('http://localhost/#army/the-empire')});
  assert.equal(f.state().phase,'arrive'); assert.equal(f.state().peanut.state,'held');
  assert.equal(f.context.location.hash,'#army/the-empire');
});

test('a flick over a menu link throws the peanut instead of following the link', () => {
  const f=heldFixture();
  f.move(525,385); f.step();
  f.move(560,365); f.click(560,365,{target:navigationAnchor('http://localhost/#army/vampire-counts')});
  const thrown=f.state().peanut;
  assert.equal(thrown.state,'dropped'); assert(thrown.vx>500);
  assert.notEqual(f.context.location.hash,'#army/vampire-counts');
});

test('a normal click still releases food after switching menus', () => {
  const f=heldFixture(); f.click(160,300,{target:navigationAnchor('http://localhost/#army/vampire-counts')});
  f.advance(400); f.click(700,400);
  assert.equal(f.state().peanut.state,'dropped'); assert.equal(f.state().phase,'chase');
});

test('following resumes if the new menu replaces its landing surface while content loads', () => {
  const f=heldFixture(); f.click(160,300,{target:navigationAnchor('http://localhost/#army/vampire-counts')});
  const slab=f.nodes.find(n=>n.className==='slab'); slab.isConnected=false; f.step();
  assert.equal(f.state().peanut.state,'held'); assert.equal(f.state().phase,'rest');
  slab.isConnected=true; f.step();
  assert.equal(f.state().phase,'arrive'); assert.equal(f.state().peanut.state,'held');
});

test('a grab press without a click does not swallow a later, unrelated click', () => {
  const f=fixture(); f.key(); f.advance(1300);
  const nut=f.state().peanut;
  f.emit('pointerdown',{clientX:nut.x,clientY:nut.y}); // No click follows (e.g. the press became a drag).
  assert.equal(f.state().peanut.state,'held');
  f.advance(1500);
  const later=f.emit('click',{});
  assert(!later.prevented && !later.stopped, 'A stale grab must not eat the next click');
});

test('a near miss scares him only until the hand moves away from the food', () => {
  const f=fixture(); f.key(); f.advance(2600);
  const nut=f.state().peanut; f.click(nut.x+48,nut.y);
  assert.equal(f.state().peanut.contested,true);
  f.move(nut.x+400,nut.y-300); f.step();
  assert.equal(f.state().peanut.contested,false);
  let chased=false;
  for(let i=0;i<300 && !chased;i++) {f.step(); chased=f.state().phase==='chase';}
  assert(chased, 'He should come back for the food within the same visit');
});

test('food left lying around brings him back sooner than an ordinary visit', () => {
  const f=fixture(); f.key(); f.advance(1300);
  const nut=f.state().peanut; f.click(nut.x,nut.y); // Grab: he ducks out of sight.
  f.context.visitor.choose('peek');
  f.move(700,300); f.click(700,300); f.move(-10000,-10000); f.emit('pointerleave');
  // Force a rest while the dropped food lies on the floor.
  f.context.visitor.rest(f.context.performance.now());
  const wait=f.context.visitor.state().next-f.context.performance.now();
  assert(wait>=2500 && wait<=4000, `expected a short return, got ${wait}`);
});

test('after fleeing a grab and leaving, a throw brings him flying in from the edge, not popping up beside it', () => {
  const f=fixture(); f.key();
  let frames=0; while(f.state().phase!=='chase') {f.step(); assert(++frames<700);}
  const nut=f.state().peanut; f.click(nut.x,nut.y);
  assert.equal(f.state().peanut.state,'held'); assert.equal(f.state().phase,'fly');
  frames=0; while(f.state().phase!=='rest') {f.step(); assert(++frames<400);}
  f.move(520,400); f.advance(300); f.click(520,400); // a gentle release
  assert.equal(f.state().peanut.state,'dropped'); assert.equal(f.state().phase,'chase');
  const start=f.state().point;
  assert(start.x<0 || start.x>1100, `he enters from off screen, not at ${Math.round(start.x)}`);
  const gap=()=>Math.abs(f.state().point.x-f.state().peanut.x), before=gap(); f.advance(300);
  assert(gap()<before, 'and flies toward the peanut');
});

test('grabbing food while he flies in makes him flee instead of vanishing', () => {
  const f=fixture(); f.key(); f.advance(1300);
  f.context.visitor.choose('walk'); f.step();
  assert.equal(f.state().phase,'arrive');
  const nut=f.state().peanut; f.click(nut.x,nut.y);
  assert.equal(f.state().peanut.state,'held'); assert.equal(f.state().phase,'fly');
});

test('thrown food tumbles in the air and rolls on the floor', () => {
  const f=heldFixture(); f.move(530,390); f.step(); f.move(580,375); f.click(580,375);
  const start=f.state().peanut; assert(start.spin>0, 'A rightward throw spins clockwise');
  f.context.visitor.tickPeanut(100);
  assert.notEqual(f.state().peanut.angle,start.angle);
  for(let i=0;i<200;i++) f.context.visitor.tickPeanut(16);
  const resting=f.state().peanut;
  if(resting && resting.vy===0 && Math.abs(resting.vx)>0)
    assert(Math.abs(resting.spin-resting.vx/10*180/Math.PI)<1e-6, 'Rolling spin follows floor travel');
  assert(f.nodes.find(n=>n.className==='menu-peanut').style.transform.includes('rotate('));
});

// Shredder's Stash: what counts as play, outside the owner's test view.
function heldOutsideTestView() {
  const f=fixture(false,.2); f.context.visitor.choose('peek');
  let frames=0; while(!f.state().peanut) {f.step(); assert(++frames<300);}
  f.advance(800);
  const nut=f.state().peanut; f.click(nut.x,nut.y); f.move(500,400); f.advance(200);
  assert.equal(f.state().peanut.state,'held');
  return f;
}
const playedIn=f=>[...f.context.played];

test('a peanut the visitor catches and gives to him counts as a grab and a peanut fed', () => {
  const f=heldOutsideTestView();
  f.move(500,400); f.advance(300); f.click(500,400);
  let frames=0; while(f.state().peanut?.state!=='carried') {f.step(); assert(++frames<400);}
  assert.deepEqual(playedIn(f),['grab','feed']);
});

test('hard throws count a cracked shell, and menu changes with food in hand count a follow', () => {
  const thrown=heldOutsideTestView(); throwDown(thrown);
  for(let i=0;i<40 && !thrown.state().peanut?.broken;i++) thrown.step();
  assert(playedIn(thrown).includes('crack'));
  const led=heldOutsideTestView(); led.click(160,300,{target:navigationAnchor('http://localhost/#army/vampire-counts')});
  assert.deepEqual(playedIn(led),['grab','follow']);
});

test('making him duck while he peeks counts as playing with his peeking', () => {
  const f=fixture(false,.6); f.context.visitor.choose('peek'); f.advance(1500);
  assert.equal(f.state().phase,'peek');
  const point=f.state().point; f.move(point.x,point.y); f.step();
  assert(['duck','peek-hidden'].includes(f.state().phase));
  assert.deepEqual(playedIn(f),['peek']);
});

test('his own finds and the owner test view never count', () => {
  const own=fixture(false,.2); own.context.visitor.choose('peek');
  let frames=0; while(own.state().peanut?.state!=='carried') {own.step(); assert(++frames<900);}
  assert.deepEqual(playedIn(own),[],'a peanut he found himself is not a peanut fed');
  const test=heldFixture(); test.move(500,400); test.advance(300); test.click(500,400);
  frames=0; while(test.state().peanut?.state!=='carried') {test.step(); assert(++frames<400);}
  assert.deepEqual(playedIn(test),[],'the peanut test view is the owner playing');
});

// Carrying him over a full page load in the same tab.
function tabStorage() {
  const saved=new Map();
  return {saved, getItem:key=>saved.has(key)?saved.get(key):null, setItem:(key,value)=>saved.set(key,String(value)), removeItem:key=>saved.delete(key)};
}
const nextPage=sessionStorage=>fixture(true,.6,{sessionStorage});

test('after a page change he flies over from where he was on the previous page', () => {
  const sessionStorage=tabStorage(), first=fixture(true,.6,{sessionStorage});
  first.context.visitor.choose('walk'); first.advance(3000); assert.equal(first.state().phase,'walk');
  const was=first.state().point; first.emit('pagehide');
  const second=nextPage(sessionStorage); second.step();
  assert.equal(second.state().phase,'arrive');
  const start=second.state().point;
  assert(Math.hypot(start.x-was.x,start.y-was.y)<40, 'his flight starts where the last page left him');
  assert.equal(sessionStorage.saved.size,0, 'the hand-over is used once');
  second.advance(4000);
  assert.equal(second.state().phase,'walk', 'a page-follow flight always lands in a walk');
});

test('following from a peek lands in a walk for every next-page visit choice', () => {
  for (const random of [.1, .4, .6, .9]) {
    const sessionStorage=tabStorage(), first=fixture(true,.6,{sessionStorage});
    first.context.visitor.choose('peek'); first.advance(1000); first.emit('pagehide');
    const second=fixture(true,random,{sessionStorage}); second.step();
    assert.equal(second.state().phase,'arrive');
    assert.equal(second.nodes.find(n=>n.className==='menu-visitor').dataset.mode,'walk');
    second.advance(3000);
    assert.equal(second.state().phase,'walk');
  }
});

test('a page-follow flight waits for a walking ledge instead of falling back to a peek', () => {
  for (const held of [false, true]) {
    const sessionStorage=tabStorage(), first=fixture(true,.6,{sessionStorage});
    if (held) {
      first.key(); first.advance(800); const nut=first.state().peanut; first.click(nut.x,nut.y);
      first.context.visitor.choose('peek'); first.advance(700);
    } else { first.context.visitor.choose('peek'); first.advance(1000); }
    first.emit('pagehide');
    const second=nextPage(sessionStorage), slab=second.nodes.find(n=>n.className==='slab');
    slab.className='side-menu'; second.advance(500);
    assert.equal(second.state().phase,'rest');
    slab.className='slab'; second.advance(300);
    assert.equal(second.state().phase,'arrive');
    assert.equal(second.nodes.find(n=>n.className==='menu-visitor').dataset.mode,'walk');
    second.advance(3000); assert.equal(second.state().phase,'walk');
  }
});

test('a page-follow flight still lands walking when its landing surface is replaced', () => {
  const sessionStorage=tabStorage(), first=fixture(true,.6,{sessionStorage});
  first.context.visitor.choose('peek'); first.advance(1000); first.emit('pagehide');
  const second=nextPage(sessionStorage); second.step();
  const slab=second.nodes.find(n=>n.className==='slab'); slab.isConnected=false; second.step();
  assert.equal(second.state().phase,'rest');
  slab.isConnected=true; second.step(); assert.equal(second.state().phase,'arrive');
  second.advance(3000); assert.equal(second.state().phase,'walk');
});

test('a peanut in hand stays in hand across the page change, and a chase carries on', () => {
  const sessionStorage=tabStorage(), holding=fixture(true,.6,{sessionStorage});
  holding.key(); holding.advance(800); const nut=holding.state().peanut; holding.click(nut.x,nut.y);
  holding.emit('pagehide');
  const held=nextPage(sessionStorage);
  assert.equal(held.state().peanut.state,'held'); held.step(); assert.equal(held.state().phase,'arrive');

  const chasing=fixture(true,.6,{sessionStorage}); chasing.key();
  let frames=0; while(chasing.state().phase!=='chase') {chasing.step(); assert(++frames<700);}
  chasing.step(); const was=chasing.state().point; chasing.emit('pagehide');
  const resumed=nextPage(sessionStorage);
  assert.equal(resumed.state().phase,'chase');
  assert.equal(resumed.state().point.x,was.x); assert.equal(resumed.state().point.y,was.y);
});

test('an old hand-over is ignored', () => {
  const sessionStorage=tabStorage();
  sessionStorage.setItem('lowpolyworks.shredderVisit',JSON.stringify({savedAt:Date.now()-60000,phase:'walk',point:{x:400,y:300},peanut:null}));
  const f=nextPage(sessionStorage); f.step();
  assert.equal(f.state().phase,'rest');
});
test('being chased uses normal flight on inward and outward ledges', () => {
  for (const random of [.1,.9]) for (const end of ['left','right']) {
    const f=fixture();
    f.context.Math.random=()=>/rollForPeanut/.test(new Error().stack) ? .9 : random;
    f.context.visitor.choose('walk'); f.advance(3000);
    assert.equal(f.state().phase,'walk'); assert.equal(f.state().perch.inward,random===.1);
    const point=f.state().point;
    f.move(point.x+(end==='left' ? 90 : -90),point.y+10);
    f.step(); assert.equal(f.state().phase,'walk','runs along the ledge before taking off');
    for(let i=0;i<180 && f.state().phase==='walk';i++) f.step();
    assert.equal(f.state().phase,'fly'); assert.equal(f.state().dive,null);
    assert.equal(f.state().offset,end==='left' ? f.state().perch.min : f.state().perch.max);
  }
});

test('relaxed walking dives from inward and outward ledges, with the longer fall', () => {
  for(const random of [.1,.9]) {
    const f=fixture();
    f.context.Math.random=()=>/rollForPeanut/.test(new Error().stack) ? .9 : random;
    f.context.visitor.choose('walk'); f.advance(3000);
    assert.equal(f.state().phase,'walk'); assert.equal(f.state().perch.inward,random===.1);
    for(let i=0;i<1800 && f.state().phase==='walk';i++) f.step();
    assert.equal(f.state().phase,'dive');
    f.advance(1500); assert.equal(f.state().phase,'dive');
    f.advance(600); assert(['fly','rest'].includes(f.state().phase));
  }
});

test('the other authored moves remain shelved', () => {
  assert.doesNotMatch(source,/\b(COO|BLOOP|HOP|ACROBATICS|rollForSpecial|startTrick)\b/);
});

test('each visit, peek or walk, has a one-in-four chance of a falling peanut', () => {
  for (const mode of ['peek', 'walk']) {
    const lucky = fixture(false, .24); lucky.context.visitor.choose(mode); lucky.advance(6000);
    assert(lucky.state().peanut, mode + ' visits can drop a peanut');
    const unlucky = fixture(false, .25); unlucky.context.visitor.choose(mode); unlucky.advance(6000);
    assert.equal(unlucky.state().peanut, null, mode + ' visits keep the roll at 25%');
  }
});


test('the Halloween hat follows each sheet and disappears at November 1 Amsterdam midnight', () => {
  let now = Date.UTC(2026, 9, 29, 23);
  const f = fixture(true, .6, {Date:class extends Date {static now(){return now;}}});
  const incoming = f.nodes.filter(n => n.context)[1];
  for (const [row, column, flying, moveArt] of [[0,0,false,null],[2,3,false,null],[8,7,false,null],[0,1,true,null],[7,3,false,'moves'],[0,0,false,'dive']]) {
    f.context.visitor.paint(500,400,row,column,0,flying,false,moveArt);
    assert(incoming.context.calls.some(c => c[0] === 'drawImage' && c[1].src?.endsWith('witch-hat.png')));
  }
  now = Date.UTC(2026, 9, 31, 23) - 1;
  f.context.visitor.paint(500,400,0,0);
  assert(incoming.context.calls.some(c => c[0] === 'drawImage' && c[1].src?.endsWith('witch-hat.png')));
  now++;
  f.context.visitor.paint(500,400,0,0);
  assert(!incoming.context.calls.some(c => c[0] === 'drawImage' && c[1].src?.endsWith('witch-hat.png')));
});

test('the original sprite alone is painted outside Halloween', () => {
  for (const now of [Date.UTC(2026,9,29,23)-1, Date.UTC(2026,9,31,23), Date.UTC(2027,9,30)]) {
    const f=fixture(true,.6,{Date:class extends Date {static now(){return now;}}});
    f.context.visitor.paint(500,400,0,0);
    const incoming=f.nodes.filter(n=>n.context)[1];
    assert.equal(incoming.context.calls.filter(c=>c[0]==='drawImage').length,1);
  }
});


test('the Halloween hat clears the inward rail top without changing the foot or side mask', () => {
  let now=Date.UTC(2026,9,30,12);
  const f=fixture(true,.1,{Date:class extends Date {static now(){return now;}}});
  f.context.visitor.choose('walk');f.advance(3000);
  assert.equal(f.state().phase,'walk');assert.equal(f.state().perch.inward,true);
  const layer=f.nodes.find(n=>n.className==='menu-visitor-layer');
  assert.equal(layer.style.clipPath,'inset(0px 258px 268px 258px)');
  now=Date.UTC(2026,9,31,23);f.step();
  assert.equal(layer.style.clipPath,'inset(238px 258px 268px 258px)');
});

// Exact Amsterdam-midnight boundaries, including a tab that stays open across the cutoff.
test('seasonal crown and Christmas windows start and end on the requested days', () => {
  const f=fixture();
  for(const [start,end,hat] of [[Date.UTC(2026,10,7,23),Date.UTC(2026,10,12,23),'morgoth'],[Date.UTC(2026,11,10,23),Date.UTC(2026,11,26,23),'christmas'],[Date.UTC(2027,11,10,23),Date.UTC(2027,11,26,23),'christmas']]) {
    assert.equal(f.context.costumeAt(start-1),'none');
    assert.equal(f.context.costumeAt(start),hat);
    assert.equal(f.context.costumeAt(end-1),hat);
    assert.equal(f.context.costumeAt(end),'none');
  }
  assert.equal(f.context.costumeAt(Date.UTC(2027,10,10)),'none','Season 3 is a one-off release');
});
test('a seasonal cutoff immediately clears an outgoing hat blend without reloading', () => {
  let now=Date.UTC(2026,9,31,23)-1;
  const f=fixture(true,.6,{Date:class extends Date {static now(){return now;}}});
  f.context.visitor.paint(500,400,0,0);
  f.context.visitor.paint(500,400,0,0,0,false,false,'dive');
  const picture=f.nodes.find(n=>n.className==='menu-visitor-frame');
  const previous=picture.context.calls.filter(c=>c[0]==='drawImage').length;
  now++;
  f.context.visitor.paint(500,400,0,0);
  assert.equal(picture.context.calls.filter(c=>c[0]==='drawImage').length-previous,1,'expired hat is not retained in the outgoing blend');
});
