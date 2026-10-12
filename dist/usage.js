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
export async function recordUsage(kind,model,format){
 if(!enabled||ownerOptedOut())return;
 try{
  const event={id:crypto.randomUUID(),kind,model,format,testing,visitorId:browserVisitorId()};
  const response=await fetch(USAGE_ENDPOINT,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(event),keepalive:true,credentials:'omit'});
  if(!response.ok)console.warn('LowPolyWorks usage tracking returned HTTP '+response.status);
 }catch(error){console.warn('LowPolyWorks usage event was not recorded',error.name);}
}
