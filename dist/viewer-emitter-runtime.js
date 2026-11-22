// EMTR simulation from MDLxL 19481b447bf06b3990adfc021dd8e2d77eec0b04, app/particle-preview-adapter.js.
// The simulation, native compatibility and snapshot-copy bodies are unchanged.
// Only imports/exports are adapted; editor UI, picking and recipe editing are omitted.
import { Matrix4, Vector3 } from 'three';
import { ModelRenderer } from './vendor/war3-model.mjs';
import { sampleTrack } from './vendor/mdlxl/src/animation.js';

const compatibleParticleRuntimes=new WeakSet();
/** Source audit: pinned 4.0.1 ignores ModelSpace and UV repeat, and divides atlas rows by Rows.
 * Model-space local integration and exclusive-end interval semantics are cross-checked
 * against mdx-m3-viewer/particle2.ts and shaders/particles.vert.ts. Game validation is separate.
 */
export function particleAtlasFrame(range,progress,columns,rows){
 const [first=0,end=0,repeat=1]=range||[],count=end-first;
 const offset=count>0?((Math.floor(count*repeat*(Number.isFinite(progress)?progress:0))%count)+count)%count:0;
 return Math.min(Math.max(0,columns*rows-1),first+offset);
}
/** Sequence ground speed is model units per second, along Warcraft's +X front. */
export function particleTravelDistance(model,sequenceIndex,elapsed){
 const speed=Number(model.Sequences?.[sequenceIndex]?.MoveSpeed);
 return Number.isFinite(speed)&&speed>0&&Number.isFinite(elapsed)&&elapsed>0?speed*elapsed/1000:0;
}
export function installParticleNativeCompatibility(native,{getTravelDistance=delta=>particleTravelDistance(native.model,native.getSequence(),delta)}={}){
 if(compatibleParticleRuntimes.has(native))return;compatibleParticleRuntimes.add(native);
 const ribbons=native.ribbonsController;
 const update=ribbons.updateEmitter;
  ribbons.updateEmitter=function(emitter,delta){
   update.call(this,emitter,delta);
   if(!emitter.props.Gravity||delta<=0)return;
   const now=Date.now();
   for(let i=0;i<emitter.creationTimes.length;i++){
    const age=Math.max(0,(now-emitter.creationTimes[i])/1000),previous=Math.max(0,age-delta/1000);
    const drop=.5*emitter.props.Gravity*(age*age-previous*previous);
    emitter.vertices[i*6+2]-=drop;emitter.vertices[i*6+5]-=drop;
   }
  };
 const particles=native.particlesController,create=particles.createParticle,buffers=particles.updateParticleBuffers,updateParticle=particles.updateParticle;
 // Keep the unit centered while emitted world-space particles retain their
 // position behind it. Model-space particles still follow their emitter.
 particles.updateParticle=function(particle,delta){
   const result=updateParticle.call(this,particle,delta);
   if(particle.lifeSpan>0&&!(particle.emitter.props.Flags&524288))particle.pos[0]-=getTravelDistance(delta);
   return result;
 };
 const identity=new Matrix4().elements,point=new Vector3(),velocity=new Vector3(),origin=new Vector3(),matrix=new Matrix4(),positionValues=new Float32Array(3),velocityValues=new Float32Array(3);
 particles.createParticle=function(emitter,transform){return create.call(this,emitter,emitter.props.Flags&524288?identity:transform);};
 particles.updateParticleBuffers=function(particle,index,emitter){
   if(!(emitter.props.Flags&524288))return buffers.call(this,particle,index,emitter);
   const position=particle.pos,speed=particle.speed;matrix.fromArray(native.rendererData.nodes[emitter.props.ObjectId].matrix);
   point.fromArray(position).applyMatrix4(matrix);origin.set(0,0,0).applyMatrix4(matrix);velocity.fromArray(speed).applyMatrix4(matrix).sub(origin);
   positionValues.set(point.toArray());velocityValues.set(velocity.toArray());particle.pos=positionValues;particle.speed=velocityValues;
   try{return buffers.call(this,particle,index,emitter);}finally{particle.pos=position;particle.speed=speed;}
 };
 particles.updateParticleTexCoordsByType=function(index,emitter,early,progress,type){
   const props=emitter.props,columns=props.Columns,rows=props.Rows,range=type===2?(early?props.TailUVAnim:props.TailDecayUVAnim):(early?props.LifeSpanUVAnim:props.DecayUVAnim);
   const target=type===2?emitter.tailTexCoords:emitter.headTexCoords;if(!target||!(columns>0&&rows>0))return;
   const cell=particleAtlasFrame(range,progress,columns,rows),x=cell%columns,y=Math.floor(cell/columns);
   target.set([x/columns,y/rows,x/columns,(y+1)/rows,(x+1)/columns,y/rows,(x+1)/columns,(y+1)/rows],index*8);
 };
 // Native PE2 ReplaceableId overrides its texture reference, and is independent of other emitters sharing that picture.
 const layer=particles.setLayerProps;
 particles.setLayerProps=function(emitter){
  const id=emitter.props.TextureID,replacement=emitter.props.ReplaceableId,original=this.rendererData.model.Textures[id];
  if(replacement===1||replacement===2)this.rendererData.model.Textures[id]={Image:'',ReplaceableId:replacement,Flags:original?.Flags||0};
  try{return layer.call(this,emitter);}finally{if(replacement===1||replacement===2)this.rendererData.model.Textures[id]=original;}
 };
 const uv=ribbons.updateEmitterTexCoords,resizeRibbon=ribbons.resizeEmitterBuffers,renderRibbons=ribbons.render;
 // KRVS defaults to one when absent or when this clip has no keys:
 // mdx-m3-viewer sd.ts defVals.KRVS / SdSequence. Pinned 4.0.1 passes 0.
 // Evaluate that runtime default without changing authored visibility data.
 const updateRibbon=ribbons.updateEmitter;
 ribbons.updateEmitter=function(emitter,delta){
  const props=emitter.props,value=props.Visibility;if(typeof value==='number')return updateRibbon.call(this,emitter,delta);
  const owned=Object.hasOwn(props,'Visibility'),globalTime=native.rendererData.globalSequencesFrames[value?.GlobalSeqId]??native.getFrame();
  const sampled=sampleTrack(value,native.getFrame(),{interval:native.model.Sequences[native.getSequence()]?.Interval,globalSequences:native.model.GlobalSequences,globalTime,fallback:1});
  props.Visibility=Number(sampled?.[0]??sampled);
  try{return updateRibbon.call(this,emitter,delta);}finally{if(owned)props.Visibility=value;else delete props.Visibility;}
 };
 // Upstream caps ribbon allocation at its initial rate/lifetime estimate. Authoring can exceed it.
 ribbons.resizeEmitterBuffers=function(emitter,size){emitter.baseCapacity=Math.max(emitter.baseCapacity,size);return resizeRibbon.call(this,emitter,size);};
 ribbons.render=function(...args){
  const saved=[];for(const emitter of this.emitters)if(emitter.props.Color?.Keys){const track=emitter.props.Color;saved.push([emitter.props,track]);emitter.props.Color=sampleTrack(track,native.getFrame(),{interval:native.model.Sequences[native.getSequence()]?.Interval,globalSequences:native.model.GlobalSequences,globalTime:native.rendererData.globalSequencesFrames[track.GlobalSeqId]??native.getFrame(),fallback:[1,1,1]});}
  try{return renderRibbons.apply(this,args);}finally{for(const [props,color]of saved)props.Color=color;}
 };
 ribbons.updateEmitterTexCoords=function(emitter,now){
   uv.call(this,emitter,now);const rows=emitter.props.Rows,columns=emitter.props.Columns;if(!(rows>0&&columns>0))return;
   const cell=this.interp.animVectorVal(emitter.props.TextureSlot,0),y=Math.floor(cell/columns)/rows;
   for(let i=0;i<emitter.creationTimes.length;i++){emitter.texCoords[i*4+1]=y;emitter.texCoords[i*4+3]=y+1/rows;}
 };
}

export function seededParticleRandom(seed=0x4d444c58) {
  let state=seed>>>0;
  return {next(){state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;},get state(){return state;},set state(value){state=value>>>0;}};
}
/** Scope deterministic randomness to synchronous native simulation, never application UI. */
export function withParticleRandom(random,operation) {
  const prior=Math.random;Math.random=()=>random.next();
  try{return operation();}finally{Math.random=prior;}
}
/** Pinned native CPU simulation. It uses the same controller as the GL preview. */
export function particleTimelineAt(timeline,time) {
  let segment=timeline[0];
  for(const next of timeline){if(next.at>time+1e-8)break;segment=next;}
  const elapsed=Math.max(0,time-segment.at);
  const rawFrame=segment.frame+elapsed*segment.poseRate,span=segment.loop?segment.loop[1]-segment.loop[0]:0,cycles=span>0?Math.floor((rawFrame-segment.loop[0]+1e-8)/span):0;
  return {frame:span>0?segment.loop[0]+phaseOf(rawFrame-segment.loop[0],span):rawFrame,global:segment.global+elapsed*segment.poseRate,fx:segment.fx+elapsed*segment.fxRate,poseRate:segment.poseRate,fxRate:segment.fxRate,cycle:(segment.cycle||0)+cycles,loop:segment.loop};
}
function simulationTracks(model) {
  const result=[],seen=new Set();
  const walk=value=>{
    if(!value||typeof value!=='object'||ArrayBuffer.isView(value)||seen.has(value))return;seen.add(value);
    if(value.Keys)result.push(value);
    for(const child of Object.values(value))walk(child);
  };
  for(const family of ['ParticleEmitters2','RibbonEmitters','Helpers','Bones'])for(const node of model[family]||[])walk(node);
  return result;
}
const phaseOf=(time,period)=>((time%period)+period)%period;
function nativeEffectState(native) {
  return {
    particles:(native.particlesController?.emitters||[]).map(e=>({id:e.props.ObjectId,emission:e.emission,squirtFrame:e.squirtFrame,particles:e.particles.map(p=>{const {emitter,...data}=p;return structuredClone(data);})})),
    ribbons:(native.ribbonsController?.emitters||[]).map(e=>({id:e.props.ObjectId,emission:e.emission,creationTimes:e.creationTimes.slice(),vertices:e.vertices?.slice(0,e.creationTimes.length*6)})),
  };
}
function restoreNativeEffectState(native,state) {
  for(const item of state.particles){
    const e=native.particlesController.emitters.find(e=>e.props.ObjectId===item.id);if(!e)continue;
    e.emission=item.emission;e.squirtFrame=item.squirtFrame;e.particles=item.particles.map(p=>({...structuredClone(p),emitter:e}));
    native.particlesController.resizeEmitterBuffers(e,e.particles.length);
  }
  for(const item of state.ribbons){
    const e=native.ribbonsController.emitters.find(e=>e.props.ObjectId===item.id);if(!e)continue;
    native.ribbonsController.resizeEmitterBuffers(e,Math.max(1,item.creationTimes.length));
    e.emission=item.emission;e.creationTimes=item.creationTimes.slice();if(item.vertices)e.vertices.set(item.vertices);
  }
}
export class ParticlePreviewBudgetError extends Error {constructor(limit){super('Preview paused at the '+limit.toLocaleString('en-US')+' live-particle budget. Authored values are unchanged.');this.name='ParticlePreviewBudgetError';this.limit=limit;}}
export class NativeParticleSimulation {
  constructor(model,sequence=0,{seed=0x4d444c58,timeline,maxLive=12000}={}) {
    this.maxLive=maxLive;this.native=new ModelRenderer(structuredClone(model));this.poseToFxRate=1;
    installParticleNativeCompatibility(this.native,{getTravelDistance:delta=>particleTravelDistance(this.native.model,this.sequence,delta*this.poseToFxRate)});this.sequence=sequence;this.native.setSequence(sequence);
    const start=model.Sequences[sequence].Interval[0];
    this.timeline=structuredClone(timeline||[{at:0,frame:start,global:start,fx:0,poseRate:1,fxRate:1}]);
    this.time=0;this.random=seededParticleRandom(seed);this.seed=seed;this.tracks=simulationTracks(this.native.model);this.burstStamps=new Map();this.checkpoints=[];
    for(const controller of [this.native.particlesController,this.native.ribbonsController])for(const emitter of controller.emitters)emitter.baseCapacity=Math.min(emitter.baseCapacity,256);
    this.step(0,0,true);
  }
  setCamera(position,quaternion){this.native.setCamera(position,quaternion);}
  nextEvent(target) {
    let next=Math.min(target,(Math.floor((this.time+1e-7)/10)+1)*10);
    const current=particleTimelineAt(this.timeline,this.time),model=this.native.model;
    for(const segment of this.timeline)if(segment.at>this.time+1e-7)next=Math.min(next,segment.at);
    if(current.poseRate>0&&current.loop)next=Math.min(next,this.time+(current.loop[1]-current.frame)/current.poseRate);
    if(current.poseRate>0)for(const track of this.tracks) {
      const period=model.GlobalSequences?.[track.GlobalSeqId];
      if(period>0) {
        const phase=phaseOf(current.global,period),wrap=(period-phase)/current.poseRate;
        if(wrap>1e-7)next=Math.min(next,this.time+wrap);
        for(const key of track.Keys){let distance=key.Frame-phase;if(distance<=1e-7)distance+=period;if(distance>1e-7)next=Math.min(next,this.time+distance/current.poseRate);}
      }else for(const key of track.Keys){
        if(current.loop&&(key.Frame<current.loop[0]||key.Frame>current.loop[1]))continue;
        let delta=key.Frame-current.frame;if(current.loop&&delta<=1e-7)delta+=current.loop[1]-current.loop[0];
        const distance=delta/current.poseRate;
        if(distance>1e-7)next=Math.min(next,this.time+distance);
      }
    }
    return next;
  }
  step(from,to,events=true,{poseOnly=false}={}) {
    const native=this.native,model=native.model,old=particleTimelineAt(this.timeline,from),current=particleTimelineAt(this.timeline,to);
    const delta=poseOnly?0:Math.max(0,current.fx-old.fx),epsilon=to>from?Math.min(1e-4,(to-from)/2):0;
    const sample=particleTimelineAt(this.timeline,to-epsilon),saved=[];
    // EMTR can run animation and FX at separate speeds; travel follows the pose.
    this.poseToFxRate=sample.fxRate>0?sample.poseRate/sample.fxRate:0;
    const prepare=(frame,global,step)=>{
      native.rendererData.animation=this.sequence;native.rendererData.animationInfo=model.Sequences[this.sequence];
      native.rendererData.frame=frame-step;
      for(let i=0;i<model.GlobalSequences.length;i++)if(model.GlobalSequences[i]>0)native.rendererData.globalSequencesFrames[i]=phaseOf(global,model.GlobalSequences[i])-step;
    };
    const at=(value,fallback,phase)=>sampleTrack(value,phase.frame,{interval:model.Sequences[this.sequence].Interval,globalSequences:model.GlobalSequences,globalTime:phase.global,fallback});
    const run=(step,phase,allowBirths,exactEvents,sampling=phase)=>{
      prepare(phase.frame,phase.global,step);
      for(const [controller,ribbon]of [[native.particlesController,false],[native.ribbonsController,true]])for(const emitter of controller?.emitters||[]){
        const props=emitter.props,visibility=props.Visibility,rate=props.EmissionRate;
        saved.push([props,visibility,rate]);
        const sampledVisibility=at(visibility,1,sampling);
        props.Visibility=allowBirths?Number(sampledVisibility?.[0]??sampledVisibility):0;
        if(!ribbon&&props.Squirt&&rate?.Keys){
          // Native's "left key changed" heuristic can fire a future first key.
          // Visit actual authored events exactly, including repeated global phases.
          const period=model.GlobalSequences[rate.GlobalSeqId],value=period>0?phaseOf(phase.global,period):phase.frame;
          props.EmissionRate=0;
          if(exactEvents)for(const key of rate.Keys)if(Math.abs(key.Frame-value)<1e-5||(period>0&&phase.global>0&&Math.abs(value)<1e-5&&Math.abs(key.Frame-period)<1e-5)){
            const stamp=period>0?Math.floor((phase.global+1e-6)/period)-(key.Frame===period?1:0):this.sequence+':'+(phase.cycle||0);
            const identity=props.ObjectId+':'+key.Frame;
            if(this.burstStamps.get(identity)!==stamp){
              this.burstStamps.set(identity,stamp);
              if(allowBirths&&props.Visibility>0&&key.Vector[0]>0)emitter.emission+=key.Vector[0]*1000;
            }
          }
        }else if(!ribbon&&rate?.Keys){const value=at(rate,0,sampling);props.EmissionRate=Number(value?.[0]??value);}
      }
      const priorNow=Date.now;Date.now=()=>current.fx;
      try{
        let projected=0;
        for(const e of native.particlesController.emitters)projected+=e.particles.length+(e.props.Visibility>0?Math.max(0,Math.floor((e.emission+Number(e.props.EmissionRate||0)*step)/1000)):0);
        for(const e of native.ribbonsController.emitters)projected+=e.creationTimes.length+(e.props.Visibility>0?1:0);
        if(!Number.isFinite(projected)||projected>this.maxLive)throw new ParticlePreviewBudgetError(this.maxLive);
        withParticleRandom(this.random,()=>native.update(step));
      }
      finally{Date.now=priorNow;for(const [props,visibility,rate]of saved.splice(0)){props.Visibility=visibility;props.EmissionRate=rate;}}
    };
    // Integrate the interval using its left-hand visibility/rate at an event,
    // then fire exact event keys without aging their newly born particles.
    const wrapped=current.loop&&current.cycle>sample.cycle,priorEnd=wrapped?{...current,frame:current.loop[1],cycle:current.cycle-1}:current;
    if(to>from&&!poseOnly)run(delta,priorEnd,current.fxRate>0,false,sample);
    if(wrapped&&!poseOnly)run(0,priorEnd,current.fxRate>0,events);
    run(0,current,!poseOnly&&current.fxRate>0,events&&!poseOnly);
    this.time=to;
  }
  advance(target,{budgetMs=Infinity,now=()=>performance.now()}={}) {
    if(target<this.time-1e-7)throw Error('Backward particle time requires restoring a checkpoint.');
    const began=now();
    if(this.partialBase&&target>this.time+1e-7){const base=this.partialBase;this.partialBase=null;this.restore(base);}
    while(this.time<target-1e-7){
      const boundary=this.nextEvent(Infinity),next=Math.min(target,boundary);
      if(next<boundary-1e-7)this.partialBase=this.snapshot();
      this.step(this.time,next,true);
      if(this.time-this.lastCheckpoint>=500||this.lastCheckpoint===undefined){
        this.lastCheckpoint=this.time;this.checkpoints.push(this.snapshot());if(this.checkpoints.length>12)this.checkpoints.shift();
      }
      if(now()-began>=budgetMs)return {complete:this.time>=target-1e-7,time:this.time};
    }
    return {complete:true,time:this.time};
  }
  snapshot(){return {time:this.time,random:this.random.state,burstStamps:[...this.burstStamps],phase:particleTimelineAt(this.timeline,this.time),...nativeEffectState(this.native)};}
  restore(snapshot){
    this.partialBase=null;
    restoreNativeEffectState(this.native,snapshot);this.random.state=snapshot.random;this.burstStamps=new Map(snapshot.burstStamps);this.time=snapshot.time;
    this.step(this.time,this.time,false,{poseOnly:true});
  }
  refresh(){this.step(this.time,this.time,false,{poseOnly:true});}
}

export function copyParticleSimulationToPreview(simulation,native,phase,hiddenIds) {
  const source=simulation.native,particles=native.particlesController,ribbons=native.ribbonsController;
  // Evaluate model pose/materials at the displayed time without triggering FX twice.
  const savedParticleUpdate=particles.update,savedRibbonUpdate=ribbons.update;
  particles.update=()=>{};ribbons.update=()=>{};
  native.rendererData.animation=simulation.sequence;native.rendererData.animationInfo=native.model.Sequences[simulation.sequence];native.rendererData.frame=phase.frame;
  for(let i=0;i<native.model.GlobalSequences.length;i++)if(native.model.GlobalSequences[i]>0)native.rendererData.globalSequencesFrames[i]=phaseOf(phase.global,native.model.GlobalSequences[i]);
  try{native.update(0);}finally{particles.update=savedParticleUpdate;ribbons.update=savedRibbonUpdate;}
  for(const from of source.particlesController.emitters){
    if(hiddenIds?.has(from.props.ObjectId))continue;
    const to=particles.emitters.find(e=>e.props.ObjectId===from.props.ObjectId);if(!to)continue;
    // Reserve modest buffers; actual particle count and exported data are never capped here.
    to.baseCapacity=Math.min(to.baseCapacity,256);
    if(to.type!==from.type){
      to.type=from.type;to.capacity=0;
      if(particles.gl)for(const [flag,names]of [[1,['headVertexBuffer','headTexCoordBuffer']],[2,['tailVertexBuffer','tailTexCoordBuffer']]])
        if(to.type&flag)for(const name of names)to[name]||=particles.gl.createBuffer();
    }
    particles.resizeEmitterBuffers(to,Math.max(1,from.particles.length));
    to.emission=from.emission;to.squirtFrame=from.squirtFrame;
    to.particles=from.particles.map(p=>({...p,emitter:to,pos:p.pos.slice(),speed:p.speed.slice()}));
    for(const [field,stride]of [['headVertices',12],['tailVertices',12],['headTexCoords',8],['tailTexCoords',8],['colors',16]])
      if(from[field]&&to[field])to[field].set(from[field].subarray(0,from.particles.length*stride));
  }
  for(const from of source.ribbonsController.emitters){
    if(hiddenIds?.has(from.props.ObjectId))continue;
    const to=ribbons.emitters.find(e=>e.props.ObjectId===from.props.ObjectId);if(!to)continue;
    to.baseCapacity=Math.min(to.baseCapacity,256);ribbons.resizeEmitterBuffers(to,Math.max(1,from.creationTimes.length));
    to.emission=from.emission;to.creationTimes=from.creationTimes.slice();
    if(from.vertices)to.vertices.set(from.vertices.subarray(0,from.creationTimes.length*6));
    if(from.texCoords)to.texCoords.set(from.texCoords.subarray(0,from.creationTimes.length*4));
  }
}
