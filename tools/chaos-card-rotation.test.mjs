import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const selection=source.slice(source.indexOf('const chaosGroupPictures='),source.indexOf('let alternateChaosArmy;'));
const groups=JSON.parse(fs.readFileSync(new URL('../dist/variants.json',import.meta.url)));
const rows=JSON.parse(fs.readFileSync(new URL('../dist/catalogue.json',import.meta.url)));
const storage=new Map();
const sessionStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
const reload=()=>vm.runInNewContext(selection+'\nchooseChaosGroupPicture',{sessionStorage});

test('every Chaos group visits all live variants, wraps, and keeps its selection during navigation',()=>{
  const chaosGroups=groups.filter(group=>group.variants.some(v=>rows.find(row=>row.id===v.id)?.army==='warriors-of-chaos'));
  assert.equal(chaosGroups.find(group=>group.id==='warrior-of-khorne').variants.length,4);
  for(const group of chaosGroups){
    const variants=group.variants.filter(v=>rows.some(row=>row.id===v.id));
    const seen=[];
    for(let load=0;load<=variants.length;load++){
      const choose=reload(),index=choose(group,variants);
      seen.push(variants[index].id);
      assert.equal(choose(group,variants),index);
    }
    assert.deepEqual(seen,[...variants.map(v=>v.id),variants[0].id],group.id);
  }
});

test('new variants enter the cycle automatically and removed selections restart at a live variant',()=>{
  const group={id:'future-chaos-group'},variants=[{id:'a'},{id:'b'}];
  assert.equal(reload()(group,variants),0);
  assert.equal(reload()(group,variants),1);
  variants.push({id:'new'});
  assert.equal(reload()(group,variants),2);
  variants.pop();
  assert.equal(reload()(group,variants),0);
});

test('group card applies the shared cycle to Chaos before Unit defaults, preserving other armies',()=>{
  const card=source.split(/\r?\n/).find(line=>line.startsWith('function groupCard('));
  assert.ok(card.includes("index=lead.army==='warriors-of-chaos'?chooseChaosGroupPicture(group,variants):variants.some(v=>v.label==='Unit')?variants.findIndex(v=>v.label==='Unit'):0"));
});
