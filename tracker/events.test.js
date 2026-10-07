import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';import {randomUUID} from 'node:crypto';
import {authorized,eventPath,summarize,validateEvent} from './lib/events.js';
const id='f5de7cba-f71f-4b51-9af4-5468d5877f11',now=new Date('2026-10-05T21:00:00Z');
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
