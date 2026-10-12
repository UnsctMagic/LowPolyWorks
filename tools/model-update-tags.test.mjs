import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {modelUpdateTag,mountModelUpdateTags} from '../dist/model-update-tags.js';
import {syncModelUpdates} from './model-updates.mjs';
const newTag=(stamp,now)=>modelUpdateTag(stamp,now,true);
const day=86400000,start=Date.parse('2026-10-10T08:00:00Z');

test('each 24-hour boundary darkens the green and the exact 72-hour boundary hides the tag',()=>{
 const stamp=new Date(start).toISOString();
 const colours=[0,1,2].map(i=>newTag(stamp,start+i*day));
 assert.deepEqual(colours.map(info=>info.label),Array(3).fill('New!'));
 assert.deepEqual(colours.map(info=>info.colour),['#83e69a','#63c37b','#48985f']);
 assert.equal(newTag(stamp,start+day-1).day,0);
 assert.equal(newTag(stamp,start+3*day-1).day,2);
 assert.equal(newTag(stamp,start+3*day),null);
 assert.equal(newTag('invalid',start),null);
 assert.equal(newTag(stamp,start-1),null);
 assert.equal(newTag('2026-10-09T23:30:00Z',start).label,'New!');
});

test('an open army card darkens, expires and disposes its timer without a page reload',()=>{
 let time=start,queued,removed=false;
 const element={dataset:{modelUpdated:'knight'},style:{},hidden:true};
 const root={querySelectorAll:()=>[element],ownerDocument:{addEventListener(){},removeEventListener(){removed=true;}}};
 const dispose=mountModelUpdateTags(root,{knight:{publishedAt:new Date(start).toISOString()}},{now:()=>time,setTimer:(callback,delay)=>{queued={callback,delay};return 1;},clearTimer:()=>{queued=null;}});
 assert.equal(element.hidden,false);assert.equal(queued.delay,day);
 for(let i=1;i<=3;i++){time=start+i*day;const callback=queued.callback;callback();assert.equal(element.hidden,i===3);if(i<3)assert.equal(element.dataset.day,String(i));}
 assert.equal(queued,null);dispose();assert(removed);
});

test('a replacement refreshes its revision timestamp but never restarts the New! window',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'lpw-model-tags-'));
 try{
  fs.mkdirSync(path.join(root,'models'));
  const catalogue=path.join(root,'catalogue.json');
  fs.writeFileSync(catalogue,JSON.stringify([{id:'knight',file:'knight.mdx',name:'Knight'}]));
  const file=path.join(root,'models/knight.mdx');fs.writeFileSync(file,'original bytes');
  const first=syncModelUpdates(root,start).models.knight;
  assert.equal(first.updatedAt,undefined);assert.equal(first.publishedAt,new Date(start).toISOString());assert.equal(newTag(first.publishedAt,start).label,'New!');
  fs.writeFileSync(file,'revision 07 bytes');
  assert.equal(syncModelUpdates(root,start).models.knight.updatedAt,new Date(start).toISOString());
  fs.writeFileSync(catalogue,JSON.stringify([{id:'knight',file:'knight.mdx',name:'New name',changelog:[{text:'New note'}]}]));
  assert.equal(syncModelUpdates(root,start+day).models.knight.updatedAt,new Date(start).toISOString());
  fs.writeFileSync(file,'revision 08 bytes');
  assert.equal(syncModelUpdates(root,start+2*day).models.knight.updatedAt,new Date(start+2*day).toISOString());
  const final=syncModelUpdates(root,start+3*day).models.knight;assert.equal(final.publishedAt,new Date(start).toISOString());assert.equal(newTag(final.publishedAt,start+3*day),null);
  fs.writeFileSync(path.join(root,'models/second.mdx'),'new model bytes');fs.writeFileSync(catalogue,JSON.stringify([{id:'knight',file:'knight.mdx'},{id:'second',file:'second.mdx'}]));
  const second=syncModelUpdates(root,start+3*day).models.second;assert.equal(second.publishedAt,new Date(start+3*day).toISOString());assert.equal(newTag(second.publishedAt,start+3*day).label,'New!');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('revised models keep their original dated Updated badges and expiry',()=>{
 const updatedAt=new Date(start).toISOString();
 assert.equal(modelUpdateTag(updatedAt,start).label,'Updated 10/10');
 for(let i=0;i<3;i++)assert.equal(modelUpdateTag(updatedAt,start+i*day).colour,['#83e69a','#63c37b','#48985f'][i]);
 assert.equal(modelUpdateTag(updatedAt,start+3*day),null);
 const element={dataset:{modelUpdated:'knight'},style:{},hidden:true};
 const root={querySelectorAll:()=>[element],ownerDocument:{addEventListener(){},removeEventListener(){}}};
 const dispose=mountModelUpdateTags(root,{knight:{updatedAt}},{now:()=>start,setTimer:()=>1,clearTimer(){}});
 assert.equal(element.hidden,false);assert.equal(element.textContent,'Updated 10/10');dispose();
});

test('New wins over Updated during first publication and later revisions still show Updated',()=>{
 let time=start;const element={dataset:{modelUpdated:'knight'},style:{},hidden:true};
 const root={querySelectorAll:()=>[element],ownerDocument:{addEventListener(){},removeEventListener(){}}};
 const record={publishedAt:new Date(start).toISOString(),updatedAt:new Date(start).toISOString()};
 let dispose=mountModelUpdateTags(root,{knight:record},{now:()=>time,setTimer:()=>1,clearTimer(){}});
 assert.equal(element.textContent,'New!');dispose();
 time=start+4*day;record.updatedAt=new Date(time).toISOString();
 dispose=mountModelUpdateTags(root,{knight:record},{now:()=>time,setTimer:()=>1,clearTimer(){}});
 assert.equal(element.textContent,'Updated 14/10');dispose();
});

test('the live catalogue has three Updated cards and two New cards without resetting timestamps',()=>{
 const records=JSON.parse(fs.readFileSync(new URL('../dist/model-updates.json',import.meta.url))).models;
 const elements=['von-carstein','von-carstein-dread-knight','khorne-flail','blood-dragon','nurgle-champion'].map(id=>({dataset:{modelUpdated:id},style:{},hidden:true}));
 const root={querySelectorAll:()=>elements,ownerDocument:{addEventListener(){},removeEventListener(){}}};
 const dispose=mountModelUpdateTags(root,records,{now:()=>Date.parse('2026-10-12T09:30:00Z'),setTimer:()=>1,clearTimer(){}});
 assert.deepEqual(elements.map(e=>[e.hidden,e.textContent]),[[false,'Updated 10/10'],[false,'Updated 10/10'],[false,'Updated 11/10'],[false,'New!'],[false,'New!']]);dispose();
});
