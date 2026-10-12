import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';

const visitor=fs.readFileSync(new URL('../dist/visitor-id.js',import.meta.url),'utf8').replace('export function browserVisitorId','function savedVisitorId');
const usage=fs.readFileSync(new URL('../dist/usage.js',import.meta.url),'utf8').replace(/^import.*?;\r?\n/gm,'').replace(/^export /gm,'');
const code=visitor+'\nconst USAGE_ENDPOINT="https://tracker.invalid/api/events";\n'+usage;
function browser(){
 const saved=new Map(),events=[];
 const storage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
 function page(search='',localStorage=storage){
  const ctx=vm.createContext({location:{hostname:'www.lowpolyworks.com',search},URLSearchParams,crypto:{randomUUID},localStorage,console:{warn(){}},fetch:async(_url,options)=>{events.push(JSON.parse(options.body));return {ok:true};}});
  vm.runInContext(code,ctx);
  return (kind,model,format)=>vm.runInContext(`recordUsage(${JSON.stringify(kind)},${JSON.stringify(model)},${JSON.stringify(format)})`,ctx);
 }
 return {saved,events,page};
}
test('owner opt-out persists across reloads and suppresses visits and all download kinds',async()=>{
 const b=browser(),first=b.page('?tracking-opt-out=1');
 await first('visit');await first('download','khorne-axe','mdx');
 const reload=b.page();await reload('visit');await reload('download','khorne-axe','pack');await reload('download','mdlxl','zip');
 assert.equal(b.saved.get('lowpolyworks.usageOptOut'),'true');assert.deepEqual(b.events,[]);
});
test('opting out in another tab immediately suppresses events in an already-open tab',async()=>{
 const b=browser(),open=b.page();await open('visit');assert.equal(b.events.length,1);
 await b.page('?tracking-opt-out=1')('visit');
 await open('visit');await open('download','mdlxl','zip');assert.equal(b.events.length,1);
});
test('other visitors still count and the opt-out URL works when storage is blocked',async()=>{
 const b=browser(),normal=b.page();await normal('visit');await normal('download','mdlxl','zip');
 assert.equal(b.events.length,2);assert.equal(b.events[0].visitorId,b.events[1].visitorId);
 const blocked=b.page('?tracking-opt-out=1',{getItem(){throw Error('Blocked');},setItem(){throw Error('Blocked');}});
 await blocked('visit');await blocked('download','khorne-axe','mdx');assert.equal(b.events.length,2);
});
test("Shredder's play is sent as one shredder event, and never from an opted-out browser",async()=>{
 const b=browser(),open=b.page();
 const shredder=page=>counts=>vm.runInContext(`recordShredder(${JSON.stringify(counts)})`,page);
 const ctx=vm.createContext({location:{hostname:'www.lowpolyworks.com',search:''},URLSearchParams,crypto:{randomUUID},localStorage:{getItem:key=>b.saved.get(key)||null,setItem:(key,value)=>b.saved.set(key,value)},console:{warn(){}},fetch:async(_url,options)=>{b.events.push(JSON.parse(options.body));return {ok:true};}});
 vm.runInContext(code,ctx);
 assert.equal(await shredder(ctx)({peek:2,feed:1}),true);
 assert.equal(b.events.length,1);assert.equal(b.events[0].kind,'shredder');assert.deepEqual(b.events[0].counts,{peek:2,feed:1});assert(b.events[0].visitorId);
 await b.page('?tracking-opt-out=1')('visit');
 assert.equal(await shredder(ctx)({feed:1}),false);assert.equal(b.events.length,1);
 await open('visit');assert.equal(b.events.length,1);
});
