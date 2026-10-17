import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const ordering=source.split(/\r?\n/).find(line=>line.startsWith('const armyReleaseTime='));
function ordered(rows,updates={},groups=[]){
 const context=vm.createContext({groupOf:id=>groups.find(g=>g.variants.includes(id)),liveVariants:group=>group.variants.map(id=>({row:rows.find(r=>r.id===id)})).filter(v=>v.row)});
 const time=vm.runInContext(ordering+'\narmyReleaseTime',context);
 return rows.filter(row=>{const group=groups.find(g=>g.variants.includes(row.id));return !group||group.variants.find(id=>rows.some(r=>r.id===id))===row.id;}).sort((a,b)=>time(b,updates)-time(a,updates)).map(row=>row.id);
}
test('new static releases and Vault uploads sort newest first without update dates bumping old models',()=>{
 const rows=[{id:'legacy'},{id:'older'},{id:'upload',models:[],publishedAt:'2026-10-18T08:00:00Z'},{id:'new'}];
 assert.deepEqual(ordered(rows,{legacy:{updatedAt:'2026-10-19T08:00:00Z'},older:{publishedAt:'2026-10-12T08:00:00Z'},new:{publishedAt:'2026-10-17T08:00:00Z'}}),['upload','new','older','legacy']);
});
test('equal and unknown publication dates preserve their relative catalogue order',()=>{
 const rows=[{id:'a'},{id:'b'},{id:'c'},{id:'d'}];
 assert.deepEqual(ordered(rows,{b:{publishedAt:'2026-10-17T08:00:00Z'},c:{publishedAt:'2026-10-17T08:00:00Z'},d:{publishedAt:'invalid'}}),['b','c','a','d']);
});
test('a new visible variant promotes its group without changing its lead or variant order',()=>{
 const rows=[{id:'other'},{id:'lead'},{id:'new-variant'}],groups=[{variants:['lead','new-variant','hidden']}];
 const updates={other:{publishedAt:'2026-10-17T08:00:00Z'},'new-variant':{publishedAt:'2026-10-18T08:00:00Z'},hidden:{publishedAt:'2026-10-19T08:00:00Z'}};
 assert.deepEqual(ordered(rows,updates,groups),['lead','other']);
 assert.deepEqual(ordered(rows.filter(r=>r.id!=='new-variant'),updates,groups),['other','lead']);
 assert.deepEqual(groups[0].variants,['lead','new-variant','hidden']);
});
test('the published Warrior of Khorne leads its army using recorded release dates',()=>{
 const rows=JSON.parse(fs.readFileSync(new URL('../dist/catalogue.json',import.meta.url))).filter(r=>r.army==='warriors-of-chaos');
 const updates=JSON.parse(fs.readFileSync(new URL('../dist/model-updates.json',import.meta.url))).models;
 assert.equal(ordered(rows,updates)[0],'warrior-of-khorne');
});
