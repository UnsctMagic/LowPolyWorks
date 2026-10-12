import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createD1State,createD1Events,eventRow,insertEvent} from './lib/d1.js';
import {summarize} from './lib/events.js';

// A small stand-in for the D1 binding, backed by Node's built-in SQLite.
export function sqliteD1(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('./migrations/0001_init.sql',import.meta.url),'utf8'));
 const statement=(sql,params=[])=>({bind:(...values)=>statement(sql,values),async first(){return sqlite.prepare(sql).get(...params)??null;},async all(){return {results:sqlite.prepare(sql).all(...params)};},async run(){const info=sqlite.prepare(sql).run(...params);return {meta:{changes:Number(info.changes)}};}});
 return {prepare:sql=>statement(sql),batch:statements=>Promise.all(statements.map(s=>s.all())),sqlite};
}
const id=n=>`${String(n).padStart(8,'0')}-0000-4000-8000-${String(n).padStart(12,'0')}`;
function sampleBlobs(){
 const blobs=[],dates=['2026-10-05','2026-10-06','2026-10-07'],countries=['NL','US','ZZ','DE','XX'];let n=0;
 const add=(pathname,at)=>blobs.push({pathname,uploadedAt:at});
 for(const [d,date] of dates.entries())for(let hour=0;hour<6;hour++){
  const at=`${date}T${String(hour+10).padStart(2,'0')}:00:00.000Z`,visitor=id(hour%4+1),country=countries[(hour+d)%5];
  add(`live/v1/${date}/visit/site/none/${id(++n)}.json`,at);
  add(`live/v2/${date}/visit/site/none/${visitor}/${id(++n)}.json`,at);
  add(`live/v3/${date}/visit/site/none/${visitor}/${country}/${id(++n)}.json`,at);
  add(`live/v3/${date}/visit/site/none/anonymous/${country}/${id(++n)}.json`,at);
  add(`live/v3/${date}/download/${hour%2?'shredder':'mdlxl'}/${hour%2?(hour%3?'mdx':'pack'):'zip'}/${visitor}/${country}/${id(++n)}.json`,at);
  add(`live/v3/${date}/view/${hour%2?'shredder':'removed-model'}/none/${visitor}/${country}/${id(++n)}.json`,at);
  // Rows summarize() ignores must be ignored here too.
  add(`testing/v3/${date}/visit/site/none/${visitor}/NL/${id(++n)}.json`,at);
  add(`live/v3/${date}/download/mdlxl/mdx/${visitor}/NL/${id(++n)}.json`,at);
  add(`live/v3/${date}/view/mdlxl/none/${visitor}/NL/${id(++n)}.json`,at);
  add(`live/v2/${date}/visit/site/none/not-a-visitor/${id(++n)}.json`,at);
  // Shredder sessions, including ones summarize() rejects.
  add(`live/v3/${date}/shredder/peek${hour}.grab1.feed${d}.crack0.follow1/session/${hour%3?visitor:'anonymous'}/${country}/${id(++n)}.json`,at);
  add(`testing/v3/${date}/shredder/peek9.grab9.feed9.crack9.follow9/session/${visitor}/NL/${id(++n)}.json`,at);
  add(`live/v3/${date}/shredder/nonsense/session/${visitor}/NL/${id(++n)}.json`,at);
 }
 return blobs;
}
const sorted=report=>({...report,timeline:[...report.timeline].sort((a,b)=>a.slice(0,4).join('|').localeCompare(b.slice(0,4).join('|')))});
test('the D1 summary matches the Blob summary for every period and event version',async()=>{
 const db=sqliteD1(),blobs=sampleBlobs(),models=[{id:'shredder',name:'Shredder'},{id:'quiet',name:'Quiet model'}];
 for(const blob of blobs)await insertEvent(db,eventRow(blob.pathname,blob.uploadedAt)).run();
 const events=createD1Events(db);
 for(const range of [{},{from:'2026-10-06'},{to:'2026-10-06'},{from:'2026-10-06',to:'2026-10-06'},{from:'2026-11-01'}])
  assert.deepEqual(sorted(await events.summary({...range,models})),sorted(summarize(blobs,{...range,models})),JSON.stringify(range));
});
test('a stored event is written once under its pathname',async()=>{
 const db=sqliteD1(),events=createD1Events(db),pathname=`live/v3/2026-10-12/visit/site/none/anonymous/NL/${id(1)}.json`;
 await events.write(pathname,JSON.stringify({recordedAt:'2026-10-12T10:00:00.000Z'}));await events.write(pathname,JSON.stringify({recordedAt:'2026-10-12T10:00:01.000Z'}));
 assert.deepEqual(db.sqlite.prepare('SELECT recorded_at,country,valid FROM events').all().map(row=>({...row})),[{recorded_at:'2026-10-12T10:00:00.000Z',country:'NL',valid:1}]);
});
test('state changes retry on a concurrent save instead of overwriting it',async()=>{
 const db=sqliteD1(),store=createD1State(db);
 assert.equal((await store.read()).etag,null);
 await store.mutate(state=>{state.posts.push({id:'first'});});
 let interfered=false;
 const result=await store.mutate(async state=>{if(!interfered){interfered=true;await store.mutate(other=>{other.posts.push({id:'other'});});}state.posts.push({id:'mine'});return 'saved';});
 assert.equal(result,'saved');
 const {state,etag}=await store.read();assert.equal(etag,3);assert.deepEqual(state.posts.map(post=>post.id),['first','other','mine']);
});
