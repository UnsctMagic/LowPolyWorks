import {put} from '@vercel/blob';
import {allowedOrigins,countryCode,eventPath,trackedModels,validateEvent} from '../lib/events.js';

export function createEventsHandler({writeBlob=put,loadModels=trackedModels}={}){return async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 // The MDLxL app posts from its main process, which sends no Origin and names itself in User-Agent.
 const app=!req.headers.origin&&/^MDLxL\/\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(req.headers['user-agent']||'');
 if(!app&&!allowedOrigins.has(req.headers.origin)){res.status(403).end();return;}
 if(!app){res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin');}
 if(req.method!=='POST'){res.setHeader('Allow','POST');res.status(405).end();return;}
 let input=req.body;
 if(Number(req.headers['content-length'])>512){res.status(413).end();return;}
 if(typeof input==='string'){try{input=JSON.parse(input);}catch{res.status(400).end();return;}}
 // An app ping carries only its kind and version; the event ID is made here.
 if(app)input={kind:input?.kind,version:input?.version,id:crypto.randomUUID()};
 try{
  const models=(input?.kind==='download'&&input.model!=='mdlxl'||input?.kind==='view')?await loadModels():[];
  const event=validateEvent(input,models,{app});if(!event){res.status(400).end();return;}
  event.country=countryCode(req.headers['x-vercel-ip-country']);
  const at=new Date();
  await writeBlob(eventPath(event,at),JSON.stringify({...event,recordedAt:at.toISOString()}),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'});
  res.status(204).end();
 }catch(error){
  console.error('Usage event could not be stored',error.name);res.status(503).end();
 }
};}
export default createEventsHandler();
