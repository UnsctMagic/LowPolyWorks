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
