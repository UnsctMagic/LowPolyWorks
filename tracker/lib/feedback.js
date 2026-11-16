// MDLxL "Report a problem" inbox on D1. Limits: 3 reports per PC, 5 per IP and 20 in total per UTC day.
import {compileRules} from './feedback-filter.js';
export const limits={pc:3,ip:5,day:20,stored:500};
const day=time=>new Date(time).toISOString().slice(0,10);
// The raw IP is never stored: a keyed hash that also depends on the day cannot be linked across days.
async function ipHash(secret,ip,at){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('feedback-ip:'+ip+'|'+at)));
 return [...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
const view=row=>({id:row.id,receivedAt:row.received_at,version:row.version,os:row.os,name:row.name||'',message:row.message,reviewed:Boolean(row.reviewed)});
export function createFeedback(db,env={},now=()=>Date.now()){
 const isOpen=async()=>Boolean((await db.prepare('SELECT open FROM feedback_settings WHERE id=1').first())?.open);
 const count=async(where,...values)=>(await db.prepare('SELECT COUNT(*) n FROM feedback WHERE '+where).bind(...values).first()).n;
 // Which limit a report would hit on its day and hashed IP; null when none is reached.
 async function refusal(today,hash,pc){
  if(await count('day=?',today)>=limits.day||await count('reviewed=0')>=limits.stored)return 'day';
  if(await count('day=? AND ip_hash=?',today,hash)>=limits.ip)return 'ip';
  if(await count('day=? AND pc=?',today,pc)>=limits.pc)return 'pc';
  return null;
 }
 async function context(ip){
  const secret=env.PUBLISHING_SESSION_SECRET;if(!secret)throw Error('Feedback secret is not configured.');
  const at=now(),today=day(at);
  return {at,today,hash:await ipHash(secret,ip,today)};
 }
 // The private rules are read at most once every five minutes per Worker instance.
 let rules;
 return {
  isOpen,
  async setOpen(open){await db.prepare('UPDATE feedback_settings SET open=? WHERE id=1').bind(open?1:0).run();},
  async rules(){
   if(rules&&now()-rules.at<300000)return rules.value;
   const rows=(await db.prepare('SELECT term FROM feedback_terms').all()).results;
   rules={at:now(),value:compileRules(rows.map(row=>row.term))};return rules.value;
  },
  // Answers as submit() would, without saving anything: used for reports that are dropped silently.
  async check({pc,ip}){
   if(!await isOpen())return 'paused';
   const {today,hash}=await context(ip);return refusal(today,hash,pc);
  },
  // Returns null when saved, otherwise why not: 'paused', 'day', 'ip' or 'pc'.
  async submit({message,name='',pc,version,os,ip}){
   const {at,today,hash}=await context(ip),yesterday=day(at-86400000);
   await db.prepare('UPDATE feedback SET ip_hash=NULL WHERE ip_hash IS NOT NULL AND day<?').bind(yesterday).run();
   // One statement counts and inserts, so concurrent reports cannot pass the caps together.
   const saved=await db.prepare(`INSERT INTO feedback (received_at,day,pc,ip_hash,version,os,message,name) SELECT ?1,?2,?3,?4,?5,?6,?7,?8 WHERE (SELECT open FROM feedback_settings WHERE id=1)=1 AND (SELECT COUNT(*) FROM feedback WHERE day=?2)<${limits.day} AND (SELECT COUNT(*) FROM feedback WHERE reviewed=0)<${limits.stored} AND (SELECT COUNT(*) FROM feedback WHERE day=?2 AND ip_hash=?4)<${limits.ip} AND (SELECT COUNT(*) FROM feedback WHERE day=?2 AND pc=?3)<${limits.pc}`).bind(new Date(at).toISOString(),today,pc,hash,version,os,message,name).run();
   if(saved.meta.changes===1)return null;
   if(!await isOpen())return 'paused';
   return await refusal(today,hash,pc)||'pc';
  },
  async inbox({all=false}={}){
   const rows=(await db.prepare(`SELECT id,received_at,version,os,name,message,reviewed FROM feedback ${all?'':'WHERE reviewed=0 '}ORDER BY id DESC LIMIT ${limits.stored}`).all()).results;
   return {open:await isOpen(),reports:rows.map(view)};
  },
  async review(ids){for(const id of ids)await db.prepare('UPDATE feedback SET reviewed=1 WHERE id=?').bind(id).run();}
 };
}
