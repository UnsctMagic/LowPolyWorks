import {put} from '@vercel/blob';
import {allowedOrigins,eventPath,validateEvent} from '../lib/events.js';

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!allowedOrigins.has(req.headers.origin)){res.status(403).end();return;}
 res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin');
 if(req.method!=='POST'){res.setHeader('Allow','POST');res.status(405).end();return;}
 let input=req.body;
 if(Number(req.headers['content-length'])>512){res.status(413).end();return;}
 if(typeof input==='string'){try{input=JSON.parse(input);}catch{res.status(400).end();return;}}
 const event=validateEvent(input);if(!event){res.status(400).end();return;}
 const at=new Date();
 try{
  await put(eventPath(event,at),JSON.stringify({...event,recordedAt:at.toISOString()}),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'});
  res.status(204).end();
 }catch(error){
  console.error('Usage event could not be stored',error.name);res.status(503).end();
 }
}
