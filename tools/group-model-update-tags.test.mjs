import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {groupModelUpdate,mountModelUpdateTags} from '../dist/model-update-tags.js';
import {syncModelUpdates} from './model-updates.mjs';
const day=86400000;
function badge(record,time){
 const element={dataset:{modelUpdated:'family'},style:{},hidden:true};
 const root={querySelectorAll:()=>[element],ownerDocument:{addEventListener(){},removeEventListener(){}}};
 const dispose=mountModelUpdateTags(root,{family:record},{now:()=>time,setTimer:()=>1,clearTimer(){}});
 dispose();return element.hidden?null:element.textContent;
}

test('a replacement of a non-leading variant and a later-added variant automatically tag their shared card',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'lpw-auto-group-tags-'));
 const published=Date.parse('2026-10-01T08:00:00Z'),updated=Date.parse('2026-11-04T08:00:00Z');
 try{
  fs.mkdirSync(path.join(root,'models'));let rows=[{id:'first',file:'first.mdx'},{id:'second',file:'second.mdx'}];
  const save=()=>fs.writeFileSync(path.join(root,'catalogue.json'),JSON.stringify(rows));
  for(const row of rows)fs.writeFileSync(path.join(root,'models',row.file),row.id+' original bytes');save();
  const initial=syncModelUpdates(root,published).models;
  assert.equal(badge(groupModelUpdate(rows.map(row=>row.id),initial),published),'New!');
  let records=syncModelUpdates(root,updated).models;
  assert.equal(badge(groupModelUpdate(rows.map(row=>row.id),records),updated),null);
  fs.writeFileSync(path.join(root,'models/second.mdx'),'repaired non-leading variant');
  records=syncModelUpdates(root,updated).models;
  assert.equal(records.first.updatedAt,undefined);
  assert.equal(records.second.publishedAt,new Date(published).toISOString());
  assert.equal(badge(groupModelUpdate(rows.map(row=>row.id),records),updated),'Updated 04/11');
  rows.push({id:'later',file:'later.mdx'});fs.writeFileSync(path.join(root,'models/later.mdx'),'later-added variant');save();
  records=syncModelUpdates(root,updated+day).models;
  assert.equal(badge(groupModelUpdate(rows.map(row=>row.id),records),updated+day),'Updated 05/11');
  fs.writeFileSync(path.join(root,'models/later.mdx'),'later variant revised');
  records=syncModelUpdates(root,updated+5*day).models;
  assert.equal(badge(groupModelUpdate(rows.map(row=>row.id),records),updated+5*day),'Updated 09/11');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('group dates prefer revisions and retain expiry without mutating records or using absent variants',()=>{
 const start=Date.parse('2026-11-04T08:00:00Z');
 const records={first:{publishedAt:new Date(start).toISOString()},second:{publishedAt:'2026-10-01T00:00:00Z',updatedAt:new Date(start+day).toISOString()},hidden:{updatedAt:new Date(start+10*day).toISOString()}};
 const original=JSON.stringify(records),record=groupModelUpdate(['first','second','missing'],records);
 assert.equal(badge(record,start+day),'Updated 05/11');
 assert.equal(badge(record,start+3*day),'Updated 05/11');
 assert.equal(badge(record,start+4*day),null);
 assert.equal(JSON.stringify(records),original);
 assert.deepEqual(groupModelUpdate(['missing'],records),{});
 assert.equal(badge(groupModelUpdate(['legacy','first'],{...records,legacy:{sha256:'previous'}}),start),'Updated 04/11');
});
