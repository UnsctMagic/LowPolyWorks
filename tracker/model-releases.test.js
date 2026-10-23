import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createModelReleases,publishedModels} from './lib/model-releases.js';
import {createHandler} from './api/model-notifications.js';
function fixture(){
 let state={subscribers:[],notifications:[]},models=[{id:'a',name:'Model A',url:'https://www.lowpolyworks.com/model/a/',fingerprint:'original'}],time=100000,writes=Promise.resolve(),failure,missingReceipt=false;
 const mail=[],attempts=[],env={MODEL_NOTIFICATIONS_ENABLED:'true'};
 const store={read:async()=>({state:structuredClone(state)}),mutate:fn=>{const task=writes.then(async()=>{const copy=structuredClone(state),result=await fn(copy);state=copy;return structuredClone(result);});writes=task.catch(()=>{});return task;}};
 const service=createModelReleases({store,env,now:()=>time,mailConfigured:()=>true,loadPublished:async()=>({models:structuredClone(models)}),unsubscribeUrl:()=> 'https://example.test/unsubscribe',fail:(status,message)=>{throw Object.assign(Error(message),{status});},sendEmail:async(message,key)=>{attempts.push(structuredClone({message,key}));if(failure)throw failure;const prior=mail.findIndex(row=>row.key===key);if(prior<0)mail.push(structuredClone({message,key}));return missingReceipt?undefined:'receipt-'+(prior<0?mail.length:prior+1);}});
 const sub=(id,ids=['a'])=>({id,email:id+'@example.test',confirmed:true,emailVerified:true,modelIds:ids,newModelsSince:0,modelFollowSince:Object.fromEntries(ids.map(id=>[id,0]))});
 return {...service,store,env,mail,attempts,sub,get state(){return state;},get models(){return models;},set models(value){models=value;},set time(value){time=value;},set failure(value){failure=value;},set missingReceipt(value){missingReceipt=value;}};
}
test('baseline mails no historical models and retires legacy post jobs',async()=>{const f=fixture();await f.store.mutate(s=>{s.subscribers.push(f.sub('reader'));s.notifications.push({id:'old',recipients:['reader'],sent:[]});});assert.equal((await f.sync()).baselined,true);assert.equal((await f.deliver()).sent,0);assert(f.state.notifications[0].cancelledAt);assert.equal(f.mail.length,0);});
test('updates reach only followers and each reader has an independent digest cooldown',async()=>{
 const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('a-reader'),f.sub('b-reader',['b']),{...f.sub('pending'),confirmed:false},f.sub('off',[])));await f.sync();
 f.models[0].fingerprint='updated';assert.equal((await f.sync()).queued,1);await Promise.all([f.deliver(),f.deliver()]);assert.equal(f.mail.length,1);assert.equal(f.mail[0].message.to,'a-reader@example.test');assert.match(f.mail[0].message.subject,/Model update:/);assert.equal(f.state.notifications[0].receipts['a-reader'],'receipt-1');
 f.models.push({id:'c',name:'Model C',url:'https://www.lowpolyworks.com/model/c/',fingerprint:'new'});assert.equal((await f.sync()).queued,2);const other=await f.deliver();assert.equal(other.sent,1);assert.equal(other.deferred,1);assert.equal(other.more,false);assert.equal(f.mail.length,2);assert.equal(f.mail[1].message.to,'b-reader@example.test');
 f.time=100000+48*3600000;await f.deliver();assert.equal(f.mail.length,3);await f.sync();assert.equal((await f.deliver()).sent,0);
});

test('unchecking, unsubscribing and re-following stop already queued mail; later subscribers get no backlog',async()=>{const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();f.models[0].fingerprint='updated';await f.sync();await f.store.mutate(s=>{s.subscribers[0].modelFollowSince.a=100001;s.subscribers.push(f.sub('later'));});assert.equal((await f.deliver()).sent,0);assert.equal(f.mail.length,0);});
test('cosmetic edits and restoring unchanged bytes send nothing; rollback after the cooldown is a distinct update',async()=>{const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();f.models[0].name='New title';assert.equal((await f.sync()).queued,0);f.models=[];await f.sync();f.models=[{id:'a',name:'Model A',fingerprint:'original',url:'https://example.test/a'}];assert.equal((await f.sync()).queued,0);f.models[0].fingerprint='changed';await f.sync();await f.deliver();f.time=100000+48*3600000;f.models[0].fingerprint='original';await f.sync();await f.deliver();assert.equal(f.mail.length,2);assert.notEqual(f.mail[0].key,f.mail[1].key);});
test('failed sends retain stable keys and receipts, and ambiguous results stop before deduplication expires',async()=>{const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();f.models[0].fingerprint='updated';await f.sync();f.failure=Error('network result unknown');assert.equal((await f.deliver()).error,'network result unknown');f.time=100000+23*3600000;await assert.rejects(f.deliver(),{status:409});assert.equal(f.mail.length,0);});
test('known quota rejection can retry the next day without treating it as an ambiguous send',async()=>{const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();f.models[0].fingerprint='updated';await f.sync();f.failure=Object.assign(Error('quota'),{status:429});await f.deliver();f.failure=null;f.time=100000+86400000;await f.deliver();assert.equal(f.mail.length,1);});
test('parallel model scans cannot enqueue duplicated releases; disabled delivery records a baseline only',async()=>{const f=fixture();const results=await Promise.allSettled([f.sync(),f.sync()]);assert.equal(results.filter(result=>result.status==='rejected').length,1);f.env.MODEL_NOTIFICATIONS_ENABLED='false';f.models[0].fingerprint='changed';assert.equal((await f.sync()).queued,0);await assert.rejects(f.deliver(),{status:503});});
test('published snapshots hash real downloads, reuse conditional reads, and include published unit download hashes',async()=>{
 const bytes=Buffer.from('MDLXactual-model'),hash=createHash('sha256').update(bytes).digest('hex');let conditional;
 const fetchApi=async(url,options)=>url.endsWith('catalogue.json')?{ok:true,json:async()=>[{id:'a',name:'A',file:'a.mdx'}]}:(conditional=options.headers,options.headers['If-None-Match']?{status:304}:{ok:true,status:200,headers:new Headers({etag:'"v1"'}),arrayBuffer:async()=>bytes});
 const loadUnits=async()=>({unitCards:[{id:'unit-a',name:'Unit A',downloads:[{sha256:'unit-hash'}]},{id:'hidden-unit',deletedAt:'today'}]});
 const {models:first}=await publishedModels({}, {fetchApi,loadUnits});assert.equal(first[0].files[0].hash,hash);assert.equal(first.length,2);const {models:second}=await publishedModels({a:first[0]},{fetchApi,loadUnits});assert.equal(conditional['If-None-Match'],'"v1"');assert.equal(second[0].fingerprint,first[0].fingerprint);
});
test('background worker requires its dedicated token and never accepts model contents from requests',async()=>{
 let scans=0;const handler=createHandler({releases:{sync:async()=>{scans++;return {enabled:false,remaining:0};}}},{env:{MODEL_NOTIFICATIONS_TOKEN:'test-worker-token'}});
 async function call(method,authorization){const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;}};await handler({method,headers:{authorization},body:{fakeModel:'ignored'}},res);return res;}
 assert.equal((await call('GET','Bearer test-worker-token')).code,405);assert.equal((await call('POST','Bearer wrong')).code,401);assert.equal(scans,0);assert.equal((await call('POST','Bearer test-worker-token')).code,200);assert.equal(scans,1);
});

test('every change during the 48-hour wait remains pending and the next digest contains the latest of each model',async()=>{
 const f=fixture(),hour=3600000,start=100000;await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();
 f.models[0].fingerprint='first';await f.sync();await f.deliver();
 f.time=start+23*hour;f.models[0].fingerprint='second';assert.equal((await f.sync()).queued,1);
 f.time=start+24*hour;f.models[0].fingerprint='third';f.models[0].name='Latest A';assert.equal((await f.sync()).queued,1);
 f.models.push({id:'new',name:'New release',url:'https://example.test/new',fingerprint:'new'});assert.equal((await f.sync()).queued,1);
 assert.deepEqual(await f.deliver(),{sent:0,remaining:1,deferred:1,more:false});assert.equal(f.mail.length,1);
 f.time=start+48*hour-1;assert.equal((await f.deliver()).sent,0);assert.equal(f.state.subscribers[0].lastModelEmailAt,start);
 f.time=start+48*hour;assert.equal((await f.deliver()).sent,1);assert.equal(f.mail.length,2);const digest=f.mail[1].message;assert.equal((digest.text.match(/Latest A/g)||[]).length,1);assert.match(digest.text,/New release/);assert(!digest.text.includes('Model A'));assert.equal(f.state.notifications.filter(job=>job.sent.includes('reader')).length,4);
 f.time=start+100*hour;assert.equal((await f.deliver()).sent,0);assert.equal(f.state.subscribers[0].lastModelEmailAt,start+48*hour);
});

test('five releases for four subscribers produce four complete digests, never twenty individual emails',async()=>{
 const f=fixture();await f.store.mutate(s=>s.subscribers.push(...Array.from({length:4},(_,i)=>f.sub('reader-'+i))));await f.sync();
 for(let i=0;i<5;i++)f.models.push({id:'warrior-'+i,name:'Warrior '+i,url:'https://example.test/warrior-'+i,fingerprint:'new-'+i});
 assert.equal((await f.sync()).queued,20);for(let i=0;i<4;i++)assert.equal((await f.deliver()).sent,1);
 assert.equal(f.mail.length,4);for(const {message} of f.mail)for(let i=0;i<5;i++)assert.match(message.text,new RegExp('Warrior '+i));
 for(let i=0;i<4;i++)assert.equal(new Set(f.state.notifications.map(job=>job.receipts['reader-'+i])).size,1);
 assert.equal((await f.deliver()).sent,0);
});

test('delayed changes and an unsent new release are coalesced without losing the announcement',async()=>{
 const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('reader',['a','b'])));await f.sync();
 f.models.push({id:'b',name:'B first',url:'https://example.test/b',fingerprint:'one'});await f.sync();f.time=100000+2*86400000;f.models[1].name='B latest';f.models[1].fingerprint='two';assert.equal((await f.sync()).queued,1);
 assert.equal((await f.deliver()).sent,1);assert.equal(f.mail[0].message.subject,'New model: B latest');assert.equal(f.state.notifications.length,2);assert(f.state.notifications.every(job=>job.sent.includes('reader')));assert.equal((await f.deliver()).sent,0);
});

test('publication cache keys fetch fresh catalogue/download bytes while retaining canonical file identities',async()=>{
 const urls=[],publication='a'.repeat(40),bytes=Buffer.from('MDLXfresh');const fetchApi=async url=>{urls.push(url);return url.includes('/catalogue.json')?{ok:true,json:async()=>[{id:'a',name:'A',file:'a.mdx'}]}:{ok:true,headers:new Headers(),arrayBuffer:async()=>bytes};};
 const {models:rows}=await publishedModels({}, {fetchApi,publication});assert(urls.every(url=>new URL(url).searchParams.get('publication')===publication));assert.equal(rows[0].files[0].url,'https://www.lowpolyworks.com/models/a.mdx');
});

test('overlapping upload events share delivery leases so different releases cannot exceed the serial sender rate',async()=>{
 const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();
 f.models.push({id:'b',name:'B',fingerprint:'b'},{id:'c',name:'C',fingerprint:'c'});await f.sync();
 const results=await Promise.all([f.deliver(),f.deliver()]);assert.equal(results.reduce((count,row)=>count+row.sent,0),1);assert.equal(f.mail.length,1);assert(!f.state.modelDeliveryLease);
 assert.equal((await f.deliver()).sent,0);assert.equal(f.mail.length,1);assert.match(f.mail[0].message.text,/B/);assert.match(f.mail[0].message.text,/C/);
});

test('a requested test update uses the real picture email and preserves model bytes and follows while counting toward the recipient cooldown',async()=>{
 const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();const snapshot=structuredClone(f.state.modelReleases.models.a),subscribers=structuredClone(f.state.subscribers);
 await f.store.mutate(s=>s.notifications.push({id:'explicit-test-update',source:'catalogue',test:true,modelId:'a',kind:'model-update',model:{name:'Model A',url:'https://www.lowpolyworks.com/model/a/'},createdAt:new Date(100000).toISOString(),recipients:['reader'],sent:[],attempts:{},receipts:{}}));
 assert.equal((await f.deliver()).sent,1);assert.match(f.mail[0].message.html,/<img src=/);assert.match(f.mail[0].message.text,/This is a test email/);assert.deepEqual(f.state.modelReleases.models.a,snapshot);assert.deepEqual(f.state.subscribers,subscribers.map(sub=>({...sub,lastModelEmailAt:100000})));
 f.models[0].fingerprint='real-update';assert.equal((await f.sync()).queued,1);assert.equal((await f.deliver()).sent,0);
});

test('unknown delivery retries reuse the exact frozen email; newer releases wait for the next digest',async()=>{
 const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();f.models[0].fingerprint='updated';await f.sync();f.failure=Error('Lost provider response');await f.deliver();
 const attempted=structuredClone(f.attempts[0]);f.models.push({id:'b',name:'Later release',url:'https://example.test/b',fingerprint:'b'});await f.sync();f.failure=null;const retried=await f.deliver();assert.equal(retried.sent,1);assert.deepEqual(f.attempts[1],attempted);assert.equal(retried.deferred,1);assert.equal(f.state.notifications[1].sent.length,0);
 f.time=100000+48*3600000;await f.deliver();assert.equal(f.mail.length,2);assert.match(f.mail[1].message.text,/Later release/);
});
test('known rejection permits a later complete digest, while conflicts preserve uncertain payloads',async()=>{
 const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();f.models[0].fingerprint='updated';await f.sync();f.failure=Object.assign(Error('Quota'),{status:429});await f.deliver();assert.deepEqual(f.state.modelDigests,{});
 f.models.push({id:'b',name:'Later release',url:'https://example.test/b',fingerprint:'b'});await f.sync();f.failure=Object.assign(Error('Concurrent provider request'),{status:409});await f.deliver();assert.equal(f.state.modelDigests.reader.jobIds.length,2);f.failure=null;await f.deliver();assert.deepEqual(f.attempts[2],f.attempts[1]);assert.equal(f.mail.length,1);assert.match(f.mail[0].message.text,/Later release/);
});
test('a receipt write failure retries the same provider key and cannot send a second digest',async()=>{
 const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();f.models[0].fingerprint='updated';await f.sync();const mutate=f.store.mutate;let calls=0;f.store.mutate=fn=>++calls===2?Promise.reject(Error('Receipt write lost')):mutate(fn);
 await assert.rejects(f.deliver(),/Receipt write lost/);assert.equal(f.mail.length,1);f.store.mutate=mutate;f.time=160000;await f.deliver();assert.equal(f.attempts.length,2);assert.deepEqual(f.attempts[0],f.attempts[1]);assert.equal(f.mail.length,1);assert.equal(f.state.subscribers[0].lastModelEmailAt,160000);assert.equal((await f.deliver()).sent,0);
});
test('legacy receipt migration holds previous recipients for 48 hours exactly once',async()=>{
 const f=fixture();await f.store.mutate(s=>{s.subscribers.push(f.sub('reader'));s.notifications.push({id:'old',source:'catalogue',modelId:'a',kind:'model-update',recipients:['reader'],sent:['reader'],receipts:{reader:'legacy-receipt'}});});await f.sync();f.models[0].fingerprint='updated';await f.sync();assert.equal((await f.deliver()).sent,0);assert.equal(f.state.modelDigestPolicyAt,100000);
 f.time=100000+24*3600000;await f.sync();assert.equal((await f.deliver()).sent,0);assert.equal(f.state.subscribers[0].lastModelEmailAt,100000);
 f.time=100000+48*3600000;assert.equal((await f.deliver()).sent,1);assert.equal(f.mail.length,1);
});
test('uncertain legacy individual sends and changed subscriptions require receipt review before a digest',async()=>{
 const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();f.models[0].fingerprint='updated';await f.sync();await f.store.mutate(s=>s.notifications[0].attempts.reader=100000);await assert.rejects(f.deliver(),/individual email result needs review/);assert.equal(f.mail.length,0);
 await f.store.mutate(s=>s.notifications[0].attempts={});f.failure=Error('Unknown');await f.deliver();await f.store.mutate(s=>s.subscribers[0].modelIds=['b']);f.models.push({id:'b',name:'B',url:'https://example.test/b',fingerprint:'b'});await f.sync();await assert.rejects(f.deliver(),/subscriptions changed/);assert.equal(f.mail.length,0);
});
test('hidden and deleted releases and unsubscribed readers are omitted from pending digests',async()=>{
 const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('reader'),f.sub('off')));await f.sync();f.models[0].fingerprint='updated';f.models.push({id:'b',name:'B',fingerprint:'b'},{id:'c',name:'C',fingerprint:'c'});await f.sync();await f.store.mutate(s=>{s.subscribers[1].confirmed=false;s.hiddenModels=['b'];s.unitCards=[{id:'c',deletedAt:'today'}];});await f.deliver();assert.equal(f.mail.length,1);assert.equal(f.mail[0].message.subject,'Model update: Model A');assert.equal((await f.deliver()).remaining,0);
});

test('a missing provider receipt remains uncertain and retries cannot duplicate the accepted email',async()=>{
 const f=fixture();await f.store.mutate(s=>s.subscribers.push(f.sub('reader')));await f.sync();f.models[0].fingerprint='updated';await f.sync();f.missingReceipt=true;assert.match((await f.deliver()).error,/send receipt/);assert.equal(f.mail.length,1);assert(f.state.modelDigests.reader);assert.equal(f.state.notifications[0].sent.length,0);
 f.missingReceipt=false;assert.equal((await f.deliver()).sent,1);assert.equal(f.mail.length,1);assert.deepEqual(f.attempts[0],f.attempts[1]);assert.equal((await f.deliver()).sent,0);
});

test('the Worker-compatible manual redirect mode rejects catalogue and download redirects without following them',async()=>{
 for(const redirectCatalogue of [true,false]){
  const calls=[],fetchApi=async(url,options)=>{calls.push(url);assert.equal(options.redirect,'manual');if(!redirectCatalogue&&url.endsWith('/catalogue.json'))return Response.json([{id:'a',name:'A',file:'a.mdx'}]);return new Response(null,{status:302,headers:{Location:'https://example.test/redirected'}});};
  await assert.rejects(publishedModels({}, {fetchApi}),/HTTP 302/);assert.equal(calls.length,redirectCatalogue?1:2);assert(calls.every(url=>url.startsWith('https://www.lowpolyworks.com/')));
 }
});
