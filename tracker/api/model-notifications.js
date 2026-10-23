import {authorized} from '../lib/events.js';
import {blobState} from '../lib/publishing-state.js';
import {createPublishing} from '../lib/publishing.js';
import {sendEmail,mailConfigured} from '../lib/publishing-mail.js';
import {runModelNotificationBatch} from '../lib/model-notifications.js';
const service=createPublishing({store:blobState,sendEmail,mailConfigured});
export function createHandler(publishing=service,{env=process.env}={}){return async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.status(405).json({error:'Method not allowed.'});return;}
 if(!authorized(req.headers.authorization,env.MODEL_NOTIFICATIONS_TOKEN)){res.status(401).json({error:'Unauthorized.'});return;}
 try{
  const params=new URL(req.url||'/api/model-notifications','https://lowpolyworks-internal-tracker.vercel.app').searchParams;
  const publication=params.get('publication')||undefined,phase=params.get('phase')||'scan';
  if(publication&&!/^[a-f0-9]{40}$/.test(publication)){res.status(400).json({error:'Invalid publication.'});return;}
  if(!['scan','deliver'].includes(phase)){res.status(400).json({error:'Invalid notification phase.'});return;}
  res.status(200).json(await runModelNotificationBatch(publishing.releases,{publication,phase}));
 }catch(error){console.error('Model notification job failed:',error.message);res.status(error.status||503).json({error:error.message,...(error.retryAfter?{retryAfter:error.retryAfter}:{})});}
};}
export default createHandler();
