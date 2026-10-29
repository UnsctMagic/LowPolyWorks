import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync} from 'fflate';
import {modelContent,packageContent} from './lib/model-release-content.js';
import {publishedModels} from './lib/model-releases.js';
import {mdx} from './model-release-fixtures.js';

test('internal MDX names are silent; every other model byte and texture reference matters',()=>{
 const original=mdx('same',{name:'Old name',textures:['Textures\\custom.blp']}),copy=Buffer.from(original);
 const first=modelContent(original),renamed=modelContent(mdx('same',{name:'New name',textures:['Textures\\custom.blp']}));
 assert.deepEqual(first,renamed);assert.deepEqual(original,copy);
 assert.notEqual(first.contentHash,modelContent(mdx('geometry changed',{textures:['Textures\\custom.blp']})).contentHash);
 assert.notEqual(first.contentHash,modelContent(mdx('same',{textures:['Textures\\other.blp']})).contentHash);
 const extents=Buffer.from(original);extents[4+8+340]=1;assert.notEqual(first.contentHash,modelContent(extents).contentHash);
 assert.throws(()=>modelContent(original.subarray(0,-1)),/incomplete/);
});

test('shared ZIPs compare only this model and its textures, independent of repacking or internal names',()=>{
 const refs=['Textures\\skin.blp'],model=mdx('a',{textures:refs});
 const pack=(entries,options={})=>zipSync(entries,options);
 const first=pack({'a.mdx':model,'Textures/skin.blp':Buffer.from('skin'),'b.mdx':mdx('old sibling')},{level:0,mtime:new Date('2020-01-01')});
 const repacked=pack({'folder/b.mdx':mdx('updated sibling'),'folder/Textures/skin.blp':Buffer.from('skin'),'folder/a.mdx':mdx('a',{name:'Renamed',textures:refs})},{level:9,mtime:new Date('2026-01-01')});
 const fingerprint=packageContent(first,'a.mdx',refs);
 assert.equal(fingerprint,packageContent(repacked,'a.mdx',refs));
 assert.equal(fingerprint,packageContent(first,'renamed-download.mdx',refs,modelContent(model).contentHash));
 assert.notEqual(fingerprint,packageContent(pack({'a.mdx':model,'Textures/skin.blp':Buffer.from('changed skin')}),'a.mdx',refs));
 assert.notEqual(fingerprint,packageContent(pack({'a.mdx':mdx('changed a',{textures:refs}),'Textures/skin.blp':Buffer.from('skin')}),'a.mdx',refs));
 assert.throws(()=>packageContent(Buffer.from('PKbroken'),'a.mdx',refs));
});

test('published snapshots use the existing variant groups and scope shared-package caches to this model',async()=>{
 let model=mdx('vampire',{textures:['skin.blp']}),skin='old',packageCalls=0,conditions=[];
 const fetchApi=async(url,options)=>{
  const path=new URL(url).pathname;
  if(path==='/catalogue.json')return Response.json([{id:'vampire',name:'Vampire',file:'vampire.mdx',downloadPack:'shared.zip'}]);
  if(path==='/variants.json')return Response.json([{id:'vampire-family',variants:[{id:'vampire',label:'Hero'},{id:'vampire-unit',label:'Unit'}]}]);
  if(path.endsWith('.mdx'))return new Response(model,{headers:{etag:'"model"'}});
  packageCalls++;conditions.push(options.headers['If-None-Match']);
  return new Response(zipSync({'vampire.mdx':model,'skin.blp':Buffer.from(skin),'second.blp':Buffer.from('second')}),{headers:{etag:'"pack"'}});
 };
 const {models:[first]}=await publishedModels({}, {fetchApi});
 assert.equal(first.releaseId,'vampire-family');assert.deepEqual(first.relatedModelIds,['vampire','vampire-unit']);
 skin='new';const {models:[second]}=await publishedModels({vampire:first},{fetchApi});assert.notEqual(second.contentFingerprint,first.contentFingerprint);assert.equal(conditions[1],'"pack"');
 model=mdx('vampire',{textures:['second.blp']});await publishedModels({vampire:second},{fetchApi});assert.equal(conditions[2],undefined);assert.equal(packageCalls,3);
});

test('missing variant metadata stops the scan before any announcement can be recorded',async()=>{
 await assert.rejects(publishedModels({}, {fetchApi:async url=>url.endsWith('/catalogue.json')?Response.json([]):new Response(null,{status:503})}),/variants unavailable/);
});
test('a shared presentation group does not turn distinct units into one release',async()=>{
 const {models:[model]}=await publishedModels({}, {fetchApi:async url=>{
  if(url.endsWith('/catalogue.json'))return Response.json([{id:'captain',name:'Captain',file:'captain.mdx'}]);
  if(url.endsWith('/variants.json'))return Response.json([{id:'infantry',variants:[{id:'captain',label:'Captain'},{id:'swordsman',label:'Swordsman'}]}]);
  return new Response(mdx());
 }});
 assert.equal(model.releaseId,'captain');assert.deepEqual(model.relatedModelIds,['captain']);
});
