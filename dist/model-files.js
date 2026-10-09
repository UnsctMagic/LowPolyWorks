import {unzipSync} from './vendor/fflate.js';
import {parseMDX,parseMDL} from './vendor/war3-model.mjs';

export const fileLimit=100*1024*1024, expandedLimit=200*1024*1024;
export const modelPattern=/\.(mdx|mdl)$/i;
const assetPattern=/\.(mdx|mdl|blp|tga|png|jpe?g|webp)$/i;
export function filePath(name){
 const path=String(name).replaceAll('\\','/').replace(/^\.\//,'');
 if(!path||path.length>240||path.startsWith('/')||path.includes(':')||path.split('/').some(p=>p==='..'||p===''))throw Error('Invalid file path: '+name);
 return path;
}
export const pathKey=name=>filePath(name).toLowerCase();
export const fileType=name=>/\.zip$/i.test(name)?'application/zip':/\.png$/i.test(name)?'image/png':/\.jpe?g$/i.test(name)?'image/jpeg':/\.webp$/i.test(name)?'image/webp':'application/octet-stream';
export async function sha256(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export function unpackFile(name,bytes){
 if(!bytes.length||bytes.length>fileLimit)throw Error('Each file must be between 1 byte and 100 MB.');
 const entries=[];let total=0,count=0;
 if(/\.zip$/i.test(name)){
  const unpacked=unzipSync(bytes,{filter:entry=>{
   if(++count>1000)throw Error('The ZIP contains too many files.');
   if(entry.name.endsWith('/'))return false;
   filePath(entry.name);total+=entry.originalSize;
   if(total>expandedLimit)throw Error('The expanded ZIP must be at most 200 MB.');
   return assetPattern.test(entry.name);
  }});
  for(const [name,bytes] of Object.entries(unpacked))entries.push({name:filePath(name),bytes});
 }else{
  if(!assetPattern.test(name))throw Error('Choose MDX, MDL, ZIP, BLP, TGA, PNG, JPG or WebP files.');
  entries.push({name:filePath(name),bytes});
 }
 const keys=new Set();for(const entry of entries){const key=pathKey(entry.name);if(keys.has(key))throw Error('Duplicate path in ZIP: '+entry.name);keys.add(key);}
 return entries;
}
export function findTexture(entries,modelName,reference){
 const key=pathKey(reference),directory=pathKey(modelName).split('/').slice(0,-1).join('/');
 for(const wanted of [directory?directory+'/'+key:key,key]){const exact=entries.filter(e=>pathKey(e.name)===wanted);if(exact.length===1)return exact[0];}
 const suffix=entries.filter(e=>pathKey(e.name).endsWith('/'+key));if(suffix.length===1)return suffix[0];
 // Flat packs are common; only accept a basename when it is unambiguous.
 const base=key.split('/').at(-1),matches=entries.filter(e=>pathKey(e.name).split('/').at(-1)===base);
 if(matches.length>1)throw Error('More than one texture matches '+reference+'. Keep its model-relative folder path.');
 return matches[0];
}
export function inspectModel(entry){
 let model;try{model=/\.mdl$/i.test(entry.name)?parseMDL(new TextDecoder().decode(entry.bytes)):parseMDX(entry.bytes.buffer.slice(entry.bytes.byteOffset,entry.bytes.byteOffset+entry.bytes.byteLength));}catch(error){throw Error('Could not read '+entry.name+': '+error.message);}
 if(!model.Geosets?.length)throw Error(entry.name+' has no model geometry.');
 return {name:entry.name,sequences:model.Sequences.map(s=>s.Name),geosets:model.Geosets.map((g,index)=>({index,vertices:g.Vertices.length/3,triangles:g.Faces.length/3,textures:[]})),textureRefs:[...new Set(model.Textures.filter(t=>t.Image&&![1,2].includes(t.ReplaceableId)).map(t=>t.Image))],bytes:entry.bytes.length};
}
