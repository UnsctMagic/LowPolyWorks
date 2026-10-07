import {get,put,BlobPreconditionFailedError} from '@vercel/blob';
import {initialState,fail} from './publishing.js';

const pathname='publishing/v1/state.json';
export function createBlobState({getBlob=get,putBlob=put}={}){return {
 async read(){const blob=await getBlob(pathname,{access:'private',useCache:false});if(!blob)return {state:initialState(),etag:null};return {state:JSON.parse(await new Response(blob.stream).text()),etag:blob.blob.etag};},
 async mutate(change){
  for(let attempt=0;attempt<5;attempt++){
   const {state,etag}=await this.read();const result=await change(state);
   try{await putBlob(pathname,JSON.stringify(state),{access:'private',addRandomSuffix:false,contentType:'application/json',...(etag?{ifMatch:etag}:{allowOverwrite:false})});return result;}
   catch(error){if(!(error instanceof BlobPreconditionFailedError)&&error.name!=='BlobAlreadyExistsError'&&!/already exists/i.test(error.message))throw error;}
  }
  fail(409,'Another change was saved at the same time. Please try again.');
 }
};}
export const blobState=createBlobState();
