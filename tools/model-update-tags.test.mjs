import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {modelUpdateTag,mountModelUpdateTags} from '../dist/model-update-tags.js';
import {syncModelUpdates} from './model-updates.mjs';
const day=86400000,start=Date.parse('2026-10-10T08:00:00Z');

test('each 24-hour boundary darkens the green and the exact 72-hour boundary hides the tag',()=>{
 const stamp=new Date(start).toISOString();
 const colours=[0,1,2].map(i=>modelUpdateTag(stamp,start+i*day));
 assert.deepEqual(colours.map(info=>info.label),Array(3).fill('Updated 10/10'));
 assert.deepEqual(colours.map(info=>info.colour),['#83e69a','#63c37b','#48985f']);
 assert.equal(modelUpdateTag(stamp,start+day-1).day,0);
 assert.equal(modelUpdateTag(stamp,start+3*day-1).day,2);
 assert.equal(modelUpdateTag(stamp,start+3*day),null);
 assert.equal(modelUpdateTag('invalid',start),null);
 assert.equal(modelUpdateTag(stamp,start-1),null);
 assert.equal(modelUpdateTag('2026-10-09T23:30:00Z',start).label,'Updated 10/10');
});

test('an open army card darkens, expires and disposes its timer without a page reload',()=>{
 let time=start,queued,removed=false;
 const element={dataset:{modelUpdated:'knight'},style:{},hidden:true};
 const root={querySelectorAll:()=>[element],ownerDocument:{addEventListener(){},removeEventListener(){removed=true;}}};
 const dispose=mountModelUpdateTags(root,{knight:{updatedAt:new Date(start).toISOString()}},{now:()=>time,setTimer:(callback,delay)=>{queued={callback,delay};return 1;},clearTimer:()=>{queued=null;}});
 assert.equal(element.hidden,false);assert.equal(queued.delay,day);
 for(let i=1;i<=3;i++){time=start+i*day;const callback=queued.callback;callback();assert.equal(element.hidden,i===3);if(i<3)assert.equal(element.dataset.day,String(i));}
 assert.equal(queued,null);dispose();assert(removed);
});

test('only a replacement of existing model bytes refreshes the stored timestamp',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'lpw-model-tags-'));
 try{
  fs.mkdirSync(path.join(root,'models'));
  const catalogue=path.join(root,'catalogue.json');
  fs.writeFileSync(catalogue,JSON.stringify([{id:'knight',file:'knight.mdx',name:'Knight'}]));
  const file=path.join(root,'models/knight.mdx');fs.writeFileSync(file,'original bytes');
  assert.equal(syncModelUpdates(root,start).models.knight.updatedAt,undefined);
  fs.writeFileSync(file,'revision 07 bytes');
  assert.equal(syncModelUpdates(root,start).models.knight.updatedAt,new Date(start).toISOString());
  fs.writeFileSync(catalogue,JSON.stringify([{id:'knight',file:'knight.mdx',name:'New name',changelog:[{text:'New note'}]}]));
  assert.equal(syncModelUpdates(root,start+day).models.knight.updatedAt,new Date(start).toISOString());
  fs.writeFileSync(file,'revision 08 bytes');
  assert.equal(syncModelUpdates(root,start+2*day).models.knight.updatedAt,new Date(start+2*day).toISOString());
  assert.equal(modelUpdateTag(syncModelUpdates(root,start+3*day).models.knight.updatedAt,start+3*day).day,1);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
