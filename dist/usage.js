import {browserVisitorId as savedVisitorId} from './visitor-id.js';
import {USAGE_ENDPOINT} from './usage-config.js';
const enabled=location.hostname==='www.lowpolyworks.com'||location.hostname==='lowpolyworks.com';
const parameters=new URLSearchParams(location.search),testing=parameters.has('tracking-test'),ownerOptOutKey='lowpolyworks.usageOptOut';
function ownerOptedOut(){
 if(parameters.has('tracking-opt-out')){
  try{localStorage.setItem(ownerOptOutKey,'true');}catch(error){console.warn('Usage opt-out setting could not be saved',error.name);}
  return true;
 }
 try{return localStorage.getItem(ownerOptOutKey)==='true';}catch{return false;}
}
function browserVisitorId(){
 try{
  return savedVisitorId();
 }catch(error){console.warn('Unique visitor tracking is unavailable',error.name);}
}
// Whether this browser may send statistics at all: the live site only, and never the owner's opted-out browsers.
export function usageAllowed(){return enabled&&!ownerOptedOut();}
async function send(event){
 try{
  const response=await fetch(USAGE_ENDPOINT,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({id:crypto.randomUUID(),...event,testing,visitorId:browserVisitorId()}),keepalive:true,credentials:'omit'});
  if(!response.ok)console.warn('LowPolyWorks usage tracking returned HTTP '+response.status);
  return response.ok;
 }catch(error){console.warn('LowPolyWorks usage event was not recorded',error.name);return false;}
}
export async function recordUsage(kind,model,format){
 if(!usageAllowed())return;
 await send({kind,model,format});
}
// One batched set of Shredder interaction counts, e.g. {peek:2, feed:1}.
export async function recordShredder(counts){
 if(!usageAllowed())return false;
 return send({kind:'shredder',counts});
}
