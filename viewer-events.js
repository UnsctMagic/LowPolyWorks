import {Matrix4,Vector3,Quaternion} from 'three';
import {ModelRenderer} from './vendor/war3-model.mjs';
import {allNodes,sampleNodeMatrices} from './vendor/mdlxl/src/animation.js';
import {resetPreviewEffects} from './vendor/mdlxl/app/warcraft-preview-adapter.js';
import {billboardCameraCorrection} from './vendor/mdlxl/app/preview-pose.js';
import {installParticleNativeCompatibility} from './vendor/mdlxl/particle-native.mjs';
import {initializeWarcraftRenderer} from './website-preview-adapter.js';
import {installWarcraftTeamTextures} from './warcraft-team-textures.js?v=20261020-particle-alpha';
import {createGLProgram,preserveGLState,uploadTexture} from './viewer-event-gl.js';
import {gamePathKey,eventResourceKey,viewerEventInstances,viewerDecalDefinition,viewerDecalSample,crossedViewerSounds} from './viewer-event-data.js';
import {parseViewerSpawn} from './viewer-spawn-model.js';

// The decal geometry, UV orientation and blend modes follow MDLxL's
// event-preview-runtime. Modulate modes fade towards their neutral RGB.
function createDecals(gl){
 const program=createGLProgram(gl,`#version 300 es
uniform mat4 transform; uniform vec4 atlas; uniform float extent; out vec2 uv;
void main(){vec2 p[6]=vec2[6](vec2(-1.,-1.),vec2(1.,-1.),vec2(1.,1.),vec2(-1.,-1.),vec2(1.,1.),vec2(-1.,1.));vec2 v=p[gl_VertexID];uv=mix(atlas.xy,atlas.zw,vec2(1.-v.y,1.-v.x)*.5);gl_Position=transform*vec4(v*extent,0.,1.);}`,`#version 300 es
precision mediump float; in vec2 uv; uniform sampler2D image; uniform vec4 tint; uniform float fade; uniform int mode; out vec4 color;
void main(){color=texture(image,uv)*tint;if(mode==2)color.rgb=mix(vec3(1.),color.rgb,fade);else if(mode==3)color.rgb=mix(vec3(.5),color.rgb,fade);else color.a*=fade;if(color.a<.001)discard;}`);
 const uniforms=Object.fromEntries(['transform','atlas','extent','image','tint','fade','mode'].map(name=>[name,gl.getUniformLocation(program,name)]));
 const vao=gl.createVertexArray(),projection=new Matrix4();
 return {
  render(texture,item,world,camera){
   gl.useProgram(program);gl.bindVertexArray(vao);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(false);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);
   const mode=item.definition.blendMode;
   if(mode===1)gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
   else if(mode===2)gl.blendFunc(gl.ZERO,gl.SRC_COLOR);
   else if(mode===3)gl.blendFunc(gl.DST_COLOR,gl.SRC_COLOR);
   else gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
   gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-1,-1);
   const sampled=viewerDecalSample(item.definition,item.ageMs);
   projection.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(world);
   gl.uniformMatrix4fv(uniforms.transform,false,projection.elements);gl.uniform4fv(uniforms.atlas,sampled.uv);
   gl.uniform1f(uniforms.extent,item.definition.scale);gl.uniform1i(uniforms.image,0);gl.uniform4fv(uniforms.tint,sampled.color);
   gl.uniform1f(uniforms.fade,sampled.fade);gl.uniform1i(uniforms.mode,mode);gl.drawArrays(gl.TRIANGLES,0,6);
   gl.disable(gl.POLYGON_OFFSET_FILL);
  },
  dispose(){gl.deleteVertexArray(vao);gl.deleteProgram(program);}
 };
}
function destroySpawn(state,gl){
 if(state.native){
  // MDLxL's war3-model destroy guard: SD has no HD shader objects.
  const destroy=state.native.destroyShaderProgramObject;
  state.native.destroyShaderProgramObject=function(shader){if(shader)return destroy.call(this,shader);};
  state.native.destroy();
 }
 if(state.vao)gl.deleteVertexArray(state.vao);
}
export function createViewerEvents({gl,model,row,textureData,graphics,teamColor,getSettings,onWarning=console.warn,onChange}){
 let disposed=false,decals,audioContext,previous,colour=teamColor,soundFrom=-1e-6,soundCycle=0,soundSequence=0;
 const definitions=new Map(),resources=new Map(),instances=new Map(),audioBuffers=new Map(),sources=new Set(),warnings=new Set();
 const warn=message=>{if(!disposed&&!warnings.has(message)){warnings.add(message);onWarning(message);}};
 const stopSounds=()=>{for(const source of sources){source.onended=null;source.stop();source.disconnect();}sources.clear();};
 const release=state=>{
  state.released=true;
  // Team textures may still be loading when an effect is toggled off.
  if(state.pendingColour)void state.pendingColour.finally(()=>destroySpawn(state,gl));
  else destroySpawn(state,gl);
 };
 function updateColour(state,value){
  state.pendingColour=state.team.colour(state.native,value).then(()=>{if(!state.released){state.teamReady=true;onChange?.();}}).catch(error=>warn(error.message));
  const pending=state.pendingColour;
  void pending.then(()=>{if(state.pendingColour===pending)state.pendingColour=null;});
  return pending;
 }
 function clear(kind){
  for(const [key,state] of instances)if(!kind||(state.definition.type==='SPN'?'spawns':'events')===kind){release(state);instances.delete(key);}
 }
 function armSound(sequence,clock,looping){
  stopSounds();soundSequence=sequence;soundFrom=clock-1e-6;
  const interval=model.Sequences[sequence].Interval,span=interval[1]-interval[0];
  soundCycle=looping&&span>0?Math.floor(clock/span):0;
 }
 function unlockSound(){if(getSettings().sounds&&audioContext?.state==='suspended')void audioContext.resume().catch(error=>warn('Sound playback: '+error.message));}
 const ready=(async()=>{
  const events=model.EventObjects||[];if(!events.length)return;
  const response=await fetch('event-resources.json?v=20261113-viewer-events',{cache:'no-cache'});
  if(!response.ok)throw Error('Event resource index unavailable.');
  const manifest=await response.json();
  const files={...manifest.files,...row.eventFiles};
  const eventTextures={...row,textureFiles:{...files,...row.textureFiles}};
  const fetchBytes=async name=>{
   const url=files[gamePathKey(name)];if(!url)throw Error('Event resource unavailable: '+name);
   const response=await fetch(url);if(!response.ok)throw Error('Event resource unavailable: '+name);
   return response.arrayBuffer();
  };
  const definitionFor=name=>row.eventDefinitions?.[eventResourceKey(name)]||manifest.events[eventResourceKey(name)];
  async function loadSound(name,entry){
   if(audioBuffers.has(name))return;
   if(!entry?.files?.length){warn('Sound file unavailable: '+name);return;}
   audioContext ||= new AudioContext();
   const buffer=await audioContext.decodeAudioData(await fetchBytes(entry.files[0]));
   if(!disposed)audioBuffers.set(name,buffer);
  }
  for(const name of new Set(events.map(e=>e.Name))){
   if(disposed)return;
   const entry=definitionFor(name);
   if(!entry){if(/^(SND|FPT|SPL|UBR|SPN)/i.test(name))warn('Event resources have not been prepared: '+name);continue;}
   if(entry.empty)continue;
   if(entry.unavailable){warn('Event unavailable: '+name+' ('+(entry.reason||'native file missing')+')');continue;}
   try{
    if(entry.type==='SND'){
     await loadSound(name,entry);
     continue;
    }
    const key=gamePathKey(entry.resourcePath);
    if(!resources.has(key)){
     if(entry.type==='SPN'){
      const source=parseViewerSpawn(await fetchBytes(entry.resourcePath),entry.resourcePath);
      source.Nodes=[];for(const node of allNodes(source))source.Nodes[node.ObjectId]=node;
      if(source.ParticleEmitterPopcorns?.length)warn('Popcorn spawn effects are unsupported: '+entry.resourcePath);
      const images=new Map();
      for(const info of source.Textures||[])if(info.Image&&![1,2].includes(info.ReplaceableId))images.set(info.Image,await textureData(info.Image,eventTextures));
      if(disposed)return;
      const sounds=new Set((source.EventObjects||[]).filter(event=>/^SND/i.test(event.Name)).map(event=>event.Name));
      for(const sound of sounds){
       try{await loadSound(sound,definitionFor(sound));}
       catch(error){warn('Event '+sound+': '+error.message);}
      }
      if(disposed)return;
      resources.set(key,{source,images,hasSounds:sounds.size>0,lifeSpanMs:Math.max(1,source.Sequences[0].Interval[1]-source.Sequences[0].Interval[0])});
     }else{
      const image=await textureData(entry.resourcePath,eventTextures);
      if(disposed)return;
      const restore=preserveGLState(gl);
      try{const texture=gl.createTexture();uploadTexture(gl,texture,image);resources.set(key,{texture});}finally{restore();}
     }
    }
    const resource=resources.get(key);
    definitions.set(name,entry.type==='SPN'?{...entry,lifeSpanMs:resource.lifeSpanMs}:viewerDecalDefinition(entry));
   }catch(error){warn('Event '+name+': '+error.message);}
  }
 })().catch(error=>warn(error.message));
 function playSound(name){
  const buffer=audioBuffers.get(name);if(!buffer)return;
  const source=audioContext.createBufferSource();source.buffer=buffer;source.connect(audioContext.destination);
  source.onended=()=>{sources.delete(source);source.disconnect();};sources.add(source);source.start();
 }
 function worldAtTrigger(item,sample){
  const interval=model.Sequences[sample.sequenceIndex].Interval,span=interval[1]-interval[0];
  const global=(item.event.GlobalSeqId??item.event.GlobalSequenceId??-1)>=0;
  const trigger=global&&span>0?interval[0]+((sample.frame-interval[0]-item.ageMs)%span+span)%span:item.triggerFrame;
  const matrices=sampleNodeMatrices(model,trigger,sample.sequenceIndex,sample.globalTime-item.ageMs);
  const world=matrices.get(item.event.ObjectId)?.clone()||new Matrix4();
  const pivot=new Vector3().fromArray(item.event.PivotPoint||model.PivotPoints?.[item.event.ObjectId]||[0,0,0]).applyMatrix4(world);
  world.setPosition(pivot);
  if(item.definition.type!=='SPN'){
   const rotation=new Quaternion(),scale=new Vector3();world.decompose(new Vector3(),rotation,scale);world.compose(pivot,rotation,new Vector3(1,1,1));
  }
  return world;
 }
 function makeSpawn(state,resource){
  state.vao=gl.createVertexArray();gl.bindVertexArray(state.vao);
  const source=structuredClone(resource.source);
  const team=installWarcraftTeamTextures(gl,source,{transparent:false,graphics});
  state.native=new ModelRenderer(source);installParticleNativeCompatibility(state.native);initializeWarcraftRenderer(state.native,gl);team.ready(state.native);
  // Match MDLxL's simulated ribbon clock while paused or stepping particles.
  const controller=state.native.ribbonsController,update=controller?.update;
  if(controller){let last=Date.now();controller.update=function(delta){const now=Date.now(),shift=now-last-delta;last=now;for(const emitter of this.emitters||[])for(let i=0;i<emitter.creationTimes.length;i++)emitter.creationTimes[i]+=shift;return update.call(this,delta);};}
  for(const [name,image]of resource.images)state.native.setTextureImageData(name,[image]);
  state.team=team;state.teamReady=false;
  updateColour(state,colour);
  state.native.setSequence(0);resetPreviewEffects(state.native);state.native.setFrame(source.Sequences[0].Interval[0]);state.simulatedAge=0;
 }
 return {
  ready,armSound,unlockSound,stopSounds,clear,
  get active(){return instances.size>0;},
  async colour(value){
   colour=value;
   await Promise.all([...instances.values()].filter(s=>s.team).map(s=>updateColour(s,value)));
  },
  render(sample,delta,camera,playing,looping,speed=1){
   if(disposed)return;
   const settings=getSettings(),restart=!previous||previous.revision!==sample.revision;
   if(restart){clear();armSound(sample.sequenceIndex,sample.globalTime,looping);}
   const elapsed=restart?0:Math.max(0,sample.globalTime-previous.globalTime);
   for(const [key,state]of instances){
    state.ageMs+=delta*(state.definition.type==='SPN'?speed:1);state.travelMs+=delta*speed;
    if(state.ageMs>=state.definition.lifeSpanMs||!settings[state.definition.type==='SPN'?'spawns':'events']){release(state);instances.delete(key);}
   }
   // MDLxL supplies authored keys and trigger poses. Age existing instances in
   // real playback time so slow motion never extends a decal past 1.5 seconds.
   if(restart||elapsed>0)for(const item of viewerEventInstances(model,definitions,sample)){
    if(item.ageMs>elapsed+1e-5||instances.has(item.key)||!settings[item.definition.type==='SPN'?'spawns':'events'])continue;
    const ageMs=item.definition.type==='SPN'?item.ageMs:(speed>0?item.ageMs/speed:0);
    if(ageMs>=item.definition.lifeSpanMs)continue;
    instances.set(item.key,{...item,ageMs,travelMs:item.ageMs,triggerTime:sample.globalTime-item.ageMs,world:worldAtTrigger(item,sample)});
   }
   if(delta>0&&settings.sounds&&playing&&sample.sequenceIndex===soundSequence&&audioContext?.state==='running'){
    for(const {event}of crossedViewerSounds(model,sample.sequenceIndex,soundFrom,sample.globalTime,soundCycle,looping))playSound(event.Name);
    const [start,end]=model.Sequences[sample.sequenceIndex].Interval,span=end-start;
    const cycleStart=soundCycle*span;
    for(const state of instances.values()){
     if(state.definition.type!=='SPN'||state.triggerTime<cycleStart||state.triggerTime>=cycleStart+span)continue;
     const resource=resources.get(gamePathKey(state.definition.resourcePath));
     if(!resource.hasSounds)continue;
     for(const {event}of crossedViewerSounds(resource.source,0,soundFrom-state.triggerTime,sample.globalTime-state.triggerTime,0,false))playSound(event.Name);
    }
   }
   if(delta>0)soundFrom=sample.globalTime;previous=sample;
   if(!instances.size)return;
   const restore=preserveGLState(gl);
   try{
    for(const [key,state]of instances){
     const resource=resources.get(gamePathKey(state.definition.resourcePath));if(!resource)continue;
     if(resource.texture){
      const world=state.world.clone();
      if(/^FPT/i.test(state.event.Name)){
       const moveSpeed=Number(model.Sequences[sample.sequenceIndex].MoveSpeed);
       if(Number.isFinite(moveSpeed)&&moveSpeed>0)world.elements[12]-=moveSpeed*state.travelMs/1000;
      }
      decals ||= createDecals(gl);decals.render(resource.texture,state,world,camera);
     }else{
      if(!state.native)try{makeSpawn(state,resource);}catch(error){warn('Spawn renderer: '+error.message);release(state);instances.delete(key);continue;}
      const native=state.native,start=resource.source.Sequences[0].Interval[0];
      let remaining=state.ageMs-state.simulatedAge;
      while(remaining>1e-6){const step=Math.min(20,remaining);native.update(step);remaining-=step;}
      native.setFrame(start+state.ageMs);native.update(0);state.simulatedAge=state.ageMs;
      if(!state.teamReady)continue;
      const inverse=state.world.clone().invert(),position=camera.position.clone().applyMatrix4(inverse);
      const rotation=new Quaternion().setFromRotationMatrix(inverse).multiply(camera.quaternion).multiply(billboardCameraCorrection);
      native.setCamera(position.toArray(),rotation.toArray());
      const matrix=new Matrix4().multiplyMatrices(camera.matrixWorldInverse,state.world);
      gl.bindVertexArray(state.vao);gl.depthFunc(gl.LEQUAL);native.render(matrix.elements,camera.projectionMatrix.elements,{wireframe:false,useEnvironmentMap:false});
     }
    }
   }finally{restore();}
  },
  dispose(){
   disposed=true;clear();stopSounds();decals?.dispose();
   for(const resource of resources.values())if(resource.texture)gl.deleteTexture(resource.texture);
   resources.clear();audioBuffers.clear();
   if(audioContext)void audioContext.close().catch(error=>console.warn('Sound cleanup:',error));
  }
 };
}
