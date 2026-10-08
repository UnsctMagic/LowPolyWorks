// Bound the entire upload, including token creation and server confirmation.
export async function uploadImage(file,{api,put,signal,onProgress,timeout=120000}){
 const controller=new AbortController();let timedOut=false;
 const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});
 if(signal?.aborted)cancel();
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeout);
 let rejectAbort;
 const aborted=new Promise((_,reject)=>{rejectAbort=()=>reject(Error(timedOut?'Upload timed out. Retry or insert an image link.':'Upload cancelled. You can retry.'));controller.signal.addEventListener('abort',rejectAbort,{once:true});if(controller.signal.aborted)rejectAbort();});
 try{
  return await Promise.race([aborted,(async()=>{
   const permit=await api('upload-token',{name:file.name,type:file.type,size:file.size},controller.signal);
   controller.signal.throwIfAborted();
   await put(permit.pathname,file,{access:'private',token:permit.clientToken,contentType:file.type,abortSignal:controller.signal,onUploadProgress:onProgress});
   controller.signal.throwIfAborted();
   onProgress?.({percentage:100});
   return await api('upload-complete',{id:permit.id},controller.signal);
  })()]);
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);controller.signal.removeEventListener('abort',rejectAbort);}
}
