import test from 'node:test';import assert from 'node:assert/strict';
import {authorized,eventPath,summarize,validateEvent} from './lib/events.js';
const id='f5de7cba-f71f-4b51-9af4-5468d5877f11',now=new Date('2026-10-05T21:00:00Z');
test('statistics require the exact private token',()=>{
 assert.equal(authorized(undefined,'secret'),false);assert.equal(authorized('Bearer bad','secret'),false);assert.equal(authorized('Bearer secret',''),false);assert.equal(authorized('Bearer secret','secret'),true);
});
test('only known downloads and anonymous visit payloads are accepted',()=>{
 assert.equal(validateEvent({id,kind:'download',model:'not-a-model',format:'mdx'}),null);
 assert.equal(validateEvent({id:'bad',kind:'visit'}),null);
 assert.equal(validateEvent({id,kind:'download',model:'khorne-axe',format:'javascript'}),null);
 const valid=validateEvent({id,kind:'download',model:'tzeentch-sword',format:'mdx',ip:'discarded',name:'discarded'});
 assert.equal(valid.model,'tzeentch-sword');assert.equal('ip' in valid,false);assert.equal('name' in valid,false);
});
test('test events never enter the live report; MDX and pack counts remain separate',()=>{
 const visit={id,kind:'visit',model:'site',format:'none'},download={id,kind:'download',model:'tzeentch-sword',format:'mdx'};
 const blobs=[visit,download,{...download,format:'pack'},{...download,testing:true}].map(event=>({pathname:eventPath(event,now),uploadedAt:now}));
 const report=summarize(blobs);assert.deepEqual(report.totals,{pageLoads:1,downloadClicks:2});assert.equal(report.models[0].mdxClicks,1);assert.equal(report.models[0].packClicks,1);
 assert.equal(summarize(blobs,{from:'2026-10-06'}).totals.downloadClicks,0);
});
