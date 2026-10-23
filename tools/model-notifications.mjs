import {pathToFileURL} from 'node:url';

// The loop runs in GitHub Actions, never inside a Worker invocation.
export async function deliverModelNotifications({token,publication,fetchApi=fetch,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=()=>Date.now(),onProgress=()=>{}}={}){
 if(!token)throw Error('MODEL_NOTIFICATIONS_TOKEN is not configured.');
 const url=new URL('https://lowpolyworks-vault.lowpolyworks-internal-tracker.workers.dev/api/model-notifications');
 if(publication)url.searchParams.set('publication',publication);
 const started=now();let phase='scan',summary={},sent=0,requests=0,failures=0;
 while(now()-started<25*60*1000){
  url.searchParams.set('phase',phase);
  let response,result;
  try{
   requests++;
   response=await fetchApi(url.href,{method:'POST',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(90000)});
   result=await response.json();
  }catch(error){
   if(++failures>3)throw error;
   await pause(1000*failures);continue;
  }
  // Another request (including one whose response was lost) may still own the
  // short-lived scan/delivery lease. Its saved checkpoint is safe to resume.
  if(response.status===409&&result.retryAfter){await pause(Math.min(30,result.retryAfter)*1000);continue;}
  if(!response.ok)throw Error(result.error||'Model notification worker returned HTTP '+response.status);
  if(!result.enabled)throw Error('Automatic model notifications are disabled.');
  if(result.phase!==phase||typeof result.more!=='boolean')throw Error('Model notification worker does not support bounded batches.');
  failures=0;
  onProgress({phase,checked:result.checked,total:result.total,sent:result.sent,remaining:result.remaining,deferred:result.deferred});
  if(phase==='scan'){
   if(result.more)continue;
   summary={models:result.models,baselined:result.baselined,queued:result.queued};
   phase='deliver';
  }else{
   sent+=result.sent;
   if(!result.more)return {...summary,sent,remaining:result.remaining,deferred:result.deferred||0,requests};
  }
  if(!result.remaining)return {...summary,sent,remaining:0,deferred:0,requests};
  if(phase==='deliver')await pause(600);
 }
 throw Error('Model notification batches did not finish within 25 minutes. Saved progress will resume on the next run.');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await deliverModelNotifications({token:process.env.MODEL_NOTIFICATIONS_TOKEN,publication:process.env.MODEL_PUBLICATION,onProgress:result=>console.log(JSON.stringify(result))});
 console.log(JSON.stringify(result));
}
