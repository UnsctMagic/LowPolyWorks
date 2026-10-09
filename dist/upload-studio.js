import {createViewer} from './viewer.js?v=20261009-unit-upload';
import {unpackFile,inspectModel,findTexture,pathKey,sha256,modelPattern} from './model-files.js';
import {TEAM_COLORS} from './vendor/mdlxl/src/team-colors.js';
let canvas=document.querySelector('#preview');
const status=document.querySelector('#status'),modelSelect=document.querySelector('#model'),sequenceSelect=document.querySelector('#sequence'),teamSelect=document.querySelector('#team');
const nativeTextures=await fetch('textures.json?v=20261009-unit-upload').then(r=>r.json());
let viewer,models=[],urls=[],version=0,requestId='',sourceHashes=[],parentOrigin='';
teamSelect.replaceChildren(...TEAM_COLORS.map(colour=>new Option(colour.name,colour.rgbHex)));
const send=(type,data={})=>{if(parentOrigin)parent.postMessage({type,requestId,...data},parentOrigin);};
function clear(){viewer?.dispose();viewer=null;const cleanCanvas=canvas.cloneNode();canvas.replaceWith(cleanCanvas);canvas=cleanCanvas;urls.forEach(URL.revokeObjectURL);urls=[];models=[];}
async function capture(){
 const coverCanvas=document.createElement('canvas');coverCanvas.width=480;coverCanvas.height=560;coverCanvas.className='capture-canvas';coverCanvas.style.cssText='position:fixed;left:-10000px;top:0;width:480px;height:560px';document.body.append(coverCanvas);
 let captureViewer;try{captureViewer=await createViewer(coverCanvas,models[Number(modelSelect.value)].row,{cutout:true,teamColor:teamSelect.value});captureViewer.pause();captureViewer.render(700);return await new Promise(resolve=>coverCanvas.toBlob(resolve,'image/png'));}finally{captureViewer?.dispose();coverCanvas.remove();}
}
async function selectModel(){
 const current=++version;viewer?.dispose();viewer=null;const nextCanvas=canvas.cloneNode();canvas.replaceWith(nextCanvas);canvas=nextCanvas;modelSelect.disabled=sequenceSelect.disabled=teamSelect.disabled=true;status.textContent='Loading model and textures…';send('studio-loading');
 try{
  const selected=models[Number(modelSelect.value)],next=await createViewer(canvas,selected.row,{teamColor:teamSelect.value});if(current!==version){next.dispose();return;}viewer=next;
  sequenceSelect.replaceChildren(...next.model.Sequences.map((s,i)=>new Option(s.Name,String(i),false,s.Name==='Stand'||s.Name==='Stand - 1')));
  const cover=await capture();if(current!==version)return;
  status.textContent='Preview and card image ready.';send('studio-ready',{models:models.map(m=>({name:m.name,...m.meta})),selectedName:selected.name,selectedIndex:Number(modelSelect.value),teamColour:teamSelect.value,cover,sourceHashes});
 }catch(error){status.textContent=error.message;send('studio-error',{error:error.message});}
 finally{if(current===version)modelSelect.disabled=sequenceSelect.disabled=teamSelect.disabled=false;}
}
window.addEventListener('message',async event=>{
 if(event.source!==parent||!['https://lowpolyworks-internal-tracker.vercel.app',location.origin].includes(event.origin))return;
 if(event.data?.type==='studio-clear'){version++;clear();modelSelect.replaceChildren();sequenceSelect.replaceChildren();modelSelect.disabled=sequenceSelect.disabled=true;status.textContent='Choose model files to see a preview.';return;}
 if(event.data?.type==='studio-colour'){teamSelect.value=event.data.colour;if(viewer)await selectModel();return;}
 if(event.data?.type!=='studio-files'&&event.data?.type!=='studio-card')return;
 parentOrigin=event.origin;requestId=event.data.requestId;version++;clear();status.textContent='Reading model files…';send('studio-loading');
 try{
  if(event.data.type==='studio-card'){
   const card=event.data.card;models=card.models.map(model=>({name:model.name,meta:model,row:{...model,file:model.name}}));sourceHashes=[];teamSelect.value=card.teamColour||event.data.colour||TEAM_COLORS[0].rgbHex;
   modelSelect.replaceChildren(...models.map((m,i)=>new Option(m.name,String(i),false,m.row.assetId===card.defaultModelId)));await selectModel();return;
  }
  const entries=[];sourceHashes=[];
  for(const [sourceIndex,file] of event.data.files.entries()){const bytes=new Uint8Array(await file.arrayBuffer());sourceHashes.push({name:file.name,sha256:await sha256(bytes)});entries.push(...unpackFile(file.name,bytes).map(entry=>({...entry,sourceIndex,sourceName:file.name})));}
  if(entries.length>1000)throw Error('Choose fewer files.');
  for(const entry of entries){entry.url=URL.createObjectURL(new Blob([entry.bytes]));urls.push(entry.url);}
  for(const entry of entries.filter(e=>modelPattern.test(e.name))){const meta=inspectModel(entry),textureFiles={};for(const ref of meta.textureRefs){const own=entries.filter(e=>e.sourceIndex===entry.sourceIndex),loose=entries.filter(e=>!modelPattern.test(e.name)&&!entries.some(m=>m.sourceIndex===e.sourceIndex&&modelPattern.test(m.name)));const texture=findTexture(own,entry.name,ref)||findTexture(loose,entry.name,ref);if(texture)textureFiles[pathKey(ref)]=texture.url;else if(!nativeTextures[ref.toLowerCase()])throw Error('Missing texture: '+ref+'. Add this texture with the model files.');}models.push({name:entry.name,meta,row:{id:'upload-preview',file:entry.name,modelBytes:entry.bytes.buffer.slice(entry.bytes.byteOffset,entry.bytes.byteOffset+entry.bytes.byteLength),textureFiles}});}
  if(!models.length||models.length>20)throw Error('Choose 1–20 MDX or MDL models, directly or inside ZIPs.');
  teamSelect.value=event.data.colour||TEAM_COLORS[0].rgbHex;modelSelect.replaceChildren(...models.map((m,i)=>new Option(m.name,String(i))));await selectModel();
 }catch(error){status.textContent=error.message;send('studio-error',{error:error.message});}
});
modelSelect.onchange=selectModel;
sequenceSelect.onchange=()=>viewer?.sequence(Number(sequenceSelect.value));
teamSelect.onchange=selectModel;
// Module texture loading can finish after the iframe load event. Signal readiness
// only after the message listener is installed so the first file selection arrives.
parent.postMessage({type:'studio-mounted'},'https://lowpolyworks-internal-tracker.vercel.app');
if(location.origin!=='https://lowpolyworks-internal-tracker.vercel.app')parent.postMessage({type:'studio-mounted'},location.origin);
