import {authorized} from '../lib/events.js';

// Strips control characters except newline and tab, then trims.
// Room for 2000 characters of four-byte text (emoji, rare CJK) plus the name and other fields.
const MAX_BODY=10240;
const clean=value=>value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g,'').trim();
export function createFeedbackHandler({feedback,env=process.env}={}){return async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const query=new URL(req.url,'https://tracker.invalid').searchParams;
 let input=req.body;
 if(Number(req.headers['content-length'])>MAX_BODY){res.status(413).end();return;}
 try{
  // The weekly review reads and marks reports with the private token; the Vault uses the owner session instead.
  if(query.get('inbox')==='1'){
   if(!authorized(req.headers.authorization,env.USAGE_READ_TOKEN)){res.status(401).end();return;}
   if(req.method==='GET'){res.status(200).json(await feedback.inbox({all:query.get('all')==='1'}));return;}
   if(req.method!=='POST'){res.setHeader('Allow','GET, POST');res.status(405).end();return;}
   if(typeof input==='string'){try{input=JSON.parse(input);}catch{res.status(400).end();return;}}
   const {reviewed,open}=input||{};
   if(reviewed!==undefined&&(!Array.isArray(reviewed)||reviewed.length>500||!reviewed.every(id=>Number.isInteger(id)&&id>0))||open!==undefined&&typeof open!=='boolean'||reviewed===undefined&&open===undefined){res.status(400).end();return;}
   if(reviewed)await feedback.review(reviewed);
   if(open!==undefined)await feedback.setOpen(open);
   res.status(204).end();return;
  }
  // The MDLxL app calls from its main process: no Origin and a User-Agent that names its version.
  const app=!req.headers.origin&&/^MDLxL\/\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(req.headers['user-agent']||'');
  if(!app){res.status(403).end();return;}
  if(req.method==='GET'){res.status(200).json({open:await feedback.isOpen()});return;}
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');res.status(405).end();return;}
  if(typeof input==='string'){if(input.length>MAX_BODY){res.status(413).end();return;}try{input=JSON.parse(input);}catch{res.status(400).end();return;}}
  if(!input||typeof input!=='object'||Array.isArray(input)){res.status(400).end();return;}
  if(Buffer.byteLength(JSON.stringify(input))>MAX_BODY){res.status(413).end();return;}
  const message=typeof input.message==='string'?clean(input.message):'';
  if(!message||message.length>2000||!/^[a-f0-9]{64}$/.test(input.pc)||!/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(input.version)){res.status(400).end();return;}
  const os=typeof input.os==='string'&&input.os.length<=60&&/^[A-Za-z0-9 ._()-]*$/.test(input.os)?input.os:'';
  const name=typeof input.name==='string'?clean(input.name).replace(/\s+/g,' '):'';
  if(name.length>40){res.status(400).end();return;}
  const ip=String(req.headers['x-forwarded-for']||'unknown').split(',')[0].trim();
  // A report that matches the private rules gets the same answer as a saved one, and nothing is stored.
  const report={message,name,pc:input.pc,version:input.version,os,ip};
  const refused=(await feedback.rules()).blocks(name+'\n'+message)?await feedback.check(report):await feedback.submit(report);
  if(refused==='paused'){res.status(503).json({error:'paused'});return;}
  if(refused){res.status(429).json({error:refused});return;}
  res.status(204).end();
 }catch(error){console.error('Report could not be handled',error.name);res.status(503).end();}
};}
