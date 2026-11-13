import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'file:///D:/Codex/lowpolyworks-rotation-qa/node_modules/playwright/index.mjs';
import {parseMDX} from '../dist/vendor/war3-model.mjs';
import {parseCompatibleMdx} from '../dist/warcraft-mdx-compatibility.js';
import {parseViewerSpawn} from '../dist/viewer-spawn-model.js';
import {gamePathKey,eventResourceKey} from '../dist/viewer-event-data.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=process.argv[2]||'http://127.0.0.1:52773/';
const failedOnly=process.argv.includes('--failed-only');
const firstReport=failedOnly?JSON.parse(fs.readFileSync(path.join(root,'output/local-tests/browser-report.json'))):null;
const failedNames=new Set(firstReport?.failed.map(f=>f.name)||[]);
const out=path.join(root,'output',failedOnly?'local-tests-rerun':'local-tests');
fs.mkdirSync(out,{recursive:true});
const catalogue=JSON.parse(fs.readFileSync(path.join(root,'dist/catalogue.json')));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist/event-resources.json')));
const models=new Map(catalogue.map(row=>{
 const bytes=fs.readFileSync(path.join(root,'dist/models',row.file));
 return [row.id,row.mdxCompatibility==='ribbon-color'?parseCompatibleMdx(bytes):parseMDX(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength))];
}));
const result={base,passed:[],failed:[],pageErrors:[],requests:[],warnings:[],models:[],coverage:{}};
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',env:{...process.env,TEMP:out,TMP:out}});
const sample=catalogue.find(r=>r.id==='great-unclean-one-of-nurgle');
const representative=[sample,catalogue.find(r=>r.id==='warrior-of-khorne'),catalogue.find(r=>/^blood-dragon/.test(r.id))].filter(Boolean);
const pause=async page=>{if((await page.locator('#play').textContent()).trim()==='Pause')await page.locator('#play').click();};
const pathFor=row=>'model/'+(row.slug||row.id)+'/';
async function settings(page){if(!await page.locator('.viewer-settings').evaluate(e=>e.open))await page.locator('.viewer-settings summary').click();}
async function ready(page,row){
 await page.goto(new URL(pathFor(row),base).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__modelReady===true,null,{timeout:90000});
 assert.equal(await page.locator('#sequence').isEnabled(),true,row.id+' ready controls');
 assert.equal(await page.locator('[data-viewer-effect]').count(),4);
 await settings(page);
}
async function slider(page,selector,value){
 const input=page.locator(selector),min=Number(await input.getAttribute('min')),step=Number(await input.getAttribute('step'));
 await input.focus();await input.press('Home');
 for(let n=0;n<Math.round((value-min)/step);n++)await input.press('ArrowRight');
 assert.equal(Number(await input.inputValue()),value,selector+' value');
}
const pixels=page=>page.locator('#model-canvas').evaluate(c=>c.toDataURL());
async function frame(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function newPage(width=1366){
 const context=await browser.newContext({viewport:{width,height:width===390?844:width===1920?1080:768}});
 const page=await context.newPage();
 page.on('pageerror',e=>result.pageErrors.push({url:page.url(),message:e.message}));
 page.on('console',m=>{if(m.type()==='warning'&&/Event |unavailable|prepared|Spawn renderer/.test(m.text()))result.warnings.push({url:page.url(),message:m.text()});});
 page.on('response',r=>{if(r.status()>=400)result.requests.push({url:r.url(),status:r.status()});});
 await page.addInitScript(()=>{
  window.__qa={draws:[],frames:[],starts:0,stops:0,active:new Set(),contexts:[],decalUniforms:0,decalDrawCalls:0};
  const q=window.__qa,Native=window.AudioContext;
  window.AudioContext=class extends Native{constructor(...a){super(...a);q.contexts.push(this);}};
  const start=AudioBufferSourceNode.prototype.start,stop=AudioBufferSourceNode.prototype.stop;
  AudioBufferSourceNode.prototype.start=function(...a){q.starts++;q.active.add(this);this.addEventListener('ended',()=>q.active.delete(this),{once:true});return start.apply(this,a);};
  AudioBufferSourceNode.prototype.stop=function(...a){q.stops++;q.active.delete(this);return stop.apply(this,a);};
  const proto=WebGL2RenderingContext.prototype,get=proto.getUniformLocation,uniform=proto.uniform1f,draw=proto.drawArrays,names=new WeakMap();
  proto.getUniformLocation=function(p,n){const loc=get.call(this,p,n);if(loc)names.set(loc,n);return loc;};
  proto.uniform1f=function(loc,v){if(names.get(loc)==='fade'){q.decalUniforms++;q.lastFade=v;}return uniform.call(this,loc,v);};
  proto.drawArrays=function(...a){if(q.lastFade!==undefined){q.decalDrawCalls++;q.lastFade=undefined;}return draw.apply(this,a);};
 });
 await page.route('**/viewer-events.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const replacements=[
   ['decals.render(resource.texture,state,world,camera);',
    "decals.render(resource.texture,state,world,camera);window.__qa.draws.push({kind:'decal',key,name:state.event.Name,age:state.ageMs,fade:viewerDecalSample(state.definition,state.ageMs).fade,x:world.elements[12],travel:state.travelMs,wall:performance.now()});"],
   ['native.render(matrix.elements,camera.projectionMatrix.elements,{wireframe:false,useEnvironmentMap:false});',
    "native.render(matrix.elements,camera.projectionMatrix.elements,{wireframe:false,useEnvironmentMap:false});window.__qa.draws.push({kind:'spawn',key,name:state.event.Name,age:state.ageMs,wall:performance.now()});"],
   ['if(delta>0)soundFrom=sample.globalTime;previous=sample;',
    "if(delta>0)soundFrom=sample.globalTime;window.__qa.sample={time:sample.globalTime,sequence:sample.sequenceIndex,revision:sample.revision};window.__qa.frames.push({wall:performance.now(),keys:[...instances.keys()]});previous=sample;"]
  ];
  for(const [before,after]of replacements){assert(body.includes(before),'Test probe anchor missing');body=body.replace(before,after);}
  await route.fulfill({response,body});
 });
 return {page,context};
}
async function check(name,fn){
 if(failedOnly&&!failedNames.has(name)&&name!=='no runtime or event resource errors')return;
 try{const evidence=await fn();result.passed.push(name);if(evidence!==undefined)result.coverage[name]=evidence;console.log('PASS '+name);}
 catch(e){result.failed.push({name,error:e.stack});console.log('FAIL '+name+': '+e.message);}
 fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(result,null,2));
}
async function navigation(page){
 await pause(page);
 const orbit=page.locator('#orbit');if(await orbit.count()&&await orbit.getAttribute('aria-pressed')==='true')await orbit.click();
 await page.locator('[data-viewer-effect="events"]').uncheck();await page.locator('[data-viewer-effect="spawns"]').uncheck();
 const canvas=page.locator('#model-canvas');await canvas.scrollIntoViewIfNeeded();await frame(page);
 let box=await canvas.boundingBox(),before=await pixels(page);
 await page.mouse.move(box.x+box.width*.3,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.55,{steps:10});await page.mouse.up();await frame(page);
 assert.notEqual(await pixels(page),before,'Mouse rotation changed no pixels');
 before=await pixels(page);await page.mouse.move(box.x+box.width*.45,box.y+box.height*.45);await page.mouse.down({button:'right'});await page.mouse.move(box.x+box.width*.55,box.y+box.height*.55,{steps:6});await page.mouse.up({button:'right'});await frame(page);
 assert.notEqual(await pixels(page),before,'Mouse pan changed no pixels');
 before=await pixels(page);await page.mouse.wheel(0,-250);await page.waitForTimeout(250);assert.notEqual(await pixels(page),before,'Wheel zoom changed no pixels');
 await page.locator('#reset').click();await frame(page);
 await page.locator('[data-viewer-effect="events"]').check();await page.locator('[data-viewer-effect="spawns"]').check();
}
async function controls(page,row){
 await ready(page,row);
 for(const key of ['sounds','events','spawns','emitters']){const box=page.locator('[data-viewer-effect="'+key+'"]');assert(await box.isChecked(),key+' default');await box.uncheck();assert(!await box.isChecked());await box.check();}
 await pause(page);assert.equal((await page.locator('#play').textContent()).trim(),'Play');await page.locator('#play').click();
 const loop=page.locator('#loop-animation'),initial=await loop.getAttribute('aria-pressed');await loop.click();assert.notEqual(await loop.getAttribute('aria-pressed'),initial);await loop.click();
 for(const value of [.25,1,2])await slider(page,'#speed',value);
 for(const value of [.25,12,1])await slider(page,'#orbit-speed',value);
 await page.locator('#orbit').click();assert.equal(await page.locator('#orbit').getAttribute('aria-pressed'),'true');await page.locator('#orbit').click();
 for(const lighting of ['none','portrait','game'])await page.locator('#lighting').selectOption(lighting);
 await pause(page);await page.locator('[data-viewer-effect="events"]').uncheck();await page.locator('[data-viewer-effect="spawns"]').uncheck();
 const team=page.locator('#team'),opts=await team.locator('option').evaluateAll(nodes=>nodes.map(n=>n.value));
 const before=await pixels(page);await team.selectOption(opts[1]);await page.waitForTimeout(250);const after=await pixels(page);if(models.get(row.id).Textures.some(t=>t.ReplaceableId===1))assert.notEqual(after,before,'Team colour changed no model pixels');await team.selectOption(opts[0]);
 await navigation(page);
 for(const name of ['description','credits','changelog']){await page.locator('#tab-'+name).click();assert.equal(await page.locator('#tab-'+name).getAttribute('aria-selected'),'true');}
 const download=page.locator('a[data-download="mdx"]').first();assert(await download.count(),'MDX download link');const [saved]=await Promise.all([page.waitForEvent('download'),download.click()]);assert.equal(await saved.failure(),null,'MDX download completed');assert.deepEqual(fs.readFileSync(await saved.path()),fs.readFileSync(path.join(root,'dist/models',row.file)),'Downloaded bytes');
}
function eventPlan(predicate){
 for(const row of catalogue){const model=models.get(row.id);
  for(const [sequence,seq]of model.Sequences.entries()){const event=model.EventObjects?.find(e=>predicate(e,seq)&&Array.from(e.EventTrack||[]).some(t=>t>=seq.Interval[0]&&t<=seq.Interval[1]));
   if(event)return {row,model,sequence,event};
  }
 }throw Error('No real model fixture satisfies event coverage');
}
async function selectPlayback(page,plan,speed=1,loop=true){
 await ready(page,plan.row);await pause(page);await slider(page,'#speed',speed);await page.locator('#sequence').selectOption(String(plan.sequence));
 await pause(page);const button=page.locator('#loop-animation');if((await button.getAttribute('aria-pressed')==='true')!==loop)await button.click();
 // Changing Loop twice resets the clock without synthesizing a UI event.
 await button.click();await button.click();await pause(page);
 await page.evaluate(()=>{window.__qa.draws=[];window.__qa.frames=[];});
 await page.locator('#play').click();
}
async function audio(page,row){
 const model=models.get(row.id),sequence=model.Sequences.findIndex(s=>model.EventObjects?.some(e=>/^SND/i.test(e.Name)&&e.EventTrack?.some(t=>t>=s.Interval[0]&&t<=s.Interval[1])&&manifest.events[eventResourceKey(e.Name)]?.files?.length));
 if(sequence<0)return {model:row.id,noAuthoredSoundInSequence:true};
 const plan={row,model,sequence},span=model.Sequences[sequence].Interval[1]-model.Sequences[sequence].Interval[0];
 await selectPlayback(page,plan,2,true);
 await page.waitForFunction(span=>window.__qa.sample?.time>=span,span,{timeout:90000});
 const first=await page.evaluate(()=>window.__qa.starts);assert(first>0,row.id+' first-loop audio');
 await page.waitForFunction(span=>window.__qa.sample?.time>=span*3,span,{timeout:180000});
 assert.equal(await page.evaluate(()=>window.__qa.starts),first,'Automatic loops replayed audio');
 await pause(page);const stopped=await page.evaluate(()=>window.__qa.starts);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__qa.starts),stopped);
 await page.locator('#loop-animation').click();await page.locator('#loop-animation').click();await pause(page);await page.locator('#play').click();await page.waitForFunction(n=>window.__qa.starts>n,first,{timeout:90000});
 const stopBefore=await page.evaluate(()=>({stops:window.__qa.stops,active:window.__qa.active.size}));
 await page.locator('[data-viewer-effect="sounds"]').uncheck();
 const muted=await page.evaluate(()=>({starts:window.__qa.starts,active:window.__qa.active.size,stops:window.__qa.stops}));
 assert.equal(muted.active,0);assert(muted.stops>=stopBefore.stops,'Mute stop count');
 await page.waitForTimeout(Math.min(span/2+100,10000));assert.equal(await page.evaluate(()=>window.__qa.starts),muted.starts);
 await page.reload();await page.waitForFunction(()=>window.__modelReady===true,null,{timeout:90000});await settings(page);assert(!await page.locator('[data-viewer-effect="sounds"]').isChecked(),'Sound persistence on reload');
 const another=catalogue.find(r=>r.id!==row.id);await ready(page,another);assert(!await page.locator('[data-viewer-effect="sounds"]').isChecked(),'Sound persistence on navigation');
 await page.locator('[data-viewer-effect="sounds"]').check();
 await selectPlayback(page,plan,2,false);
 await page.waitForFunction(()=>document.querySelector('#play').textContent.trim()==='Play',null,{timeout:90000});const endCount=await page.evaluate(()=>window.__qa.starts);
 assert(endCount>0,'Nonloop sounds');await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.__qa.starts),endCount);
 await page.locator('#play').click();await page.waitForFunction(n=>window.__qa.starts>n,endCount,{timeout:90000});
 return {model:row.id,sequence:model.Sequences[sequence].Name,firstLoopStarts:first,automaticLoopsSilent:2,explicitReplay:true,persistence:true,nonLoop:true,activeBeforeMute:stopBefore.active,sourcesStoppedByMute:muted.stops-stopBefore.stops};
}
async function decals(page){
 const plan=eventPlan((e,s)=>/^FPT/i.test(e.Name)&&s.MoveSpeed>0&&manifest.events[eventResourceKey(e.Name)]?.lifeSpanMs>=1500),runs=[];
 for(const speed of [.25,1,2]){
  await selectPlayback(page,plan,speed,true);await page.locator('[data-viewer-effect="spawns"]').uncheck();
  await page.waitForFunction(name=>window.__qa.draws.some(d=>d.name===name),plan.event.Name,{timeout:90000});
  const key=await page.evaluate(name=>window.__qa.draws.find(d=>d.name===name).key,plan.event.Name);
  await page.waitForTimeout(1650);
  const draws=await page.evaluate(key=>window.__qa.draws.filter(d=>d.key===key),key);
  assert(draws.length>4,'Footprint draws');
  const closest=age=>draws.reduce((a,b)=>Math.abs(b.age-age)<Math.abs(a.age-age)?b:a);
  const before=closest(950),half=closest(1250),last=draws.at(-1);
  assert.equal(before.fade,1);assert(Math.abs(half.age-1250)<90&&Math.abs(half.fade-.5)<.18,'Half fade timing');
  assert(last.age<1500&&last.age>1400,'1.5 second maximum');
  assert(draws.at(-1).x<draws[0].x,'Footprint backward motion');
  const removed=await page.evaluate(key=>!window.__qa.frames.at(-1).keys.includes(key),key);assert(removed,'Expired decal still active');
  assert(await page.evaluate(()=>window.__qa.decalUniforms>0&&window.__qa.decalDrawCalls>0),'Real decal GL draw/uniform');
  await pause(page);const frozen=await page.evaluate(()=>window.__qa.draws.at(-1));await page.waitForTimeout(100);const frozenAfter=await page.evaluate(()=>window.__qa.draws.at(-1));if(frozen&&frozenAfter&&frozen.key===frozenAfter.key)assert.equal(frozen.age,frozenAfter.age,'Pause decal age');
  await page.locator('[data-viewer-effect="events"]').uncheck();await frame(page);assert.equal(await page.evaluate(()=>window.__qa.frames.at(-1).keys.length),0,'Events off clears active decals');
  runs.push({speed,first:draws[0],half,last,draws:draws.length});
 }
 return {model:plan.row.id,event:plan.event.Name,runs};
}
async function spawned(page){
 const plan=eventPlan(e=>/^SPN.UDIS$/i.test(e.Name));
 const def=manifest.events[eventResourceKey(plan.event.Name)],file=manifest.files[gamePathKey(def.resourcePath)];
 const model=parseViewerSpawn(fs.readFileSync(path.join(root,'dist',file)),def.resourcePath);
 const duration=model.Sequences[0].Interval[1]-model.Sequences[0].Interval[0];assert.equal(duration,3333);
 await selectPlayback(page,plan,1,true);await page.locator('[data-viewer-effect="emitters"]').uncheck();await page.locator('[data-viewer-effect="events"]').uncheck();
 await page.waitForFunction(name=>window.__qa.draws.some(d=>d.kind==='spawn'&&d.name===name),plan.event.Name,{timeout:90000});
 const key=await page.evaluate(name=>window.__qa.draws.find(d=>d.kind==='spawn'&&d.name===name).key,plan.event.Name);
 await page.waitForTimeout(3450);const draws=await page.evaluate(key=>window.__qa.draws.filter(d=>d.key===key),key);
 result.coverage.spawnEvidence={duration,key,first:draws[0],last:draws.at(-1),samples:draws.length};assert(draws.some(d=>d.age>3100),'Spawn lifetime check did not observe the final portion');assert(draws.every(d=>d.age<duration),'Spawn exceeded duration');
 assert(!await page.evaluate(key=>window.__qa.frames.at(-1).keys.includes(key),key),'Spawn did not expire');
 await page.locator('[data-viewer-effect="spawns"]').uncheck();await frame(page);assert.equal(await page.evaluate(()=>window.__qa.frames.at(-1).keys.length),0,'Spawns off clear');
 return {model:plan.row.id,duration,emittersOff:true,last:draws.at(-1),draws:draws.length};
}
try{
 await check('all event resource mappings and current model dependencies',async()=>{
  let spawns=0;const unique=new Set(Object.values(manifest.files));
  for(const file of unique){assert(fs.statSync(path.join(root,'dist',file)).size>0,file);}
  for(const def of Object.values(manifest.events)){
   if(def.unavailable||def.empty)continue;
   for(const name of def.files||[def.resourcePath])assert(manifest.files[gamePathKey(name)],name);
   if(def.type==='SPN'){const source=parseViewerSpawn(fs.readFileSync(path.join(root,'dist',manifest.files[gamePathKey(def.resourcePath)])),def.resourcePath);spawns++;
    for(const t of source.Textures||[])if(t.Image&&![1,2].includes(t.ReplaceableId))assert(manifest.files[gamePathKey(t.Image)],t.Image);
   }
  }
  let references=0;for(const [id,model]of models)for(const event of model.EventObjects||[]){if(!/^(SND|FPT|SPL|UBR|SPN)/i.test(event.Name))continue;const def=manifest.events[eventResourceKey(event.Name)];assert(def&&!def.unavailable,id+': '+event.Name);references++;}
  return {files:unique.size,spawns,references,knownUnusedNativeExceptions:Object.values(manifest.events).filter(d=>d.unavailable).length};
 });
 for(const width of [1920,1366,390]){const {page,context}=await newPage(width);
  await check('click controls and mouse navigation '+width,async()=>{
   await controls(page,sample);
   const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('[data-viewer-effect]')].map(e=>({key:e.dataset.viewerEffect,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))}));
   assert(!layout.overflow,'Horizontal overflow');assert(layout.buttons.every(b=>b.left>=0&&b.right<=width),'Checkbox overflow');
   await page.locator('.viewer').scrollIntoViewIfNeeded();if(width!==1366)await page.screenshot({path:path.join(out,width===390?'viewer-mobile.png':'viewer-desktop.png'),fullPage:false});
   return layout;
  });await context.close();
 }
 const {page,context}=await newPage();
 await check('every catalogue model loads',async()=>{for(const row of catalogue){await ready(page,row);await frame(page);result.models.push(row.id);}return result.models.length;});
 for(const row of representative){
  await check('all sequences '+row.id,async()=>{await ready(page,row);await page.locator('#lighting').selectOption('game');const names=await page.locator('#sequence option').allTextContents();
   for(let i=0;i<names.length;i++){await page.locator('#sequence').selectOption(String(i));await frame(page);if(/portrait/i.test(names[i])){assert.equal(await page.locator('#lighting').inputValue(),'portrait');const normal=names.findIndex(n=>!/portrait/i.test(n));if(normal>=0){await page.locator('#sequence').selectOption(String(normal));assert.equal(await page.locator('#lighting').inputValue(),'game');}}}return names;});
  await check('variant links '+row.id,async()=>{await ready(page,row);const ids=await page.locator('[data-variant]').evaluateAll(a=>a.map(e=>e.dataset.variant));for(const id of ids){const link=page.locator('[data-variant="'+id+'"]');if(await link.getAttribute('aria-selected')==='true')continue;await page.evaluate(()=>window.__modelReady=false);await link.click();await page.waitForFunction(()=>window.__modelReady===true,null,{timeout:90000});assert(page.url().includes('/model/'+id+'/'));}return ids;});
  await check('sound playback '+row.id,()=>audio(page,row));
 }
 await check('decal lifetime fade motion and toggles',()=>decals(page));
 await check('spawn duration and independent emitter switch',()=>spawned(page));
 await check('Bird Attack supported sequence',async()=>{
  await ready(page,sample);const bird=page.locator('#bird-attack');assert(await bird.count(),'Bird Attack control');
  await bird.click();await page.waitForFunction(()=>/death|decay/i.test(document.querySelector('#sequence option:checked').textContent),null,{timeout:30000});
 });
 await check('uploaded model viewer',async()=>{
  await page.goto(new URL('/#acknowledgements',base).href);await page.waitForFunction(()=>/Acknowledgements/i.test(document.querySelector('#app')?.textContent||''));
  await page.evaluate(async row=>{
   const {renderUnitCard}=await import('/unit-card.js?v=20261113-viewer-events');window.__modelReady=false;
   window.__fixtureOwner=await renderUnitCard(document.querySelector('#app'),{id:'unit-fixture',name:'Fixture',description:'Fixture',credits:'Fixture',byline:'Fixture',projectName:'Fixture',army:row.army,downloads:[],models:[{assetId:'fixture',name:row.file,fileUrl:'/models/'+row.file,textureFiles:row.textureFiles}],defaultModelId:'fixture'},{isCurrent:()=>true,recordUsage:()=>{}});
  },sample);
  await page.waitForFunction(()=>window.__modelReady===true,null,{timeout:90000});await settings(page);
  for(const key of ['sounds','events','spawns','emitters']){const box=page.locator('[data-viewer-effect="'+key+'"]');await box.uncheck();await box.check();}
  await navigation(page);await page.locator('#tab-credits').click();await page.locator('#tab-description').click();
  await page.evaluate(()=>window.__fixtureOwner.dispose());return true;
 });
 await check('all shared sound files decode',async()=>{
  await ready(page,sample);
  const repairedSounds=['war3.w3mod:Abilities/Spells/NightElf/BattleRoar/BattleRoar.flac','war3.w3mod:Abilities/Spells/Other/Parasite/Parasite.flac','war3.w3mod:Abilities/Spells/Items/AIso/SoulGem.flac'];
  const files=[...new Set((failedOnly?repairedSounds:Object.values(manifest.events).flatMap(d=>d.files||[])).map(n=>manifest.files[gamePathKey(n)]))];
  const failures=await page.evaluate(async files=>{const ctx=new AudioContext(),failures=[];for(let i=0;i<files.length;i+=12)await Promise.all(files.slice(i,i+12).map(async file=>{try{const r=await fetch('/'+file);if(!r.ok)throw Error(String(r.status));await ctx.decodeAudioData(await r.arrayBuffer());}catch(e){failures.push({file,error:e.message});}}));await ctx.close();return failures;},files);
  assert.deepEqual(failures,[]);return {decoded:files.length,reusedPassingDecodes:failedOnly?new Set(Object.values(manifest.events).flatMap(d=>d.files||[]).map(n=>manifest.files[gamePathKey(n)])).size-files.length:0};
 });
 await context.close();
 await check('no runtime or event resource errors',()=>{assert.deepEqual(result.pageErrors,[]);assert.deepEqual(result.requests,[]);assert.deepEqual(result.warnings,[]);});
}finally{
 await browser.close();fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(result,null,2));
}
console.log(JSON.stringify({passed:result.passed.length,failed:result.failed.length,models:result.models.length,output:out}));
if(result.failed.length)process.exitCode=1;
