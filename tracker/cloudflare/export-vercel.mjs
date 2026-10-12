// Exports the Vercel Blob data into an SQL file for `wrangler d1 execute --remote --file`.
// Usage: BLOB_READ_WRITE_TOKEN=... node cloudflare/export-vercel.mjs <output.sql>
// It reads the state document and lists live/ events (one Blob list call per 1,000 events).
import {writeFileSync} from 'node:fs';
import {get,list} from '@vercel/blob';
import {eventRow} from '../lib/d1.js';

const output=process.argv[2];if(!output)throw Error('Pass the output SQL path.');
const quote=value=>value===null?'NULL':typeof value==='number'?String(value):"'"+String(value).replaceAll("'","''")+"'";
const blob=await get('publishing/v1/state.json',{access:'private',useCache:false});
const state=await new Response(blob.stream).text();JSON.parse(state);
const events=[];let cursor;
do{const page=await list({prefix:'live/',limit:1000,cursor});events.push(...page.blobs);cursor=page.hasMore?page.cursor:undefined;}while(cursor);
// D1 limits one statement to 100 KB, so the state is written in chunks and events in groups.
const sql=["DELETE FROM state;","INSERT INTO state (id,version,body,updated_at) VALUES (1,1,'',"+quote(new Date().toISOString())+");"];
for(let start=0;start<state.length;start+=60000)sql.push('UPDATE state SET body=body||'+quote(state.slice(start,start+60000))+' WHERE id=1;');
const columns=['pathname','recorded_at','date','kind','model','format','visitor','country','valid'];
for(let start=0;start<events.length;start+=100)sql.push('INSERT OR IGNORE INTO events ('+columns.join(',')+') VALUES '+events.slice(start,start+100).map(({pathname,uploadedAt})=>{const row=eventRow(pathname,uploadedAt);return '('+columns.map(key=>quote(row[key])).join(',')+')';}).join(',')+';');
writeFileSync(output,sql.join('\n')+'\n');
console.log(`Wrote ${events.length} events and a ${state.length}-byte state document.`);
