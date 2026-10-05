import {timingSafeEqual} from 'node:crypto';
import models from './models.json' with {type:'json'};

const modelById=new Map(models.map(model=>[model.id,model]));
export const allowedOrigins=new Set(['https://www.lowpolyworks.com','https://lowpolyworks.com']);
export function authorized(header,secret){
 if(!secret||typeof header!=='string')return false;
 const actual=Buffer.from(header),expected=Buffer.from('Bearer '+secret);
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
export function validateEvent(input){
 if(!input||typeof input!=='object'||!['visit','download'].includes(input.kind)||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.id||''))return null;
 if(input.kind==='visit')return {id:input.id,kind:'visit',model:'site',format:'none',testing:input.testing===true};
 const model=modelById.get(input.model);
 if(!model||!['mdx','pack'].includes(input.format)||input.format==='pack'&&!model.hasPack)return null;
 return {id:input.id,kind:'download',model:input.model,format:input.format,testing:input.testing===true};
}
export function eventPath(event,now=new Date()){
 return `${event.testing?'testing':'live'}/v1/${now.toISOString().slice(0,10)}/${event.kind}/${event.model}/${event.format}/${event.id}.json`;
}
export function summarize(blobs,{from='',to=''}={}){
 const totals={pageLoads:0,downloadClicks:0},daily=new Map(),byModel=new Map();let lastRecordedAt=null;
 for(const blob of blobs){
  const [namespace,version,date,kind,model,format]=blob.pathname.split('/');
  if(namespace!=='live'||version!=='v1'||from&&date<from||to&&date>to)continue;
  if(!daily.has(date))daily.set(date,{date,pageLoads:0,downloadClicks:0});
  const day=daily.get(date);
  if(kind==='visit'){totals.pageLoads++;day.pageLoads++;}
  if(kind==='download'){
   const row=modelById.get(model);if(!row)continue;
   totals.downloadClicks++;day.downloadClicks++;
   if(!byModel.has(model))byModel.set(model,{id:model,name:row.name,mdxClicks:0,packClicks:0,total:0});
   const entry=byModel.get(model);entry.total++;entry[format==='pack'?'packClicks':'mdxClicks']++;
  }
  const at=new Date(blob.uploadedAt).toISOString();if(!lastRecordedAt||at>lastRecordedAt)lastRecordedAt=at;
 }
 return {totals,lastRecordedAt,daily:[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date)),models:[...byModel.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name)),measurement:'Page loads and download-button clicks; not unique people or completed file transfers.'};
}
