// Cloudflare Worker for the LowPolyWorks backend. It reuses the Vercel handlers with D1 storage.
import {createHandler as createPublishingHandler} from './api/publishing.js';
import {createEventsHandler} from './api/events.js';
import {createReportHandler} from './api/report.js';
import {createHandler as createNotificationsHandler} from './api/model-notifications.js';
import {createPublishing} from './lib/publishing.js';
import {mailConfigured,sendEmail} from './lib/publishing-mail.js';
import {trackedModels,unitsOf} from './lib/events.js';
import {createD1State,createD1Events} from './lib/d1.js';
import {runVercelHandler} from './cloudflare/adapter.js';

// Workers Free cannot take uploads; unit files are added through git for now.
const uploadsPaused=()=>{throw Object.assign(Error('File uploads need Workers Paid. Add unit files through Codex or Claude for now.'),{status:503});};
let services;
function servicesFor(env){
 if(services?.db===env.DB)return services;
 const store=createD1State(env.DB),events=createD1Events(env.DB);
 const loadModels=(options={})=>trackedModels({...options,loadUnits:async()=>unitsOf((await store.read()).state)});
 // No upload storage exists on Cloudflare yet, so removed cards have no files to delete.
 const publishing=createPublishing({store,env,sendEmail:(message,key)=>sendEmail(message,key,env),mailConfigured,loadModels,createUploadToken:uploadsPaused,inspectUpload:uploadsPaused,readUpload:uploadsPaused,saveAsset:uploadsPaused,deleteFiles:async()=>{}});
 // Usage events reuse the parsed catalogue for a minute, which keeps each event well inside the CPU budget.
 let cached;
 // Only finished results are shared, because a Worker request cannot wait on another request's I/O.
 const eventModels=async()=>{if(cached&&Date.now()-cached.at<60000)return cached.models;const models=await loadModels();cached={at:Date.now(),models};return models;};
 return services={db:env.DB,store,events,loadModels,eventModels,publishing};
}
export default {async fetch(request,env,ctx){
 const {pathname}=new URL(request.url),{events,loadModels,eventModels,publishing}=servicesFor(env);
 const handler={
  '/api/publishing':()=>createPublishingHandler(publishing,{summary:events.summary,loadModels,env,background:promise=>ctx.waitUntil(promise)}),
  '/api/events':()=>createEventsHandler({writeBlob:events.write,loadModels:eventModels}),
  '/api/report':()=>createReportHandler({summary:events.summary,loadModels,env}),
  '/api/model-notifications':()=>createNotificationsHandler(publishing,{env}),
 }[pathname];
 // Post media and unit files need upload storage, which waits for Workers Paid.
 if(!handler)return pathname.startsWith('/api/')?new Response(null,{status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}}):env.ASSETS.fetch(request);
 return runVercelHandler(handler(),request);
}};
