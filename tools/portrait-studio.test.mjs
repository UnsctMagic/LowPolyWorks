import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('./portrait-studio.html',import.meta.url),'utf8');
const selection=source.slice(source.indexOf('function referenceRow('),source.indexOf('async function captureRow('));
const rows=JSON.parse(fs.readFileSync(new URL('../dist/catalogue.json',import.meta.url),'utf8'));
const groups=JSON.parse(fs.readFileSync(new URL('../dist/variants.json',import.meta.url),'utf8'));
const reference=vm.runInNewContext(selection+'\nreferenceRow',{rows,groups});
test('every catalogue Hero resolves to its corresponding Unit, including named and Warboss variants',()=>{
 for(const group of groups)for(const hero of group.variants.filter(v=>/\bHero\b/i.test(v.label))){
  const unit=group.variants.find(v=>v.label===hero.label.replace(/\bHero\b/i,'Unit'))||group.variants.find(v=>v.label===hero.label.replace(/\s*\bHero\b/i,'').trim())||group.variants.filter(v=>!/\bHero\b/i.test(v.label)).find((v,i,a)=>a.length===1);
  assert.ok(unit,group.id+': '+hero.label);
  assert.equal(reference(rows.find(r=>r.id===hero.id)).id,unit.id,group.id+': '+hero.label);
 }
});
test('Unit variants retain their own frame, including Swimless and named weapons',()=>{
 for(const group of groups)for(const variant of group.variants.filter(v=>!/\bHero\b/i.test(v.label))){
  const row=rows.find(r=>r.id===variant.id);if(row)assert.equal(reference(row).id,row.id,group.id+': '+variant.label);
 }
});
test('a Hero-only request still resolves its Unit from the full catalogue',()=>{
 for(const id of ['gluma-143397','gluma-123553','gluma-123551','gluma-135400','herrdave-104264','warrior-of-khorne-cleaver-hero'])assert.notEqual(reference(rows.find(r=>r.id===id)).id,id,id);
});
