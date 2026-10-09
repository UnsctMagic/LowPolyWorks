import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {unpackFile,inspectModel,findTexture,fileType,fileLimit,sha256,pathKey,modelPattern} from '../vendor/model-files.js';
import {fail,AUTHOR_ORIGIN,PUBLIC_ORIGIN} from './publishing.js';
const nativeTextures=JSON.parse(readFileSync(new URL('./native-textures.json',import.meta.url)));
export const unitArmies=JSON.parse(readFileSync(new URL('./unit-armies.json',import.meta.url)));
const unitColours=JSON.parse(readFileSync(new URL('./unit-colours.json',import.meta.url)));
const assetUrl=id=>AUTHOR_ORIGIN+'/api/assets?id='+id;
const text=(value,max,label)=>{if(typeof value!=='string'||!value.trim()||value.length>max)fail(400,'Enter '+label+'.');return value.trim();};
export function unitView(card){return {...card,coverUrl:assetUrl(card.coverId),url:PUBLIC_ORIGIN+'/#model/'+card.id,models:card.models.map(model=>({...model,fileUrl:assetUrl(model.assetId),textureFiles:Object.fromEntries(Object.entries(model.textureAssets).map(([key,id])=>[key,assetUrl(id)]))})),downloads:card.downloads.map(file=>({...file,url:assetUrl(file.id)}))};}
export function unitCatalogue(state){return {cards:(state.unitCards||[]).filter(card=>!card.deletedAt).map(unitView),hiddenModels:state.hiddenModels||[]};}
export function createUnitCards({store,authenticate,createUploadToken,inspectUpload,readUpload,saveAsset,now}){
 return async function execute(action,input,request){
  if(!['unit-upload-token','unit-upload-complete','publish-unit','update-unit','delete-unit','restore-unit','hide-model','restore-model'].includes(action))return null;
  const {state}=await store.read(),author=authenticate(state,request,true);
  if(action==='unit-upload-token'){
   const name=text(input.name,180,'a file name');if(!/\.(mdx|mdl|zip|blp|tga|png|jpe?g|webp)$/i.test(name))fail(400,'Choose a model, ZIP, or model texture.');
   if(!Number.isInteger(input.size)||input.size<1||input.size>fileLimit)fail(400,'Each file must be at most 100 MB.');
   const type=fileType(name),id=randomUUID(),pathname='publishing/units/'+author.id+'/'+id+'/'+name.replace(/[^a-zA-Z0-9._-]/g,'_');
   const clientToken=await createUploadToken({pathname,type,size:input.size});
   await store.mutate(s=>{authenticate(s,request,true);s.uploads??=[];s.uploads.push({id,authorId:author.id,pathname,name,type,size:input.size,kind:'unit',ready:false});});
   return {id,pathname,clientToken,type};
  }
  if(action==='unit-upload-complete'){
   const upload=state.uploads?.find(u=>u.id===input.id&&u.authorId===author.id&&u.kind==='unit');if(!upload)fail(404,'Upload not found.');
   if(upload.ready)return {upload:{id:upload.id,name:upload.name,sha256:upload.sha256,models:upload.models}};
   const blob=await inspectUpload(upload.pathname);if(blob.contentType!==upload.type||blob.size!==upload.size)fail(400,'The uploaded file does not match the selected file.');
   const bytes=await readUpload(upload.pathname);if(bytes.length!==upload.size)fail(400,'The upload is incomplete.');
   let entries,models;try{entries=unpackFile(upload.name,bytes);models=entries.filter(e=>modelPattern.test(e.name)).map(inspectModel);}catch(error){fail(400,error.message);}
   if(/\.zip$/i.test(upload.name)&&!models.length)fail(400,'The ZIP does not contain an MDX or MDL model.');
   const extracted=[];
   for(const entry of entries){
    entry.sha256=await sha256(entry.bytes);
    if(!/\.zip$/i.test(upload.name)){entry.id=upload.id;continue;}
    entry.id=randomUUID();const pathname='publishing/units/'+author.id+'/'+upload.id+'/'+entry.id;
    await saveAsset(pathname,entry.bytes,fileType(entry.name));extracted.push({id:entry.id,parentUploadId:upload.id,authorId:author.id,pathname,name:entry.name,type:fileType(entry.name),size:entry.bytes.length,sha256:entry.sha256,kind:'unit-asset',ready:true});
   }
   const manifest=entries.map(({name,id,sha256})=>({name,id,sha256}));
   const inspected=models.map(model=>({...model,uploadId:upload.id,sourceName:upload.name,assetId:entries.find(e=>e.name===model.name).id,sha256:entries.find(e=>e.name===model.name).sha256}));
   const hash=await sha256(bytes);
   return store.mutate(s=>{authenticate(s,request,true);const current=s.uploads.find(u=>u.id===upload.id);if(!current.ready){s.uploads.push(...extracted);Object.assign(current,{ready:true,sha256:hash,entries:manifest,models:inspected});}return {upload:{id:current.id,name:current.name,sha256:current.sha256,models:current.models}};});
  }
  if(action==='hide-model'||action==='restore-model'){
   if(author.role!=='owner')fail(403,'Only the admin can delete unit cards.');
   if(!/^[a-z0-9-]{1,100}$/.test(input.id||''))fail(400,'Choose a unit card.');
   return store.mutate(s=>{if(authenticate(s,request,true).role!=='owner')fail(403,'Admin access required.');s.hiddenModels??=[];s.hiddenModels=s.hiddenModels.filter(id=>id!==input.id);if(action==='hide-model')s.hiddenModels.push(input.id);return {hiddenModels:s.hiddenModels};});
  }
  if(['delete-unit','restore-unit'].includes(action))return store.mutate(s=>{
   if(authenticate(s,request,true).role!=='owner')fail(403,'Only the admin can delete unit cards.');
   const card=s.unitCards?.find(c=>c.id===input.id);if(!card)fail(404,'Unit card not found.');
   if(input.revision!==(card.revision||0))fail(409,'This card changed. Reload before trying again.');
   const timestamp=new Date(now()).toISOString();if(action==='delete-unit')card.deletedAt=timestamp;else delete card.deletedAt;card.revision=(card.revision||0)+1;
   const post=s.posts.find(p=>p.unitCardId===card.id);if(post){if(card.deletedAt)post.deletedAt=timestamp;else delete post.deletedAt;post.revision=(post.revision||0)+1;}
   const job=s.notifications.find(j=>j.id===post?.id);if(job&&card.deletedAt)job.cancelledAt=timestamp;
   return {card:unitView(card)};
  });
  return store.mutate(s=>{
   const current=authenticate(s,request,true);s.unitCards??=[];
   const existing=s.unitCards.find(card=>card.id===input.id);
   if(existing&&existing.authorId!==current.id&&current.role!=='owner')fail(403,'This card belongs to another author.');
   if(action==='publish-unit'&&existing)return {card:unitView(existing)};
   if(action==='update-unit'&&(!existing||existing.deletedAt))fail(404,'Unit card not found.');
   if(existing&&input.revision!==(existing.revision||0))fail(409,'This card changed. Reload before saving.');
   if(!/^unit-[a-f0-9-]{36}$/i.test(input.id||''))fail(400,'A unit card ID is required.');
   const project=s.projects.find(p=>p.id===input.projectId);if(!project)fail(400,'Choose a project.');
   const army=project.id==='warhammercraft'&&unitArmies.find(a=>a.id===input.army);if(project.id==='warhammercraft'&&!army)fail(400,'Choose a WarhammerCraft army.');
   const ids=input.uploadIds||existing?.uploadIds;
   if(!Array.isArray(ids)||!ids.length||ids.length>30||new Set(ids).size!==ids.length)fail(400,'Upload models and their textures first.');
   const uploads=ids.map(id=>s.uploads?.find(u=>u.id===id&&u.ready&&u.kind==='unit'&&(u.authorId===current.id||existing?.uploadIds.includes(id))));if(uploads.some(u=>!u))fail(400,'Finish uploading your own files first.');
   const entries=uploads.flatMap(u=>u.entries),models=uploads.flatMap(u=>u.models);
   if(!models.length||models.length>20)fail(400,'A card must contain 1–20 models.');
   const rendered=models.map(model=>{
    const textureAssets={};for(const ref of model.textureRefs){let texture;try{const own=uploads.find(u=>u.id===model.uploadId);texture=findTexture(own?.entries||[],model.name,ref)||findTexture(uploads.filter(u=>!u.models.length).flatMap(u=>u.entries),model.name,ref);}catch(error){fail(400,error.message);}if(texture)textureAssets[pathKey(ref)]=texture.id;else if(!nativeTextures[ref.toLowerCase()]&&!nativeTextures[pathKey(ref).replaceAll('/','\\')])fail(400,'Missing texture: '+ref+'. Add it with the model files.');}
    return {...model,textureAssets};
   });
   const coverId=input.coverId||existing?.coverId,cover=s.uploads?.find(u=>u.id===coverId&&u.ready&&u.type==='image/png'&&(u.authorId===current.id||existing?.coverId===u.id));if(!cover)fail(400,'Generate the card image before publishing.');
   const selected=input.defaultModelId||existing?.defaultModelId||rendered[0].assetId;if(!rendered.some(m=>m.assetId===selected))fail(400,'Choose one of this card’s models.');
   const teamColour=input.teamColour||existing?.teamColour||army?.teamColour||army?.colour||unitColours[0];if(!unitColours.includes(teamColour))fail(400,'Choose a Warcraft player colour.');
   const timestamp=new Date(now()).toISOString(),content={name:text(input.name,160,'a unit name'),description:text(input.description,20000,'a description'),credits:text(input.credits,20000,'the credits'),byline:text(input.byline,2000,'the finished model authors'),projectId:project.id,projectName:project.name,army:army?.id||null,coverId,defaultModelId:selected,uploadIds:ids,models:rendered,downloads:uploads.map(u=>({id:u.id,name:u.name,sha256:u.sha256,bytes:u.size})),assetIds:[...new Set([coverId,...ids,...entries.map(e=>e.id)])]};
   content.teamColour=teamColour;let card=existing;
   if(card)Object.assign(card,content,{updatedAt:timestamp,revision:(card.revision||0)+1});else{card={id:input.id,authorId:current.id,...content,publishedAt:timestamp,revision:0};s.unitCards.push(card);}
   let post=s.posts.find(p=>p.unitCardId===card.id);const postContent={title:card.name,body:card.description,kind:'model-upload',projectId:card.projectId,link:PUBLIC_ORIGIN+'/#model/'+card.id,media:[],videos:[],poll:null};
   if(post)Object.assign(post,postContent,{updatedAt:timestamp,revision:(post.revision||0)+1});else{post={id:randomUUID(),authorId:current.id,...postContent,unitCardId:card.id,publishedAt:timestamp};s.posts.push(post);}
   return {card:unitView(card)};
  });
 };
}
