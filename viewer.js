import * as THREE from 'three';
import {bindVertexCamera} from './website-camera-controls.js';
import {skinGeoset} from './vendor/mdlxl/src/animation.js';
import {perspectiveFitDistance,modelClipRadius,updateDepthClipping} from './vendor/mdlxl/app/viewport-math.js';
import {parseMDX,ModelRenderer} from './vendor/war3-model.mjs';
import {installWarcraftPreviewAdapter,previewGeosetTint} from './vendor/mdlxl/app/warcraft-preview-adapter.js';
import {advanceShowcaseModel} from './vendor/mdlxl/app/showcase-playback.js';
import {viewerPlaybackSample,setWarcraftCamera} from './viewer-effects.js?v=20261006-classic-portrait-controls';
import {installParticleNativeCompatibility} from './vendor/mdlxl/particle-native.mjs';
import {convertMdxGeosetColorTracks} from './vendor/mdlxl/src/geoset-color-codec.js';
import {decodePaintBlp} from './vendor/mdlxl/src/paint-blp.js';
import {improveNativeTexture} from './vendor/mdlxl/app/viewport-quality.js';
import {TEAM_COLORS} from './vendor/mdlxl/src/team-colors.js';
import {evaluateModelCamera,applyEvaluatedModelCamera,firstPortraitSequenceIndex} from './vendor/mdlxl/app/portrait-view.js';
import {SHOWCASE_QUALITY} from './vendor/mdlxl/app/showcase-director.js';
import {installWarcraftTeamTextures} from './warcraft-team-textures.js?v=20261008-unified-army-cards';
const graphics=SHOWCASE_QUALITY.high;
const preferences={graphics:{...graphics,textures:true,lighting:true,particles:true,maxFps:60,pauseWhenHidden:false},lighting:{preset:'legacy'}};
const textureIndex=fetch('textures.json?v=20261009-necrarch-vampire').then(r=>r.json()),textureCache=new Map();
async function textureData(name,row){const index=await textureIndex,key=name.toLowerCase(),file=row.textureFiles?.[key]||index[key];if(!file)throw Error('Missing texture: '+name);if(!textureCache.has(file))textureCache.set(file,(async()=>{const b=await fetch(file).then(r=>r.arrayBuffer());const pixels=await decodePaintBlp(b);return new ImageData(pixels.data,pixels.width,pixels.height);})());return textureCache.get(file);}
export async function createViewer(canvas,row,{thumbnail=false,portrait=false,formation=false,formationYaw=0,cutout=false,teamColor=TEAM_COLORS[0].rgbHex,onPortraitModeChange}={}){
 const transparent=formation||cutout;
 const bytes=await fetch('models/'+row.file+(row.sha256?'?v='+row.sha256:'')).then(r=>{if(!r.ok)throw Error('Model unavailable');return r.arrayBuffer();});const model=parseMDX(bytes),gl=canvas.getContext('webgl2',{alpha:transparent,premultipliedAlpha:transparent,antialias:graphics.antialias,preserveDrawingBuffer:true});if(!gl)throw Error('This browser could not start WebGL2.');
 let sequence=model.Sequences.findIndex(s=>s.Name==='Stand'||s.Name==='Stand - 1'),clock=0,playing=!thumbnail,speed=1,rotate=false,revision=0,previous=null,disposed=false;
 if(sequence<0)sequence=0;
 if(portrait&&firstPortraitSequenceIndex(model)>=0)sequence=firstPortraitSequenceIndex(model);
 let looping=!model.Sequences[sequence].NonLooping;
 let portraitActive=portrait,portraitDetached=false,worldView=null;
 // Exclude scenery from formation cutouts and fit bounds; portrait playback uses authored visibility.
 const scenery=new Set(row.portraitBackdropGeosets||[]);
 const teamTextures=installWarcraftTeamTextures(gl,model,{transparent,graphics});
 // Match MDLxL's MDX load boundary: animated KGAC is BGR; static GEOA is already RGB.
 model.GeosetAnims=convertMdxGeosetColorTracks(model.GeosetAnims);
 const displayLight=()=>new THREE.Vector3(-.65,.55,1);
 const native=new ModelRenderer(model),adapter=installWarcraftPreviewAdapter(gl,model,()=>({frame:native.getFrame(),sequenceIndex:sequence,globalTime:clock,lighting:preferences.graphics.lighting,portrait:portraitActive,hiddenGeosets:formation?scenery:undefined,preferences,lightDirection:portraitActive?[.3,-.3,.25]:displayLight().toArray(),viewDirection:camera.getWorldDirection(new THREE.Vector3()).negate().toArray()}));installParticleNativeCompatibility(native);native.initGL(gl);adapter.ready(native);gl.depthFunc(gl.LEQUAL);
 // The Champion's skin and bracer overlap at their differently weighted elbow seam.
 // Bias only the bracer's opaque layer so depth rounding cannot stripe that edge.
 if(row.id==='aspiring'){
  const bracerLayer=model.Materials[model.Geosets[15].MaterialID].Layers[0],setLayerProps=native.setLayerProps;
  native.setLayerProps=function(layer,textureID){const result=setLayerProps.call(this,layer,textureID);if(layer===bracerLayer){gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-1,-8);}else gl.disable(gl.POLYGON_OFFSET_FILL);return result;};
 }

 teamTextures.ready(native);
 await Promise.all([teamTextures.colour(native,teamColor),...model.Textures.filter(t=>t.Image&&!teamTextures.textures.has(t)).map(async t=>{native.setTextureImageData(t.Image,[await textureData(t.Image,row)]);improveNativeTexture(gl,native,t.Image,graphics);})]);
 const camera=new THREE.PerspectiveCamera(32,1,.1,3000);camera.up.set(0,0,1);
 native.setSequence(sequence);native.setLightColor([1,1,1]);
 previous=advanceShowcaseModel(native,model,{frame:model.Sequences[sequence].Interval[0],sequenceIndex:sequence,globalTime:0,revision,segment:sequence},previous);
 // Frame the drawn pose, excluding portrait scenery and invisible variants.
 const matrices=new Map((native.rendererData?.nodes||[]).flatMap((node,index)=>node?.matrix?[[index,new THREE.Matrix4().fromArray(node.matrix)]]:[]));
 const box=new THREE.Box3(),point=new THREE.Vector3();
 for(const [index,g] of model.Geosets.entries()){const layers=model.Materials[g.MaterialID]?.Layers||[];if(scenery.has(index)||!layers.some(layer=>previewGeosetTint(model,index,layer,native.getFrame(),sequence,0)[3]>.001))continue;const vertices=skinGeoset(g,matrices);for(const id of new Set(g.Faces))box.expandByPoint(point.fromArray(vertices,id*3));}
 const center=box.getCenter(new THREE.Vector3()),radius=Math.max(1,box.getSize(new THREE.Vector3()).length()/2);
 const clipRadius=modelClipRadius(model,center,radius);
 const navigation=!thumbnail&&!portrait?bindVertexCamera(camera,canvas):null,controls=navigation?.controls;
 if(controls)controls.autoRotateSpeed=1.2;
 function fit(){const aspect=Math.max(1,canvas.clientWidth)/Math.max(1,canvas.clientHeight),distance=perspectiveFitDistance(radius,camera.fov,aspect);camera.zoom=1;camera.position.copy(center).addScaledVector(formation?new THREE.Vector3(Math.cos(formationYaw),Math.sin(formationYaw),.12).normalize():new THREE.Vector3(Math.cos(.75),Math.sin(.75),.18).normalize(),distance);camera.lookAt(center);if(controls){controls.target.copy(center);controls.minDistance=radius*.4;controls.maxDistance=distance*3;controls.update();}}
 fit();
 const portraitControls={target:new THREE.Vector3(),object:camera,update(){}};
 const detachPortrait=()=>{if(portraitActive)portraitDetached=true;};
 controls?.addEventListener('start',detachPortrait);
 function setLivePortrait(active){
  if(active&&!portraitActive){worldView={camera:camera.clone(),target:controls.target.clone(),minDistance:controls.minDistance,maxDistance:controls.maxDistance};controls.minDistance=.001;controls.maxDistance=Infinity;}
  if(!active&&portraitActive&&worldView){camera.copy(worldView.camera);controls.target.copy(worldView.target);controls.minDistance=worldView.minDistance;controls.maxDistance=worldView.maxDistance;controls.update();worldView=null;}
  portraitActive=active;portraitDetached=false;onPortraitModeChange?.(active);
 }
 const maxSize=Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),...gl.getParameter(gl.MAX_VIEWPORT_DIMS)),msaaSamples=gl.getParameter(gl.SAMPLES);
 function render(delta=0){if(disposed)return;const w=Math.max(1,canvas.clientWidth||480),h=Math.max(1,canvas.clientHeight||480),scale=Math.min(graphics.pixelRatio,maxSize/Math.max(w,h));const width=Math.round(w*scale),height=Math.round(h*scale);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;canvas.dataset.renderScale=String(scale);canvas.dataset.msaaSamples=String(msaaSamples);}camera.aspect=w/h;camera.updateProjectionMatrix();camera.updateMatrixWorld();native.setLightPosition(displayLight().normalize().multiplyScalar(radius*10).add(center).toArray());
 clock+=delta*speed;const sample=viewerPlaybackSample(model,sequence,clock,revision,looping),frame=sample.frame;
 if(portraitActive&&!portraitDetached){const evaluated=evaluateModelCamera(model,model.Cameras[0],frame,sequence,clock);if(!applyEvaluatedModelCamera(camera,controls||portraitControls,evaluated,w/h))throw Error('Portrait camera unavailable.');}
 // Keep depth precision around the model as playback and mouse navigation change the view.
 if(!portraitActive||portraitDetached)updateDepthClipping(camera,center,radius,clipRadius);
 // Warcraft particle planes and billboard nodes use +X as forward and +Z as up.
 setWarcraftCamera(native,camera);previous=advanceShowcaseModel(native,model,sample,previous);
 gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(...(portraitActive||transparent?[0,0,0]:[16/255,24/255,39/255]),transparent?0:1);gl.clearDepth(1);gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);native.render(camera.matrixWorldInverse.elements,camera.projectionMatrix.elements,{wireframe:false,useEnvironmentMap:true});}
 let last=performance.now(),raf;function tick(now){if(disposed)return;const delta=Math.min(70,now-last);last=now;controls?.update(delta/1000);render(playing?delta:0);raf=requestAnimationFrame(tick);}render();
 if(!thumbnail)raf=requestAnimationFrame(tick);
 return {model,render,formationAnchor:()=>new THREE.Vector3(0,0,center.z).project(camera).x/2+.5,snapshot:()=>canvas.toDataURL('image/png'),sequence(i){sequence=i;looping=!model.Sequences[i].NonLooping;clock=0;revision++;previous=null;native.setSequence(i);if(!thumbnail)setLivePortrait(/portrait/i.test(model.Sequences[i].Name));render();return looping;},loop(v){looping=v;clock=0;revision++;previous=null;render();},looping:()=>looping,pause(){playing=!playing;return playing;},speed(v){speed=v;},orbitSpeed(v){if(controls)controls.autoRotateSpeed=1.2*v;},async colour(hex){await teamTextures.colour(native,hex);if(!disposed)render();},rotate(){rotate=!rotate;if(controls){controls.autoRotate=rotate;if(rotate)detachPortrait();}return rotate;},reset(){if(portraitActive)portraitDetached=false;else fit();render();},dispose(){disposed=true;cancelAnimationFrame(raf);controls?.removeEventListener('start',detachPortrait);navigation?.dispose();adapter.dispose();gl.getExtension('WEBGL_lose_context')?.loseContext();}};
}
