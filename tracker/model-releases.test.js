import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createModelReleases,publishedModels} from './lib/model-releases.js';
import {createHandler} from './api/model-notifications.js';
function fixture(){
 let state={subscribers:[],notifications:[]},models=[{id:'a',name:'Model A',url:'https://www.lowpolyworks.com/model/a/',fingerprint:'original'}],time=100000,writes=Promise.resolve(),failure;
 const mail=[],env={MODEL_NOTIFICATIONS_ENABLED:'true'};
 const store={read:async()=>({state:structuredClone(state)}),mutate:fn=>{const task=writes.then(async()=>{const copy=structuredClone(state),result=await fn(copy);state=copy;return structuredClone(result);});writes=task.catch(()=>{});return task;}};
 const service=createModelReleases({store,env,now:()=>time,mailConfigured:()=>true,loadPublished:async()=>structuredClone(models),unsubscribeUrl:()=> 'https://example.test/unsubscribe',fail:(status,message)=>{throw Object.assign(Error(message),{status});},sendEmail:async(message,key)=>{if(failure)throw failure;mail.push({message,key});return 'receipt-'+mail.length;}});
 const sub=(id,ids=['a'])=>({id,email:id+'@example.test',confirmed:true,emailVerified:true,modelIds:ids,newModelsSince:0,modelFollowSince:Object.fromEntries(ids.map(id=>[id,0]))});
 return {...service,store,env,mail,sub,get state(){return state;},get models(){return models;},set models(value){models=value;},set time(value){time=value;},set failure(value){failure=value;}};
}
test('baseline mails no historical models and retires legacy post jobs',async()=>{const f=fixture();await f.store.mutate(s=>{s.subscribers.push(f.sub('reader'));s.notifications.push({id:'old',recipients:['reader'],sent:[]});});assert.equal((await f.sync()).baselined,true);assert.equal((await f.deliver()).sent,0);assert(f.state.notifications[0].cancelledAt);assert.equal(f.mail.length,0);});
test('updates reach only that model followers; new models reach every active verified reader once',async()=>{const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('a-reader'),f.sub('b-reader',['b']),{...f.sub('pending'),confirmed:false},f.sub('off',[])));await f.sync();f.models[0].fingerprint='updated';assert.equal((await f.sync()).queued,1);await Promise.all([f.deliver(),f.deliver()]);assert.equal(f.mail.length,1);assert.equal(f.mail[0].message.to,'a-reader@example.test');assert.match(f.mail[0].message.subject,/Model update:/);assert.equal(f.state.notifications[0].receipts['a-reader'],'receipt-1');f.models.push({id:'c',name:'Model C',url:'https://www.lowpolyworks.com/model/c/',fingerprint:'new'});assert.equal((await f.sync()).queued,2);await f.deliver();assert.equal(f.mail.length,3);assert.equal(new Set(f.mail.map(row=>row.key)).size,3);await f.sync();assert.equal((await f.deliver()).sent,0);});
test('unchecking, unsubscribing and re-following stop already queued mail; later subscribers get no backlog',async()=>{const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();f.models[0].fingerprint='updated';await f.sync();await f.store.mutate(s=>{s.subscribers[0].modelFollowSince.a=100001;s.subscribers.push(f.sub('later'));});assert.equal((await f.deliver()).sent,0);assert.equal(f.mail.length,0);});
test('cosmetic edits and restoring unchanged bytes send nothing; rollback after the cooldown is a distinct update',async()=>{const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();f.models[0].name='New title';assert.equal((await f.sync()).queued,0);f.models=[];await f.sync();f.models=[{id:'a',name:'Model A',fingerprint:'original',url:'https://example.test/a'}];assert.equal((await f.sync()).queued,0);f.models[0].fingerprint='changed';await f.sync();await f.deliver();f.time=100000+86400000;f.models[0].fingerprint='original';await f.sync();await f.deliver();assert.equal(f.mail.length,2);assert.notEqual(f.mail[0].key,f.mail[1].key);});
test('failed sends retain stable keys and receipts, and ambiguous results stop before deduplication expires',async()=>{const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();f.models[0].fingerprint='updated';await f.sync();f.failure=Error('network result unknown');assert.equal((await f.deliver()).error,'network result unknown');f.time=100000+23*3600000;await assert.rejects(f.deliver(),{status:409});assert.equal(f.mail.length,0);});
test('known quota rejection can retry the next day without treating it as an ambiguous send',async()=>{const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();f.models[0].fingerprint='updated';await f.sync();f.failure=Object.assign(Error('quota'),{status:429});await f.deliver();f.failure=null;f.time=100000+86400000;await f.deliver();assert.equal(f.mail.length,1);});
test('parallel model scans cannot enqueue duplicated releases; disabled delivery records a baseline only',async()=>{const f=fixture();const results=await Promise.allSettled([f.sync(),f.sync()]);assert.equal(results.filter(result=>result.status==='rejected').length,1);f.env.MODEL_NOTIFICATIONS_ENABLED='false';f.models[0].fingerprint='changed';assert.equal((await f.sync()).queued,0);await assert.rejects(f.deliver(),{status:503});});
test('published snapshots hash real downloads, reuse conditional reads, and include published unit download hashes',async()=>{
 const bytes=Buffer.from('MDLXactual-model'),hash=createHash('sha256').update(bytes).digest('hex');let conditional;
 const fetchApi=async(url,options)=>url.endsWith('catalogue.json')?{ok:true,json:async()=>[{id:'a',name:'A',file:'a.mdx'}]}:(conditional=options.headers,options.headers['If-None-Match']?{status:304}:{ok:true,status:200,headers:new Headers({etag:'"v1"'}),arrayBuffer:async()=>bytes});
 const loadUnits=async()=>({unitCards:[{id:'unit-a',name:'Unit A',downloads:[{sha256:'unit-hash'}]},{id:'hidden-unit',deletedAt:'today'}]});
 const first=await publishedModels({}, {fetchApi,loadUnits});assert.equal(first[0].files[0].hash,hash);assert.equal(first.length,2);const second=await publishedModels({a:first[0]},{fetchApi,loadUnits});assert.equal(conditional['If-None-Match'],'"v1"');assert.equal(second[0].fingerprint,first[0].fingerprint);
});
test('background worker requires its dedicated token and never accepts model contents from requests',async()=>{
 let scans=0;const handler=createHandler({releases:{sync:async()=>{scans++;return {enabled:false,remaining:0};}}},{env:{MODEL_NOTIFICATIONS_TOKEN:'test-worker-token'}});
 async function call(method,authorization){const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;}};await handler({method,headers:{authorization},body:{fakeModel:'ignored'}},res);return res;}
 assert.equal((await call('GET','Bearer test-worker-token')).code,405);assert.equal((await call('POST','Bearer wrong')).code,401);assert.equal(scans,0);assert.equal((await call('POST','Bearer test-worker-token')).code,200);assert.equal(scans,1);
});

test('every changed update renews a rolling 24-hour cooldown; idle time and cosmetic edits never send or renew it',async()=>{
 const f=fixture(),hour=3600000,start=100000;await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();
 f.models[0].fingerprint='first';assert.equal((await f.sync()).queued,1);await f.deliver();
 f.time=start+23*hour;f.models[0].fingerprint='second';assert.equal((await f.sync()).queued,0);await f.deliver();assert.equal(f.mail.length,1);
 assert.equal(f.state.modelReleases.models.a.lastUpdateAt,start+23*hour);
 f.time=start+24*hour;f.models[0].fingerprint='third';assert.equal((await f.sync()).queued,0);
 f.time=start+47*hour;f.models[0].name='Cosmetic title';await f.sync();assert.equal(f.state.modelReleases.models.a.lastUpdateAt,start+24*hour);assert.equal((await f.deliver()).sent,0);
 f.time=start+48*hour;f.models[0].fingerprint='after quiet period';assert.equal((await f.sync()).queued,1);await f.deliver();assert.equal(f.mail.length,2);
});

test('update cooldowns belong to each model and never restrict several new releases on the same day',async()=>{
 const f=fixture();f.models.push({id:'b',name:'B',fingerprint:'b-original'});await f.store.mutate(s=>s.subscribers.push(f.sub('reader',['a','b'])));await f.sync();
 f.models[0].fingerprint='a-first';await f.sync();await f.deliver();f.models[0].fingerprint='a-again';f.models[1].fingerprint='b-first';assert.equal((await f.sync()).queued,1);await f.deliver();
 for(const id of ['c','d']){f.models.push({id,name:id,fingerprint:id});assert.equal((await f.sync()).queued,1);await f.deliver();}
 assert.equal(f.mail.length,4);assert.deepEqual(f.mail.map(row=>row.message.subject),['Model update: Model A','Model update: B','New model: c','New model: d']);
});

test('a pending or delayed update cannot turn into a burst of queued emails',async()=>{
 const f=fixture(),start=100000;await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();
 f.models[0].fingerprint='one';await f.sync();f.time=start+2*86400000;f.models[0].fingerprint='two';assert.equal((await f.sync()).queued,0);assert.equal(f.state.notifications.length,1);
 await f.deliver();f.time=start+2*86400000+1;f.models[0].fingerprint='three';assert.equal((await f.sync()).queued,0);assert.equal(f.mail.length,1);
});

test('publication cache keys fetch fresh catalogue/download bytes while retaining canonical file identities',async()=>{
 const urls=[],publication='a'.repeat(40),bytes=Buffer.from('MDLXfresh');const fetchApi=async url=>{urls.push(url);return url.includes('/catalogue.json')?{ok:true,json:async()=>[{id:'a',name:'A',file:'a.mdx'}]}:{ok:true,headers:new Headers(),arrayBuffer:async()=>bytes};};
 const rows=await publishedModels({}, {fetchApi,publication});assert(urls.every(url=>new URL(url).searchParams.get('publication')===publication));assert.equal(rows[0].files[0].url,'https://www.lowpolyworks.com/models/a.mdx');
});

test('overlapping upload events share delivery leases so different releases cannot exceed the serial sender rate',async()=>{
 const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();
 f.models.push({id:'b',name:'B',fingerprint:'b'},{id:'c',name:'C',fingerprint:'c'});await f.sync();
 const results=await Promise.all([f.deliver(),f.deliver()]);assert.equal(results.reduce((count,row)=>count+row.sent,0),1);assert.equal(f.mail.length,1);assert(!f.state.modelDeliveryLease);
 assert.equal((await f.deliver()).sent,1);assert.equal(f.mail.length,2);assert.equal(new Set(f.mail.map(row=>row.key)).size,2);
});
