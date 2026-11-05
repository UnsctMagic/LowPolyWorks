import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const ordering=source.split(/\r?\n/).find(line=>line.startsWith('const armyActivityTime='));
function ordered(rows,updates={},groups=[]){
 const context=vm.createContext({groupOf:id=>groups.find(g=>g.variants.includes(id)),liveVariants:group=>group.variants.map(id=>({row:rows.find(r=>r.id===id)})).filter(v=>v.row)});
 const time=vm.runInContext(ordering+'\narmyActivityTime',context);
 return rows.filter(row=>{const group=groups.find(g=>g.variants.includes(row.id));return !group||group.variants.find(id=>rows.some(r=>r.id===id))===row.id;}).sort((a,b)=>time(b,updates)-time(a,updates)).map(row=>row.id);
}

test('model updates and new static releases or Vault uploads sort by their latest activity',()=>{
 const rows=[{id:'legacy'},{id:'older'},{id:'upload',models:[],publishedAt:'2026-10-18T08:00:00Z'},{id:'new'}];
 assert.deepEqual(ordered(rows,{legacy:{updatedAt:'2026-10-19T08:00:00Z'},older:{publishedAt:'2026-10-12T08:00:00Z'},new:{publishedAt:'2026-10-17T08:00:00Z'}}),['legacy','upload','new','older']);
});

test('latest activity considers row and byte-derived metadata dates independently',()=>{
 const rows=[{id:'row-update',publishedAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-20T00:00:00Z'},{id:'metadata-update',publishedAt:'2026-10-02T00:00:00Z'},{id:'metadata-release',publishedAt:'2026-10-01T00:00:00Z'}];
 assert.deepEqual(ordered(rows,{'metadata-update':{updatedAt:'2026-10-21T00:00:00Z'},'metadata-release':{publishedAt:'2026-10-22T00:00:00Z'}}),['metadata-release','metadata-update','row-update']);
});

test('equal and unknown activity dates preserve relative catalogue order',()=>{
 const rows=[{id:'a'},{id:'b'},{id:'c'},{id:'d'}];
 assert.deepEqual(ordered(rows,{b:{publishedAt:'2026-10-17T08:00:00Z'},c:{updatedAt:'2026-10-17T08:00:00Z'},d:{publishedAt:'invalid'}}),['b','c','a','d']);
});

test('new or updated live variants promote their shared card without changing its lead or variant order',()=>{
 const rows=[{id:'other'},{id:'lead'},{id:'new-variant'}],groups=[{variants:['lead','new-variant','hidden']}];
 const updates={other:{publishedAt:'2026-10-17T08:00:00Z'},'new-variant':{publishedAt:'2026-10-18T08:00:00Z'},hidden:{updatedAt:'2026-10-25T08:00:00Z'}};
 assert.deepEqual(ordered(rows,updates,groups),['lead','other']);
 updates.other.updatedAt='2026-10-19T08:00:00Z';
 assert.deepEqual(ordered(rows,updates,groups),['other','lead']);
 updates['new-variant'].updatedAt='2026-10-20T08:00:00Z';
 assert.deepEqual(ordered(rows,updates,groups),['lead','other']);
 assert.deepEqual(ordered(rows.filter(r=>r.id!=='new-variant'),updates,groups),['other','lead']);
 assert.deepEqual(groups[0].variants,['lead','new-variant','hidden']);
});

test('fixed Chaos placements cannot demote a freshly updated Axe card in the actual route',()=>{
 const catalogue=JSON.parse(fs.readFileSync(new URL('../dist/catalogue.json',import.meta.url)));
 const groups=JSON.parse(fs.readFileSync(new URL('../dist/variants.json',import.meta.url)));
 const updates=JSON.parse(fs.readFileSync(new URL('../dist/model-updates.json',import.meta.url)));
 const latest=Math.max(0,...Object.values(updates.models).flatMap(r=>[Date.parse(r.publishedAt)||0,Date.parse(r.updatedAt)||0]));
 updates.models['khorne-axe'].updatedAt=new Date(latest+60000).toISOString();
 const groupOf=id=>groups.find(g=>g.variants.some(v=>v.id===id));
 const liveVariants=g=>g.variants.map(v=>({...v,row:catalogue.find(r=>r.id===v.id)})).filter(v=>v.row);
 const isGroupLead=row=>{const group=groupOf(row.id);return !group||liveVariants(group)[0]?.id===row.id;};
 const route=source.split(/\r?\n/).find(line=>line.startsWith(" if(kind==='army')"));
 const actualOrder=route.slice(route.indexOf('const rows='),route.indexOf('document.title=army.name'));
 const context=vm.createContext({catalogue,updates,groupOf,liveVariants,isGroupLead,id:'warriors-of-chaos'});
 assert.equal(vm.runInContext(ordering+'\n'+actualOrder+'\nrows[0].id',context),'khorne-axe');
});
