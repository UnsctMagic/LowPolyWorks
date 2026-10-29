import {createHash} from 'node:crypto';
import {unzipSync} from 'fflate';
import {findTexture,pathKey,filePath,fileLimit,expandedLimit} from '../vendor/model-files.js';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

// The MODL display name is catalogue maintenance, not a geometry/animation edit.
// All other authored bytes, including extents and texture paths, remain significant.
export function modelContent(bytes){
 const content=Buffer.from(bytes),textures=[];
 if(content.subarray(0,4).toString()!=='MDLX')throw Error('Published model download has invalid file contents.');
 for(let offset=4;offset<content.length;){
  if(offset+8>content.length)throw Error('Published model has an incomplete chunk.');
  const tag=content.toString('ascii',offset,offset+4),size=content.readUInt32LE(offset+4),start=offset+8,end=start+size;
  if(end>content.length)throw Error('Published model has an incomplete chunk.');
  if(tag==='MODL'){
   if(size<80)throw Error('Published model has an incomplete name.');
   content.fill(0,start,start+80);
  }
  if(tag==='TEXS'){
   if(size%268)throw Error('Published model has incomplete textures.');
   for(let at=start;at<end;at+=268){
    const ref=content.toString('utf8',at+4,at+264).split('\0')[0];
    if(ref&&![1,2].includes(content.readUInt32LE(at)))textures.push(ref);
   }
  }
  offset=end;
 }
 return {contentHash:hash(content),textures:[...new Set(textures)].sort()};
}

// ZIP timestamps, compression, paths and unrelated bundled models do not change
// this model. Its own packaged MDX and referenced custom textures do.
export function packageContent(bytes,modelFile,textures,primaryContentHash){
 if(!bytes.length||bytes.length>fileLimit)throw Error('Published package exceeds the model file limit.');
 const entries=[],names=new Set(),assets=[];let expanded=0,count=0;
 // Read the ZIP directory first. Inflate only this model and its own textures;
 // a shared archive can contain many other units, icons and copies of textures.
 unzipSync(bytes,{filter:file=>{
  if(++count>1000)throw Error('The ZIP contains too many files.');
  if(file.name.endsWith('/'))return false;
  filePath(file.name);expanded+=file.originalSize;if(expanded>expandedLimit)throw Error('The expanded ZIP exceeds the model file limit.');
  const key=pathKey(file.name);if(names.has(key))throw Error('Duplicate path in ZIP: '+file.name);names.add(key);entries.push({name:file.name});return false;
 }});
 let models=entries.filter(entry=>pathKey(entry.name).split('/').at(-1)===pathKey(modelFile).split('/').at(-1));
 // A catalogue filename change can leave the original filename inside the ZIP.
 // Resolve that identity by exact model content, never by a similar title.
 if(!models.length&&primaryContentHash){
  const candidates=unzipSync(bytes,{filter:file=>/\.mdx$/i.test(file.name)});
  models=entries.filter(entry=>candidates[entry.name]&&modelContent(candidates[entry.name]).contentHash===primaryContentHash);
 }
 if(models.length>1)throw Error('More than one packaged model matches '+modelFile+'.');
 const selected=new Map();if(models.length)selected.set('model',models[0].name);
 for(const ref of textures){
  const entry=findTexture(entries,models[0]?.name||modelFile,ref);
  if(entry)selected.set(pathKey(ref),entry.name);
 }
 const included=new Set(selected.values()),contents=unzipSync(bytes,{filter:file=>included.has(file.name)});
 for(const [key,name] of selected)assets.push([key,key==='model'?modelContent(contents[name]).contentHash:hash(contents[name])]);
 return hash(JSON.stringify(assets.sort((a,b)=>a[0].localeCompare(b[0]))));
}
