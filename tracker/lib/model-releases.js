import {createHash,randomUUID} from 'node:crypto';
import {modelDigestEmail} from './model-email.js';
import {AUTHOR_ORIGIN} from './author-origin.js';
import {modelContent,packageContent} from './model-release-content.js';
const origin='https://www.lowpolyworks.com';
const hash=value=>createHash('sha256').update(value).digest('hex');
const active=sub=>sub.confirmed&&sub.emailVerified&&sub.modelIds?.length>0;
const digestCooldown=48*3600000;
// Package content comparison can inflate an MDX and custom textures. Keep that
// CPU work to one catalogue row per invocation on the Workers Free plan.
const scanBatchSize=1;
const scanBusy=message=>{throw Object.assign(Error(message),{status:409,retryAfter:5});};
export const unitRelease=card=>({id:card.id,source:'vault',name:card.name,url:origin+'/#model/'+card.id,imageUrl:AUTHOR_ORIGIN+'/api/assets?id='+card.coverId,files:[],fingerprint:hash(JSON.stringify(card.downloads.map(file=>file.sha256).sort()))});
const eligible=(sub,job)=>active(sub)&&(job.kind==='model-upload'?(!job.createdAt||sub.newModelsSince<=Date.parse(job.createdAt)):(job.relatedModelIds||[job.modelId]).some(id=>sub.modelIds.includes(id)&&(!job.createdAt||sub.modelFollowSince?.[id]<=Date.parse(job.createdAt))));
const pendingFor=(state,sub)=>(state.notifications||[]).filter(job=>job.source==='catalogue'&&!job.cancelledAt&&job.recipients.includes(sub.id)&&!job.sent.includes(sub.id)&&eligible(sub,job)&&!state.hiddenModels?.includes(job.modelId)&&!state.unitCards?.some(card=>card.id===job.modelId&&card.deletedAt));
const readyAt=sub=>(sub.lastModelEmailAt??-Infinity)+digestCooldown;
export const pendingModelEmails=state=>(state.subscribers||[]).filter(sub=>pendingFor(state,sub).length).length;
function digestStatus(state,time){
 const pending=(state.subscribers||[]).filter(sub=>pendingFor(state,sub).length),ready=pending.filter(sub=>readyAt(sub)<=time).length;
 return {remaining:pending.length,deferred:pending.length-ready,more:ready>0};
}
function initializeDigestPolicy(state,time){
 if(state.modelDigestPolicyAt!==undefined)return;
 // Legacy receipts have no per-recipient send timestamp. Hold their recipients
 // for 48 hours from this one-time transition, rather than risk mailing early.
 state.modelDigestPolicyAt=time;
 for(const sub of state.subscribers||[])if((state.notifications||[]).some(job=>job.source==='catalogue'&&job.receipts?.[sub.id]))sub.lastModelEmailAt=Math.max(sub.lastModelEmailAt||0,time);
}

// Compare the downloadable bytes, rather than titles, artwork, credits, or posts.
export async function publishedModels(previous={}, {fetchApi=fetch,loadUnits=async()=>({unitCards:[],hiddenModels:[]}),publication,continuation}={}){
 const fresh=url=>{if(!publication)return url;const result=new URL(url);result.searchParams.set('publication',publication);return result.href;};
 let catalogue=continuation?.catalogue,groups=continuation?.groups;
 if(!catalogue){
  const response=await fetchApi(fresh(origin+'/catalogue.json'),{cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('Published catalogue unavailable (HTTP '+response.status+')');
  catalogue=(await response.json()).map(({id,name,file,downloadPack,slug})=>({id,name,file,downloadPack,slug}));
 }
 if(!groups){
  const response=await fetchApi(fresh(origin+'/variants.json'),{cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('Published model variants unavailable (HTTP '+response.status+')');
  groups=await response.json();
 }
 const state=await loadUnits(),hidden=new Set(state.hiddenModels||[]),offset=continuation?.offset||0;
 const end=Math.min(offset+scanBatchSize,catalogue.length),rows=catalogue.slice(offset,end).filter(model=>!hidden.has(model.id));
 const result=[];let next=0;
 async function fileHash(path,old,scope,readContent){
  const url=new URL(path,origin+'/');if(url.origin!==origin)throw Error('Model download must belong to LowPolyWorks.');
  const cached=old?.files?.find(file=>file.url===url.href);
  const reusable=cached?.contentHash&&cached.scope===scope;
  const file=await fetchApi(fresh(url.href),{cache:'no-store',redirect:'manual',headers:reusable&&cached.etag?{'If-None-Match':cached.etag}:{},signal:AbortSignal.timeout(12000)});
  if(file.status===304&&reusable)return cached;
  if(!file.ok)throw Error('Published model download unavailable (HTTP '+file.status+')');
  const bytes=Buffer.from(await file.arrayBuffer());
  if(/\.mdx$/i.test(url.pathname)&&bytes.subarray(0,4).toString()!=='MDLX'||/\.zip$/i.test(url.pathname)&&bytes.subarray(0,2).toString()!=='PK')throw Error('Published model download has invalid file contents.');
  return {url:url.href,hash:hash(bytes),etag:file.headers.get('etag')||null,scope,...readContent(bytes)};
 }
 await Promise.all(Array.from({length:4},async()=>{while(next<rows.length){
  const model=rows[next++],files=[],group=groups.find(group=>group.variants.length===2&&group.variants.every(variant=>['Hero','Unit'].includes(variant.label))&&group.variants.some(variant=>variant.id===model.id));
  const primary=await fileHash('models/'+model.file,previous[model.id],'mdx-name-v1',modelContent);files.push(primary);
  if(model.downloadPack){
   const scope=hash(JSON.stringify([model.file,primary.textures,primary.contentHash]));
   files.push(await fileHash(model.downloadPack,previous[model.id],scope,bytes=>({contentHash:packageContent(bytes,model.file,primary.textures,primary.contentHash)})));
  }
  result.push({id:model.id,name:model.name,url:origin+'/model/'+(model.slug||model.id)+'/',releaseId:group?.id||model.id,relatedModelIds:group?group.variants.map(variant=>variant.id):[model.id],files,fingerprint:hash(JSON.stringify(files.map(file=>file.hash).sort())),contentFingerprint:hash(JSON.stringify(files.map(file=>file.contentHash)))});
 }}));
 const more=end<catalogue.length;
 if(!more)for(const card of (state.unitCards||[]).filter(card=>!card.deletedAt))result.push(unitRelease(card));
 return {models:result,continuation:more?{catalogue,groups,offset:end}:null,checked:end,total:catalogue.length};
}

export function createModelReleases({store,env,sendEmail,mailConfigured,loadPublished=publishedModels,now=()=>Date.now(),unsubscribeUrl,fail}){
 const enabled=()=>mailConfigured(env)&&env.MODEL_NOTIFICATIONS_ENABLED==='true';
 // Vault publications and daily catalogue scans share the same retained queue.
 function record(s,model,{baseline=false}={}){
  const time=now(),timestamp=new Date(time).toISOString();
  s.modelReleases??={baselineAt:timestamp,models:{}};
  const old=s.modelReleases.models[model.id],changed=old?.contentFingerprint&&model.contentFingerprint?old.contentFingerprint!==model.contentFingerprint:old?.fingerprint!==model.fingerprint;
  const revision=old?(old.revision||0)+(changed?1:0):0;
  const known=old||(model.relatedModelIds||[]).some(id=>s.modelReleases.models[id]);
  const kind=known?'model-update':'model-upload';
  let queued=0;
  if(!baseline&&changed&&enabled()){
   const identity={modelId:model.id,...(model.releaseId?{releaseId:model.releaseId,relatedModelIds:old?[model.id]:model.relatedModelIds}:{})};
   const job={id:hash(model.id+':'+revision+':'+model.fingerprint),source:'catalogue',...identity,kind,model:{name:model.name,url:model.url,...(model.imageUrl?{imageUrl:model.imageUrl}:{})},createdAt:timestamp,recipients:s.subscribers.filter(sub=>eligible(sub,{kind,...identity,createdAt:timestamp})).map(sub=>sub.id),sent:[],attempts:{},receipts:{}};
   s.notifications.push(job);queued=job.recipients.length;
  }
  s.modelReleases.models[model.id]={...old,...model,revision,...(old&&changed?{lastUpdateAt:time}:{})};
  return {changed,queued};
 }
 async function sync({publication}={}){
  const lease=randomUUID(),time=now();
  const snapshot=await store.mutate(s=>{
   initializeDigestPolicy(s,time);
   if(s.modelScanLease?.until>time)scanBusy('Published models are already being checked.');
   s.modelScanLease={token:lease,until:time+300000};
   const scan=s.modelScan?.publication===(publication||null)?s.modelScan:{publication:publication||null,models:[],baseline:!s.modelReleases};
   return {previous:s.modelReleases?.models||{},scan};
  });
  try{
  const batch=await loadPublished(snapshot.previous,{publication,continuation:snapshot.scan.continuation});
  const models=[...snapshot.scan.models,...batch.models];
  return await store.mutate(s=>{
   if(s.modelScanLease?.token!==lease)scanBusy('Another model check is already running.');
   if(batch.continuation){
    s.modelScan={...snapshot.scan,models,continuation:batch.continuation};delete s.modelScanLease;
    return {more:true,checked:batch.checked,total:batch.total,models:models.length,queued:0,remaining:pendingModelEmails(s),enabled:enabled()};
   }
   const timestamp=new Date(now()).toISOString();let queued=0;
   // Retire the previous post-based mailer without mailing historical posts.
   for(const job of s.notifications||[])if(job.source!=='catalogue')job.cancelledAt??=timestamp;
   const baseline=snapshot.scan.baseline;s.modelReleases??={baselineAt:timestamp,models:{}};
   for(const model of models){
    // A Vault upload may finish while the static downloads are being hashed.
    // Its atomic publication record owns the timer, so never replay a stale card.
    if(model.source==='vault'){const card=s.unitCards?.find(card=>card.id===model.id&&!card.deletedAt);if(card)queued+=record(s,unitRelease(card),{baseline}).queued;}
    else if(!s.hiddenModels?.includes(model.id))queued+=record(s,model,{baseline}).queued;
   }
   s.modelReleases.checkedAt=timestamp;
   delete s.modelScanLease;
   delete s.modelScan;
   return {more:false,checked:batch.checked,total:batch.total,baselined:baseline,models:models.length,queued,remaining:pendingModelEmails(s),enabled:enabled()};
  });
  }catch(error){await store.mutate(s=>{if(s.modelScanLease?.token===lease)delete s.modelScanLease;});throw error;}
 }
 async function deliver(){
  if(!enabled())fail(503,'Model notification delivery is not enabled yet.');
  const time=now(),lease=randomUUID();
  const work=await store.mutate(s=>{
   initializeDigestPolicy(s,time);
   if(s.modelDeliveryLease?.until>time)return {status:digestStatus(s,time)};
   const sub=s.subscribers.find(sub=>readyAt(sub)<=time&&pendingFor(s,sub).length);
   if(!sub)return {status:digestStatus(s,time)};
   const jobs=pendingFor(s,sub);s.modelDigests??={};
   let digest=s.modelDigests[sub.id];
   if(jobs.some(job=>job.attempts?.[sub.id]))fail(409,'An earlier individual email result needs review before creating a digest.');
   if(digest){
    if(time-digest.attemptedAt>=23*3600000)fail(409,'An earlier digest result needs review before retrying.');
    if(!digest.jobIds.every(id=>jobs.some(job=>job.id===id)))fail(409,'Digest subscriptions changed after an uncertain send. Review its receipt before retrying.');
   }else{
    const jobIds=jobs.map(job=>job.id).sort();
    digest={id:hash(sub.id+':'+jobIds.join(':')),recipientId:sub.id,jobIds,attemptedAt:time,message:{to:sub.email,...modelDigestEmail(jobs,unsubscribeUrl(sub.email))}};
    s.modelDigests[sub.id]=digest;
   }
   s.modelDeliveryLease={token:lease,until:time+60000};
   return {digest};
  });
  if(!work.digest)return {sent:0,...work.status};
  const {digest}=work;let receipt,error,rejected=false;
  try{
   receipt=await sendEmail(digest.message,'lpw-digest/'+digest.id,env);
   if(typeof receipt!=='string'||!receipt)throw Error('Email provider did not return a send receipt.');
  }catch(cause){
   error=cause.message;
   // Conflict/time-out responses can describe a send already in progress.
   rejected=cause.status>=400&&cause.status<500&&![408,409,425].includes(cause.status);
  }
  return store.mutate(s=>{
   if(s.modelDeliveryLease?.token!==lease)fail(409,'Digest delivery is already being handled.');
   if(!error){
    const sentAt=now(),sub=s.subscribers.find(sub=>sub.id===digest.recipientId);
    for(const id of digest.jobIds){
     const job=s.notifications.find(job=>job.id===id);if(!job)continue;
     if(!job.sent.includes(digest.recipientId))job.sent.push(digest.recipientId);
     job.receipts??={};job.receipts[digest.recipientId]=receipt;
     job.sentAt??={};job.sentAt[digest.recipientId]=sentAt;
     if(job.kind==='model-update'&&!job.test&&s.modelReleases?.models[job.modelId])s.modelReleases.models[job.modelId].lastUpdateEmailAt=sentAt;
    }
    if(sub)sub.lastModelEmailAt=Math.max(sub.lastModelEmailAt||0,sentAt);
   }
   if(!error||rejected)delete s.modelDigests[digest.recipientId];
   delete s.modelDeliveryLease;
   return {sent:error?0:1,...digestStatus(s,now()),...(error?{error}:{})};
  });
 }
 return {sync,deliver,enabled,record};
}
