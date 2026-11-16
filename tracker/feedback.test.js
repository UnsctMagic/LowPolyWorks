import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createFeedback} from './lib/feedback.js';
import {createFeedbackHandler} from './api/feedback.js';
import {runVercelHandler} from './cloudflare/adapter.js';
import {compileRules} from './lib/feedback-filter.js';

// A small stand-in for the D1 binding, backed by Node's built-in SQLite.
function sqliteD1(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('./migrations/0003_feedback.sql',import.meta.url),'utf8'));
 const statement=(sql,params=[])=>({bind:(...values)=>statement(sql,values),async first(){return sqlite.prepare(sql).get(...params)??null;},async all(){return {results:sqlite.prepare(sql).all(...params)};},async run(){const info=sqlite.prepare(sql).run(...params);return {meta:{changes:Number(info.changes)}};}});
 return {prepare:sql=>statement(sql),sqlite};
}
const env={PUBLISHING_SESSION_SECRET:'test-only-secret-'.repeat(3),USAGE_READ_TOKEN:'read-token'};
const pcs=n=>'a'.repeat(60)+String(n).padStart(4,'0');
function setup(){
 const db=sqliteD1(),clock={at:Date.parse('2026-11-16T10:00:00Z')},feedback=createFeedback(db,env,()=>clock.at),handler=createFeedbackHandler({feedback,env});
 async function call({method='POST',query='',body,ip='203.0.113.7',app=true,headers={}}={}){
  const response=await runVercelHandler(handler,new Request('https://worker.example/api/feedback'+query,{method,headers:{'Content-Type':'application/json','CF-Connecting-IP':ip,...app?{'User-Agent':'MDLxL/0.41.0'}:{},...headers},body:method==='GET'?undefined:typeof body==='string'?body:JSON.stringify(body)}));
  const text=await response.text();return {status:response.status,body:text?JSON.parse(text):null,headers:response.headers};
 }
 return {db,clock,feedback,call};
}
const report=(n=1,extra={})=>({message:'The tool crashed.',pc:pcs(n),version:'0.41.0',os:'Windows 11 (10.0.26200)',...extra});
const token={Authorization:'Bearer read-token'};

test('only the MDLxL app can read the switch or send a report',async()=>{
 const {call}=setup();
 const open=await call({method:'GET'});assert.deepEqual([open.status,open.body,open.headers.get('cache-control')],[200,{open:true},'no-store']);
 for(const options of [{app:false},{headers:{Origin:'https://www.lowpolyworks.com'}},{headers:{'User-Agent':'MDLxL/1.2'}},{headers:{'User-Agent':'curl/8'}}]){
  assert.equal((await call({method:'GET',...options})).status,403);assert.equal((await call({body:report(),...options})).status,403);
 }
 assert.equal((await call({body:report()})).status,204);
});
test('reports are validated and cleaned before they are stored',async()=>{
 const {call,db}=setup();
 assert.equal((await call({body:report(1,{message:'x'.repeat(12000)})})).status,413);
 assert.equal((await call({body:'x'.repeat(12000)})).status,413);
 for(const bad of [{message:'   '},{message:''},{message:5},{message:'x'.repeat(2001)},{pc:'ABC'},{pc:'A'.repeat(64)},{pc:'a'.repeat(63)},{version:'1.2'},{version:'1.2.3.4'},{version:'a.b.c'}])assert.equal((await call({body:report(1,bad)})).status,400,JSON.stringify(bad).slice(0,60));
 assert.equal((await call({body:'{oops'})).status,400);assert.equal((await call({body:'[]'})).status,400);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM feedback').get().n,0);
 assert.equal((await call({body:report(1,{message:'  Line one\nTab\there\u0000\u0007\r bell\u007F  ',os:'Windows <script>'})})).status,204);
 assert.equal((await call({body:report(2,{message:'x'.repeat(2000),os:'x'.repeat(61)})})).status,204);
 const rows=db.sqlite.prepare('SELECT message,os,pc,version FROM feedback ORDER BY id').all();
 assert.equal(rows[0].message,'Line one\nTab\there bell');assert.equal(rows[0].os,'');assert.equal(rows[1].os,'');assert.equal(rows[1].message.length,2000);assert.equal(rows[0].version,'0.41.0');
});
test('the fourth report from one PC in a day is refused with pc, and the next UTC day starts fresh',async()=>{
 const {call,clock,db}=setup();
 for(let i=0;i<3;i++)assert.equal((await call({body:report(1),ip:'198.51.100.'+i})).status,204);
 const refused=await call({body:report(1),ip:'198.51.100.9'});assert.deepEqual([refused.status,refused.body],[429,{error:'pc'}]);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM feedback').get().n,3);
 clock.at=Date.parse('2026-11-17T00:00:01Z');assert.equal((await call({body:report(1)})).status,204);
});
test('the sixth report from one IP across PCs is refused with ip',async()=>{
 const {call}=setup();
 for(let i=1;i<=5;i++)assert.equal((await call({body:report(i)})).status,204);
 const refused=await call({body:report(6)});assert.deepEqual([refused.status,refused.body],[429,{error:'ip'}]);
 assert.equal((await call({body:report(6),ip:'203.0.113.99'})).status,204);
});
test('the twenty-first report of the day across many IPs and PCs is refused with day, checked before ip and pc',async()=>{
 const {call,clock}=setup();
 for(let i=1;i<=20;i++)assert.equal((await call({body:report(i),ip:'192.0.2.'+i})).status,204);
 const refused=await call({body:report(21),ip:'192.0.2.99'});assert.deepEqual([refused.status,refused.body],[429,{error:'day'}]);
 // A PC and IP that are also at their own limits still get "day" first.
 assert.deepEqual((await call({body:report(1),ip:'192.0.2.1'})).body,{error:'day'});
 clock.at=Date.parse('2026-11-17T09:00:00Z');assert.equal((await call({body:report(21),ip:'192.0.2.99'})).status,204);
});
test('concurrent reports cannot pass the caps',async()=>{
 const {call,db}=setup();
 const results=await Promise.all(Array.from({length:12},(_,i)=>call({body:report(i+1),ip:'192.0.2.'+i})));
 assert.equal(results.filter(r=>r.status===204).length,12);
 const same=await Promise.all(Array.from({length:8},()=>call({body:report(50),ip:'198.51.100.1'})));
 assert.equal(same.filter(r=>r.status===204).length,3);assert(same.filter(r=>r.status===429).every(r=>r.body.error==='pc'));
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM feedback WHERE pc=?').get(pcs(50)).n,3);
});
test('the switch pauses reports and a full inbox of 500 unreviewed reports refuses with day',async()=>{
 const {call,feedback,db}=setup();
 await feedback.setOpen(false);
 assert.deepEqual((await call({method:'GET'})).body,{open:false});
 const paused=await call({body:report()});assert.deepEqual([paused.status,paused.body],[503,{error:'paused'}]);
 await feedback.setOpen(true);
 const insert=db.sqlite.prepare("INSERT INTO feedback (received_at,day,pc,ip_hash,version,os,message,reviewed) VALUES ('2026-10-01T00:00:00Z','2026-10-01',?,NULL,'0.41.0','','old',0)");
 for(let i=0;i<500;i++)insert.run(pcs(1000+i));
 assert.deepEqual((await call({body:report()})).body,{error:'day'});
 db.sqlite.prepare('UPDATE feedback SET reviewed=1 WHERE id=1').run();
 assert.equal((await call({body:report()})).status,204);
});
test('the raw IP is never stored and old IP hashes are cleared',async()=>{
 const {call,clock,db}=setup();
 await call({body:report(1),ip:'203.0.113.7'});await call({body:report(2),ip:'2001:db8::7'});
 const stored=JSON.stringify(db.sqlite.prepare('SELECT * FROM feedback').all());
 assert(!stored.includes('203.0.113'));assert(!stored.includes('2001:db8'));
 const day1=db.sqlite.prepare('SELECT ip_hash FROM feedback WHERE id=1').get().ip_hash;assert.match(day1,/^[a-f0-9]{64}$/);
 clock.at=Date.parse('2026-11-17T10:00:00Z');await call({body:report(1),ip:'203.0.113.7'});
 const rows=db.sqlite.prepare('SELECT id,ip_hash FROM feedback ORDER BY id').all();
 // Yesterday's hash stays for yesterday's limits; the same IP hashes differently on another day.
 assert.equal(rows[0].ip_hash,day1);assert.notEqual(rows[2].ip_hash,day1);
 clock.at=Date.parse('2026-11-18T10:00:00Z');await call({body:report(3),ip:'198.51.100.2'});
 const after=db.sqlite.prepare('SELECT id,ip_hash FROM feedback ORDER BY id').all();
 assert.deepEqual(after.map(r=>r.ip_hash===null),[true,true,false,false]);
});
test('the private token reads the inbox and marks reports reviewed or flips the switch',async()=>{
 const {call,feedback}=setup();
 for(let i=1;i<=3;i++)await call({body:report(i,{message:'Report '+i}),ip:'192.0.2.'+i});
 assert.equal((await call({method:'GET',query:'?inbox=1'})).status,401);
 assert.equal((await call({method:'GET',query:'?inbox=1',headers:{Authorization:'Bearer wrong'}})).status,401);
 assert.equal((await call({method:'POST',query:'?inbox=1',body:{open:false}})).status,401);
 const read=await call({method:'GET',query:'?inbox=1',app:false,headers:token});
 assert.equal(read.status,200);assert.equal(read.body.open,true);assert.deepEqual(read.body.reports.map(r=>r.message),['Report 3','Report 2','Report 1']);
 assert.deepEqual(Object.keys(read.body.reports[0]).sort(),['id','message','name','os','receivedAt','reviewed','version']);assert.equal(read.body.reports[0].reviewed,false);
 assert(!JSON.stringify(read.body).includes(pcs(1)));
 assert.equal((await call({method:'POST',query:'?inbox=1',headers:token,body:{reviewed:[2]}})).status,204);
 assert.deepEqual((await call({method:'GET',query:'?inbox=1',headers:token})).body.reports.map(r=>r.id),[3,1]);
 const all=await call({method:'GET',query:'?inbox=1&all=1',headers:token});assert.deepEqual(all.body.reports.map(r=>[r.id,r.reviewed]),[[3,false],[2,true],[1,false]]);
 assert.equal((await call({method:'POST',query:'?inbox=1',headers:token,body:{open:false}})).status,204);assert.equal(await feedback.isOpen(),false);
 for(const body of [{reviewed:['x']},{},{open:'no'}])assert.equal((await call({method:'POST',query:'?inbox=1',headers:token,body})).status,400);
});

test('an optional name up to 40 characters is stored and read back',async()=>{
 const {call,db}=setup();
 assert.equal((await call({body:report(1,{name:'  Herr   Dave\u0007 '})})).status,204);
 assert.equal((await call({body:report(2)})).status,204);
 assert.equal((await call({body:report(3,{name:'n'.repeat(41)})})).status,400);
 assert.equal((await call({body:report(3,{name:7})})).status,204);
 assert.deepEqual(db.sqlite.prepare('SELECT name FROM feedback ORDER BY id').all().map(row=>row.name),['Herr Dave','','']);
 const read=await call({method:'GET',query:'?inbox=1',headers:token});assert.deepEqual(read.body.reports.map(r=>r.name),['','','Herr Dave']);
});

// Stand-in terms only: the real list is private and never in Git.
const rules=['banana','^grape','~melon','=piña','kiwi fruit','egg','שזיף','تفاحة','苹果','^яблок','=(((','=1234'];
test('a report matching the private rules is answered like a saved one and nothing is stored',async()=>{
 const {call,db,feedback}=setup();
 const add=db.sqlite.prepare('INSERT INTO feedback_terms (term) VALUES (?)');for(const term of rules)add.run(term);
 const blocked=await call({body:report(1,{message:'I like B A N A N A s? no: b4n4n4 is bad'})});
 assert.deepEqual([blocked.status,blocked.body],[204,null]);
 assert.equal((await call({body:report(2,{name:'Grapefruit',message:'The tool crashed.'})})).status,204);
 assert.equal((await call({body:report(3,{message:'The tool crashed when I opened the Movement editor.'})})).status,204);
 assert.deepEqual(db.sqlite.prepare('SELECT pc FROM feedback ORDER BY id').all().map(row=>row.pc),[pcs(3)]);
 // Over a limit or paused, a matching report gets the same refusal as any other, so the rules cannot be probed.
 for(let i=0;i<3;i++)await call({body:report(9),ip:'192.0.2.'+i});
 assert.deepEqual((await call({body:report(9,{message:'melons'}),ip:'192.0.2.50'})).body,{error:'pc'});
 await feedback.setOpen(false);
 assert.equal((await call({body:report(10,{message:'banana'})})).status,503);
});
test('the rules see through spacing, digits, look-alike letters, accents, hidden characters and masks',()=>{
 const {blocks}=compileRules(rules);
 for(const text of ['banana','BANANA!','b a n a n a','b.a.n.a.n.a','b4n4n4','bаnаnа','bananaaaa','b​anana','bánáná','ｂａｎａｎａ','b*nana','b@n@n@',
  'grapes','Grapefruit','watermelon','piña','kiwi-fruit','kiwifruit','וְהַשְּׁזִיפִים','ושזיפים','بالتفاحة','التفاحه','我喜欢苹果','яблоко','Яблоки','(((them)))','pin 1234','b*n*n*','b***','grap*s','**banana**'])assert(blocks(text),text);
 for(const text of ['bandana','Ban ana','grape'.replace('g','x'),'mel on','pina colada','kiwi','eggplant','eg','The UV editor froze','שלום','مرحبا','苹','1234567',
  // Bold markdown is not a mask, letters of different scripts are not joined, and a doubled letter stays doubled.
  '**Bold** text and **A** b**','k i w и','eg g'])assert(!blocks(text),text);
 assert.equal(compileRules([]).blocks('anything'),false);
});
