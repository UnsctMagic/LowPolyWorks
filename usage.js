import {browserVisitorId as savedVisitorId} from './visitor-id.js';
import {USAGE_ENDPOINT} from './usage-config.js';
const enabled=location.hostname==='www.lowpolyworks.com'||location.hostname==='lowpolyworks.com';
const testing=new URLSearchParams(location.search).has('tracking-test');
function browserVisitorId(){
 try{
  return savedVisitorId();
 }catch(error){console.warn('Unique visitor tracking is unavailable',error.name);}
}
export async function recordUsage(kind,model,format){
 if(!enabled)return;
 try{
  const event={id:crypto.randomUUID(),kind,model,format,testing,visitorId:browserVisitorId()};
  const response=await fetch(USAGE_ENDPOINT,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(event),keepalive:true,credentials:'omit'});
  if(!response.ok)console.warn('LowPolyWorks usage tracking returned HTTP '+response.status);
 }catch(error){console.warn('LowPolyWorks usage event was not recorded',error.name);}
}
