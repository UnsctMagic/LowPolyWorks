import {authorized} from '../lib/events.js';
import {blobState} from '../lib/publishing-state.js';
import {createPublishing} from '../lib/publishing.js';
import {sendEmail,mailConfigured} from '../lib/publishing-mail.js';
const service=createPublishing({store:blobState,sendEmail,mailConfigured});
export function createHandler(publishing=service,{env=process.env,now=()=>Date.now()}={}){return async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.status(405).json({error:'Method not allowed.'});return;}
 if(!authorized(req.headers.authorization,env.MODEL_NOTIFICATIONS_TOKEN)){res.status(401).json({error:'Unauthorized.'});return;}
 try{
  const start=now(),sync=await publishing.releases.sync();let sent=0,remaining=sync.remaining;
  if(sync.enabled)while(remaining&&now()-start<200000){const result=await publishing.releases.deliver();sent+=result.sent;remaining=result.remaining;if(result.error)throw Error(result.error);if(!result.sent)break;await new Promise(resolve=>setTimeout(resolve,600));}
  res.status(200).json({...sync,sent,remaining});
 }catch(error){console.error('Model notification job failed:',error.message);res.status(error.status||503).json({error:error.message});}
};}
export default createHandler();
