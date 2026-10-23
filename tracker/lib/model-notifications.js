// Each HTTP request scans one bounded batch or delivers one subscriber digest.
export async function runModelNotificationBatch(releases,{phase='scan',publication}={}){
 if(phase==='scan')return {...await releases.sync({publication}),phase,sent:0};
 const result=await releases.deliver();
 if(result.error)throw Error(result.error);
 return {...result,phase,enabled:releases.enabled()};
}
