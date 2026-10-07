import {Readable} from 'node:stream';
import {get} from '@vercel/blob';
import {blobState} from '../lib/publishing-state.js';
import {imageTypes,uuidPattern} from '../lib/post-content.js';
export function createMediaHandler({store=blobState,getBlob=get}={}){return async function handler(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'none'; sandbox");
 if(req.method!=='GET'){res.status(405).end();return;}
 const id=new URL(req.url,'https://lowpolyworks-internal-tracker.vercel.app').searchParams.get('id');if(!uuidPattern.test(id||'')){res.status(404).end();return;}
 try{
  const {state}=await store.read(),upload=(state.uploads||[]).find(u=>u.id===id&&u.ready);
  if(!upload||!imageTypes.includes(upload.type)||!state.posts.some(post=>post.media?.some(media=>media.id===id))){res.status(404).end();return;}
  const blob=await getBlob(upload.pathname,{access:'private'});if(!blob||blob.statusCode!==200){res.status(404).end();return;}
  res.setHeader('Content-Type',upload.type);res.setHeader('Cache-Control','public, max-age=86400, immutable');
  await new Promise((resolve,reject)=>{const stream=Readable.fromWeb(blob.stream);stream.on('error',reject);res.on('finish',resolve);res.on('close',resolve);stream.pipe(res);});
 }catch(error){console.error('Post media unavailable',error.name);if(!res.headersSent)res.status(503).end();else res.destroy();}
};}
export default createMediaHandler();
