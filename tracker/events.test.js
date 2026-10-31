import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';import {randomUUID} from 'node:crypto';
import {authorized,eventPath,summarize as summarizeEvents,trackedModels,validateEvent as validateModelEvent} from './lib/events.js';
import {createEventsHandler} from './api/events.js';
import {createReportHandler} from './api/report.js';
const catalogue=JSON.parse(fs.readFileSync(new URL('../dist/catalogue.json',import.meta.url),'utf8'));
const models=catalogue.map(model=>({id:model.id,name:model.name,hasPack:Boolean(model.downloadPack)}));
const validateEvent=input=>validateModelEvent(input,models);
const summarize=(blobs,options={})=>summarizeEvents(blobs,{models,...options});
const id='f5de7cba-f71f-4b51-9af4-5468d5877f11',now=new Date('2026-10-05T21:00:00Z');
function response(){return {setHeader(){},status(code){this.statusCode=code;return this;},end(){},json(body){this.body=body;}};}
test('country collection uses Vercel location, discards client geography and stores no IP',async()=>{
 const blobs=[],events=[],collect=createEventsHandler({writeBlob:async(pathname,data)=>{const event=JSON.parse(data);events.push(event);blobs.push({pathname,uploadedAt:event.recordedAt});}});
 for(const country of [' nl ',undefined,'invalid', ['US']]){
  const res=response();await collect({method:'POST',headers:{origin:'https://www.lowpolyworks.com','x-vercel-ip-country':country,'x-forwarded-for':'192.0.2.1','x-vercel-ip-city':'Amsterdam'},body:{id:randomUUID(),visitorId:id,kind:'visit',country:'US',ip:'192.0.2.2'}},res);
  assert.equal(res.statusCode,204);
 }
 assert.deepEqual(events.map(event=>event.country),['NL','ZZ','ZZ','ZZ']);
 assert(blobs[0].pathname.includes('/v3/'));assert(blobs[0].pathname.includes('/'+id+'/NL/'));
 assert(!JSON.stringify(events).includes('192.0.2'));assert(!JSON.stringify(events).includes('Amsterdam'));
 const report=summarize(blobs);assert.equal(report.totals.pageLoads,4);assert.equal(report.totals.uniqueVisitors,1);
 assert.deepEqual(report.countries,[{code:'NL',name:'Netherlands',uniqueVisitors:1,share:1}]);
});
test('country shares preserve old totals, deduplicate browsers and use the first known country',()=>{
 const other=randomUUID(),unknown=randomUUID(),day2=new Date('2026-10-06T21:00:00Z');
 const visit={id:randomUUID(),kind:'visit',model:'site',format:'none',visitorId:id};
 const blob=(event,at=now)=>({pathname:eventPath(event,at),uploadedAt:at});
 const blobs=[blob(visit),blob({...visit,country:'US',id:randomUUID()}),blob({...visit,country:'US',id:randomUUID()}),blob({...visit,country:'NL'},day2),blob({...visit,visitorId:other,country:'NL'}),blob({...visit,visitorId:unknown}),blob({...visit,visitorId:undefined,country:'US'}),blob({...visit,visitorId:undefined}),blob({...visit,visitorId:randomUUID(),country:'DE',testing:true}),blob({...visit,kind:'download',model:'mdlxl',format:'zip',country:'US'})];
 const report=summarize(blobs.reverse());
 assert.deepEqual(report.totals,{pageLoads:8,downloadClicks:1,modelViews:0,uniqueVisitors:3});
 assert.deepEqual(report.coverage,{identifiedPageLoads:6,unidentifiedPageLoads:2});
 assert.deepEqual(report.countries,[{code:'NL',name:'Netherlands',uniqueVisitors:1,share:1/3},{code:'US',name:'United States',uniqueVisitors:1,share:1/3},{code:'ZZ',name:'Unknown',uniqueVisitors:1,share:1/3}]);
 assert.equal(report.countries.reduce((sum,row)=>sum+row.uniqueVisitors,0),report.totals.uniqueVisitors);
 assert.equal(report.countries.reduce((sum,row)=>sum+row.share,0),1);
 assert.deepEqual(summarize(blobs,{from:'2026-10-06'}).countries,[{code:'NL',name:'Netherlands',uniqueVisitors:1,share:1}]);
 assert.deepEqual(summarize(blobs,{from:'2026-10-07'}).countries,[]);
 const returned=summarize([...blobs,blob({...visit,visitorId:unknown,country:'US'},day2)]);
 assert.equal(returned.countries.find(row=>row.code==='US').uniqueVisitors,2);assert(!returned.countries.some(row=>row.code==='ZZ'));
 assert(!JSON.stringify(report).includes(id));assert(!JSON.stringify(report).includes(other));
});
test('private country reports keep authentication and aggregate across listing pages',async()=>{
 const blob=(visitorId,country)=>({pathname:eventPath({id:randomUUID(),kind:'visit',model:'site',format:'none',visitorId,country},now),uploadedAt:now});
 const pages=[[blob(id,'US')],[blob(randomUUID(),'NL')]],handler=createReportHandler({loadModels:async()=>models,listBlobs:async({cursor})=>({blobs:pages[cursor?1:0],hasMore:!cursor,cursor:'next'}),env:{USAGE_READ_TOKEN:'secret'}});
 const denied=response();await handler({method:'GET',url:'/api/report',headers:{}},denied);assert.equal(denied.statusCode,401);
 const res=response();await handler({method:'GET',url:'/api/report',headers:{authorization:'Bearer secret'}},res);
 assert.equal(res.statusCode,200);assert.equal(res.body.totals.uniqueVisitors,2);assert.equal(res.body.countries.length,2);assert(res.body.countries.every(row=>row.share===0.5));assert(!JSON.stringify(res.body).includes(id));
});
test('newly published models are accepted and reported without restarting the tracker',async t=>{
 let published=[{id:'existing-model',name:'Existing Model'}];
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  assert.match(url,/^https:\/\/www\.lowpolyworks\.com\/catalogue\.json\?tracking=\d+$/);
  assert.equal(options.cache,'no-store');
  return {ok:true,json:async()=>structuredClone(published)};
 });
 const blobs=[];
 const collect=createEventsHandler({loadModels:()=>trackedModels({loadUnits:async()=>[]}),writeBlob:async(pathname,data)=>{
  const event=JSON.parse(data);blobs.push({pathname,uploadedAt:event.recordedAt});
 }});
 const read=createReportHandler({loadModels:()=>trackedModels({loadUnits:async()=>[]}),listBlobs:async()=>({blobs,hasMore:false}),env:{USAGE_READ_TOKEN:'secret'}});
 async function download(model,format){
  const res=response();
  await collect({method:'POST',headers:{origin:'https://www.lowpolyworks.com'},body:JSON.stringify({id:randomUUID(),kind:'download',model,format})},res);
  return res.statusCode;
 }
 assert.equal(await download('future-model','mdx'),400);
 assert.equal(await download('existing-model','mdx'),204);
 published.push({id:'future-model',name:'Future Model',downloadPack:'downloads/future-model.zip'});
 assert.equal(await download('future-model','mdx'),204);
 assert.equal(await download('future-model','pack'),204);
 assert.equal(await download('existing-model','pack'),400);
 assert.equal(await download('not-in-catalogue','mdx'),400);
 const res=response();
 await read({method:'GET',url:'/api/report',headers:{authorization:'Bearer secret'}},res);
 assert.equal(res.statusCode,200);
 assert.deepEqual(res.body.models,[
  {id:'future-model',name:'Future Model',mdxClicks:1,packClicks:1,total:2,views:0},
  {id:'existing-model',name:'Existing Model',mdxClicks:1,packClicks:0,total:1,views:0},
 ]);
 assert.equal(res.body.totals.downloadClicks,3);
});
test('catalogue outages are explicit and do not prevent visits or application tracking',async t=>{
 t.mock.method(globalThis,'fetch',async()=>({ok:false,status:503}));
 t.mock.method(console,'error',()=>{});
 await assert.rejects(trackedModels(),/Tracking catalogue unavailable/);
 const written=[],collect=createEventsHandler({writeBlob:async(_path,data)=>written.push(JSON.parse(data))});
 for(const [kind,model,format,status] of [['visit',undefined,undefined,204],['download','mdlxl','zip',204],['download','future-model','mdx',503]]){
  const res=response();await collect({method:'POST',headers:{origin:'https://www.lowpolyworks.com'},body:{id:randomUUID(),kind,model,format}},res);
  assert.equal(res.statusCode,status);
 }
 assert.equal(written.length,2);
 const read=createReportHandler({listBlobs:async()=>({blobs:[],hasMore:false}),env:{USAGE_READ_TOKEN:'secret'}}),res=response();
 await read({method:'GET',url:'/api/report',headers:{authorization:'Bearer secret'}},res);
 assert.equal(res.statusCode,503);
});
test('every catalogue download is accepted and reports its own item and format',()=>{
 const blobs=[];
 for(const model of catalogue){
  for(const format of model.downloadPack?['mdx','pack']:['mdx']){
   const event=validateEvent({id:randomUUID(),kind:'download',model:model.id,format});
   assert(event,`${model.id} ${format} download must be accepted`);
   blobs.push({pathname:eventPath(event,now),uploadedAt:now});
  }
 }
 const report=summarize(blobs);
 assert.equal(report.models.length,catalogue.length);
 assert.equal(report.totals.downloadClicks,blobs.length);
 for(const model of catalogue){
  assert.deepEqual(report.models.find(row=>row.id===model.id),{id:model.id,name:model.name,mdxClicks:1,packClicks:model.downloadPack?1:0,total:model.downloadPack?2:1,views:0});
 }
});
test('MDLxL ZIP clicks are accepted and reported separately from model files',()=>{
 const input={id,kind:'download',model:'mdlxl',format:'zip',visitorId:id};
 assert.deepEqual(validateEvent(input),{...input,testing:false});
 for(const format of ['mdx','pack','exe'])assert.equal(validateEvent({...input,format}),null);
 assert.equal(validateEvent({...input,model:'not-an-app'}),null);
 const blob=event=>({pathname:eventPath(event,now),uploadedAt:now});
 const report=summarize([blob(input),blob({...input,testing:true}),blob({...input,format:'mdx'}),blob({...input,model:'tzeentch-sword',format:'pack'})]);
 assert.deepEqual(report.totals,{pageLoads:0,downloadClicks:2,modelViews:0,uniqueVisitors:1});
 assert.deepEqual(report.applications,[{id:'mdlxl',name:'MDLxL',zipClicks:1,total:1}]);
 assert.equal(report.models.length,catalogue.length);assert.deepEqual(report.models[0],{id:'tzeentch-sword',name:catalogue.find(model=>model.id==='tzeentch-sword').name,mdxClicks:0,packClicks:1,total:1,views:0});
 assert.equal(report.daily[0].downloadClicks,2);
 assert.equal(summarize([blob(input)],{from:'2026-10-06'}).applications[0].total,0);
});
test('statistics require the exact private token',()=>{
 assert.equal(authorized(undefined,'secret'),false);assert.equal(authorized('Bearer bad','secret'),false);assert.equal(authorized('Bearer secret',''),false);assert.equal(authorized('Bearer secret','secret'),true);
});
test('only known downloads and anonymous visit payloads are accepted',()=>{
 assert.equal(validateEvent({id,kind:'download',model:'not-a-model',format:'mdx'}),null);
 assert.equal(validateEvent({id:'bad',kind:'visit'}),null);
 assert.equal(validateEvent({id,kind:'download',model:'khorne-axe',format:'javascript'}),null);
 const valid=validateEvent({id,kind:'download',model:'tzeentch-sword',format:'mdx',ip:'discarded',name:'discarded'});
 assert.equal(valid.model,'tzeentch-sword');assert.equal('ip' in valid,false);assert.equal('name' in valid,false);
});
test('test events never enter the live report; MDX and pack counts remain separate',()=>{
 const visit={id,kind:'visit',model:'site',format:'none'},download={id,kind:'download',model:'tzeentch-sword',format:'mdx'};
 const blobs=[visit,download,{...download,format:'pack'},{...download,testing:true}].map(event=>({pathname:eventPath(event,now),uploadedAt:now}));
 const report=summarize(blobs);assert.deepEqual(report.totals,{pageLoads:1,downloadClicks:2,modelViews:0,uniqueVisitors:0});assert.equal(report.coverage.unidentifiedPageLoads,1);assert.equal(report.models[0].mdxClicks,1);assert.equal(report.models[0].packClicks,1);
 assert.equal(summarize(blobs,{from:'2026-10-06'}).totals.downloadClicks,0);
});

test('visitor IDs are optional for older clients and validated for new clients',()=>{
 assert.equal(validateEvent({id,kind:'visit',visitorId:'not-a-uuid'}),null);
 assert.equal(validateEvent({id,kind:'download',model:'khorne-axe',format:'mdx',visitorId:'bad'}),null);
 assert.equal(validateEvent({id,kind:'visit',visitorId:id.toUpperCase()}).visitorId,id);
 assert.equal('visitorId' in validateEvent({id,kind:'visit'}),false);
});

test('refreshes, return visits and downloads count one browser across dates',()=>{
 const other='aa0ec2ea-2a98-4f4b-9b10-42e20e9c853b',day2=new Date('2026-10-06T21:00:00Z');
 const blob=(event,at=now)=>({pathname:eventPath(event,at),uploadedAt:at});
 const visit={id,kind:'visit',model:'site',format:'none',visitorId:id};
 const blobs=[blob(visit),blob({...visit,id:other}),blob(visit,day2),blob({...visit,visitorId:other},day2),blob({...visit,kind:'download',model:'tzeentch-sword',format:'mdx'},day2),blob({...visit,visitorId:'0a0ec2ea-2a98-4f4b-9b10-42e20e9c853b',testing:true})];
 const report=summarize(blobs);assert.deepEqual(report.totals,{pageLoads:4,downloadClicks:1,modelViews:0,uniqueVisitors:2});
 assert.deepEqual(report.daily.map(day=>day.uniqueVisitors),[1,2]);assert.deepEqual(report.coverage,{identifiedPageLoads:4,unidentifiedPageLoads:0});
 assert.equal(summarize(blobs,{to:'2026-10-05'}).totals.uniqueVisitors,1);
 assert.equal(summarize(blobs,{from:'2026-10-06'}).totals.pageLoads,2);
 assert.equal(summarize(blobs,{from:'2026-10-07'}).totals.uniqueVisitors,0);
});

test('the website reuses its browser ID after a refresh and on downloads',async()=>{
 const visitor=fs.readFileSync(new URL('../dist/visitor-id.js',import.meta.url),'utf8').replace('export function browserVisitorId','function savedVisitorId');
 const code=visitor+'\nconst USAGE_ENDPOINT="https://tracker.invalid/api/events";\n'+fs.readFileSync(new URL('../dist/usage.js',import.meta.url),'utf8').replace(/^import.*?;\r?\n/gm,'').replace(/^export /gm,'');
 const saved=new Map(),events=[],warnings=[];
 const storage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
 async function page(localStorage=storage){const ctx=vm.createContext({location:{hostname:'www.lowpolyworks.com',search:''},URLSearchParams,crypto:{randomUUID},localStorage,console:{warn:(...args)=>warnings.push(args)},fetch:async(_url,opts)=>{events.push(JSON.parse(opts.body));return{ok:true};}});vm.runInContext(code,ctx);await vm.runInContext('recordUsage("visit")',ctx);return ctx;}
 const first=await page();await vm.runInContext('recordUsage("download","khorne-axe","mdx")',first);await page();
 assert.equal(new Set(events.map(event=>event.visitorId)).size,1);assert.equal(new Set(events.map(event=>event.id)).size,3);
 saved.clear();await page();assert.notEqual(events[0].visitorId,events[3].visitorId);
 await page({getItem(){throw Error('Storage disabled');}});assert.equal(events.length,5);assert.equal(events[4].visitorId,undefined);assert.equal(warnings.length,1);
});
test('every unit is listed with its own count, including new units without downloads and removed units with history',async t=>{
 t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>[{id:'old-model',name:'Old Model'},{id:'new-model',name:'New Model'}]}));
 const units=[{id:'unit-live',name:'Live Unit',downloads:[{name:'live.mdx'}]},{id:'unit-hidden',name:'Hidden Unit',deletedAt:'2026-10-06T00:00:00Z',downloads:[{name:'pack.zip'}]}];
 assert.deepEqual((await trackedModels({loadUnits:async()=>units})).map(model=>model.id),['old-model','new-model','unit-live']);
 const all=await trackedModels({loadUnits:async()=>units,includeRemoved:true});assert.deepEqual(all.map(model=>model.id),['old-model','new-model','unit-live','unit-hidden']);
 const blob=(model,format)=>({pathname:eventPath({id:randomUUID(),kind:'download',model,format},now),uploadedAt:now});
 const report=summarizeEvents([blob('old-model','mdx'),blob('unit-hidden','pack'),blob('unit-hidden','mdx'),blob('retired-model','mdx')],{models:all});
 assert.deepEqual(report.models,[
  {id:'unit-hidden',name:'Hidden Unit',mdxClicks:1,packClicks:1,total:2,views:0},
  {id:'old-model',name:'Old Model',mdxClicks:1,packClicks:0,total:1,views:0},
  {id:'retired-model',name:'retired-model',mdxClicks:1,packClicks:0,total:1,views:0,unlisted:true},
  {id:'unit-live',name:'Live Unit',mdxClicks:0,packClicks:0,total:0,views:0},
  {id:'new-model',name:'New Model',mdxClicks:0,packClicks:0,total:0,views:0},
 ]);
 assert.equal(report.totals.downloadClicks,4);
});
test('model views are accepted only for listed models and reported per model and per day beside downloads',()=>{
 const view={id,kind:'view',model:'graveguard',format:'none',visitorId:id};
 assert.deepEqual(validateEvent(view),{id,kind:'view',model:'graveguard',format:'none',testing:false,visitorId:id});
 assert.equal(validateEvent({...view,model:'not-in-catalogue'}),null);assert.equal(validateEvent({...view,model:'mdlxl'}),null);
 const day1=new Date('2026-10-05T10:00:00Z'),day2=new Date('2026-10-06T10:00:00Z'),blob=(event,at)=>({pathname:eventPath({...event,id:randomUUID(),country:'NL'},at),uploadedAt:at});
 const report=summarize([blob(view,day1),blob(view,day2),blob({...view,model:'strigoi-vampire'},day2),blob({id,kind:'download',model:'graveguard',format:'mdx'},day2),blob({id,kind:'visit',model:'site',format:'none'},day2),blob({...view,testing:true},day2)]);
 assert.equal(report.totals.modelViews,3);assert.equal(report.totals.pageLoads,1);assert.equal(report.totals.downloadClicks,1);
 assert.equal(report.models.find(row=>row.id==='graveguard').views,2);assert.equal(report.models.find(row=>row.id==='strigoi-vampire').views,1);
 assert.deepEqual(report.timeline,[['2026-10-05','view','graveguard','none',1],['2026-10-06','view','graveguard','none',1],['2026-10-06','view','strigoi-vampire','none',1],['2026-10-06','download','graveguard','mdx',1]].sort((a,b)=>a[0].localeCompare(b[0])));
});
test("Shredder's play arrives as one batched count per session and its counts live in the event path",async()=>{
 const blobs=[],collect=createEventsHandler({writeBlob:async(pathname,data)=>blobs.push({pathname,uploadedAt:JSON.parse(data).recordedAt})});
 const send=async body=>{const res=response();await collect({method:'POST',headers:{origin:'https://www.lowpolyworks.com','x-vercel-ip-country':'NL'},body},res);return res.statusCode;};
 assert.equal(await send({id:randomUUID(),visitorId:id,kind:'shredder',counts:{peek:2,feed:1,attack:1}}),204);
 assert.match(blobs[0].pathname,/^live\/v3\/\d{4}-\d{2}-\d{2}\/shredder\/peek2\.grab0\.feed1\.crack0\.follow0\.attack1\/session\//);
 assert(blobs[0].pathname.includes('/session/'+id+'/NL/'));
 for(const counts of [{},{peek:0},{peek:-1},{peek:1.5},{peek:1000},{peek:'1'},{scratch:1},[1],null])
  assert.equal(await send({id:randomUUID(),visitorId:id,kind:'shredder',counts}),400,JSON.stringify(counts));
 assert.equal(blobs.length,1);
});
test("Shredder's Stash counts people and interactions apart from the site totals",()=>{
 const other='0b9c6a41-6a55-4f0e-9d0e-1f2a3b4c5d6e',at='2026-10-05T21:00:00.000Z';
 const play=(counts,visitorId,date='2026-10-05',namespace='live')=>({pathname:`${namespace}/v3/${date}/shredder/${counts}/session/${visitorId}/NL/${randomUUID()}.json`,uploadedAt:at});
 const blobs=[
  {pathname:eventPath({...validateEvent({id:randomUUID(),visitorId:id,kind:'visit'}),country:'NL'},now),uploadedAt:at},
  play('peek2.grab1.feed1.crack0.follow0',id),play('peek1.grab0.feed2.crack1.follow0',id,'2026-10-06'),
  play('peek0.grab0.feed1.crack0.follow1',other),play('peek3.grab0.feed0.crack0.follow0','anonymous'),
  play('peek0.grab0.feed0.crack0.follow0.attack2',other),play('peek0.grab0.feed0.crack0.follow0.attack1',id),
  play('peek0.grab0.feed0.crack0.follow0.attack1.extra9',other),
  play('peek9.grab9.feed9.crack9.follow9',other,'2026-10-05','testing'),play('nonsense',other),
 ];
 const report=summarize(blobs);
 assert.deepEqual(report.totals,{pageLoads:1,downloadClicks:0,modelViews:0,uniqueVisitors:1},'site totals are unchanged by play');
 assert.equal(report.shredder.people,2);
 assert.deepEqual(report.shredder.interactions,{peek:{count:6,people:1},grab:{count:1,people:1},feed:{count:4,people:2},crack:{count:1,people:1},follow:{count:1,people:1},attack:{count:3,people:2}},'paths from before Bird Attack read as attack0');
 assert.equal(summarize(blobs,{from:'2026-10-06'}).shredder.interactions.feed.count,2);
 assert(!JSON.stringify(report.shredder).includes(id),'no browser IDs leave the report');
});
test('MDLxL sends a bare ping per installed update, kept apart from the site totals',async()=>{
 const blobs=[],collect=createEventsHandler({writeBlob:async(pathname,data)=>blobs.push({pathname,uploadedAt:JSON.parse(data).recordedAt})});
 const send=async(body,headers={'user-agent':'MDLxL/0.30.1'})=>{const res=response();await collect({method:'POST',headers:{'x-vercel-ip-country':'NL',...headers},body},res);return res.statusCode;};
 assert.equal(await send({kind:'update',version:'0.31.0'}),204);
 assert.equal(await send({kind:'update',version:'0.31.0'}),204);
 assert.equal(await send({kind:'update',version:'0.32.0',visitorId:id}),204);
 assert.match(blobs[0].pathname,/^live\/v3\/\d{4}-\d{2}-\d{2}\/update\/mdlxl\/0\.31\.0\/anonymous\/NL\//);
 assert(blobs.every(blob=>!blob.pathname.includes(id)),'an app ping never stores an ID it sends');
 assert.equal(await send({kind:'update',version:'../x'}),400);
 assert.equal(await send({kind:'visit'}),400,'the app sends only updates');
 assert.equal(await send({id:randomUUID(),kind:'update',version:'0.31.0'},{origin:'https://www.lowpolyworks.com'}),400,'the site cannot send updates');
 assert.equal(await send({kind:'update',version:'0.31.0'},{'user-agent':'curl/8'}),403);
 const report=summarize(blobs);
 assert.deepEqual(report.updates.versions,[{version:'0.32.0',downloads:1},{version:'0.31.0',downloads:2}]);
 assert.equal(report.updates.downloads,3);
 assert.equal(report.totals.uniqueVisitors,0);assert.equal(report.totals.downloadClicks,0);
});
test('MDLxL tutorial opens are counted per tutorial and language, apart from the site totals',async()=>{
 const blobs=[],collect=createEventsHandler({writeBlob:async(pathname,data)=>blobs.push({pathname,uploadedAt:JSON.parse(data).recordedAt})});
 const send=async body=>{const res=response();await collect({method:'POST',headers:{origin:'https://www.lowpolyworks.com','x-vercel-ip-country':'NL'},body},res);return res.statusCode;};
 const other='0b9c6a41-6a55-4f0e-9d0e-1f2a3b4c5d6e';
 assert.equal(await send({id:randomUUID(),visitorId:id,kind:'tutorial',model:'anchor',format:'en'}),204);
 assert.equal(await send({id:randomUUID(),visitorId:other,kind:'tutorial',model:'anchor',format:'ru'}),204);
 assert.equal(await send({id:randomUUID(),visitorId:id,kind:'tutorial',model:'library',format:'en'}),204);
 assert.equal(await send({id:randomUUID(),kind:'tutorial',model:'glow',format:'mordor'}),204);
 assert.match(blobs[0].pathname,/^live\/v3\/\d{4}-\d{2}-\d{2}\/tutorial\/anchor\/en\//);
 for(const [model,format] of [['../x','en'],['anchor','../x'],['anchor',''],['','en'],['Anchor','en']])
  assert.equal(await send({id:randomUUID(),visitorId:id,kind:'tutorial',model,format}),400,model+'/'+format);
 assert.equal(blobs.length,4);
 const report=summarize([...blobs,{pathname:`testing/v3/2026-10-05/tutorial/anchor/en/${id}/NL/${randomUUID()}.json`,uploadedAt:blobs[0].uploadedAt}]);
 assert.equal(report.tutorials.opens,4);assert.equal(report.tutorials.people,2);
 assert.deepEqual(report.tutorials.tutorials[0],{id:'anchor',opens:2,languages:{en:1,ru:1},people:2});
 assert.deepEqual(report.tutorials.tutorials.find(row=>row.id==='glow'),{id:'glow',opens:1,languages:{mordor:1},people:0});
 assert.equal(report.totals.uniqueVisitors,0);assert.equal(report.totals.modelViews,0);
 assert(!JSON.stringify(report.tutorials).includes(id),'no browser IDs leave the report');
});
