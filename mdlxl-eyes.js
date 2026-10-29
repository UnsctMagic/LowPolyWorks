// The MDLxL update popup's helmet eyes for the MDLxL page logo: dark eye cores
// that slowly ignite after 450 ms with the Aspiring Champion's four native eye emitters.
// Based on MDLxL src/update-popup-effects.js, without the fanfare.
import {ModelRenderer,parseMDX,decodeBLP,getBLPImageData} from './vendor/war3-model.mjs';
import {Matrix4,Vector3} from 'three';
import {eyeScene,eyeTextures} from './mdlxl-eyes-assets.js?v=20261029-logo-eyes';

// Slower than the popup so the ignition reads on a page: a 450 ms start,
// then a gradual fade from dark to burning, and the eye flames at 60% speed.
const DELAY=450,FADE=1200,FLAME_SPEED=.6;
const bytes=value=>Uint8Array.from(atob(value),character=>character.charCodeAt(0));

// Follow the two connected red eye regions, including their brighter centers.
// A rectangular color threshold also darkens the helmet's gold trim.
function darkEyePixels(source,width,height){
 const result=new Uint8ClampedArray(source),size=width*height;
 const visited=new Uint8Array(size),mask=new Uint8Array(size);
 const queue=[[Math.round(width*.3515625),Math.round(height*.546875)],[Math.round(width*.578125),Math.round(height*.546875)]];
 while(queue.length){
  const [x,y]=queue.pop();
  if(x<0||y<0||x>=width||y>=height)continue;
  const index=y*width+x;
  if(visited[index])continue;
  visited[index]=1;
  const offset=index*4,r=source[offset],g=source[offset+1],b=source[offset+2];
  if(!(r>g*2.5&&r>b*2.5&&r>30))continue;
  mask[index]=1;
  queue.push([x-1,y],[x+1,y],[x,y-1],[x,y+1]);
 }
 const outside=new Uint8Array(size),exterior=[0];
 while(exterior.length){
  const index=exterior.pop();
  if(outside[index]||mask[index])continue;
  outside[index]=1;
  const x=index%width,y=Math.floor(index/width);
  if(x>0)exterior.push(index-1);
  if(x+1<width)exterior.push(index+1);
  if(y>0)exterior.push(index-width);
  if(y+1<height)exterior.push(index+width);
 }
 for(let index=0;index<size;index++)if(mask[index]||!outside[index]){
  for(let channel=0;channel<3;channel++)result[index*4+channel]=Math.round(source[index*4+channel]*.04);
 }
 return result;
}

// The hero is rebuilt on every MDLxL section link, so the ignition time
// belongs to the page visit: later sections show the eyes already burning.
let deadline=null;
const begin=()=>{if(deadline==null&&document.visibilityState!=='hidden')deadline=performance.now()+DELAY;};

export function mdlxlLogoMarkup(alt){
 return `<span class="mdlxl-logo"><img src="ui/mdlxl-icon.png" alt="${alt}" width="128" height="128"><canvas data-helmet width="512" height="512" aria-hidden="true"></canvas><canvas data-particles width="768" height="768" aria-hidden="true"></canvas></span>`;
}

export async function igniteMdlxlLogo(element){
 if(!element||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const image=element.querySelector('img'),picture=element.querySelector('[data-helmet]'),canvas=element.querySelector('[data-particles]');
 let native,gl,frame=0,lastTime=null,shown=-1;
 const dispose=()=>{
  cancelAnimationFrame(frame);
  document.removeEventListener('visibilitychange',begin);
  delete element.dataset.effects;
  // Same pinned SD cleanup compatibility as MDLxL: upstream also tries to
  // destroy HD shader objects that were never created for this model.
  if(native){const destroyShader=native.destroyShaderProgramObject;native.destroyShaderProgramObject=function(shader){if(shader)return destroyShader.call(this,shader);};}
  try{native?.destroy();}catch(error){console.warn('Could not finish MDLxL logo cleanup.',error);}
  finally{gl?.getExtension('WEBGL_lose_context')?.loseContext();}
 };
 try{
  const context=picture.getContext('2d',{willReadFrequently:true});
  gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:true});
  if(!gl)throw Error('The MDLxL logo eyes need WebGL.');
  native=new ModelRenderer(parseMDX(bytes(eyeScene).buffer));
  native.initGL(gl);
  native.setSequence(0);
  native.setCamera([100,0,0],[0,0,0,1]);
  for(const [path,value] of Object.entries(eyeTextures))native.setTextureImageData(path,[getBLPImageData(decodeBLP(bytes(value).buffer),0)]);
  const view=new Matrix4().lookAt(new Vector3(100,0,0),new Vector3(),new Vector3(0,0,1)).setPosition(100,0,0).invert().elements;
  const projection=new Matrix4().makeOrthographic(-24,24,24,-24,.1,200).elements;
  // decode() can stall in some mobile Chromium builds; the load event is enough for drawImage.
  if(!image.complete)await new Promise((resolve,reject)=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',reject,{once:true});});
  if(!image.naturalWidth)throw Error('The MDLxL logo did not load.');
  if(!element.isConnected)return dispose();
  context.drawImage(image,0,0,picture.width,picture.height);
  const lit=context.getImageData(0,0,picture.width,picture.height);
  const dark=new ImageData(darkEyePixels(lit.data,lit.width,lit.height),lit.width,lit.height);
  const litImage=document.createElement('canvas');litImage.width=lit.width;litImage.height=lit.height;litImage.getContext('2d').putImageData(lit,0,0);
  document.addEventListener('visibilitychange',begin);
  begin();
  const render=time=>{
   frame=0;
   if(!element.isConnected)return dispose();
   if(deadline!=null&&time>=deadline){
    const glow=Math.min(1,(time-deadline)/FADE),eased=glow*glow*(3-2*glow);
    if(eased!==shown){
     shown=eased;
     context.putImageData(dark,0,0);
     context.globalAlpha=eased;context.drawImage(litImage,0,0);context.globalAlpha=1;
     canvas.style.opacity=eased;
     element.dataset.eyes=glow<1?'igniting':'lit';
    }
    native.update(lastTime==null?0:Math.min(50,Math.max(0,time-lastTime))*FLAME_SPEED);
    lastTime=time;
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    native.render(view,projection,{wireframe:false,env:false,useEnvironmentMap:false});
   }
   frame=requestAnimationFrame(render);
  };
  context.putImageData(dark,0,0);
  element.dataset.eyes='dark';
  element.dataset.effects='ready';
  frame=requestAnimationFrame(render);
 }catch(error){
  dispose();
  console.warn('MDLxL logo eyes unavailable; using the static icon.',error);
 }
}
