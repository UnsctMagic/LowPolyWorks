// Native dependencies for model uploads and the site's shared event library.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gamePathKey,eventResourceKey} from '../dist/viewer-event-data.js';
import {parseViewerSpawn} from '../dist/viewer-spawn-model.js';

export async function prepareModelEvents({root,row={id:'native-event-library'},model,fullLibrary=false,mdlxl,archives,game}){
 const requested=[...new Set((model?.EventObjects||[]).map(e=>e.Name).filter(n=>/^(SND|FPT|SPL|UBR|SPN)/i.test(n)))];
 if(!fullLibrary&&!requested.length)return;
 const require=createRequire(import.meta.url);
 const {TextureResolver,IMAGE_EXTENSIONS}=require(path.join(mdlxl,'electron/texture-resolver.cjs'));
 const {CascTextures,CascReader,soundCandidates,soundFallbacks}=require(path.join(mdlxl,'electron/casc.cjs'));
 const {eventCatalog,NODE_EVENT_TABLES}=await import(pathToFileURL(path.join(mdlxl,'app/node-event-data.js')));
 const {parseCompatibleMdx,generateCompatibleMdx}=await import(pathToFileURL(path.join(mdlxl,'src/mdx-compatibility.js')));
 const {parseMdx}=await import(pathToFileURL(path.join(mdlxl,'src/mdx-container.js')));
 const {hdContentIssues,normalizeVersionFields}=await import(pathToFileURL(path.join(mdlxl,'src/model-version.js')));
 const {assertModelEquivalent}=await import(pathToFileURL(path.join(mdlxl,'src/save-equivalence.js')));
 const {decodeDds}=await import(pathToFileURL(path.join(mdlxl,'src/dds.js')));
 const {encodePaintPng,decodePaintPng}=await import(pathToFileURL(path.join(mdlxl,'src/paint-project.js')));
 const cacheDirectory=path.join(root,'output/event-resource-cache');
 const casc=new CascTextures({cacheDirectory,openReader:folder=>new CascReader(folder,root)});
 const resolver=new TextureResolver({casc});
 const entries=await fs.readdir(archives).catch(error=>{if(error.code!=='ENOENT')throw error;return [];});
 const archiveFiles=['war3patch.mpq','war3x.mpq','war3xlocal.mpq','war3.mpq'].flatMap(name=>{
  const actual=entries.find(entry=>entry.toLowerCase()===name);return actual?[path.join(archives,actual)]:[];
 });
 const sources={folders:[path.join(root,'dist/models')],archives:archiveFiles,cascFolders:[game]};
 const extensions=[...IMAGE_EXTENSIONS,'slk','mdl','mdx','wav','mp3','ogg','flac'];
 const indexPath=path.join(root,'dist/event-resources.json');
 let manifest;
 try{manifest=JSON.parse(await fs.readFile(indexPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;manifest={events:{},files:{}};}
 // The fourth event-name character is an instance marker, not its Warcraft ID.
 manifest.events=Object.fromEntries(Object.entries(manifest.events).map(([key,value])=>[key.includes(':')?key:eventResourceKey(key),value]));
 const textureIndex=JSON.parse(await fs.readFile(path.join(root,'dist/textures.json'),'utf8'));
 const records=[],missing=[],conversions=[],emptyDefinitions=[],resolved=new Map(),preparedSpawns=new Map();
 const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
 await fs.mkdir(path.join(root,'dist/event-resources'),{recursive:true});
 async function save(name,bytes,sourceName=name,prefix='native'){
  const digest=hash(bytes),file='event-resources/'+prefix+'-'+digest.slice(0,24)+path.extname(sourceName).toLowerCase();
  await fs.writeFile(path.join(root,'dist',file),bytes);manifest.files[gamePathKey(name)]=file;
  records.push({name,sourceName,file,sha256:digest,bytes:bytes.length});
  return bytes;
 }
 const isSound=name=>/\.(wav|mp3|ogg|flac)$/i.test(name);
 const audioBytes=bytes=>bytes?.length>3&&(/^(OggS|fLaC|RIFF|ID3)/.test(bytes.subarray(0,4).toString())||bytes[0]===255&&(bytes[1]&224)===224);
 async function nativeSound(name){
  // CASC's general named-file fallback can return a same-stem DDS texture.
  // Select sound-list content keys through MDLxL's own sound matching rules.
  const source=await casc.soundIndex(game);if(!source)return null;
  const names=source.index.names||[];
  for(const candidate of [...soundCandidates(name,names,source.locales),...soundFallbacks(name,names,source.locales)]){
   const key=source.index.keys?.[candidate.toLowerCase()];if(!key)continue;
   const bytes=await casc.read('@ckey:'+key,[game]);
   if(audioBytes(bytes))return {bytes,sourceName:candidate};
  }
  return null;
 }
 async function compatibleTexture(name,bytes){
  if(bytes.subarray(0,4).toString()!=='DDS ')return bytes;
  const raster=decodeDds(bytes),png=Buffer.from(await encodePaintPng(raster)),decoded=await decodePaintPng(png);
  if(decoded.width!==raster.width||decoded.height!==raster.height||!Buffer.from(decoded.data).equals(Buffer.from(raster.data)))throw Error(name+': texture conversion changed pixels.');
  await save(name,png,name.replace(/\.[^./\\]+$/,'.png'),'rgba');
  conversions.push({name,sourceFormat:'DDS',previewFormat:'PNG',sourceSha256:hash(bytes),previewSha256:hash(png),pixelsPreserved:true});
  return png;
 }
 async function resource(name,required=true){
  const key=gamePathKey(name);
  if(resolved.has(key)){const bytes=resolved.get(key);if(!bytes&&required)missing.push(name);return bytes;}
  const existing=row.eventFiles?.[key]||row.textureFiles?.[key]||manifest.files[key]||textureIndex[key];
  if(existing){
   const input=await fs.readFile(path.join(root,'dist',existing));
   if(!isSound(name)||audioBytes(input)){manifest.files[key]=existing;const bytes=await compatibleTexture(name,input);resolved.set(key,bytes);return bytes;}
   delete manifest.files[key];
  }
  let found=(await resolver.resolve([name],sources,extensions))[0];
  if(isSound(name)&&!audioBytes(found?.bytes))found=await nativeSound(name);
  if(!found?.bytes){resolved.set(key,null);if(required)missing.push(name);return null;}
  const bytes=found.bytes.subarray(0,4).toString()==='DDS '?await compatibleTexture(name,found.bytes):await save(name,found.bytes,found.sourceName||name);
  resolved.set(key,bytes);return bytes;
 }
 async function spawnResource(name){
  const key=gamePathKey(name);
  if(preparedSpawns.has(key))return preparedSpawns.get(key);
  const bytes=await resource(name);if(!bytes)return null;
  let source;
  try{source=parseViewerSpawn(bytes,name);}
  catch(reason){
   if(!/\.mdx$/i.test(name))throw reason;
   let original=bytes,decoded=parseCompatibleMdx(original);
   if(hdContentIssues(decoded).length){
    const sdName='war3.w3mod:_sd.w3mod:'+name;
    const sd=(await resolver.resolve([sdName],sources,extensions))[0];
    if(sd?.bytes){original=sd.bytes;decoded=parseCompatibleMdx(original);}
   }
   const issues=hdContentIssues(decoded);
   if(issues.length)throw Error(name+': HD materials/weighted skin need a classic source to preserve the authored appearance.');
   if(decoded.ParticleEmitterPopcorns?.length)throw Error(name+': Popcorn effects cannot be represented by the classic viewer.');
   const target=structuredClone(decoded);normalizeVersionFields(target,800);
   // Classic lighting has no shadow-intensity field. Retain all classic light
   // values/tracks, and record the removed modern-only shadow metadata.
   const omittedLightFields=[];
   for(const [index,light]of (target.Lights||[]).entries())for(const field of ['ShadowIntensity','ShadowCasting','ShadowCastingStart','ShadowCastingEnd'])if(field in light){omittedLightFields.push({index,field,value:light[field]});delete light[field];}
   const generated=Buffer.from(generateCompatibleMdx(target));
   const before=parseMdx(original),after=parseMdx(generated);
   if(before.hasErrors||after.hasErrors)throw Error(name+': invalid conversion container.');
   const changed=new Set(['VERS','MTLS','GEOS','LITE']);
   const chunks=new Map(after.chunks.filter(c=>changed.has(c.tag)).map(c=>[c.tag,generated.subarray(c.offset,c.payloadOffset+c.declaredSize)]));
   const converted=Buffer.concat([original.subarray(0,4),...before.chunks.map(c=>changed.has(c.tag)?chunks.get(c.tag):original.subarray(c.offset,c.payloadOffset+c.declaredSize))]);
   assertModelEquivalent(target,parseCompatibleMdx(converted),{format:'mdx'});
   source=parseViewerSpawn(converted,name);
   await save(name,converted,name,'mdx800');
   resolved.set(key,converted);
   conversions.push({name,sourceVersion:decoded.Version,targetVersion:800,sourceSha256:hash(original),previewSha256:hash(converted),preserved:true,...(omittedLightFields.length?{omittedLightFields}:{})});
  }
  preparedSpawns.set(key,source);
  for(const info of source.Textures||[])if(info.Image&&![1,2].includes(info.ReplaceableId))await resource(info.Image);
  // Referenced child model assets belong to the upload too.
  for(const node of [...source.ParticleEmitters||[],...source.Attachments||[]])if(node.Path&&/\.(mdx|mdl)$/i.test(node.Path))await spawnResource(node.Path.replace(/\.mdl$/i,'.mdx'));
  return source;
 }
 let names=requested,catalogue;
 try{
  const nativeTables=['AnimSounds',...['Human','Orc','Undead','NightElf','Naga','Demon','Creeps'].map(race=>'Dialogue'+race+'Base')].map(name=>'war3.w3mod:UI\\SoundInfo\\'+name+'.slk');
  const tables=await resolver.resolve([...NODE_EVENT_TABLES,...nativeTables],sources,extensions);
  catalogue=eventCatalog(tables);
  if(fullLibrary)names=Object.entries(catalogue).flatMap(([type,entries])=>entries.map(entry=>type+'x'+entry.id));
  const pending=[...new Map(names.map(name=>[eventResourceKey(name),name])).values()];
  for(let i=0;i<pending.length;i++){
   const name=pending[i],key=eventResourceKey(name),type=name.slice(0,3).toUpperCase(),id=name.slice(4);
   const choices=['FPT','SPL'].includes(type)?[...catalogue.FPT,...catalogue.SPL]:catalogue[type];
   const entry=choices?.find(entry=>entry.id.toLowerCase()===id.toLowerCase());
   if(!entry){missing.push('Event definition: '+name);continue;}
   try{
    if(type==='SND'){
     const files=[];
     for(const file of entry.files||[])if(await resource(file,false))files.push(file);else missing.push(file);
     if(files.length)manifest.events[key]={type,files};
     else manifest.events[key]={type,files:[],unavailable:true};
    }else{
     const definition=entry.definition;
     // Warcraft itself leaves these table rows without a resource.
     if(!definition){manifest.events[key]={type,empty:true};emptyDefinitions.push(name);continue;}
     const bytes=type==='SPN'?await spawnResource(definition.resourcePath):await resource(definition.resourcePath);
     if(bytes)manifest.events[key]=definition;else manifest.events[key]={type,resourcePath:definition.resourcePath,unavailable:true,reason:'Not present in the local game sources.'};
    }
   }catch(error){missing.push(name+': '+error.message);manifest.events[key]={type,resourcePath:entry.definition?.resourcePath,unavailable:true,reason:error.message};if(entry.definition?.resourcePath)delete manifest.files[gamePathKey(entry.definition.resourcePath)];}
   if(fullLibrary&&(i+1)%100===0)console.log('Prepared '+(i+1)+'/'+pending.length+' event definitions.');
  }
 }finally{await resolver.close();}
 manifest.events=Object.fromEntries(Object.entries(manifest.events).sort(([a],[b])=>a.localeCompare(b)));
 manifest.files=Object.fromEntries(Object.entries(manifest.files).sort(([a],[b])=>a.localeCompare(b)));
 await fs.writeFile(indexPath,JSON.stringify(manifest,null,2)+'\n');
 const report={id:row.id,events:names,resources:records,conversions,emptyDefinitions,missing:[...new Set(missing)],counts:catalogue?Object.fromEntries(Object.entries(catalogue).map(([k,v])=>[k,v.length])):{}};
 await fs.mkdir(path.join(root,'output/model-events'),{recursive:true});
 await fs.writeFile(path.join(root,'output/model-events',row.id+'.json'),JSON.stringify(report,null,2)+'\n');
 if(report.missing.length)throw Error('Event dependencies requiring attention ('+report.missing.length+'):\n'+report.missing.join('\n'));
 console.log(row.id+': '+names.length+' event definitions prepared; '+records.length+' native resources added; '+conversions.length+' converted.');
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.shift()!=='--all'||args.length%2)throw Error('Usage: node tools/model-event-resources.mjs --all [--mdlxl path] [--archives path] [--game path]');
 const options=Object.fromEntries(Array.from({length:args.length/2},(_,i)=>[args[i*2],args[i*2+1]]));
 for(const key of Object.keys(options))if(!['--mdlxl','--archives','--game'].includes(key))throw Error('Unknown option '+key);
 await prepareModelEvents({root:path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),fullLibrary:true,mdlxl:options['--mdlxl']||'D:/Claude/MDLxL',archives:options['--archives']||'D:/WarcraftStuff',game:options['--game']||'D:/Warcraft III'});
}

