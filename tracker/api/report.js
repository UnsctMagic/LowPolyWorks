import {list} from '@vercel/blob';
import {authorized,summarize} from '../lib/events.js';

export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(!authorized(req.headers.authorization,process.env.USAGE_READ_TOKEN)){res.status(401).end();return;}
 if(req.method!=='GET'){res.setHeader('Allow','GET');res.status(405).end();return;}
 const query=new URL(req.url,'https://tracker.invalid').searchParams,from=query.get('from')||'',to=query.get('to')||'';
 if([from,to].some(value=>value&&!/^\d{4}-\d{2}-\d{2}$/.test(value))||from&&to&&from>to){res.status(400).end();return;}
 try{
  const blobs=[];let cursor;
  do{const page=await list({prefix:'live/',limit:1000,cursor});blobs.push(...page.blobs);cursor=page.hasMore?page.cursor:undefined;}while(cursor);
  res.status(200).json({asOf:new Date().toISOString(),trackingSince:process.env.TRACKING_STARTED_AT,...summarize(blobs,{from,to})});
 }catch(error){console.error('Usage report unavailable',error.name);res.status(503).end();}
}
