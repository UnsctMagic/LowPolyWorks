import * as THREE from 'three';
import {bindVertexCamera} from './website-camera-controls.js?v=20261018-mobile-touch';
import {setEditorCameraAngles} from './vendor/mdlxl/app/editor-camera-controls.js';
import {skinGeoset,sampleNodeMatrices} from './vendor/mdlxl/src/animation.js';
import {perspectiveFitDistance,modelClipRadius,updateDepthClipping} from './vendor/mdlxl/app/viewport-math.js';
import {parseMDX,parseMDL,ModelRenderer} from './vendor/war3-model.mjs';
import {decodeTga} from './texture-raster.js';
import {installWarcraftPreviewAdapter,previewGeosetTint,initializeWarcraftRenderer} from './website-preview-adapter.js?v=20261018-uniform-budget';
import {advanceShowcaseModel} from './vendor/mdlxl/app/showcase-playback.js';
import {createViewerEvents} from './viewer-events.js?v=20261114-viewer-performance';
import {readEffectSettings} from './viewer-effect-controls.js';
import {resetPreviewEffects} from './vendor/mdlxl/app/warcraft-preview-adapter.js';
import {viewerPlaybackSample,setWarcraftCamera} from './viewer-effects.js?v=20261006-classic-portrait-controls';
import {installParticleNativeCompatibility} from './vendor/mdlxl/particle-native.mjs';
import {convertMdxGeosetColorTracks} from './vendor/mdlxl/src/geoset-color-codec.js';
import {decodePaintBlp} from './vendor/mdlxl/src/paint-blp.js';
import {improveNativeTexture} from './vendor/mdlxl/app/viewport-quality.js';
import {TEAM_COLORS} from './vendor/mdlxl/src/team-colors.js';
import {evaluateModelCamera,applyEvaluatedModelCamera,firstPortraitSequenceIndex} from './vendor/mdlxl/app/portrait-view.js';
import {SHOWCASE_QUALITY} from './vendor/mdlxl/app/showcase-director.js';
import {installWarcraftTeamTextures} from './warcraft-team-textures.js?v=20261020-particle-alpha';
const graphics=SHOWCASE_QUALITY.high;
const preferences={graphics:{...graphics,textures:true,lighting:true,particles:true,maxFps:60,pauseWhenHidden:false},lighting:{preset:'legacy'}};
const textureIndex=fetch('textures.json?v=20261027-slaanesh-gw').then(r=>r.json()),textureCache=new Map();
async function textureData(name,row){const index=await textureIndex,key=name.toLowerCase(),file=row.textureFiles?.[key]||row.textureFiles?.[key.replaceAll('\\','/')]||index[key];if(!file)throw Error('Missing texture: '+name);if(!textureCache.has(file))textureCache.set(file,(async()=>{const response=await fetch(file);if(!response.ok)throw Error('Texture unavailable: '+name);const b=await response.arrayBuffer(),signature=new TextDecoder().decode(b.slice(0,4));if(/^BLP[12]$/.test(signature)){const pixels=await decodePaintBlp(b);return new ImageData(pixels.data,pixels.width,pixels.height);}if(/\.tga$/i.test(name))return decodeTga(new Uint8Array(b));const bitmap=await createImageBitmap(new Blob([b])),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);bitmap.close();return context.getImageData(0,0,canvas.width,canvas.height);})().catch(error=>{textureCache.delete(file);throw error;}));return textureCache.get(file);}
export async function createViewer(canvas,row,{thumbnail=false,portrait=false,formation=false,formationYaw=0,cutout=false,teamColor=TEAM_COLORS[0].rgbHex,onPortraitModeChange,onPlayingChange,onLightingChange,onTimeChange}={}){
 const transparent=formation||cutout;
 const bytes=row.modelBytes||await fetch(row.fileUrl||'models/'+row.file+(row.sha256?'?v='+row.sha256:'')).then(r=>{if(!r.ok)throw Error('Model unavailable');return r.arrayBuffer();});const model=/\.mdl$/i.test(row.file||row.name||'')?parseMDL(new TextDecoder().decode(bytes)):row.mdxCompatibility==='ribbon-color'?(await import('./warcraft-mdx-compatibility.js?v=20261020-gluma')).parseCompatibleMdx(new Uint8Array(bytes)):parseMDX(bytes),gl=canvas.getContext('webgl2',{alpha:transparent,premultipliedAlpha:transparent,antialias:graphics.antialias,preserveDrawingBuffer:true});if(!gl)throw Error('This browser could not start WebGL2.');
 if(!model.Sequences.length)model.Sequences.push({Name:'Stand',Interval:[0,1000],NonLooping:false,MinimumExtent:[0,0,0],MaximumExtent:[0,0,0],BoundsRadius:0});
 let sequence=model.Sequences.findIndex(s=>s.Name==='Stand'||s.Name==='Stand - 1'),clock=0,playing=!thumbnail,speed=1,rotate=false,revision=0,previous=null,disposed=false;
 if(sequence<0)sequence=0;
 if(portrait&&firstPortraitSequenceIndex(model)>=0)sequence=firstPortraitSequenceIndex(model);
 let looping=!model.Sequences[sequence].NonLooping,ended=false,needsRender=true;
 const invalidate=()=>{needsRender=true;};
 const effects=readEffectSettings();
 let portraitActive=portrait,portraitDetached=false,worldView=null;
 let turntableYaw=0,turntableSpeed=1,navigating=false;
 const turntableAxis=new THREE.Vector3(0,0,1),inverseTurntable=new THREE.Quaternion();
 // Lighting is In game, Portrait or None. Portrait views select Portrait lighting and
 // restore the previous choice on leaving; the viewer can override either.
 let lightingMode=portrait?'portrait':'game',viewLighting='game';
 // Exclude scenery from formation cutouts and fit bounds; portrait playback uses authored visibility.
 const scenery=new Set(row.portraitBackdropGeosets||[]);
 const teamTextures=installWarcraftTeamTextures(gl,model,{transparent,graphics});
 // Match MDLxL's MDX load boundary: animated KGAC is BGR; static GEOA is already RGB.
 if(!/\.mdl$/i.test(row.file||row.name||''))model.GeosetAnims=convertMdxGeosetColorTracks(model.GeosetAnims);
 const displayLight=()=>new THREE.Vector3(-.65,.55,1);
 const native=new ModelRenderer(model),adapter=installWarcraftPreviewAdapter(gl,model,()=>({frame:native.getFrame(),sequenceIndex:sequence,globalTime:clock,lighting:lightingMode!=='none'&&preferences.graphics.lighting,portrait:lightingMode==='portrait',hiddenGeosets:formation?scenery:undefined,preferences,lightDirection:(lightingMode==='portrait'?new THREE.Vector3(.3,-.3,.25):displayLight()).applyQuaternion(inverseTurntable).toArray(),viewDirection:renderCamera.getWorldDirection(new THREE.Vector3()).negate().toArray()}));if(thumbnail&&row.captureRibbons===false)native.ribbonsController.emitters.length=0;if(thumbnail&&row.captureEmitters===false){native.particlesController.emitters.length=0;native.ribbonsController.emitters.length=0;}installParticleNativeCompatibility(native);initializeWarcraftRenderer(native,gl);adapter.ready(native);gl.depthFunc(gl.LEQUAL);
 // The Champion's skin and bracer overlap at their differently weighted elbow seam.
 // Bias only the bracer's opaque layer so depth rounding cannot stripe that edge.
 if(row.id==='aspiring'){
  const bracerLayer=model.Materials[model.Geosets[15].MaterialID].Layers[0],setLayerProps=native.setLayerProps;
  native.setLayerProps=function(layer,textureID){const result=setLayerProps.call(this,layer,textureID);if(layer===bracerLayer){gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-1,-8);}else gl.disable(gl.POLYGON_OFFSET_FILL);return result;};
 }

 teamTextures.ready(native);
 // Gate the main model's emitters only; spawned effects own their controllers.
 for(const controller of [native.particlesController,native.ribbonsController]){
  if(!controller)continue;
  const update=controller.updateEmitter,draw=controller.render;
  controller.updateEmitter=function(...args){if(effects.emitters)return update.apply(this,args);};
  controller.render=function(...args){if(effects.emitters)return draw.apply(this,args);};
 }
 await Promise.all([teamTextures.colour(native,teamColor),...model.Textures.filter(t=>t.Image&&!teamTextures.textures.has(t)).map(async t=>{native.setTextureImageData(t.Image,[await textureData(t.Image,row)]);improveNativeTexture(gl,native,t.Image,graphics);})]);
 const eventPreview=thumbnail?null:createViewerEvents({gl,model,row,textureData,graphics,teamColor,getSettings:()=>effects,onChange:invalidate});
 const unlockSound=()=>eventPreview?.unlockSound();
 if(!thumbnail)canvas.addEventListener('pointerdown',unlockSound);
 const captureOrthographic=thumbnail&&row.captureOrthographic;
 const camera=captureOrthographic?new THREE.OrthographicCamera(-200,200,200,-200,.1,3000):new THREE.PerspectiveCamera(32,1,.1,3000);camera.up.set(0,0,1);
 const turntableCamera=thumbnail?null:camera.clone();
 let renderCamera=camera;
 await eventPreview?.ready;
 native.setSequence(sequence);native.setLightColor([1,1,1]);
 previous=advanceShowcaseModel(native,model,{frame:model.Sequences[sequence].Interval[0],sequenceIndex:sequence,globalTime:0,revision,segment:sequence},previous);
 // Frame the drawn pose, excluding portrait scenery and invisible variants.
 const matrices=new Map((native.rendererData?.nodes||[]).flatMap((node,index)=>node?.matrix?[[index,new THREE.Matrix4().fromArray(node.matrix)]]:[]));
 const box=new THREE.Box3(),point=new THREE.Vector3(),framePoints=[];
 // Glows and additive or modulated overlays fade well inside their quads, so the
 // live framing uses only the solid surfaces; the capture bounds keep every layer.
 const solidLayer=layer=>(layer.FilterMode??0)<=2&&model.Textures[layer.TextureID]?.ReplaceableId!==2;
 for(const [index,g] of model.Geosets.entries()){const layers=(model.Materials[g.MaterialID]?.Layers||[]).filter(layer=>previewGeosetTint(model,index,layer,native.getFrame(),sequence,0)[3]>.001);if(scenery.has(index)||!layers.length)continue;const vertices=skinGeoset(g,matrices),solid=layers.some(solidLayer);for(const id of new Set(g.Faces)){box.expandByPoint(point.fromArray(vertices,id*3));if(solid)framePoints.push(point.clone());}}
 const center=box.getCenter(new THREE.Vector3());let radius=Math.max(1,box.getSize(new THREE.Vector3()).length()/2);
 // Depth range for one sequence: its authored extents plus the geometry it actually
 // draws. Other sequences' extents are excluded; the Champion's placeholder "Decay For
 // Hive" extent (832 units) pulled the near plane to 0.47 and made close layers z-fight.
 const clipRadii=new Map();
 function sequenceClipRadius(index){
  if(clipRadii.has(index))return clipRadii.get(index);
  const s=model.Sequences[index],[start,end]=s.Interval,steps=Math.min(48,Math.max(4,Math.ceil((end-start)/50)));
  let result=modelClipRadius({Info:model.Info,Sequences:[s],Geosets:model.Geosets.map(g=>({MinimumExtent:g.MinimumExtent,MaximumExtent:g.MaximumExtent,Anims:g.Anims?.[index]?[g.Anims[index]]:[]}))},center,radius);
  for(let step=0;step<=steps;step++){
   const frame=start+(end-start)*step/steps,matrices=sampleNodeMatrices(model,frame,index,frame-start);
   for(const [geosetIndex,g] of model.Geosets.entries()){
    if(formation&&scenery.has(geosetIndex))continue;
    if(!(model.Materials[g.MaterialID]?.Layers||[]).some(layer=>previewGeosetTint(model,geosetIndex,layer,frame,index,frame-start)[3]>.001))continue;
    const vertices=skinGeoset(g,matrices);
    for(let v=0;v<vertices.length;v+=3)result=Math.max(result,Math.hypot(vertices[v]-center.x,vertices[v+1]-center.y,vertices[v+2]-center.z));
   }
  }
  clipRadii.set(index,result);return result;
 }
 let clipRadius=sequenceClipRadius(sequence);
 const navigation=!thumbnail?bindVertexCamera(camera,canvas):null,controls=navigation?.controls;
 // The live view faces the model head-on, centred on its body, and frames the drawn pose
 // tightly, so every model fills the same share of the viewport.
 function frontView(aspect){
  const up=new THREE.Vector3(0,0,1),direction=new THREE.Vector3(1,0,.32).normalize(),right=new THREE.Vector3().crossVectors(up,direction).normalize(),screenUp=new THREE.Vector3().crossVectors(direction,right);
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],axes=[right,screenUp,direction];
  for(const p of framePoints)axes.forEach((axis,i)=>{const v=p.dot(axis);min[i]=Math.min(min[i],v);max[i]=Math.max(max[i],v);});
  if(!framePoints.length)return {target:center.clone(),direction,distance:perspectiveFitDistance(radius,camera.fov??32,aspect)};
  const across=framePoints.map(p=>p.dot(right)).sort((a,b)=>a-b),mid=min.map((v,i)=>i===0?across[across.length>>1]:(v+max[i])/2),target=right.clone().multiplyScalar(mid[0]).addScaledVector(screenUp,mid[1]).addScaledVector(direction,mid[2]);
  const fill=.86,tanV=Math.tan((camera.fov??32)*Math.PI/360)*fill,tanH=tanV*aspect;let distance=1;
  for(const p of framePoints){const x=p.dot(right)-mid[0],y=p.dot(screenUp)-mid[1],z=p.dot(direction)-mid[2];distance=Math.max(distance,z+Math.max(Math.abs(x)/tanH,Math.abs(y)/tanV));}
  return {target,direction,distance};
 }
 function fit(){const aspect=Math.max(1,canvas.clientWidth)/Math.max(1,canvas.clientHeight);camera.zoom=1;camera.aspect=aspect;
  if(!thumbnail){const view=frontView(aspect);camera.position.copy(view.target).addScaledVector(view.direction,view.distance);camera.lookAt(view.target);if(controls){controls.target.copy(view.target);controls.minDistance=radius*.4;controls.maxDistance=view.distance*3;controls.update();}return;}
  const distance=perspectiveFitDistance(radius,camera.fov??32,aspect);camera.position.copy(center).addScaledVector(formation?new THREE.Vector3(Math.cos(formationYaw),Math.sin(formationYaw),.12).normalize():new THREE.Vector3(Math.cos(.75),Math.sin(.75),.18).normalize(),distance);camera.lookAt(center);if(controls){controls.target.copy(center);controls.minDistance=radius*.4;controls.maxDistance=distance*3;controls.update();}}
 fit();
 if(thumbnail&&row.captureCameraAngles){setEditorCameraAngles(camera,center,row.captureCameraAngles);if(captureOrthographic){camera.left=-radius;camera.right=radius;camera.top=radius;camera.bottom=-radius;camera.updateProjectionMatrix();}}
 const portraitControls={target:new THREE.Vector3(),object:camera,update(){}};
 const detachPortrait=()=>{if(portraitActive)portraitDetached=true;};
 const startNavigation=()=>{navigating=true;detachPortrait();};
 const endNavigation=()=>{navigating=false;};
 controls?.addEventListener('start',startNavigation);
 controls?.addEventListener('end',endNavigation);
 controls?.addEventListener('change',invalidate);
 function setLivePortrait(active){
  if(active&&!portraitActive){worldView={camera:camera.clone(),target:controls.target.clone(),minDistance:controls.minDistance,maxDistance:controls.maxDistance,turntableYaw};controls.minDistance=.001;controls.maxDistance=Infinity;}
  if(!active&&portraitActive&&worldView){camera.copy(worldView.camera);controls.target.copy(worldView.target);controls.minDistance=worldView.minDistance;controls.maxDistance=worldView.maxDistance;turntableYaw=worldView.turntableYaw;controls.update();worldView=null;}
  if(active!==portraitActive){if(active)viewLighting=lightingMode;lightingMode=active?'portrait':viewLighting;onLightingChange?.(lightingMode);}
  if(active)turntableYaw=0;
  portraitActive=active;portraitDetached=false;onPortraitModeChange?.(active);
 }
 const maxSize=Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),...gl.getParameter(gl.MAX_VIEWPORT_DIMS)),msaaSamples=gl.getParameter(gl.SAMPLES);
 function render(delta=0,eventDelta=delta){if(disposed)return;needsRender=false;const w=Math.max(1,canvas.clientWidth||480),h=Math.max(1,canvas.clientHeight||480),scale=Math.min(graphics.pixelRatio,maxSize/Math.max(w,h));const width=Math.round(w*scale),height=Math.round(h*scale);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;canvas.dataset.renderScale=String(scale);canvas.dataset.msaaSamples=String(msaaSamples);}// Preserve the current orbit and pan while keeping the same framing on resize.
 if(!thumbnail&&!portraitActive&&camera.aspect!==w/h)camera.zoom*=Math.min(1,w/h)/Math.min(1,camera.aspect);
 camera.aspect=w/h;camera.updateProjectionMatrix();camera.updateMatrixWorld();
 clock+=delta*speed;
 const [start,end]=model.Sequences[sequence].Interval,duration=Math.max(0,end-start);
 // Hold the right edge when scrubbing a loop instead of wrapping to its first pose.
 const holdEnd=!playing&&clock===duration;
 const sample=viewerPlaybackSample(model,sequence,clock,revision,holdEnd?false:looping),frame=sample.frame;
 onTimeChange?.({time:looping&&!holdEnd&&duration>0?clock%duration:Math.min(clock,duration),duration});
 if(portraitActive&&!portraitDetached){const evaluated=evaluateModelCamera(model,model.Cameras[0],frame,sequence,clock);if(!applyEvaluatedModelCamera(camera,controls||portraitControls,evaluated,w/h))throw Error('Portrait camera unavailable.');}
 // Apply the inverse of a ground-plane model spin to the render camera so
 // the authored origin stays fixed, even after the navigation camera pans.
 renderCamera=camera;
 inverseTurntable.identity();
 if((!portraitActive||portraitDetached)&&turntableYaw){
  inverseTurntable.setFromAxisAngle(turntableAxis,-turntableYaw);
  renderCamera=turntableCamera.copy(camera);
  renderCamera.position.applyQuaternion(inverseTurntable);
  renderCamera.quaternion.premultiply(inverseTurntable);
  renderCamera.updateMatrixWorld();
 }
 native.setLightPosition(displayLight().normalize().multiplyScalar(radius*10).add(center).applyQuaternion(inverseTurntable).toArray());
 // Keep depth precision around the model as playback and mouse navigation change the view.
 if(!portraitActive||portraitDetached)updateDepthClipping(renderCamera,center,radius,clipRadius);
 // Warcraft particle planes and billboard nodes use +X as forward and +Z as up.
 setWarcraftCamera(native,renderCamera);previous=advanceShowcaseModel(native,model,sample,previous);
 gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(...(portraitActive||transparent?[0,0,0]:[16/255,24/255,39/255]),transparent?0:1);gl.clearDepth(1);gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);native.render(renderCamera.matrixWorldInverse.elements,renderCamera.projectionMatrix.elements,{wireframe:false,useEnvironmentMap:true});
 eventPreview?.render(sample,eventDelta,renderCamera,playing,looping,speed);}
 const frameInterval=1000/preferences.graphics.maxFps;
 let last=performance.now(),frameAt=last,raf;
 const resizeObserver=thumbnail?null:new ResizeObserver(invalidate);
 resizeObserver?.observe(canvas);
 function tick(now){
  if(disposed)return;
  if(now-frameAt<frameInterval){raf=requestAnimationFrame(tick);return;}
  frameAt=now-(now-frameAt)%frameInterval;
  const eventDelta=Math.max(0,now-last),delta=Math.min(70,eventDelta);
  last=now;
  // Match the previous 50-second revolution at the default 1× orbit speed.
  const turning=rotate&&!navigating&&(!portraitActive||portraitDetached);
  if(turning)turntableYaw=(turntableYaw+delta*turntableSpeed*(2*Math.PI/50000))%(2*Math.PI);
  // Mouse controls update on input and emit change, including zoom.
  // Held poses redraw only after input, resize or an async effect upload.
  if(playing||turning||needsRender||ended&&eventPreview?.active)render(playing?delta:0,playing||ended?eventDelta:0);
  if(playing&&!looping&&clock>=model.Sequences[sequence].Interval[1]-model.Sequences[sequence].Interval[0]){
   playing=false;ended=true;onPlayingChange?.(playing);
  }
  raf=requestAnimationFrame(tick);
 }
 render();
 if(!thumbnail)raf=requestAnimationFrame(tick);
 return {model,render,seek(time){
  const [start,end]=model.Sequences[sequence].Interval;
  clock=Math.max(0,Math.min(end-start,time));playing=false;ended=false;
  eventPreview?.stopSounds();revision++;previous=null;render();onPlayingChange?.(false);
 },...(thumbnail?{captureFrame:()=>({center:center.clone(),radius,clipRadius,camera:camera.clone()}),useCaptureFrame(frame){center.copy(frame.center);radius=frame.radius;clipRadius=frame.clipRadius;camera.copy(frame.camera);revision++;previous=null;render();}}:{}),formationAnchor:()=>new THREE.Vector3(0,0,center.z).project(camera).x/2+.5,snapshot:()=>canvas.toDataURL('image/png'),sequence(i){ended=false;eventPreview?.stopSounds();sequence=i;clipRadius=sequenceClipRadius(i);looping=!model.Sequences[i].NonLooping;clock=0;revision++;previous=null;native.setSequence(i);if(!thumbnail)setLivePortrait(/portrait/i.test(model.Sequences[i].Name));render();return looping;},play(){eventPreview?.unlockSound();if(ended){clock=0;revision++;previous=null;}ended=false;eventPreview?.armSound(sequence,clock,looping);if(!playing){playing=true;onPlayingChange?.(playing);}},loop(v){ended=false;looping=v;clock=0;revision++;previous=null;render();},looping:()=>looping,pause(){playing=!playing;ended=false;if(playing){eventPreview?.unlockSound();eventPreview?.armSound(sequence,clock,looping);}else eventPreview?.stopSounds();if(playing&&!looping&&clock>=model.Sequences[sequence].Interval[1]-model.Sequences[sequence].Interval[0]){clock=0;revision++;previous=null;render();}onPlayingChange?.(playing);return playing;},speed(v){speed=v;},orbitSpeed(v){turntableSpeed=v;},lighting(mode){if(['game','portrait','none'].includes(mode)){lightingMode=mode;render();}return lightingMode;},effects:()=>({...effects}),effect(key,value){if(!(key in effects))return;effects[key]=!!value;if(key==='emitters'&&!value)resetPreviewEffects(native);if(key==='sounds'){if(value)eventPreview?.unlockSound();else eventPreview?.stopSounds();}else if(!value)eventPreview?.clear(key);render();},async colour(hex){await Promise.all([teamTextures.colour(native,hex),eventPreview?.colour(hex)]);if(!disposed)render();},rotate(){rotate=!rotate;if(rotate)detachPortrait();return rotate;},reset(){turntableYaw=0;if(portraitActive)portraitDetached=false;else fit();render();},dispose(){disposed=true;cancelAnimationFrame(raf);resizeObserver?.disconnect();controls?.removeEventListener('change',invalidate);canvas.removeEventListener('pointerdown',unlockSound);eventPreview?.dispose();controls?.removeEventListener('start',startNavigation);controls?.removeEventListener('end',endNavigation);navigation?.dispose();adapter.dispose();gl.getExtension('WEBGL_lose_context')?.loseContext();}};
}
