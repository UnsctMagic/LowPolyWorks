import {USAGE_ENDPOINT} from './usage-config.js';
const enabled=location.hostname==='www.lowpolyworks.com'||location.hostname==='lowpolyworks.com';
const testing=new URLSearchParams(location.search).has('tracking-test');
function browserVisitorId(){
 try{
  const key='lowpolyworks.visitorId';let id=localStorage.getItem(key);
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id||'')){id=crypto.randomUUID();localStorage.setItem(key,id);}
  return id;
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
