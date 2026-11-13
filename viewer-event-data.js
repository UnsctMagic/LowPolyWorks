import {activeEventInstances,sampleEventDecal} from './vendor/mdlxl/app/event-preview-data.js';
export const gamePathKey = name => String(name || '').replaceAll('/', '\\').toLowerCase();
export function eventResourceKey(name){const type=String(name).slice(0,3).toLowerCase();return (type==='fpt'?'spl':type)+':'+String(name).slice(4).toLowerCase();}
export const effectDefaults = Object.freeze({sounds:true,events:true,spawns:true,emitters:true});

// Keep MDLxL's authored event timing, including instances carried over a loop.
export function viewerEventInstances(model,definitions,sample){
 const span=model.Sequences[sample.sequenceIndex].Interval[1]-model.Sequences[sample.sequenceIndex].Interval[0];
 return activeEventInstances(model,definitions,{
  frame:sample.frame,sequenceIndex:sample.sequenceIndex,globalTime:sample.globalTime,
  playback:{...sample,...sample.animationRow,motionSeconds:span/1000,segment:sample.revision},maxInstances:64
 });
}
export function viewerDecalDefinition(definition){
 return {...definition,lifeSpanMs:Math.min(1500,definition.lifeSpanMs)};
}
export function viewerDecalSample(definition,ageMs){
 const sampled=sampleEventDecal(definition,ageMs);
 const fade=Math.min(1,Math.max(0,(definition.lifeSpanMs-ageMs)/500));
 return {...sampled,fade};
}
// Only the armed local cycle may make sound. Global-sequence sounds share this
// window, so a global key cannot make a looping preview chatter indefinitely.
export function crossedViewerSounds(model,sequence,from,to,cycle,looping){
 const [start,end]=model.Sequences[sequence].Interval,span=end-start,result=[];
 if(!(span>0)||to<from)return result;
 const windowStart=looping?cycle*span:0,windowEnd=windowStart+span;
 for(const event of model.EventObjects||[]){
  if(!/^SND/i.test(event.Name))continue;
  const globalId=event.GlobalSeqId??event.GlobalSequenceId;
  for(const frame of new Set(event.EventTrack||[])){
   if(Number.isInteger(globalId)&&globalId>=0){
    const period=model.GlobalSequences?.[globalId];
    if(!(period>0)||frame<0||frame>period)continue;
    const first=Math.max(0,Math.floor((Math.max(from,windowStart-1e-6)-frame)/period)+1);
    for(let n=first;n*period+frame<=Math.min(to,windowEnd);n++){
     const time=n*period+frame;
     if(time<windowEnd)result.push({event,time});
    }
   }else if(frame>=start&&frame<=end){
    const time=windowStart+frame-start;
    if(time>from&&time<=to)result.push({event,time});
   }
  }
 }
 return result.sort((a,b)=>a.time-b.time);
}
