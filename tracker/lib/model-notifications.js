// One HTTP call does one bounded step. The GitHub runner owns the loop, so each
// step gets a fresh Worker subrequest budget. Do not drain the queue here.
export async function runModelNotificationBatch(releases,{phase='scan',publication}={}){
 if(phase==='scan')return {...await releases.sync({publication}),phase,sent:0};
 // One recipient also leaves room for all five D1 conditional-write retries.
 const result=await releases.deliver({limit:1});
 if(result.error)throw Error(result.error);
 return {...result,phase,enabled:releases.enabled(),more:result.remaining>0};
}

// Invoked by a published model change, never by a recurring timer.
export async function runModelNotifications(releases,{scan=true,publication,now=()=>Date.now()}={}){
 const start=now(),sync=scan?await releases.sync({publication}):{enabled:releases.enabled()};
 let sent=0,remaining=sync.remaining;
 if(sync.enabled)do{
  const result=await releases.deliver();sent+=result.sent;remaining=result.remaining;
  if(result.error)throw Error(result.error);
  if(!remaining||!result.sent||now()-start>=200000)break;
  await new Promise(resolve=>setTimeout(resolve,600));
 }while(true);
 return {...sync,sent,remaining};
}
