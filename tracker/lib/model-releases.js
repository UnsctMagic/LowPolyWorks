import {createHash,randomUUID} from 'node:crypto';
import {modelEmail} from './model-email.js';
import {AUTHOR_ORIGIN} from './author-origin.js';
const origin='https://www.lowpolyworks.com';
const hash=value=>createHash('sha256').update(value).digest('hex');
const active=sub=>sub.confirmed&&sub.emailVerified&&sub.modelIds?.length>0;
const updateWindow=86400000;
// Ten rows need at most twenty downloads. Redirects must not silently multiply
// those requests; the remaining headroom is for state reads and writes.
const scanBatchSize=10;
const scanBusy=message=>{throw Object.assign(Error(message),{status:409,retryAfter:5});};
export const unitRelease=card=>({id:card.id,source:'vault',name:card.name,url:origin+'/#model/'+card.id,imageUrl:AUTHOR_ORIGIN+'/api/assets?id='+card.coverId,files:[],fingerprint:hash(JSON.stringify(card.downloads.map(file=>file.sha256).sort()))});
const eligible=(sub,job)=>active(sub)&&(job.kind==='model-upload'?(!job.createdAt||sub.newModelsSince<=Date.parse(job.createdAt)):(sub.modelIds.includes(job.modelId)&&(!job.createdAt||sub.modelFollowSince?.[job.modelId]<=Date.parse(job.createdAt))));
export const pendingModelEmails=state=>(state.notifications||[]).filter(job=>job.source==='catalogue'&&!job.cancelledAt).reduce((count,job)=>count+job.recipients.filter(id=>!job.sent.includes(id)).length,0);

// Compare the downloadable bytes, rather than titles, artwork, credits, or posts.
export async function publishedModels(previous={}, {fetchApi=fetch,loadUnits=async()=>({unitCards:[],hiddenModels:[]}),publication,continuation}={}){
 const fresh=url=>{if(!publication)return url;const result=new URL(url);result.searchParams.set('publication',publication);return result.href;};
 let catalogue=continuation?.catalogue;
 if(!catalogue){
  const response=await fetchApi(fresh(origin+'/catalogue.json'),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('Published catalogue unavailable (HTTP '+response.status+')');
  catalogue=(await response.json()).map(({id,name,file,downloadPack,slug})=>({id,name,file,downloadPack,slug}));
 }
 const state=await loadUnits(),hidden=new Set(state.hiddenModels||[]),offset=continuation?.offset||0;
 const end=Math.min(offset+scanBatchSize,catalogue.length),rows=catalogue.slice(offset,end).filter(model=>!hidden.has(model.id));
 const result=[];let next=0;
 async function fileHash(path,old){
  const url=new URL(path,origin+'/');if(url.origin!==origin)throw Error('Model download must belong to LowPolyWorks.');
  const cached=old?.files?.find(file=>file.url===url.href);
  const file=await fetchApi(fresh(url.href),{cache:'no-store',redirect:'error',headers:cached?.etag?{'If-None-Match':cached.etag}:{},signal:AbortSignal.timeout(12000)});
  if(file.status===304&&cached)return cached;
  if(!file.ok)throw Error('Published model download unavailable (HTTP '+file.status+')');
  const bytes=Buffer.from(await file.arrayBuffer());
  if(/\.mdx$/i.test(url.pathname)&&bytes.subarray(0,4).toString()!=='MDLX'||/\.zip$/i.test(url.pathname)&&bytes.subarray(0,2).toString()!=='PK')throw Error('Published model download has invalid file contents.');
  return {url:url.href,hash:hash(bytes),etag:file.headers.get('etag')||null};
 }
 await Promise.all(Array.from({length:4},async()=>{while(next<rows.length){const model=rows[next++],files=[];files.push(await fileHash('models/'+model.file,previous[model.id]));if(model.downloadPack)files.push(await fileHash(model.downloadPack,previous[model.id]));result.push({id:model.id,name:model.name,url:origin+'/model/'+(model.slug||model.id)+'/',files,fingerprint:hash(JSON.stringify(files.map(file=>file.hash).sort()))});}}));
 const more=end<catalogue.length;
 if(!more)for(const card of (state.unitCards||[]).filter(card=>!card.deletedAt))result.push(unitRelease(card));
 return {models:result,continuation:more?{catalogue,offset:end}:null,checked:end,total:catalogue.length};
}

export function createModelReleases({store,env,sendEmail,mailConfigured,loadPublished=publishedModels,now=()=>Date.now(),unsubscribeUrl,fail}){
 const enabled=()=>mailConfigured(env)&&env.MODEL_NOTIFICATIONS_ENABLED==='true';
 // Called inside the publishing transaction too, so every Vault file change
 // refreshes the rolling timer even when uploads happen faster than delivery.
 function record(s,model,{baseline=false}={}){
  const time=now(),timestamp=new Date(time).toISOString();
  s.modelReleases??={baselineAt:timestamp,models:{}};
  const old=s.modelReleases.models[model.id],changed=old?.fingerprint!==model.fingerprint;
  const revision=old?(old.revision||0)+(changed?1:0):0;
  const kind=old?'model-update':'model-upload';
  const cooling=kind==='model-update'&&(old.lastUpdateAt>time-updateWindow||old.lastUpdateEmailAt>time-updateWindow||(s.notifications||[]).some(job=>job.source==='catalogue'&&job.modelId===model.id&&job.kind==='model-update'&&!job.test&&!job.cancelledAt&&job.recipients.some(id=>!job.sent.includes(id))));
  let queued=0;
  if(!baseline&&changed&&!cooling&&enabled()){
   const job={id:hash(model.id+':'+revision+':'+model.fingerprint),source:'catalogue',modelId:model.id,kind,model:{name:model.name,url:model.url,...(model.imageUrl?{imageUrl:model.imageUrl}:{})},createdAt:timestamp,recipients:s.subscribers.filter(sub=>eligible(sub,{kind,modelId:model.id,createdAt:timestamp})).map(sub=>sub.id),sent:[],attempts:{},receipts:{}};
   s.notifications.push(job);queued=job.recipients.length;
  }
  s.modelReleases.models[model.id]={...old,...model,revision,...(old&&changed?{lastUpdateAt:time}:{})};
  return {changed,queued};
 }
 async function sync({publication}={}){
  const lease=randomUUID(),time=now();
  const snapshot=await store.mutate(s=>{
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
 async function deliver({limit=2}={}){
  if(!enabled())fail(503,'Model notification delivery is not enabled yet.');
  const time=now(),lease=randomUUID();
  const work=await store.mutate(s=>{
   if(s.modelDeliveryLease?.until>time)return null;
   const job=s.notifications.find(job=>job.source==='catalogue'&&!job.cancelledAt&&job.recipients.some(id=>!job.sent.includes(id))&&(!job.lease||job.lease.until<time));
   if(!job)return null;
   const recipients=job.recipients.filter(id=>!job.sent.includes(id)).slice(0,Math.min(2,limit));
   for(const id of recipients)if(job.attempts[id]&&time-job.attempts[id]>=23*3600000)fail(409,'An earlier email result needs review before retrying.');
   job.lease={token:lease,until:time+60000};s.modelDeliveryLease={...job.lease};
   return {...job,recipients};
  });
  if(!work)return {sent:0,remaining:pendingModelEmails((await store.read()).state)};
  const results=[];
  // Resend accepts two API requests per second. Serial sends also save receipts
  // promptly, leaving only the current recipient ambiguous if execution stops.
  for(const id of work.recipients){
   const sub=(await store.read()).state.subscribers.find(sub=>sub.id===id);let receipt,error,rejected,skipped=!sub||!eligible(sub,work);
   if(!skipped)try{
    await store.mutate(s=>{const job=s.notifications.find(job=>job.id===work.id);if(job?.lease?.token!==lease)fail(409,'Email delivery is already being handled.');job.attempts[id]??=now();});
    receipt=await sendEmail({to:sub.email,...modelEmail(work,unsubscribeUrl(sub.email))},'lpw-release/'+work.id+'/'+id,env);
   }catch(cause){error=cause.message;rejected=cause.status&&cause.status<500;}
   await store.mutate(s=>{const job=s.notifications.find(job=>job.id===work.id);if(job?.lease?.token!==lease)fail(409,'Email delivery is already being handled.');if(rejected)delete job.attempts[id];if(!error){if(!job.sent.includes(id))job.sent.push(id);if(receipt){job.receipts[id]=receipt;if(work.kind==='model-update'&&!work.test)s.modelReleases.models[work.modelId].lastUpdateEmailAt=now();}delete job.attempts[id];}});
   results.push({error,skipped});if(error)break;
   if(work.recipients.length>results.length)await new Promise(resolve=>setTimeout(resolve,600));
  }
  return store.mutate(s=>{const job=s.notifications.find(job=>job.id===work.id);if(job?.lease?.token===lease)delete job.lease;if(s.modelDeliveryLease?.token===lease)delete s.modelDeliveryLease;return {sent:results.filter(result=>!result.error&&!result.skipped).length,remaining:pendingModelEmails(s),error:results.find(result=>result.error)?.error};});
 }
 return {sync,deliver,enabled,record};
}
