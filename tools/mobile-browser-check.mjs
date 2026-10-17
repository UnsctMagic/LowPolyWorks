// Real-browser layout and gesture regression check. Run the local server first.
// Set MOBILE_QA_DIR to a disposable output directory, CHROME_EXECUTABLE to Chrome,
// and PLAYWRIGHT_MODULE to an installed playwright-core module URL if not resolvable.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const root=process.env.MOBILE_QA_DIR;
if(!root)throw Error('Set MOBILE_QA_DIR to a disposable output directory.');
const origin=process.env.MOBILE_QA_URL||'http://127.0.0.1:4186';
const executablePath=process.env.CHROME_EXECUTABLE;
await fs.mkdir(path.join(root,'tmp'),{recursive:true});
process.env.TEMP=process.env.TMP=path.join(root,'tmp');
for(const action of ['catalogue','feed']){
 const file=path.join(root,action+'-live.json');
 try{await fs.access(file);}catch{
  const response=await fetch('https://lowpolyworks-vault.lowpolyworks-internal-tracker.workers.dev/api/publishing?action='+action);
  if(!response.ok)throw Error('Cannot read public '+action+' fixture: '+response.status);
  await fs.writeFile(file,await response.text());
 }
}
async function checkLayouts(){
const profile=await fs.mkdtemp(path.join(root,'checkLayouts-'));
const context=await chromium.launchPersistentContext(profile,{executablePath,headless:true,viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
await context.route('**/api/publishing?*',async r=>{const action=new URL(r.request().url()).searchParams.get('action');if(['feed','catalogue'].includes(action))return r.fulfill({contentType:'application/json',body:await fs.readFile(root+'/'+(action==='feed'?'feed':'catalogue')+'-live.json','utf8')});return r.continue();});
await context.route('**/website-camera-controls.js*',async r=>{const res=await r.fetch();return r.fulfill({response:res,body:(await res.text()).replace('return {controls,setMode,dispose()', 'window.__cameraTest={camera,controls};return {controls,setMode,dispose()')});});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const results=[];
const state=()=>page.evaluate(()=>({zoom:__cameraTest.camera.zoom,aspect:__cameraTest.camera.aspect,position:__cameraTest.camera.position.toArray(),target:__cameraTest.controls.target.toArray()}));
async function bounds(){return page.evaluate(()=>{const bad=[];const visible=e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height;for(const e of document.querySelectorAll('.controls button,.controls select,.controls input,.tabs button,.side-downloads a,.masthead a')){if(!visible(e))continue;const r=e.getBoundingClientRect(),p=e.closest('.controls,.tabs,.side-downloads,.masthead').getBoundingClientRect();if(r.left<p.left-1||r.right>p.right+1||e.scrollWidth>e.clientWidth+3&&e.tagName==='BUTTON')bad.push({tag:e.tagName,id:e.id,text:e.textContent,width:r.width,parent:p.width,scroll:e.scrollWidth,client:e.clientWidth});}return{width:innerWidth,body:document.documentElement.scrollWidth,bad,coarse:matchMedia('(pointer:coarse)').matches};});}
try{
for(const [width,height] of [[320,568],[390,844],[600,750],[768,1024],[1024,768],[1440,900],[844,390],[480,320]]){
 await page.setViewportSize({width,height});
 for(const route of ['/#feed','/#project/warhammercraft','/#army/warriors-of-chaos','/model/nurgle-champion/','/mdlxl/','/#acknowledgements']){
 await page.goto(origin+route,{waitUntil:'domcontentloaded'});
 if(route.includes('/model/'))await page.locator('#play:not([disabled])').waitFor();else if(route.includes('army/'))await page.locator('.model-card').first().waitFor();else if(route.includes('warhammercraft'))await page.locator('.army-card').first().waitFor();else if(route.includes('feed'))await page.locator('.post').first().waitFor();else await page.locator('#app h1').first().waitFor();
 if(route.includes('warhammercraft')){
  const formations=await page.locator('.formation-unit').evaluateAll(async images=>{await Promise.all(images.map(img=>img.decode()));return images.map(img=>({src:img.getAttribute('src'),ratio:img.getBoundingClientRect().height/img.parentElement.getBoundingClientRect().height}));});
  assert(formations.every(img=>img.ratio>0&&img.ratio<1.5),'Army formations must fit their card instead of using intrinsic image size');
 }
 const b=await bounds();results.push({route,width,height,...b});
 }
}
for(const route of ['/model/graveguard/','/model/bretonnian-archer/','/model/empire-captain/','/model/greenskin-black-orc/','/model/von-carstein-dread-knight/']){
 await page.setViewportSize({width:390,height:844});await page.goto(origin+route,{waitUntil:'domcontentloaded'});await page.locator('#play:not([disabled])').waitFor();await page.locator('#play').tap();const before=await page.locator('#model-canvas').evaluate(c=>c.toDataURL());await page.locator('#model-canvas').scrollIntoViewIfNeeded();const box=await page.locator('#model-canvas').boundingBox(),cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2+50,y:box.y+box.height/2+20,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);assert.notEqual(await page.locator('#model-canvas').evaluate(c=>c.toDataURL()),before);await cdp.detach();results.push({route,renderedAndTouchRotated:true});
}
// Exercise the uploaded-unit owner with an unchanged local MDX, since the live catalogue has no uploads.
await page.goto(origin+'/model/nurgle-champion/',{waitUntil:'domcontentloaded'});await page.locator('#play:not([disabled])').waitFor();
await page.evaluate(async()=>{const {renderUnitCard}=await import('/unit-card.js?v=20261018-mobile-layout');const card={id:'unit-touch-fixture',name:'Touch test',army:'warriors-of-chaos',projectId:'warhammercraft',byline:'Test fixture',description:'Viewer check',credits:'Model Base - local test model',models:[{assetId:'local',name:'WH_WOC_KnightNurgleChampion_04b.mdx',fileUrl:'/models/WH_WOC_KnightNurgleChampion_04b.mdx'}],defaultModelId:'local',downloads:[]};const rows=await fetch('/catalogue.json').then(r=>r.json());const row=rows.find(r=>r.id==='nurgle-champion');card.models[0].name=row.file;card.models[0].fileUrl='/models/'+row.file;window.__unitTest=await renderUnitCard(document.querySelector('#app'),card,{isCurrent:()=>true,recordUsage(){}});});await page.locator('#play:not([disabled])').waitFor();assert((await page.locator('#viewer-message').getAttribute('hidden'))!==null);results.push({uploadedUnitViewer:true,...await bounds()});await page.evaluate(()=>window.__unitTest.dispose());
// Resize a live paused viewer without resetting it: orbit and target remain, zoom follows aspect.
await page.setViewportSize({width:844,height:390});await page.goto(origin+'/model/nurgle-champion/',{waitUntil:'domcontentloaded'});await page.locator('#play:not([disabled])').waitFor();await page.locator('#play').tap();const wide=await state();await page.setViewportSize({width:320,height:568});await page.waitForTimeout(200);const narrow=await state();assert.deepEqual(wide.position,narrow.position);assert.deepEqual(wide.target,narrow.target);assert(Math.abs(narrow.zoom-wide.zoom*Math.min(1,narrow.aspect)/Math.min(1,wide.aspect))<.0001);await page.setViewportSize({width:844,height:390});await page.waitForTimeout(150);const back=await state();assert(Math.abs(back.zoom-wide.zoom)<.0001);results.push({resizeRoundTrip:true});
await page.setViewportSize({width:1024,height:768});await page.goto(origin+'/model/nurgle-champion/',{waitUntil:'domcontentloaded'});await page.locator('#play:not([disabled])').waitFor();await page.screenshot({path:root+'/small-window.png',fullPage:true});
await page.setViewportSize({width:768,height:1024});await page.goto(origin+'/#armies',{waitUntil:'domcontentloaded'});await page.locator('.army-card').first().waitFor();await page.locator('.formation-unit').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));await page.screenshot({path:root+'/armies-tablet.png',fullPage:true});
await fs.writeFile(root+'/final-audit.json',JSON.stringify({results,errors},null,2));const overflows=results.filter(r=>r.body>r.width||r.bad?.length);console.log(JSON.stringify({checks:results.length,overflows,errors},null,2));assert.deepEqual(overflows,[]);assert.deepEqual(errors,[]);
}finally{await context.close();await fs.rm(profile,{recursive:true,force:true});}

}

async function checkInteractions(){
const profile=await fs.mkdtemp(path.join(root,'checkInteractions-'));
const context=await chromium.launchPersistentContext(profile,{executablePath,headless:true,viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
await context.route('**/api/publishing?*',async r=>{const action=new URL(r.request().url()).searchParams.get('action');if(['feed','catalogue'].includes(action))return r.fulfill({contentType:'application/json',body:await fs.readFile(root+'/'+(action==='feed'?'feed':'catalogue')+'-live.json','utf8')});return r.continue();});
// Inspect the actual camera used by the page without adding a production debug API.
await context.route('**/website-camera-controls.js*',async r=>{const res=await r.fetch();return r.fulfill({response:res,body:(await res.text()).replace('return {controls,setMode,dispose()', 'window.__cameraTest={camera,controls};return {controls,setMode,dispose()')});});
const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));const results=[];
const state=()=>page.evaluate(()=>{const {camera:c,controls:o}=window.__cameraTest;return {position:c.position.toArray(),target:o.target.toArray(),zoom:c.zoom,scroll:scrollY,canvas:document.querySelector('#model-canvas').toDataURL()}});
const changed=(a,b)=>JSON.stringify(a)!==JSON.stringify(b);
const cdp=await context.newCDPSession(page);
async function gesture(start,end,cancel=false){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:start.map((p,id)=>({x:p[0],y:p[1],id}))});for(let n=1;n<=12;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:end.map((p,id)=>({x:start[id][0]+(p[0]-start[id][0])*n/12,y:start[id][1]+(p[1]-start[id][1])*n/12,id}))});await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});await page.waitForTimeout(100);}
try{
await page.goto(origin+'/model/nurgle-champion/',{waitUntil:'domcontentloaded'});await page.locator('#play:not([disabled])').waitFor();await page.locator('#play').tap();
await page.locator('#model-canvas').scrollIntoViewIfNeeded();
let box=await page.locator('#model-canvas').boundingBox();let x=box.x+box.width/2,y=box.y+box.height/2;
let a=await state();await gesture([[x-50,y]],[[x+50,y+25]]);let b=await state();assert(changed(a.position,b.position));assert(a.canvas!==b.canvas);assert(Math.abs(a.scroll-b.scroll)<2);results.push('One-finger rotation changes the rendered model without scrolling the page');
a=b;await gesture([[x-30,y],[x+30,y]],[[x-65,y],[x+65,y]]);b=await state();assert(b.zoom>a.zoom);assert(a.canvas!==b.canvas);results.push('Two-finger pinch zoom changes the rendered model');
a=b;await gesture([[x-30,y],[x+30,y]],[[x-10,y+30],[x+50,y+30]]);b=await state();assert(changed(a.target,b.target));results.push('Two-finger pan changes the camera target');
await page.locator('.viewer-settings>summary').tap();
await page.locator('#reset').tap();await page.waitForFunction(()=>window.__cameraTest.camera.zoom===1);await page.locator('#model-canvas').scrollIntoViewIfNeeded();a=await state();assert.equal(a.zoom,1);
await page.locator('#team').selectOption('#0042ff');await page.waitForTimeout(500);b=await state();assert(a.canvas!==b.canvas);results.push('Team-colour selection changes model pixels');
await page.locator('#sequence').selectOption({label:'Portrait - 1'});await page.waitForTimeout(300);assert(await page.locator('.viewport').evaluate(e=>e.classList.contains('portrait-mode')));await page.locator('#model-canvas').scrollIntoViewIfNeeded();box=await page.locator('#model-canvas').boundingBox();x=box.x+box.width/2;y=box.y+box.height/2;a=await state();await gesture([[x-30,y]],[[x+30,y+20]]);b=await state();assert(changed(a.position,b.position));assert(a.canvas!==b.canvas);results.push('Portrait animation remains touch-rotatable');
await page.locator('#sequence').selectOption({label:'Stand - 1'});await page.locator('#reset').tap();await page.locator('#model-canvas').scrollIntoViewIfNeeded();
await page.locator('.viewer').screenshot({path:root+'/mobile-viewer.png'});
await page.locator('#tab-credits').tap();assert.match(await page.locator('#tab-content').innerText(),/Model Base/);results.push('Credits tab is tappable');
await page.setViewportSize({width:844,height:390});await page.locator('#reset').tap();await page.locator('#model-canvas').scrollIntoViewIfNeeded();box=await page.locator('#model-canvas').boundingBox();assert(box.height<=390);a=await state();await gesture([[box.x+80,box.y+100]],[[box.x+160,box.y+100]]);b=await state();assert(changed(a.position,b.position));results.push('Landscape touch rotation and viewport fit');
// Mouse input on the same real viewer must still work after touch.
await page.setViewportSize({width:1280,height:900});await page.locator('#reset').click();await page.locator('#model-canvas').scrollIntoViewIfNeeded();box=await page.locator('#model-canvas').boundingBox();x=box.x+box.width/2;y=box.y+box.height/2;a=await state();await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+80,y+20,{steps:12});await page.mouse.up();await page.waitForTimeout(100);b=await state();assert(changed(a.position,b.position));assert(a.canvas!==b.canvas);results.push('Normal left-mouse rotation remains working');
a=b;await page.mouse.move(x,y);await page.mouse.down({button:'right'});await page.mouse.move(x+40,y+20,{steps:10});await page.mouse.up({button:'right'});await page.waitForTimeout(100);b=await state();assert(changed(a.target,b.target));a=b;await page.mouse.wheel(0,-100);await page.waitForTimeout(100);b=await state();assert(b.zoom>a.zoom);results.push('Right-mouse pan and wheel zoom remain working');
await gesture([[x,y]],[[x+10,y]],true);a=await state();await gesture([[x,y]],[[x-60,y]]);b=await state();assert(changed(a.position,b.position));results.push('Touch cancellation recovers for the next gesture');
assert.deepEqual(errors,[]);await fs.writeFile(root+'/interaction-results.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify(results,null,2));
}finally{await context.close();await fs.rm(profile,{recursive:true,force:true});}

}

await checkLayouts();
await checkInteractions();
