import {timingSafeEqual} from 'node:crypto';
import models from './models.json' with {type:'json'};

const modelById=new Map(models.map(model=>[model.id,model]));
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const allowedOrigins=new Set(['https://www.lowpolyworks.com','https://lowpolyworks.com']);
export function authorized(header,secret){
 if(!secret||typeof header!=='string')return false;
 const actual=Buffer.from(header),expected=Buffer.from('Bearer '+secret);
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
export function validateEvent(input){
 if(!input||typeof input!=='object'||!['visit','download'].includes(input.kind)||!uuid.test(input.id||'')||input.visitorId!==undefined&&!uuid.test(input.visitorId))return null;
 const visitor=input.visitorId?{visitorId:input.visitorId.toLowerCase()}:{};
 if(input.kind==='visit')return {id:input.id,kind:'visit',model:'site',format:'none',testing:input.testing===true,...visitor};
 if(input.model==='mdlxl')return input.format==='zip'?{id:input.id,kind:'download',model:'mdlxl',format:'zip',testing:input.testing===true,...visitor}:null;
 const model=modelById.get(input.model);
 if(!model||!['mdx','pack'].includes(input.format)||input.format==='pack'&&!model.hasPack)return null;
 return {id:input.id,kind:'download',model:input.model,format:input.format,testing:input.testing===true,...visitor};
}
export function eventPath(event,now=new Date()){
 return `${event.testing?'testing':'live'}/${event.visitorId?'v2':'v1'}/${now.toISOString().slice(0,10)}/${event.kind}/${event.model}/${event.format}/${event.visitorId?event.visitorId+'/':''}${event.id}.json`;
}
export function summarize(blobs,{from='',to=''}={}){
 const totals={pageLoads:0,downloadClicks:0,uniqueVisitors:0},applications=[{id:'mdlxl',name:'MDLxL',zipClicks:0,total:0}],daily=new Map(),byModel=new Map(),visitors=new Set(),dailyVisitors=new Map(),coverage={identifiedPageLoads:0,unidentifiedPageLoads:0};let lastRecordedAt=null;
 for(const blob of blobs){
  const [namespace,version,date,kind,model,format,visitorId]=blob.pathname.split('/');
  if(namespace!=='live'||!['v1','v2'].includes(version)||from&&date<from||to&&date>to||!['visit','download'].includes(kind))continue;
  if(version==='v2'&&!uuid.test(visitorId))continue;
  if(kind==='download'&&(model==='mdlxl'?format!=='zip':!modelById.has(model)))continue;
  if(!daily.has(date)){daily.set(date,{date,pageLoads:0,downloadClicks:0,uniqueVisitors:0});dailyVisitors.set(date,new Set());}
  const day=daily.get(date);
  if(version==='v2'){visitors.add(visitorId.toLowerCase());dailyVisitors.get(date).add(visitorId.toLowerCase());}
  if(kind==='visit'){totals.pageLoads++;day.pageLoads++;coverage[version==='v2'?'identifiedPageLoads':'unidentifiedPageLoads']++;}
  if(kind==='download'){
   totals.downloadClicks++;day.downloadClicks++;
   if(model==='mdlxl'){applications[0].total++;applications[0].zipClicks++;}
   else{
    const row=modelById.get(model);
    if(!byModel.has(model))byModel.set(model,{id:model,name:row.name,mdxClicks:0,packClicks:0,total:0});
    const entry=byModel.get(model);entry.total++;entry[format==='pack'?'packClicks':'mdxClicks']++;
   }
  }
  const at=new Date(blob.uploadedAt).toISOString();if(!lastRecordedAt||at>lastRecordedAt)lastRecordedAt=at;
 }
 totals.uniqueVisitors=visitors.size;for(const [date,ids] of dailyVisitors)daily.get(date).uniqueVisitors=ids.size;
 return {totals,coverage,lastRecordedAt,daily:[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date)),models:[...byModel.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name)),applications,measurement:'Unique visitors are anonymous browser IDs, not unique people. Earlier page loads without an ID are excluded from unique counts. Downloads are button clicks, not completed transfers. MDLxL counts cover the enabled LowPolyWorks application download button.'};
}
