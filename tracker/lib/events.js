import {timingSafeEqual} from 'node:crypto';
// Removed Vault cards stay as named tombstones so their earlier downloads remain readable.
const savedUnits=async()=>{const {blobState}=await import('./publishing-state.js'),{state}=await blobState.read();return [...state.unitCards||[],...Object.entries(state.removedCards||{}).map(([id,row])=>({id,name:row.name,deletedAt:row.removedAt,downloads:[]}))];};
export async function trackedModels({loadUnits=savedUnits,includeRemoved=false}={}){
 // A fresh query bypasses the Pages CDN copy, so a just-published model is accepted at once.
 const response=await fetch('https://www.lowpolyworks.com/catalogue.json?tracking='+Date.now(),{cache:'no-store'});
 if(!response.ok)throw Error('Tracking catalogue unavailable (HTTP '+response.status+')');
 const base=(await response.json()).map(model=>({id:model.id,name:model.name,slug:model.slug||model.id,hasPack:Boolean(model.downloadPack)}));
 const units=await loadUnits();return [...base,...units.filter(card=>includeRemoved||!card.deletedAt).map(card=>({id:card.id,name:card.name,slug:card.id,url:'https://www.lowpolyworks.com/#model/'+card.id,hasPack:card.downloads.some(file=>/\.zip$/i.test(file.name))}))];
}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const regionNames=new Intl.DisplayNames(['en'],{type:'region',fallback:'none'});
export function countryCode(value){
 const code=typeof value==='string'?value.trim().toUpperCase():'';
 return /^[A-Z]{2}$/.test(code)&&code!=='ZZ'&&regionNames.of(code)?code:'ZZ';
}
export const allowedOrigins=new Set(['https://www.lowpolyworks.com','https://lowpolyworks.com']);
export function authorized(header,secret){
 if(!secret||typeof header!=='string')return false;
 const actual=Buffer.from(header),expected=Buffer.from('Bearer '+secret);
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
export function validateEvent(input,models=[]){
 if(!input||typeof input!=='object'||!['visit','download'].includes(input.kind)||!uuid.test(input.id||'')||input.visitorId!==undefined&&!uuid.test(input.visitorId))return null;
 const visitor=input.visitorId?{visitorId:input.visitorId.toLowerCase()}:{};
 if(input.kind==='visit')return {id:input.id,kind:'visit',model:'site',format:'none',testing:input.testing===true,...visitor};
 if(input.model==='mdlxl')return input.format==='zip'?{id:input.id,kind:'download',model:'mdlxl',format:'zip',testing:input.testing===true,...visitor}:null;
 const model=models.find(model=>model.id===input.model);
 if(!model||!['mdx','pack'].includes(input.format)||input.format==='pack'&&!model.hasPack)return null;
 return {id:input.id,kind:'download',model:input.model,format:input.format,testing:input.testing===true,...visitor};
}
export function eventPath(event,now=new Date()){
 if(event.country!==undefined)return `${event.testing?'testing':'live'}/v3/${now.toISOString().slice(0,10)}/${event.kind}/${event.model}/${event.format}/${event.visitorId||'anonymous'}/${countryCode(event.country)}/${event.id}.json`;
 return `${event.testing?'testing':'live'}/${event.visitorId?'v2':'v1'}/${now.toISOString().slice(0,10)}/${event.kind}/${event.model}/${event.format}/${event.visitorId?event.visitorId+'/':''}${event.id}.json`;
}
export function summarize(blobs,{from='',to='',models=[]}={}){
 const totals={pageLoads:0,downloadClicks:0,uniqueVisitors:0},applications=[{id:'mdlxl',name:'MDLxL',zipClicks:0,total:0}],daily=new Map(),byModel=new Map(),visitors=new Set(),dailyVisitors=new Map(),visitorCountries=new Map(),coverage={identifiedPageLoads:0,unidentifiedPageLoads:0};let lastRecordedAt=null;
 // Every tracked model is listed, including new ones that have no downloads yet.
 for(const row of models)byModel.set(row.id,{id:row.id,name:row.name,mdxClicks:0,packClicks:0,total:0});
 for(const blob of blobs){
  const [namespace,version,date,kind,model,format,visitorId,country]=blob.pathname.split('/');
  if(namespace!=='live'||!['v1','v2','v3'].includes(version)||from&&date<from||to&&date>to||!['visit','download'].includes(kind))continue;
  if(version==='v2'&&!uuid.test(visitorId)||version==='v3'&&visitorId!=='anonymous'&&!uuid.test(visitorId))continue;
  const identified=version!=='v1'&&uuid.test(visitorId),at=new Date(blob.uploadedAt).toISOString();
  // Stored downloads were validated when recorded, so a model later renamed or removed keeps its clicks.
  if(kind==='download'&&(model==='mdlxl'?format!=='zip':!/^[a-z0-9-]{1,100}$/.test(model)||!['mdx','pack'].includes(format)))continue;
  if(!daily.has(date)){daily.set(date,{date,pageLoads:0,downloadClicks:0,uniqueVisitors:0});dailyVisitors.set(date,new Set());}
  const day=daily.get(date);
  if(identified){
   const id=visitorId.toLowerCase();visitors.add(id);dailyVisitors.get(date).add(id);
   const code=version==='v3'?countryCode(country):'ZZ',previous=visitorCountries.get(id);
   if(code!=='ZZ'&&(!previous||at<previous.at||at===previous.at&&code<previous.code))visitorCountries.set(id,{code,at});
  }
  if(kind==='visit'){totals.pageLoads++;day.pageLoads++;coverage[identified?'identifiedPageLoads':'unidentifiedPageLoads']++;}
  if(kind==='download'){
   totals.downloadClicks++;day.downloadClicks++;
   if(model==='mdlxl'){applications[0].total++;applications[0].zipClicks++;}
   else{
    if(!byModel.has(model))byModel.set(model,{id:model,name:model,mdxClicks:0,packClicks:0,total:0,unlisted:true});
    const entry=byModel.get(model);entry.total++;entry[format==='pack'?'packClicks':'mdxClicks']++;
   }
  }
  if(!lastRecordedAt||at>lastRecordedAt)lastRecordedAt=at;
 }
 totals.uniqueVisitors=visitors.size;for(const [date,ids] of dailyVisitors)daily.get(date).uniqueVisitors=ids.size;
 const byCountry=new Map();for(const id of visitors){const code=visitorCountries.get(id)?.code||'ZZ';byCountry.set(code,(byCountry.get(code)||0)+1);}
 const countries=[...byCountry].map(([code,uniqueVisitors])=>({code,name:code==='ZZ'?'Unknown':regionNames.of(code),uniqueVisitors,share:uniqueVisitors/totals.uniqueVisitors})).sort((a,b)=>(a.code==='ZZ')-(b.code==='ZZ')||b.uniqueVisitors-a.uniqueVisitors||a.name.localeCompare(b.name));
 return {totals,coverage,lastRecordedAt,countries,daily:[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date)),models:[...byModel.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name)),applications,measurement:'Unique visitors are anonymous browser IDs, not unique people. Earlier page loads without an ID are excluded from unique counts. Countries are estimated from network location; each browser uses its first known country in the reporting period. Earlier or unavailable locations are Unknown. Downloads are button clicks, not completed transfers. MDLxL counts cover the enabled LowPolyWorks application download button.'};
}
