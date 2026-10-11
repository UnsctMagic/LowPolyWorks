import {createHash,randomUUID} from 'node:crypto';
import {modelEmail} from './model-email.js';
const origin='https://www.lowpolyworks.com';
const hash=value=>createHash('sha256').update(value).digest('hex');
const active=sub=>sub.confirmed&&sub.emailVerified&&sub.modelIds?.length>0;
const updateWindow=86400000;
export const unitRelease=card=>({id:card.id,source:'vault',name:card.name,url:origin+'/#model/'+card.id,imageUrl:'https://lowpolyworks-internal-tracker.vercel.app/api/assets?id='+card.coverId,files:[],fingerprint:hash(JSON.stringify(card.downloads.map(file=>file.sha256).sort()))});
const eligible=(sub,job)=>active(sub)&&(job.kind==='model-upload'?(!job.createdAt||sub.newModelsSince<=Date.parse(job.createdAt)):(sub.modelIds.includes(job.modelId)&&(!job.createdAt||sub.modelFollowSince?.[job.modelId]<=Date.parse(job.createdAt))));
export const pendingModelEmails=state=>(state.notifications||[]).filter(job=>job.source==='catalogue'&&!job.cancelledAt).reduce((count,job)=>count+job.recipients.filter(id=>!job.sent.includes(id)).length,0);

// Compare the downloadable bytes, rather than titles, artwork, credits, or posts.
export async function publishedModels(previous={}, {fetchApi=fetch,loadUnits=async()=>({unitCards:[],hiddenModels:[]}),publication}={}){
 const fresh=url=>{if(!publication)return url;const result=new URL(url);result.searchParams.set('publication',publication);return result.href;};
 const response=await fetchApi(fresh(origin+'/catalogue.json'),{cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('Published catalogue unavailable (HTTP '+response.status+')');
 const catalogue=await response.json(),state=await loadUnits(),hidden=new Set(state.hiddenModels||[]);
 const rows=catalogue.filter(model=>!hidden.has(model.id));
 const result=[];let next=0;
 async function fileHash(path,old){
  const url=new URL(path,origin+'/');if(url.origin!==origin)throw Error('Model download must belong to LowPolyWorks.');
  const cached=old?.files?.find(file=>file.url===url.href);
  const file=await fetchApi(fresh(url.href),{cache:'no-store',headers:cached?.etag?{'If-None-Match':cached.etag}:{},signal:AbortSignal.timeout(12000)});
  if(file.status===304&&cached)return cached;
  if(!file.ok)throw Error('Published model download unavailable (HTTP '+file.status+')');
  const bytes=Buffer.from(await file.arrayBuffer());
  if(/\.mdx$/i.test(url.pathname)&&bytes.subarray(0,4).toString()!=='MDLX'||/\.zip$/i.test(url.pathname)&&bytes.subarray(0,2).toString()!=='PK')throw Error('Published model download has invalid file contents.');
  return {url:url.href,hash:hash(bytes),etag:file.headers.get('etag')||null};
 }
 await Promise.all(Array.from({length:4},async()=>{while(next<rows.length){const model=rows[next++],files=[];files.push(await fileHash('models/'+model.file,previous[model.id]));if(model.downloadPack)files.push(await fileHash(model.downloadPack,previous[model.id]));result.push({id:model.id,name:model.name,url:origin+'/model/'+(model.slug||model.id)+'/',files,fingerprint:hash(JSON.stringify(files.map(file=>file.hash).sort()))});}}));
 for(const card of (state.unitCards||[]).filter(card=>!card.deletedAt))result.push(unitRelease(card));
 return result;
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
  const previous=await store.mutate(s=>{if(s.modelScanLease?.until>time)fail(409,'Published models are already being checked.');s.modelScanLease={token:lease,until:time+300000};return s.modelReleases?.models||{};});
  try{
  const models=await loadPublished(previous,{publication});
  return await store.mutate(s=>{
   if(s.modelScanLease?.token!==lease)fail(409,'Another model check is already running.');
   const timestamp=new Date(now()).toISOString();let queued=0;
   // Retire the previous post-based mailer without mailing historical posts.
   for(const job of s.notifications||[])if(job.source!=='catalogue')job.cancelledAt??=timestamp;
   const baseline=!s.modelReleases;s.modelReleases??={baselineAt:timestamp,models:{}};
   for(const model of models){
    // A Vault upload may finish while the static downloads are being hashed.
    // Its atomic publication record owns the timer, so never replay a stale card.
    if(model.source==='vault'){const card=s.unitCards?.find(card=>card.id===model.id&&!card.deletedAt);if(card)queued+=record(s,unitRelease(card),{baseline}).queued;}
    else queued+=record(s,model,{baseline}).queued;
   }
   s.modelReleases.checkedAt=timestamp;
   delete s.modelScanLease;
   return {baselined:baseline,models:models.length,queued,remaining:pendingModelEmails(s),enabled:enabled()};
  });
  }catch(error){await store.mutate(s=>{if(s.modelScanLease?.token===lease)delete s.modelScanLease;});throw error;}
 }
 async function deliver(){
  if(!enabled())fail(503,'Model notification delivery is not enabled yet.');
  const time=now(),lease=randomUUID();
  const work=await store.mutate(s=>{
   if(s.modelDeliveryLease?.until>time)return null;
   const job=s.notifications.find(job=>job.source==='catalogue'&&!job.cancelledAt&&job.recipients.some(id=>!job.sent.includes(id))&&(!job.lease||job.lease.until<time));
   if(!job)return null;
   const recipients=job.recipients.filter(id=>!job.sent.includes(id)).slice(0,2);
   for(const id of recipients)if(job.attempts[id]&&time-job.attempts[id]>=23*3600000)fail(409,'An earlier email result needs review before retrying.');
   job.lease={token:lease,until:time+60000};s.modelDeliveryLease={...job.lease};
   return {...job,recipients};
  });
  if(!work)return {sent:0,remaining:pendingModelEmails((await store.read()).state)};
  const results=[];
  // Resend accepts two API requests per second. Serial sends also save receipts
  // promptly, leaving only the current recipient ambiguous if execution stops.
  for(const id of work.recipients){
   const sub=(await store.read()).state.subscribers.find(sub=>sub.id===id);let receipt,error,skipped=!sub||!eligible(sub,work);
   if(!skipped)try{
    await store.mutate(s=>{const job=s.notifications.find(job=>job.id===work.id);if(job?.lease?.token!==lease)fail(409,'Email delivery is already being handled.');job.attempts[id]??=now();});
    receipt=await sendEmail({to:sub.email,...modelEmail(work,unsubscribeUrl(sub.email))},'lpw-release/'+work.id+'/'+id,env);
   }catch(cause){error=cause.message;if(cause.status&&cause.status<500)await store.mutate(s=>{const job=s.notifications.find(job=>job.id===work.id);if(job?.lease?.token===lease)delete job.attempts[id];});}
   await store.mutate(s=>{const job=s.notifications.find(job=>job.id===work.id);if(job?.lease?.token!==lease)fail(409,'Email delivery is already being handled.');if(!error){if(!job.sent.includes(id))job.sent.push(id);if(receipt){job.receipts[id]=receipt;if(work.kind==='model-update'&&!work.test)s.modelReleases.models[work.modelId].lastUpdateEmailAt=now();}delete job.attempts[id];}});
   results.push({error,skipped});if(error)break;
   if(work.recipients.length>results.length)await new Promise(resolve=>setTimeout(resolve,600));
  }
  return store.mutate(s=>{const job=s.notifications.find(job=>job.id===work.id);if(job?.lease?.token===lease)delete job.lease;if(s.modelDeliveryLease?.token===lease)delete s.modelDeliveryLease;return {sent:results.filter(result=>!result.error&&!result.skipped).length,remaining:pendingModelEmails(s),error:results.find(result=>result.error)?.error};});
 }
 return {sync,deliver,enabled,record};
}
