import {createPublishing,AUTHOR_ORIGIN,PUBLIC_ORIGIN} from '../lib/publishing.js';
import {blobState} from '../lib/publishing-state.js';
import {mailConfigured,sendEmail} from '../lib/publishing-mail.js';
import {generateClientTokenFromReadWriteToken} from '@vercel/blob/client';
import {head,list,get,put,del} from '@vercel/blob';
import {listSummary,trackedModels} from '../lib/events.js';
import {waitUntil} from '@vercel/functions';
import {runModelNotifications} from '../lib/model-notifications.js';
const service=createPublishing({store:blobState,sendEmail,mailConfigured,createUploadToken:({pathname,type,size})=>generateClientTokenFromReadWriteToken({pathname,allowedContentTypes:[type],maximumSizeInBytes:size,validUntil:Date.now()+15*60*1000,addRandomSuffix:false,allowOverwrite:false}),inspectUpload:pathname=>head(pathname),readUpload:async pathname=>{const blob=await get(pathname,{access:'private'});if(!blob||blob.statusCode!==200)throw Error('Upload unavailable');return new Uint8Array(await new Response(blob.stream).arrayBuffer());},saveAsset:(pathname,bytes,type)=>put(pathname,bytes,{access:'private',addRandomSuffix:false,contentType:type}),deleteFiles:pathnames=>del(pathnames)});
const publicWrites=new Set(['subscribe','vote','follow','follow-confirm','follow-status','unfollow']);
async function analytics(publishing,session,{summary,loadModels,env,days}){
 const account=await publishing.execute('me',{}, {session});
 if(account.author.role!=='owner')throw Object.assign(Error('Owner access required.'),{status:403});
 const from=days?new Date(Date.now()-(days-1)*86400000).toISOString().slice(0,10):'';
 return {asOf:new Date().toISOString(),trackingSince:env.TRACKING_STARTED_AT,days:days||null,...await summary({from,models:await loadModels({includeRemoved:true})})};
}
export function createHandler(publishing=service,{listBlobs=list,summary=listSummary(listBlobs),loadModels=trackedModels,env=process.env,background=waitUntil}={}){return async function handler(req,res){
 const origins=new Set([PUBLIC_ORIGIN,'https://lowpolyworks.com',AUTHOR_ORIGIN]);
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const origin=req.headers.origin;if(origin&&origins.has(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, X-CSRF-Token');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');}
 if(req.method==='OPTIONS'){res.status(origin&&origins.has(origin)?204:403).end();return;}
 const action=new URL(req.url,AUTHOR_ORIGIN).searchParams.get('action')||'feed';
 if(!['GET','POST'].includes(req.method)||req.method==='GET'&&!['feed','me','analytics','catalogue'].includes(action)||req.method==='POST'&&['feed','me','analytics','catalogue'].includes(action)){res.status(405).json({error:'Method not allowed.'});return;}
 if(req.method==='POST'&&(!origins.has(origin)||!publicWrites.has(action)&&origin!==AUTHOR_ORIGIN)){res.status(403).json({error:'Open the author page to continue.'});return;}
 if(req.method==='POST'&&!String(req.headers['content-type']).startsWith('application/json')){res.status(415).json({error:'JSON required.'});return;}
 if(Number(req.headers['content-length'])>240000){res.status(413).json({error:'This request is too large.'});return;}
 try{let input=req.body||{};if(typeof input==='string')input=JSON.parse(input);if(!input||typeof input!=='object'||Array.isArray(input)||Buffer.byteLength(JSON.stringify(input))>240000){res.status(400).json({error:'Invalid request.'});return;}
 if(req.method==='GET'&&action==='feed')input.visitorId=new URL(req.url,AUTHOR_ORIGIN).searchParams.get('visitorId')||undefined;
 const session=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('lpw_session='))?.slice(12);
 const result=action==='analytics'?await analytics(publishing,session,{summary,loadModels,env,days:[7,30].find(days=>String(days)===new URL(req.url,AUTHOR_ORIGIN).searchParams.get('days'))}):await publishing.execute(action,input,{session,csrf:req.headers['x-csrf-token'],ip:String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0]});
 if(result.modelChanged&&publishing.releases.enabled())background(runModelNotifications(publishing.releases,{scan:false}).then(result=>console.log('Model publication delivery',JSON.stringify({sent:result.sent,remaining:result.remaining}))));
 delete result.modelChanged;
 if(result.cookie){res.setHeader('Set-Cookie',result.cookie);delete result.cookie;}res.status(200).json(result);
 }catch(error){if(error instanceof SyntaxError){res.status(400).json({error:'Invalid JSON.'});return;}if(!error.status)console.error('Publishing request failed',error.name);res.status(error.status||503).json({error:error.status?error.message:'The publishing service is temporarily unavailable. Please try again.'});}
};}
export default createHandler();
