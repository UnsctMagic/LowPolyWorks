import {Readable} from 'node:stream';
import {get} from '@vercel/blob';
import {blobState} from '../lib/publishing-state.js';
import {uuidPattern} from '../lib/post-content.js';
export function createAssetHandler({store=blobState,getBlob=get}={}){return async function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'none'; sandbox");
 if(!['GET','HEAD'].includes(req.method)){res.status(405).end();return;}
 const url=new URL(req.url,'https://lowpolyworks-internal-tracker.vercel.app'),id=url.searchParams.get('id');if(!uuidPattern.test(id||'')){res.status(404).end();return;}
 try{
  const {state}=await store.read(),upload=state.uploads?.find(u=>u.id===id&&u.ready);
  if(!upload||!(state.unitCards||[]).some(c=>!c.deletedAt&&c.assetIds.includes(id))){res.status(404).end();return;}
  const blob=await getBlob(upload.pathname,{access:'private'});if(!blob||blob.statusCode!==200){res.status(404).end();return;}
  res.setHeader('Content-Type',upload.type);res.setHeader('Content-Length',String(upload.size));res.setHeader('Cache-Control','no-store');
  if(url.searchParams.has('download'))res.setHeader('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent(upload.name));
  if(req.method==='HEAD'){res.status(200).end();return;}
  await new Promise((resolve,reject)=>{const stream=Readable.fromWeb(blob.stream);stream.on('error',reject);res.on('finish',resolve);res.on('close',resolve);stream.pipe(res);});
 }catch(error){console.error('Unit asset unavailable',error.name);if(!res.headersSent)res.status(503).end();else res.destroy();}
};}
export default createAssetHandler();
