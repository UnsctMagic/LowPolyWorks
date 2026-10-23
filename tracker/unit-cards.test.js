import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {Writable} from 'node:stream';
import {zipSync} from 'fflate';
import {parseMDX,generateMDX,generateMDL} from '../dist/vendor/war3-model.mjs';
import {createPublishing,initialState,digest} from './lib/publishing.js';
import {createAssetHandler} from './api/assets.js';
import {createHandler} from './api/publishing.js';
import {unpackFile,inspectModel,findTexture} from './vendor/model-files.js';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const original=fs.readFileSync(new URL('../dist/models/WH_VC_Graveguard03.mdx',import.meta.url));
function pack(){const model=parseMDX(original.buffer.slice(original.byteOffset,original.byteOffset+original.byteLength));model.Textures.find(t=>t.Image&&![1,2].includes(t.ReplaceableId)).Image='Custom\\skin.blp';const edited=new Uint8Array(generateMDX(model));const textures=JSON.parse(fs.readFileSync(new URL('../dist/textures.json',import.meta.url))),ref=parseMDX(original.buffer.slice(original.byteOffset,original.byteOffset+original.byteLength)).Textures.find(t=>t.Image&&![1,2].includes(t.ReplaceableId)).Image;const skin=fs.readFileSync(new URL('../dist/'+textures[ref.toLowerCase()],import.meta.url));return zipSync({'Pack/Main.mdx':edited,'Pack/Variant.mdx':edited,'Pack/Custom/skin.blp':skin});}
function fixture({notifications=false}={}){let state=initialState(),writes=Promise.resolve(),time=1791532800000;const mail=[];const files=new Map(),permits=[];const store={read:async()=>({state:structuredClone(state)}),mutate:change=>{const task=writes.then(async()=>{const copy=structuredClone(state),result=await change(copy);state=copy;return structuredClone(result);});writes=task.catch(()=>{});return task;}};const env={PUBLISHING_SESSION_SECRET:'unit-test-secret'.repeat(4),PUBLISHING_OWNER_USERNAME:'owner',PUBLISHING_SETUP_TOKEN_HASH:digest('setup'),MODEL_NOTIFICATIONS_ENABLED:String(notifications)};const service=createPublishing({store,env,now:()=>time,mailConfigured:()=>notifications,sendEmail:async(message,key)=>{mail.push({message,key});return key;},createUploadToken:async p=>{permits.push(p);return 'test-token';},inspectUpload:async path=>{const file=files.get(path);if(!file)throw Error('Missing upload');return {size:file.bytes.length,contentType:file.type};},readUpload:async path=>files.get(path).bytes,saveAsset:async(path,bytes,type)=>files.set(path,{bytes,type})});return {...service,store,files,permits,mail,get state(){return state;},set time(value){time=value;}};}
async function account(f,username='owner',owner){let token='setup';if(owner){const invite=await f.execute('invite',{username},owner);token=new URLSearchParams(new URL(invite.url).hash.slice(1)).get('invite');}const result=await f.execute('activate',{username,name:username,password:'long-unit-test-password',token});const session=result.cookie.match(/^lpw_session=([^;]+)/)[1];return {session,csrf:(await f.execute('me',{}, {session})).csrf};}
async function login(f,username='owner'){const session=(await f.execute('login',{username,password:'long-unit-test-password'})).cookie.match(/^lpw_session=([^;]+)/)[1];return {session,csrf:(await f.execute('me',{},{session})).csrf};}
async function upload(f,request,name,bytes){const p=await f.execute('unit-upload-token',{name,size:bytes.length},request);f.files.set(p.pathname,{bytes,type:p.type});return (await f.execute('unit-upload-complete',{id:p.id},request)).upload;}
async function cover(f,request){const bytes=Uint8Array.from([137,80,78,71,13,10,26,10]),p=await f.execute('upload-token',{name:'unit-card.png',size:bytes.length,type:'image/png'},request);f.files.set(p.pathname,{bytes,type:'image/png'});return (await f.execute('upload-complete',{id:p.id},request)).media;}
const content=(upload,image)=>({id:'unit-'+randomUUID(),name:'Two models',projectId:'warhammercraft',army:'vampire-counts',description:'**Lore** with [a link](https://example.test/lore) and [img]https://example.test/image.png[/img].',byline:'[Finished author](https://example.test/author)',credits:'**Model Base**\n\n[Original model](https://example.test/base) by [Source author](https://example.test/source)',uploadIds:[upload.id],coverId:image.id,defaultModelId:upload.models[0].assetId});
test('several standalone models and MDL source text publish in one card without rewriting downloads',async()=>{
 const f=fixture(),owner=await account(f),model=parseMDX(original.buffer.slice(original.byteOffset,original.byteOffset+original.byteLength)),mdl=new TextEncoder().encode(generateMDL(model)),first=await upload(f,owner,'first.mdx',original),second=await upload(f,owner,'second.mdl',mdl),image=await cover(f,owner);
 const input={...content(first,image),uploadIds:[first.id,second.id],defaultModelId:second.models[0].assetId};const {card}=await f.execute('publish-unit',input,owner);assert.equal(card.models.length,2);assert.equal(card.models[1].name,'second.mdl');assert.equal(card.models[1].sha256,hash(mdl));assert.equal(card.downloads[0].sha256,hash(original));assert.equal(card.downloads[1].sha256,hash(mdl));
});
test('ZIP discovery preserves both model bytes, texture paths, original pack, and hashes',async()=>{
 const f=fixture(),owner=await account(f),zip=pack(),sourceHash=hash(original),u=await upload(f,owner,'models.zip',zip),image=await cover(f,owner),input=content(u,image);
 assert.equal(u.sha256,hash(zip));assert.equal(u.models.length,2);assert(u.models[0].textureRefs.includes('Custom\\skin.blp'));
 const {card}=await f.execute('publish-unit',input,owner);assert.equal(card.models.length,2);assert.equal(card.downloads[0].sha256,hash(zip));assert(card.models[0].textureFiles['custom/skin.blp'].includes('/api/assets?id='));assert.equal(card.credits,input.credits);assert.equal(card.byline,input.byline);assert.equal(card.description,input.description);assert.equal(hash(original),sourceHash);
 const stored=f.state.uploads.find(x=>x.id===u.id);assert.deepEqual(f.files.get(stored.pathname).bytes,zip);
 const exposed=JSON.stringify(await f.execute('catalogue'));for(const privateKey of ['pathname','password','sessionVersion','clientToken'])assert(!exposed.includes('"'+privateKey+'"'));
 await Promise.all([f.execute('publish-unit',input,owner),f.execute('publish-unit',input,owner)]);assert.equal(f.state.unitCards.length,1);assert.equal(f.state.posts.length,1);assert.equal(f.state.notifications.length,0);
 assert.equal((await f.execute('feed')).posts[0].unitCard.coverUrl,card.coverUrl);
});
test('invited authors can upload and edit their own cards; deletion and account management stay admin-only',async()=>{
 const f=fixture(),owner=await account(f),author=await account(f,'contributor',owner),other=await account(f,'another',owner);
 await assert.rejects(f.execute('unit-upload-token',{name:'unit.mdx',size:original.length},{session:author.session}),{status:403});
 const u=await upload(f,author,'unit.mdx',original),image=await cover(f,author),input=content(u,image);await f.execute('publish-unit',input,author);
 await assert.rejects(f.execute('publish-unit',{...input,id:'unit-'+randomUUID()},other),{status:400});
 await assert.rejects(f.execute('update-unit',{...input,revision:0},other),{status:403});
 const changed=await f.execute('update-unit',{...input,revision:0,name:'Changed'},author);assert.equal(changed.card.name,'Changed');assert.equal(f.state.posts.length,1);
 await assert.rejects(f.execute('delete-unit',{id:input.id,revision:1},author),{status:403});
 await assert.rejects(f.execute('hide-model',{id:'strigoi-vampire'},author),{status:403});
 const post={id:randomUUID(),title:'Author post',body:'Text',kind:'news',projectId:'warhammercraft',link:''};await f.execute('publish',post,author);
 await assert.rejects(f.execute('delete-post',{id:post.id,revision:0},author),{status:403});await f.execute('delete-post',{id:post.id,revision:0},owner);
 await f.execute('delete-unit',{id:input.id,revision:1},owner);assert.equal((await f.execute('catalogue')).cards.length,0);assert.equal((await f.execute('feed')).posts.length,0);
 await f.execute('restore-unit',{id:input.id,revision:2},owner);assert.equal((await f.execute('catalogue')).cards.length,1);
});
test('missing and ambiguous custom textures fail before publication; incomplete uploads never publish',async()=>{
 const f=fixture(),owner=await account(f),zip=pack(),files=unpackFile('pack.zip',zip),model=files.find(e=>e.name.endsWith('Main.mdx'));const u=await upload(f,owner,'missing.mdx',model.bytes),image=await cover(f,owner);
 await assert.rejects(f.execute('publish-unit',content(u,image),owner),{status:400});assert.equal(f.state.unitCards?.length||0,0);
 assert.throws(()=>findTexture([{name:'a/skin.blp'},{name:'b/skin.blp'}],'unit.mdx','skin.blp'),/More than one/);
 assert.throws(()=>unpackFile('bad.zip',zipSync({'../bad.mdx':model.bytes})),/Invalid file path/);
 const p=await f.execute('unit-upload-token',{name:'not-finished.mdx',size:100},owner);await assert.rejects(f.execute('publish-unit',{...content(u,image),uploadIds:[p.id]},owner),{status:400});
 const textureIndex=JSON.parse(fs.readFileSync(new URL('./lib/native-textures.json',import.meta.url)));assert(Object.keys(textureIndex).length>6000);assert(inspectModel(model).textureRefs.includes('Custom\\skin.blp'));
});
test('asset HTTP route protects drafts, serves exact ZIP bytes with CORS, and revokes deleted cards',async()=>{
 const f=fixture(),owner=await account(f),zip=pack(),u=await upload(f,owner,'models.zip',zip),image=await cover(f,owner);
 const handler=createAssetHandler({store:f.store,getBlob:async path=>({statusCode:200,stream:new ReadableStream({start(c){c.enqueue(f.files.get(path).bytes);c.close();}})})});
 async function get(){const chunks=[],res=new Writable({write(chunk,_encoding,done){chunks.push(chunk);done();}});res.headers={};res.setHeader=(key,value)=>res.headers[key]=value;res.status=code=>{res.statusCode=code;return res;};await handler({method:'GET',url:'/api/assets?id='+u.id+'&download=1'},res);return {status:res.statusCode,headers:res.headers,bytes:Buffer.concat(chunks)};}
 assert.equal((await get()).status,404);const {card}=await f.execute('publish-unit',content(u,image),owner),response=await get();assert.equal(hash(response.bytes),hash(zip));assert.equal(response.headers['Access-Control-Allow-Origin'],'*');assert(response.headers['Content-Disposition'].includes('models.zip'));
 await f.execute('delete-unit',{id:card.id,revision:0},owner);assert.equal((await get()).status,404);
});

test('Vault publication queues actual file changes for one digest without starting background mail',async()=>{
 const f=fixture({notifications:true}),owner=await account(f),u=await upload(f,owner,'unit.mdx',original),image=await cover(f,owner),input=content(u,image),tasks=[];
 await f.store.mutate(s=>s.subscribers.push({id:'reader',email:'reader@example.test',confirmed:true,emailVerified:true,modelIds:[input.id],newModelsSince:0,modelFollowSince:{[input.id]:0}}));
 const handler=createHandler(f,{background:promise=>tasks.push(promise)});
 async function publish(action,body){const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;}};await handler({url:'/api/publishing?action='+action,method:'POST',headers:{origin:'https://lowpolyworks-internal-tracker.vercel.app','content-type':'application/json',cookie:'lpw_session='+owner.session,'x-csrf-token':owner.csrf},body},res);assert.equal(res.code,200);assert(!Object.hasOwn(res.body,'modelChanged'));return res.body.card;}
 let card=await publish('publish-unit',input);await publish('publish-unit',input);card=await publish('update-unit',{...input,revision:card.revision,name:'Cosmetic edit'});assert.equal(f.state.notifications.length,1);
 const parsed=parseMDX(original.buffer.slice(original.byteOffset,original.byteOffset+original.byteLength));
 async function changed(name){parsed.Info.Name=name;return upload(f,owner,'changed.mdx',new Uint8Array(generateMDX(parsed)));}
 const first=await changed('Revision one');card=await publish('update-unit',{...input,revision:card.revision,uploadIds:[first.id],defaultModelId:first.models[0].assetId});
 f.time=1791532800000+3600000;const second=await changed('Revision two');await publish('update-unit',{...input,revision:card.revision,uploadIds:[second.id],defaultModelId:second.models[0].assetId});assert.equal(tasks.length,0);assert.equal(f.mail.length,0);assert.equal(f.state.notifications.length,3);
 assert.equal((await f.releases.deliver()).sent,1);assert.equal(f.mail.length,1);assert(f.state.notifications.every(job=>job.sent.includes('reader')));assert.equal((await f.releases.deliver()).sent,0);
});

test('permanent removal hides a Vault card at once, can be undone for 24 hours, then deletes its card, post and files',async()=>{
 const f=fixture(),deleted=[],start=1791532800000;let owner=await account(f);const author=await account(f,'contributor',owner);let elapsed=0;
 const service=createPublishing({store:f.store,env:{PUBLISHING_SESSION_SECRET:'unit-test-secret'.repeat(4),PUBLISHING_OWNER_USERNAME:'owner',PUBLISHING_SETUP_TOKEN_HASH:digest('setup')},now:()=>start+elapsed,mailConfigured:()=>false,sendEmail:async()=>{},createUploadToken:async()=>'test-token',inspectUpload:async path=>({size:f.files.get(path).bytes.length,contentType:f.files.get(path).type}),readUpload:async path=>f.files.get(path).bytes,saveAsset:async(path,bytes,type)=>f.files.set(path,{bytes,type}),deleteFiles:async paths=>deleted.push(...paths)});
 const u=await upload(f,author,'models.zip',pack()),image=await cover(f,author),input=content(u,image);await service.execute('publish-unit',input,author);
 const kept=await upload(f,author,'other.mdx',original),keptImage=await cover(f,author),other=content(kept,keptImage);await service.execute('publish-unit',other,author);
 await assert.rejects(service.execute('remove-unit',{id:input.id,revision:0},author),{status:403});
 const removed=await service.execute('remove-unit',{id:input.id,revision:0},owner);assert.equal(removed.card.removeAt,new Date(start+86400000).toISOString());
 assert.deepEqual((await service.execute('catalogue')).cards.map(card=>card.id),[other.id]);assert.equal((await service.execute('feed')).posts.length,1);
 await assert.rejects(service.execute('restore-unit',{id:input.id,revision:1},owner),{status:409});
 await assert.rejects(service.execute('update-unit',{...input,revision:1},author),{status:409});
 await service.execute('undo-remove-unit',{id:input.id,revision:1},owner);assert.equal((await service.execute('catalogue')).cards.length,2);assert.equal((await service.execute('feed')).posts.length,2);
 await service.execute('delete-unit',{id:input.id,revision:2},owner);await service.execute('remove-unit',{id:input.id,revision:3},owner);
 elapsed=86400000-1;owner=await login(service);await service.execute('undo-remove-unit',{id:input.id,revision:4},owner);assert.equal((await service.execute('catalogue')).cards.length,1,'a card hidden before removal stays hidden after undo');
 await service.execute('remove-unit',{id:input.id,revision:5},owner);elapsed+=86400000;owner=await login(service);
 await assert.rejects(service.execute('undo-remove-unit',{id:input.id,revision:6},owner),{status:404},'the next admin Vault visit deletes the expired card');
 const me=await service.execute('me',{},owner);assert.deepEqual(me.unitCards.map(card=>card.id),[other.id]);
 assert.equal(f.state.posts.length,1);assert(!f.state.uploads.some(row=>row.id===u.id||row.parentUploadId===u.id||row.id===image.id));
 assert(f.state.uploads.some(row=>row.id===kept.id)&&f.state.uploads.some(row=>row.id===keptImage.id));
 assert(deleted.length>=4&&deleted.every(path=>!path.includes(kept.id)));assert.equal(f.state.removedCards[input.id].name,input.name);
});
test('the admin edits, hides and permanently removes existing catalogue cards with a 24-hour undo',async()=>{
 const f=fixture();let owner=await account(f);const author=await account(f,'contributor',owner);
 const edit={id:'graveguard',name:'Grave Guard',army:'vampire-counts',description:'New lore.',credits:'Model Base - Necron Guard by Rhapsodie',authors:[{name:'Unsanctioned Magic',url:'https://example.test/um'}],creditLinks:[{text:'Rhapsodie',url:'https://example.test/r'}]};
 await assert.rejects(f.execute('edit-model',edit,author),{status:403});
 await assert.rejects(f.execute('edit-model',{...edit,army:'dwarfs'},owner),{status:400});
 await assert.rejects(f.execute('edit-model',{...edit,authors:[{name:'Bad',url:'javascript:alert(1)'}]},owner),{status:400});
 await f.execute('edit-model',edit,owner);await assert.rejects(f.execute('edit-model',edit,owner),{status:409});
 const saved=(await f.execute('catalogue')).modelEdits.graveguard;assert.equal(saved.name,'Grave Guard');assert.equal(saved.revision,1);
 await f.execute('reset-model',{id:'graveguard',revision:1},owner);assert.deepEqual((await f.execute('catalogue')).modelEdits,{});
 await f.execute('hide-model',{id:'graveguard'},owner);await f.execute('remove-model',{id:'graveguard'},owner);
 await assert.rejects(f.execute('restore-model',{id:'graveguard'},owner),{status:409});
 await f.execute('undo-remove-model',{id:'graveguard'},owner);assert.deepEqual((await f.execute('catalogue')).hiddenModels,['graveguard'],'hidden before removal stays hidden');
 await f.execute('restore-model',{id:'graveguard'},owner);await f.execute('edit-model',edit,owner);
 await f.execute('remove-model',{id:'graveguard'},owner);assert.deepEqual((await f.execute('catalogue')).hiddenModels,['graveguard']);
 f.time=1791532800000+86400000;owner=await login(f);await assert.rejects(f.execute('undo-remove-model',{id:'graveguard'},owner),{status:410});
 const me=await f.execute('me',{},owner);assert.deepEqual(me.removedModels,['graveguard']);assert.deepEqual(me.modelRemovals,{});assert.deepEqual(me.hiddenModels,['graveguard']);assert.equal(me.modelEdits.graveguard,undefined);
 await assert.rejects(f.execute('restore-model',{id:'graveguard'},owner),{status:410});
});
