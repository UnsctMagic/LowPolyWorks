import {initialState,fail} from './publishing.js';
import {countryCode,measurement,summarize} from './events.js';
// Cloudflare D1 storage: the publishing state is one versioned row, and each usage event is one row.
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i,slug=/^[a-z0-9-]{1,100}$/;
const regionNames=new Intl.DisplayNames(['en'],{type:'region',fallback:'none'});
export function createD1State(db){return {
 async read(){const row=await db.prepare('SELECT version,body FROM state WHERE id=1').first();return row?{state:JSON.parse(row.body),etag:row.version}:{state:initialState(),etag:null};},
 async mutate(change){
  for(let attempt=0;attempt<5;attempt++){
   const {state,etag}=await this.read(),result=await change(state),body=JSON.stringify(state),at=new Date().toISOString();
   const saved=etag===null?await db.prepare('INSERT OR IGNORE INTO state (id,version,body,updated_at) VALUES (1,1,?,?)').bind(body,at).run():await db.prepare('UPDATE state SET body=?,version=version+1,updated_at=? WHERE id=1 AND version=?').bind(body,at,etag).run();
   if(saved.meta.changes===1)return result;
  }
  fail(409,'Another change was saved at the same time. Please try again.');
 }
};}
// Mirrors the validation in summarize(), so a stored row is counted exactly as its Blob pathname was.
export function eventRow(pathname,recordedAt){
 const [namespace,version,date,kind,model,format,visitorId,country]=pathname.split('/');
 let valid=namespace==='live'&&['v1','v2','v3'].includes(version)&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&['visit','download','view'].includes(kind);
 if(version==='v2'&&!uuid.test(visitorId)||version==='v3'&&visitorId!=='anonymous'&&!uuid.test(visitorId))valid=false;
 if(kind==='download'&&(model==='mdlxl'?format!=='zip':!slug.test(model)||!['mdx','pack'].includes(format)))valid=false;
 if(kind==='view'&&(!slug.test(model)||model==='mdlxl'))valid=false;
 const identified=version!=='v1'&&uuid.test(visitorId||'');
 return {pathname,recorded_at:new Date(recordedAt).toISOString(),date,kind,model,format,visitor:identified?visitorId.toLowerCase():null,country:version==='v3'?countryCode(country):'ZZ',valid:valid?1:0};
}
const insert='INSERT OR IGNORE INTO events (pathname,recorded_at,date,kind,model,format,visitor,country,valid) VALUES (?,?,?,?,?,?,?,?,?)';
export const insertEvent=(db,row)=>db.prepare(insert).bind(row.pathname,row.recorded_at,row.date,row.kind,row.model,row.format,row.visitor,row.country,row.valid);
export function createD1Events(db){
 // The events handler stores each event under its Blob pathname with a JSON body.
 const write=async(pathname,body)=>{await insertEvent(db,eventRow(pathname,JSON.parse(body).recordedAt)).run();};
 // Aggregates in SQL, so the CPU cost stays flat as events accumulate.
 async function summary({from='',to='',models=[]}={}){
  const where='WHERE valid=1 AND (?1=\'\' OR date>=?1) AND (?2=\'\' OR date<=?2)',q=sql=>db.prepare(sql).bind(from,to);
  const [totalsRows,dailyRows,timelineRows,countryRows,shredderRows,updateRows]=(await db.batch([
   q(`SELECT SUM(kind='visit') pageLoads,SUM(kind='download') downloadClicks,SUM(kind='view') modelViews,COUNT(DISTINCT visitor) uniqueVisitors,SUM(kind='visit' AND visitor IS NOT NULL) identifiedPageLoads,SUM(kind='visit' AND visitor IS NULL) unidentifiedPageLoads,MAX(recorded_at) lastRecordedAt FROM events ${where}`),
   q(`SELECT date,SUM(kind='visit') pageLoads,SUM(kind='download') downloadClicks,COUNT(DISTINCT visitor) uniqueVisitors FROM events ${where} GROUP BY date ORDER BY date`),
   q(`SELECT date,kind,model,format,COUNT(*) count FROM events ${where} AND kind<>'visit' GROUP BY date,kind,model,format ORDER BY date,kind,model,format`),
   // Each browser counts once, in the first known country of the period.
   q(`SELECT country code,COUNT(*) uniqueVisitors FROM (SELECT country,ROW_NUMBER() OVER (PARTITION BY visitor ORDER BY recorded_at,country) rank FROM events ${where} AND visitor IS NOT NULL AND country<>'ZZ') WHERE rank=1 GROUP BY country`),
   // Shredder sessions are few (batched, a handful per browser a day), so summarize() reads them from their pathnames.
   q(`SELECT pathname,recorded_at uploadedAt FROM events WHERE kind='shredder' AND (?1='' OR date>=?1) AND (?2='' OR date<=?2)`),
   // MDLxL updates are one per downloaded release, so they are read the same way.
   // The date column already limits both to the period; older pathnames carry UTC dates.
   q(`SELECT pathname,recorded_at uploadedAt FROM events WHERE kind='update' AND (?1='' OR date>=?1) AND (?2='' OR date<=?2)`),
  ])).map(result=>result.results);
  const row=totalsRows[0]||{},totals={pageLoads:row.pageLoads||0,downloadClicks:row.downloadClicks||0,modelViews:row.modelViews||0,uniqueVisitors:row.uniqueVisitors||0};
  const applications=[{id:'mdlxl',name:'MDLxL',zipClicks:0,total:0}],byModel=new Map();
  for(const model of models)byModel.set(model.id,{id:model.id,name:model.name,mdxClicks:0,packClicks:0,total:0,views:0});
  const entry=id=>{if(!byModel.has(id))byModel.set(id,{id,name:id,mdxClicks:0,packClicks:0,total:0,views:0,unlisted:true});return byModel.get(id);};
  for(const {kind,model,format,count} of timelineRows){
   if(kind==='view')entry(model).views+=count;
   else if(model==='mdlxl'){applications[0].total+=count;applications[0].zipClicks+=count;}
   else{const item=entry(model);item.total+=count;item[format==='pack'?'packClicks':'mdxClicks']+=count;}
  }
  const known=countryRows.reduce((sum,row)=>sum+row.uniqueVisitors,0),countries=[...countryRows,...totals.uniqueVisitors>known?[{code:'ZZ',uniqueVisitors:totals.uniqueVisitors-known}]:[]]
   .map(({code,uniqueVisitors})=>({code,name:code==='ZZ'?'Unknown':regionNames.of(code),uniqueVisitors,share:uniqueVisitors/totals.uniqueVisitors}))
   .sort((a,b)=>(a.code==='ZZ')-(b.code==='ZZ')||b.uniqueVisitors-a.uniqueVisitors||a.name.localeCompare(b.name));
  return {totals,coverage:{identifiedPageLoads:row.identifiedPageLoads||0,unidentifiedPageLoads:row.unidentifiedPageLoads||0},lastRecordedAt:row.lastRecordedAt||null,countries,shredder:summarize(shredderRows).shredder,updates:summarize(updateRows).updates,daily:dailyRows.map(({date,pageLoads,downloadClicks,uniqueVisitors})=>({date,pageLoads,downloadClicks,uniqueVisitors})),
   models:[...byModel.values()].sort((a,b)=>b.total-a.total||b.views-a.views||a.name.localeCompare(b.name)),applications,timeline:timelineRows.map(({date,kind,model,format,count})=>[date,kind,model,format,count]),measurement};
 }
 return {write,summary};
}
