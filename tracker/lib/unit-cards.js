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
export function unitCatalogue(state){return {cards:(state.unitCards||[]).filter(card=>!card.deletedAt).map(unitView),hiddenModels:state.hiddenModels||[],modelEdits:state.modelEdits||{}};}
// Permanent removal hides a card at once and keeps it restorable for this long.
export const REMOVAL_DELAY=86400000;
const catalogueId=/^[a-z0-9-]{1,100}$/;
const linkOf=(value,label)=>{let url;try{url=new URL(value);}catch{fail(400,'Enter a full https:// link for '+label+'.');}if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.href.length>2000)fail(400,'Enter a full https:// link for '+label+'.');return url.href;};
const linkList=(value,max,key,label)=>{if(!Array.isArray(value)||value.length>max)fail(400,'Enter at most '+max+' '+label+'.');return value.map(row=>({[key]:text(row?.[key],200,'a name for every '+label.replace(/s$/,'')),url:linkOf(row?.url,row[key])}));};
export function expiredRemovals(state,time){return (state.unitCards||[]).some(card=>card.removeAt&&Date.parse(card.removeAt)<=time)||Object.values(state.modelRemovals||{}).some(row=>Date.parse(row.removeAt)<=time);}
// Deletes expired removals from the state and returns the private files they leave unreferenced.
export function purgeRemovals(s,time){
 const removed=[],files=[],posts=new Set(),timestamp=new Date(time).toISOString();s.modelRemovals??={};
 for(const [id,row] of Object.entries(s.modelRemovals))if(Date.parse(row.removeAt)<=time){delete s.modelRemovals[id];delete s.modelEdits?.[id];s.removedModels=[...new Set([...(s.removedModels||[]),id])];if(!(s.hiddenModels||[]).includes(id))(s.hiddenModels??=[]).push(id);removed.push(id);}
 const expired=(s.unitCards||[]).filter(card=>card.removeAt&&Date.parse(card.removeAt)<=time);
 if(expired.length){
  s.unitCards=s.unitCards.filter(card=>!expired.includes(card));
  for(const post of s.posts)if(expired.some(card=>card.id===post.unitCardId))posts.add(post.id);
  s.posts=s.posts.filter(post=>!posts.has(post.id));
  const kept=new Set(s.unitCards.flatMap(card=>[card.coverId,...card.uploadIds,...card.assetIds]));
  const owned=new Set(expired.flatMap(card=>[card.coverId,...card.uploadIds,...card.assetIds]).filter(id=>!kept.has(id)));
  s.uploads=(s.uploads||[]).filter(upload=>{const drop=owned.has(upload.id)||upload.parentUploadId&&owned.has(upload.parentUploadId);if(drop)files.push(upload.pathname);return !drop;});
  for(const card of expired){delete s.modelReleases?.models?.[card.id];(s.removedCards??={})[card.id]={name:card.name,removedAt:timestamp};removed.push(card.id);}
 }
 for(const job of s.notifications||[])if(!job.cancelledAt&&(removed.includes(job.modelId)||posts.has(job.id)))job.cancelledAt=timestamp;
 return {removed,files:[...new Set(files)]};
}
export function createUnitCards({store,authenticate,createUploadToken,inspectUpload,readUpload,saveAsset,deleteFiles=async()=>{},now,recordRelease}){
 async function purge(){
  const result=await store.mutate(s=>purgeRemovals(s,now()));
  if(result.files.length)try{await deleteFiles(result.files);}catch(error){console.error('Removed unit files could not be deleted',error.name);}
  return result;
 }
 async function execute(action,input,request){
  if(!['unit-upload-token','unit-upload-complete','publish-unit','update-unit','delete-unit','restore-unit','remove-unit','undo-remove-unit','hide-model','restore-model','remove-model','undo-remove-model','edit-model','reset-model'].includes(action))return null;
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
  if(['hide-model','restore-model','remove-model','undo-remove-model','edit-model','reset-model'].includes(action)){
   if(author.role!=='owner')fail(403,'Only the admin can manage catalogue cards.');
   if(!catalogueId.test(input.id||'')||input.id.startsWith('unit-'))fail(400,'Choose a unit card.');
   const edit=action==='edit-model'&&{name:text(input.name,160,'a unit name'),army:unitArmies.find(a=>a.id===input.army)?.id||fail(400,'Choose a WarhammerCraft army.'),description:text(input.description,20000,'a description'),credits:text(input.credits,20000,'the credits'),authors:linkList(input.authors,20,'name','authors'),creditLinks:linkList(input.creditLinks,60,'text','credit links')};
   if(edit&&!edit.authors.length)fail(400,'Enter the finished model authors.');
   return store.mutate(s=>{
    if(authenticate(s,request,true).role!=='owner')fail(403,'Admin access required.');
    s.hiddenModels??=[];s.modelRemovals??={};s.modelEdits??={};
    const time=now(),removal=s.modelRemovals[input.id];
    if((s.removedModels||[]).includes(input.id))fail(410,'This card was removed permanently.');
    if(removal&&action!=='undo-remove-model')fail(409,'Undo the removal before changing this card.');
    if(action==='undo-remove-model'){if(!removal||Date.parse(removal.removeAt)<=time)fail(410,'The 24-hour undo window has ended.');delete s.modelRemovals[input.id];if(!removal.wasHidden)s.hiddenModels=s.hiddenModels.filter(id=>id!==input.id);}
    else if(action==='remove-model'){s.modelRemovals[input.id]={removeAt:new Date(time+REMOVAL_DELAY).toISOString(),wasHidden:s.hiddenModels.includes(input.id)};if(!s.hiddenModels.includes(input.id))s.hiddenModels.push(input.id);for(const job of s.notifications||[])if(job.modelId===input.id&&!job.cancelledAt)job.cancelledAt=new Date(time).toISOString();}
    else if(action==='edit-model'||action==='reset-model'){const current=s.modelEdits[input.id];if((input.revision??0)!==(current?.revision||0))fail(409,'This card changed. Reload before saving.');if(action==='reset-model')delete s.modelEdits[input.id];else s.modelEdits[input.id]={...edit,updatedAt:new Date(time).toISOString(),revision:(current?.revision||0)+1};}
    else{s.hiddenModels=s.hiddenModels.filter(id=>id!==input.id);if(action==='hide-model')s.hiddenModels.push(input.id);}
    return {hiddenModels:s.hiddenModels,modelRemovals:s.modelRemovals,modelEdits:s.modelEdits};
   });
  }
  if(['delete-unit','restore-unit','remove-unit','undo-remove-unit'].includes(action))return store.mutate(s=>{
   if(authenticate(s,request,true).role!=='owner')fail(403,'Only the admin can delete unit cards.');
   const card=s.unitCards?.find(c=>c.id===input.id);if(!card)fail(404,'Unit card not found.');
   if(input.revision!==(card.revision||0))fail(409,'This card changed. Reload before trying again.');
   const time=now(),timestamp=new Date(time).toISOString();
   if(card.removeAt&&action!=='undo-remove-unit')fail(409,'Undo the removal before changing this card.');
   if(action==='undo-remove-unit'){if(!card.removeAt||Date.parse(card.removeAt)<=time)fail(410,'The 24-hour undo window has ended.');if(!card.hiddenBeforeRemoval)delete card.deletedAt;delete card.removeAt;delete card.hiddenBeforeRemoval;}
   else if(action==='remove-unit'){card.hiddenBeforeRemoval=Boolean(card.deletedAt);card.deletedAt??=timestamp;card.removeAt=new Date(time+REMOVAL_DELAY).toISOString();}
   else if(action==='delete-unit')card.deletedAt=timestamp;else delete card.deletedAt;
   card.revision=(card.revision||0)+1;
   const post=s.posts.find(p=>p.unitCardId===card.id);if(post){if(card.deletedAt)post.deletedAt=card.deletedAt;else delete post.deletedAt;post.revision=(post.revision||0)+1;}
   if(card.deletedAt)for(const job of s.notifications)if((job.id===post?.id||card.removeAt&&job.modelId===card.id)&&!job.cancelledAt)job.cancelledAt=timestamp;
   return {card:unitView(card)};
  });
  return store.mutate(s=>{
   const current=authenticate(s,request,true);s.unitCards??=[];
   const existing=s.unitCards.find(card=>card.id===input.id);
   if(existing&&existing.authorId!==current.id&&current.role!=='owner')fail(403,'This card belongs to another author.');
   if(action==='publish-unit'&&existing)return {card:unitView(existing)};
   if(action==='update-unit'&&!existing)fail(404,'Unit card not found.');
   if(action==='update-unit'&&existing.deletedAt)fail(409,existing.removeAt?'Undo the removal before editing this card.':'Show this card on the site before editing it.');
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
   const modelChanged=!existing||JSON.stringify(existing.downloads.map(file=>file.sha256).sort())!==JSON.stringify(content.downloads.map(file=>file.sha256).sort());
   content.teamColour=teamColour;let card=existing;
   if(card)Object.assign(card,content,{updatedAt:timestamp,revision:(card.revision||0)+1});else{card={id:input.id,authorId:current.id,...content,publishedAt:timestamp,revision:0};s.unitCards.push(card);}
   let post=s.posts.find(p=>p.unitCardId===card.id);const postContent={title:card.name,body:card.description,kind:'model-upload',projectId:card.projectId,link:PUBLIC_ORIGIN+'/#model/'+card.id,media:[],videos:[],poll:null};
   if(post)Object.assign(post,postContent,{updatedAt:timestamp,revision:(post.revision||0)+1});else{post={id:randomUUID(),authorId:current.id,...postContent,unitCardId:card.id,publishedAt:timestamp};s.posts.push(post);}
   if(modelChanged)recordRelease(s,card);
   return {card:unitView(card),modelChanged};
  });
 }
 return Object.assign(execute,{purge});
}
