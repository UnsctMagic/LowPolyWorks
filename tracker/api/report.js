import {list} from '@vercel/blob';
import {authorized,listSummary,trackedModels} from '../lib/events.js';

export function createReportHandler({listBlobs=list,summary=listSummary(listBlobs),loadModels=trackedModels,env=process.env}={}){return async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(!authorized(req.headers.authorization,env.USAGE_READ_TOKEN)){res.status(401).end();return;}
 if(req.method!=='GET'){res.setHeader('Allow','GET');res.status(405).end();return;}
 const query=new URL(req.url,'https://tracker.invalid').searchParams,from=query.get('from')||'',to=query.get('to')||'';
 if([from,to].some(value=>value&&!/^\d{4}-\d{2}-\d{2}$/.test(value))||from&&to&&from>to){res.status(400).end();return;}
 try{
  const models=await loadModels();
  res.status(200).json({asOf:new Date().toISOString(),trackingSince:env.TRACKING_STARTED_AT,...await summary({from,to,models})});
 }catch(error){console.error('Usage report unavailable',error.name);res.status(503).end();}
};}
export default createReportHandler();
