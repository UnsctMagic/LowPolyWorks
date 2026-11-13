import test from 'node:test';
import assert from 'node:assert/strict';
import {crossedViewerSounds,viewerDecalDefinition,viewerDecalSample,viewerEventInstances,effectDefaults,eventResourceKey} from '../dist/viewer-event-data.js';
import {viewerPlaybackSample} from '../dist/viewer-effects.js';

// Keep timing tests independent of browser autoplay and resource-loading latency.
const model={Sequences:[{Name:'Walk',Interval:[100,1100],MoveSpeed:150}],GlobalSequences:[250],EventObjects:[
 {Name:'SNDxTEST',ObjectId:0,EventTrack:[100,500,1100]},
 {Name:'SNDxGLOB',ObjectId:1,GlobalSeqId:0,EventTrack:[0,125]},
 {Name:'FPTxLEFT',ObjectId:2,EventTrack:[100,900]}
]};
test('all four controls default on',()=>assert.deepEqual(effectDefaults,{sounds:true,events:true,spawns:true,emitters:true}));
test('local sounds include start and end keys once, then automatic loops stay silent',()=>{
 const local=(from,to,cycle=0)=>crossedViewerSounds(model,0,from,to,cycle,true).filter(x=>x.event.ObjectId===0).map(x=>x.time);
 assert.deepEqual(local(-1e-6,1000),[0,400,1000]);
 assert.deepEqual(local(1000,2000),[]);
 assert.deepEqual(local(2000,3000),[]);
 assert.deepEqual(local(400,400),[]);
});
test('Play arms the resumed cycle without replaying earlier keys',()=>{
 const fired=crossedViewerSounds(model,0,1199.999,2000,1,true).filter(x=>x.event.ObjectId===0);
 assert.deepEqual(fired.map(x=>x.time),[1400,2000]);
 assert.deepEqual(crossedViewerSounds(model,0,2000,3000,1,true),[]);
});
test('global sounds cannot escape the first animation-loop window',()=>{
 const first=crossedViewerSounds(model,0,-1e-6,1000,0,true).filter(x=>x.event.ObjectId===1);
 assert.deepEqual(first.map(x=>x.time),[0,125,250,375,500,625,750,875]);
 assert.deepEqual(crossedViewerSounds(model,0,1000,4000,0,true),[]);
});
test('non-loop playback never retriggers after the sequence end',()=>{
 const first=crossedViewerSounds(model,0,-1e-6,1000,0,false).filter(x=>x.event.ObjectId===0);
 assert.equal(first.length,3);
 assert.deepEqual(crossedViewerSounds(model,0,1000,5000,0,false),[]);
});
test('long decals cap at 1500ms and fade only in their final 500ms',()=>{
 const definition=viewerDecalDefinition({type:'SPL',lifeSpanMs:10000,intervalTimesMs:[9000,1000]});
 assert.equal(definition.lifeSpanMs,1500);
 assert.equal(viewerDecalSample(definition,999).fade,1);
 assert.equal(viewerDecalSample(definition,1000).fade,1);
 assert.equal(viewerDecalSample(definition,1250).fade,.5);
 assert.equal(viewerDecalSample(definition,1500).fade,0);
 const short=viewerDecalDefinition({...definition,lifeSpanMs:600});
 assert.equal(short.lifeSpanMs,600);
 assert.equal(viewerDecalSample(short,350).fade,.5);
});
test('footprint instances retain their key across loops and reset on replay',()=>{
 const definitions=new Map([['FPTxLEFT',{type:'SPL',lifeSpanMs:1500}]]);
 const sample=time=>viewerPlaybackSample(model,0,time,4,true);
 const before=viewerEventInstances(model,definitions,sample(999));
 const after=viewerEventInstances(model,definitions,sample(1001));
 const old=before.find(x=>x.triggerFrame===900);
 assert(after.some(x=>x.key===old.key&&x.ageMs===201));
 assert.equal(new Set(after.map(x=>x.key)).size,after.length);
 const replay=viewerEventInstances(model,definitions,viewerPlaybackSample(model,0,0,5,true));
 assert(replay.every(x=>!after.some(y=>y.key===x.key)));
});

test('event IDs ignore instance markers and share the footprint/splat table',()=>{
 assert.equal(eventResourceKey('SNDaABCD'),eventResourceKey('SNDzabcd'));
 assert.equal(eventResourceKey('FPTxHFS0'),eventResourceKey('SPLbHFS0'));
 assert.notEqual(eventResourceKey('SPNxUDIS'),eventResourceKey('SNDxUDIS'));
});
