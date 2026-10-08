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
test('newly published models are accepted and reported without restarting the tracker',async t=>{
 let published=[{id:'existing-model',name:'Existing Model'}];
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  assert.equal(url,'https://www.lowpolyworks.com/catalogue.json');
  assert.equal(options.cache,'no-store');
  return {ok:true,json:async()=>structuredClone(published)};
 });
 const blobs=[];
 const collect=createEventsHandler({writeBlob:async(pathname,data)=>{
  const event=JSON.parse(data);blobs.push({pathname,uploadedAt:event.recordedAt});
 }});
 const read=createReportHandler({listBlobs:async()=>({blobs,hasMore:false}),env:{USAGE_READ_TOKEN:'secret'}});
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
  {id:'future-model',name:'Future Model',mdxClicks:1,packClicks:1,total:2},
  {id:'existing-model',name:'Existing Model',mdxClicks:1,packClicks:0,total:1},
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
  assert.deepEqual(report.models.find(row=>row.id===model.id),{id:model.id,name:model.name,mdxClicks:1,packClicks:model.downloadPack?1:0,total:model.downloadPack?2:1});
 }
});
test('MDLxL ZIP clicks are accepted and reported separately from model files',()=>{
 const input={id,kind:'download',model:'mdlxl',format:'zip',visitorId:id};
 assert.deepEqual(validateEvent(input),{...input,testing:false});
 for(const format of ['mdx','pack','exe'])assert.equal(validateEvent({...input,format}),null);
 assert.equal(validateEvent({...input,model:'not-an-app'}),null);
 const blob=event=>({pathname:eventPath(event,now),uploadedAt:now});
 const report=summarize([blob(input),blob({...input,testing:true}),blob({...input,format:'mdx'}),blob({...input,model:'tzeentch-sword',format:'pack'})]);
 assert.deepEqual(report.totals,{pageLoads:0,downloadClicks:2,uniqueVisitors:1});
 assert.deepEqual(report.applications,[{id:'mdlxl',name:'MDLxL',zipClicks:1,total:1}]);
 assert.equal(report.models.length,1);assert.equal(report.models[0].packClicks,1);
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
 const report=summarize(blobs);assert.deepEqual(report.totals,{pageLoads:1,downloadClicks:2,uniqueVisitors:0});assert.equal(report.coverage.unidentifiedPageLoads,1);assert.equal(report.models[0].mdxClicks,1);assert.equal(report.models[0].packClicks,1);
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
 const report=summarize(blobs);assert.deepEqual(report.totals,{pageLoads:4,downloadClicks:1,uniqueVisitors:2});
 assert.deepEqual(report.daily.map(day=>day.uniqueVisitors),[1,2]);assert.deepEqual(report.coverage,{identifiedPageLoads:4,unidentifiedPageLoads:0});
 assert.equal(summarize(blobs,{to:'2026-10-05'}).totals.uniqueVisitors,1);
 assert.equal(summarize(blobs,{from:'2026-10-06'}).totals.pageLoads,2);
 assert.equal(summarize(blobs,{from:'2026-10-07'}).totals.uniqueVisitors,0);
});

test('the website reuses its browser ID after a refresh and on downloads',async()=>{
 const visitor=fs.readFileSync(new URL('../dist/visitor-id.js',import.meta.url),'utf8').replace('export function browserVisitorId','function savedVisitorId');
 const code=visitor+'\nconst USAGE_ENDPOINT="https://tracker.invalid/api/events";\n'+fs.readFileSync(new URL('../dist/usage.js',import.meta.url),'utf8').replace(/^import.*?;\r?\n/gm,'').replace('export async function','async function');
 const saved=new Map(),events=[],warnings=[];
 const storage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
 async function page(localStorage=storage){const ctx=vm.createContext({location:{hostname:'www.lowpolyworks.com',search:''},URLSearchParams,crypto:{randomUUID},localStorage,console:{warn:(...args)=>warnings.push(args)},fetch:async(_url,opts)=>{events.push(JSON.parse(opts.body));return{ok:true};}});vm.runInContext(code,ctx);await vm.runInContext('recordUsage("visit")',ctx);return ctx;}
 const first=await page();await vm.runInContext('recordUsage("download","khorne-axe","mdx")',first);await page();
 assert.equal(new Set(events.map(event=>event.visitorId)).size,1);assert.equal(new Set(events.map(event=>event.id)).size,3);
 saved.clear();await page();assert.notEqual(events[0].visitorId,events[3].visitorId);
 await page({getItem(){throw Error('Storage disabled');}});assert.equal(events.length,5);assert.equal(events[4].visitorId,undefined);assert.equal(warnings.length,1);
});
