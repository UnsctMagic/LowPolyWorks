import {authorized} from '../lib/events.js';
import {blobState} from '../lib/publishing-state.js';
import {createPublishing} from '../lib/publishing.js';
import {sendEmail,mailConfigured} from '../lib/publishing-mail.js';
import {runModelNotifications} from '../lib/model-notifications.js';
const service=createPublishing({store:blobState,sendEmail,mailConfigured});
export function createHandler(publishing=service,{env=process.env,now=()=>Date.now()}={}){return async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.status(405).json({error:'Method not allowed.'});return;}
 if(!authorized(req.headers.authorization,env.MODEL_NOTIFICATIONS_TOKEN)){res.status(401).json({error:'Unauthorized.'});return;}
 try{
  const publication=new URL(req.url||'/api/model-notifications','https://lowpolyworks-internal-tracker.vercel.app').searchParams.get('publication')||undefined;
  if(publication&&!/^[a-f0-9]{40}$/.test(publication)){res.status(400).json({error:'Invalid publication.'});return;}
  res.status(200).json(await runModelNotifications(publishing.releases,{publication,now}));
 }catch(error){console.error('Model notification job failed:',error.message);res.status(error.status||503).json({error:error.message});}
};}
export default createHandler();
