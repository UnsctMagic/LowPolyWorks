import {parseMDX,parseMDL} from './vendor/war3-model.mjs';
import {convertMdxGeosetColorTracks} from './vendor/mdlxl/src/geoset-color-codec.js';
// MDLxL event-render-model's verified runtime profile: post-1100 SD spawn
// resources retain these particle-only layouts. Never rewrite downloadable MDX.
const particleChunks=new Set(['VERS','MODL','SEQS','GLBS','TEXS','BONE','HELP','PIVT','PRE2']);
const versions=[800,900,1000,1100,1200,1300,1400,1600,1800];
export function parseViewerSpawn(input,name=''){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
 let version,modern=false;
 if(!/\.mdl$/i.test(name)){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),text=new TextDecoder(),chunks=[];
  if(text.decode(bytes.subarray(0,4))!=='MDLX')throw Error('Invalid spawn model header.');
  let offset=4;
  while(offset<bytes.length){
   if(offset+8>bytes.length)throw Error('Truncated spawn model chunk.');
   const tag=text.decode(bytes.subarray(offset,offset+4)),size=view.getUint32(offset+4,true);
   if(offset+8+size>bytes.length)throw Error('Truncated spawn model data.');
   if(tag==='VERS'){if(size!==4||version!==undefined)throw Error('Invalid spawn model version.');version=view.getUint32(offset+8,true);}
   chunks.push({tag,size});offset+=8+size;
  }
  if(!versions.includes(version))throw Error('Unsupported spawn model version: '+version);
  modern=version>=1200;
  if(modern&&chunks.some(c=>c.size&&!particleChunks.has(c.tag)))throw Error('Modern spawn preview supports ParticleEmitter2 scenes only.');
 }
 const model=/\.mdl$/i.test(name)?parseMDL(new TextDecoder().decode(bytes)):parseMDX(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 if(!versions.includes(model.Version)||/\.mdl$/i.test(name)&&model.Version>=1200)throw Error('Unsupported spawn model format.');
 if(modern&&(!model.ParticleEmitters2?.length||model.ParticleEmitters2.some(e=>![e.Rows,e.Columns].every(n=>Number.isInteger(n)&&n>0)||!(e.LifeSpan>0)||![0,1,2,3,4].includes(e.FilterMode)||![1,2,3].includes(e.FrameFlags))))throw Error('Invalid spawn particle scene.');
 if(model.Geosets?.some(g=>g.SkinWeights?.length)||model.Materials?.some(m=>m.Shader||m.Layers?.some(l=>l.ShaderTypeId>0)))throw Error('HD spawn models are not supported.');
 if(!/\.mdl$/i.test(name))model.GeosetAnims=convertMdxGeosetColorTracks(model.GeosetAnims);
 if(!model.Sequences?.length)model.Sequences=[{Name:'Event',Interval:[0,1000],NonLooping:true}];
 return model;
}
