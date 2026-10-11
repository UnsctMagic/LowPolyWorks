const token=process.env.MODEL_NOTIFICATIONS_TOKEN;
if(!token)throw Error('MODEL_NOTIFICATIONS_TOKEN is not configured.');
const url=new URL('https://lowpolyworks-internal-tracker.vercel.app/api/model-notifications');
if(process.env.MODEL_PUBLICATION)url.searchParams.set('publication',process.env.MODEL_PUBLICATION);
const response=await fetch(url,{
 method:'POST',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(280000),
});
const result=await response.json();
if(!response.ok)throw Error(result.error||'Model notification worker returned HTTP '+response.status);
if(!result.enabled)throw Error('Automatic model notifications are disabled.');
console.log(JSON.stringify({models:result.models,baselined:result.baselined,queued:result.queued,sent:result.sent,remaining:result.remaining}));
