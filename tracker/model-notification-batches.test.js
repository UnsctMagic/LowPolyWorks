import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createD1State} from './lib/d1.js';
import {createModelReleases,publishedModels} from './lib/model-releases.js';
import {createHandler} from './api/model-notifications.js';
import {deliverModelNotifications} from '../tools/model-notifications.mjs';

function fixture(t,{catalogue=Array.from({length:130},(_,i)=>({id:'model-'+i,name:'Model '+i,file:i+'.mdx',...(i<105?{downloadPack:i+'.zip'}:{})})),conflicts=false}={}){
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());
 sqlite.exec(readFileSync(new URL('./migrations/0001_init.sql',import.meta.url),'utf8'));
 let external=0,queries=0,writes=0,time=100000,version=1,unavailable=false,mailFailure;
 const calls=[],mail=[],fetches=[];
 const count=kind=>{if(kind==='external')assert(++external<50,'outgoing request limit');else assert(++queries<50,'D1 query limit');};
 const statement=(sql,params=[])=>({bind:(...values)=>statement(sql,values),async first(){count('db');return sqlite.prepare(sql).get(...params)??null;},async run(){count('db');if(conflicts&&++writes%5)return {meta:{changes:0}};return {meta:{changes:Number(sqlite.prepare(sql).run(...params).changes)}};}});
 const store=createD1State({prepare:sql=>statement(sql)});
 const state=()=>JSON.parse(sqlite.prepare('SELECT body FROM state WHERE id=1').get()?.body||'{}');
 const fetchApi=async(url,options)=>{
  count('external');fetches.push(url);assert.equal(options.redirect,'error');
  const path=new URL(url).pathname;
  if(path==='/catalogue.json')return Response.json(catalogue);
  if(unavailable&&path==='/models/10.mdx')throw Error('Download interrupted');
  const etag='"'+version+'"';
  if(options.headers['If-None-Match']===etag)return new Response(null,{status:304});
  return new Response((path.endsWith('.mdx')?'MDLX':'PK')+path+version,{headers:{etag}});
 };
 const releases=createModelReleases({store,env:{MODEL_NOTIFICATIONS_ENABLED:'true'},mailConfigured:()=>true,now:()=>time,
  loadPublished:(previous,options)=>publishedModels(previous,{...options,fetchApi,loadUnits:async()=>(await store.read()).state}),
  sendEmail:async(message,key)=>{count('external');if(mailFailure)throw mailFailure;mail.push({message,key});return key;},unsubscribeUrl:()=> 'https://example.test/unsubscribe',fail:(status,message)=>{throw Object.assign(Error(message),{status});}});
 const handler=createHandler({releases},{env:{MODEL_NOTIFICATIONS_TOKEN:'test-token'}});
 async function invoke(url='https://example.test/api/model-notifications?phase=scan',options={headers:{Authorization:'Bearer test-token'}}){
  external=queries=0;
  const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;}};
  await handler({method:'POST',url,headers:{authorization:options.headers.Authorization}},res);
  calls.push({phase:new URL(url).searchParams.get('phase'),external,queries,status:res.code,body:res.body});
  return Response.json(res.body,{status:res.code});
 }
 const run=(options={})=>deliverModelNotifications({token:'test-token',publication:'a'.repeat(40),fetchApi:invoke,now:()=>time,pause:async ms=>{time+=ms;},...options});
 const subscribe=async(count=1)=>{queries=0;await store.mutate(s=>{for(let i=0;i<count;i++)s.subscribers.push({id:'reader-'+i,email:'reader-'+i+'@example.test',confirmed:true,emailVerified:true,modelIds:['model-0'],newModelsSince:0,modelFollowSince:{'model-0':0}});});};
 return {store,invoke,run,subscribe,state,calls,mail,fetches,releases,set unavailable(value){unavailable=value;},set version(value){version=value;},set time(value){time=value;},set mailFailure(value){mailFailure=value;}};
}

test('one runner processes all 130 models and 105 packs in 13 bounded Worker scans, then drains deliveries',async t=>{
 const f=fixture(t);await f.subscribe(8);
 const baseline=await f.run();assert.equal(baseline.models,130);assert.equal(baseline.baselined,true);assert.equal(baseline.requests,13);
 assert.equal(f.fetches.length,236);assert.equal(f.mail.length,0);assert.equal(Math.max(...f.calls.map(call=>call.external)),21);
 assert.equal(Math.max(...f.calls.map(call=>call.queries)),5);assert(!f.state().modelScan);
 f.version=2;const updated=await f.run();assert.equal(updated.queued,8);assert.equal(updated.sent,8);assert.equal(updated.remaining,0);
 assert.equal(updated.requests,21);assert.equal(new Set(f.mail.map(mail=>mail.key)).size,8);
 assert(f.calls.filter(call=>call.phase==='deliver').every(call=>call.external===1&&call.queries===4));
 assert.equal((await f.run()).queued,0);assert.equal(f.mail.length,8);
});

test('five conditional-write attempts still stay below the D1 limit for scanning and delivery',async t=>{
 const f=fixture(t,{catalogue:[{id:'model-0',name:'Model',file:'0.mdx'}],conflicts:true});await f.subscribe();await f.run();
 f.version=2;await f.run();assert.equal(f.mail.length,1);
 assert.equal(Math.max(...f.calls.map(call=>call.queries)),21);
 assert(f.calls.every(call=>call.external+call.queries<50));
});

test('known email rejection and all conditional-write retries stay within the D1 budget',async t=>{
 const f=fixture(t,{catalogue:[{id:'model-0',name:'Model',file:'0.mdx'}],conflicts:true});await f.subscribe();await f.run();
 f.version=2;f.mailFailure=Object.assign(Error('Quota rejected'),{status:429});
 await assert.rejects(f.run(),/Quota rejected/);assert.equal(f.calls.at(-1).queries,20);
 assert.deepEqual(f.state().notifications[0].attempts,{});f.mailFailure=null;await f.run();assert.equal(f.mail.length,1);
});

test('an interrupted scan resumes its saved catalogue and never commits a partial baseline',async t=>{
 const f=fixture(t);await f.subscribe();
 assert.equal((await f.invoke()).status,200);assert.equal(f.state().modelScan.continuation.offset,10);assert(!f.state().modelReleases);
 f.unavailable=true;assert.equal((await f.invoke()).status,503);assert.equal(f.state().modelScan.continuation.offset,10);assert(!f.state().modelScanLease);
 assert(!f.state().modelReleases);assert.equal(f.mail.length,0);
 f.unavailable=false;const result=await f.run({publication:undefined});assert.equal(result.models,130);assert.equal(result.baselined,true);
 assert.equal(f.fetches.filter(url=>new URL(url).pathname==='/catalogue.json').length,1);assert.equal(f.mail.length,0);
});

test('a different publication discards an unfinished snapshot and hidden models stay excluded at commit',async t=>{
 const f=fixture(t);await f.subscribe();await f.run();
 f.version=2;await f.invoke('https://example.test/api/model-notifications?publication='+'b'.repeat(40));
 assert.equal(f.state().notifications.length,0);
 await f.store.mutate(s=>{s.hiddenModels=['model-0'];});
 await f.run();assert.equal(f.mail.length,0);assert(!f.state().modelScan);
 assert.equal(f.fetches.filter(url=>new URL(url).pathname==='/catalogue.json').length,3);
});

test('lost scan and delivery responses can be retried without duplicated recipients',async t=>{
 const f=fixture(t);await f.subscribe(3);await f.run();f.version=2;
 let lostScan=false,lostDelivery=false;
 await f.run({fetchApi:async(url,options)=>{
  const response=await f.invoke(url,options),phase=new URL(url).searchParams.get('phase');
  if(phase==='scan'&&!lostScan){lostScan=true;throw Error('lost scan response');}
  if(phase==='deliver'&&!lostDelivery){lostDelivery=true;throw Error('lost delivery response');}
  return response;
 }});
 assert.equal(f.mail.length,3);assert.equal(new Set(f.mail.map(row=>row.key)).size,3);
 assert.equal(f.fetches.filter(url=>new URL(url).pathname==='/catalogue.json').length,2);
 assert(!f.state().modelScan);assert(!f.state().modelDeliveryLease);
});

test('the HTTP batch contract rejects unknown phases and never scans while delivering',async t=>{
 const f=fixture(t);
 assert.equal((await f.invoke('https://example.test/api/model-notifications?phase=unknown')).status,400);
 const response=await f.invoke('https://example.test/api/model-notifications?phase=deliver');assert.equal(response.status,200);
 assert.equal(f.fetches.length,0);assert.equal((await response.json()).more,false);
});

test('the runner fails clearly on an old Worker or an uncompleted deadline instead of reporting success',async()=>{
 await assert.rejects(deliverModelNotifications({token:'test',fetchApi:async()=>Response.json({enabled:true,remaining:0})}),/bounded batches/);
 let time=0;
 await assert.rejects(deliverModelNotifications({token:'test',now:()=>time,pause:async()=>{time+=25*60*1000;},fetchApi:async()=>Response.json({error:'Busy',retryAfter:5},{status:409})}),/Saved progress will resume/);
 await assert.rejects(deliverModelNotifications({token:'test',fetchApi:async()=>Response.json({error:'Earlier email result needs review'},{status:409})}),/Earlier email result needs review/);
});

test('the daily runner exits successfully with cooldown work retained, then sends it after 48 hours',async t=>{
 const f=fixture(t,{catalogue:[{id:'model-0',name:'Model',file:'0.mdx'}]});await f.subscribe(3);await f.run();f.version=2;await f.run();assert.equal(f.mail.length,3);
 f.version=3;const waiting=await f.run();assert.equal(waiting.sent,0);assert.equal(waiting.remaining,3);assert.equal(waiting.deferred,3);assert.equal(waiting.requests,2);assert.equal(f.mail.length,3);
 f.time=100000+49*3600000;const resumed=await f.run();assert.equal(resumed.sent,3);assert.equal(resumed.remaining,0);assert.equal(f.mail.length,6);
});
