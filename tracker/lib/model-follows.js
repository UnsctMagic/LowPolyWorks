export function createModelFollows({store,env,sendEmail,mailConfigured,now,loadModels,sign,safeEqual,limit,emailOf,token,digest,fail,publicOrigin}){
 const managementToken=sub=>sub.id+'.'+(sub.followVersion||0)+'.'+sign('model-follows:'+sub.id+':'+(sub.followVersion||0));
 const view=sub=>({email:sub.email,modelIds:[...(sub.modelIds||[])]});
 function follow(sub,modelId){
  sub.modelIds??=[];sub.modelFollowSince??={};
  if(!sub.modelIds.length)sub.newModelsSince=now();
  if(!sub.modelIds.includes(modelId)){sub.modelIds.push(modelId);sub.modelFollowSince[modelId]=now();}
  sub.emailVerified=true;sub.confirmed=true;
 }
 function subscriber(state,credential){
  const [id,version,signature]=String(credential||'').split('.');
  const sub=state.subscribers.find(row=>row.id===id&&(row.emailVerified||row.confirmed)&&String(row.followVersion||0)===version);
  if(!sub||!signature||!safeEqual(signature,sign('model-follows:'+id+':'+version)))fail(403,'Confirm your email again to manage model follows.');
  return sub;
 }
 async function modelOf(id){
  if(typeof id!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))fail(400,'Choose a model.');
  const model=(await loadModels()).find(row=>row.id===id);
  if(!model)fail(404,'This model is not in the catalogue.');
  return model;
 }
 return async function execute(action,input,request){
  if(action==='follow-status'){const {state}=await store.read();return view(subscriber(state,input.token));}
  if(action==='unfollow')return store.mutate(state=>{
   const sub=subscriber(state,input.token);sub.modelIds=(sub.modelIds||[]).filter(id=>id!==input.modelId);delete sub.modelFollowSince?.[input.modelId];sub.confirmed=sub.modelIds.length>0;
   return {...view(sub),message:sub.confirmed?'Update me is off for this model.':'Update me is off. You will receive no model emails.'};
  });
  if(action==='follow-confirm'){
   const [id,modelId,credential]=String(input.token||'').split('.');await modelOf(modelId);
   return store.mutate(state=>{
    const sub=state.subscribers.find(row=>row.id===id),pending=sub?.pendingFollows?.find(row=>row.modelId===modelId&&safeEqual(row.hash,digest(credential||''))&&row.expiresAt>now());
    if(!pending)fail(400,'This confirmation has expired or was already used. Request Update me again.');
    if(pending.replaces){
     const previous=state.subscribers.find(row=>row.id===pending.replaces.id&&(row.followVersion||0)===pending.replaces.version);
     if(previous){previous.modelIds=(previous.modelIds||[]).filter(id=>id!==modelId);delete previous.modelFollowSince?.[modelId];previous.confirmed=previous.modelIds.length>0;}
    }
    follow(sub,modelId);sub.pendingFollows=sub.pendingFollows.filter(row=>row!==pending);
    return {...view(sub),token:managementToken(sub),message:'Email confirmed. Update me is on for this model and new model uploads.'};
   });
  }
  if(!mailConfigured(env))fail(503,'Update me is not connected yet.');
  const model=await modelOf(input.modelId);
  if(input.token)return store.mutate(state=>{
   const sub=subscriber(state,input.token);follow(sub,model.id);
   return {...view(sub),message:'Update me is on. You are following this model and new model uploads.'};
  });
  await limit(request,'follow',5);const email=emailOf(input.email),id=digest(email),confirmation=token(),time=now();
  await store.mutate(state=>{
   const previous=input.previousToken?subscriber(state,input.previousToken):null;
   let sub=state.subscribers.find(row=>row.id===id);
   if(!sub){sub={id,email,confirmed:false,createdAt:new Date(time).toISOString(),modelIds:[]};state.subscribers.push(sub);}
   sub.pendingFollows=(sub.pendingFollows||[]).filter(row=>row.modelId!==model.id&&row.expiresAt>time);
   const pending={modelId:model.id,hash:digest(confirmation),expiresAt:time+86400000};
   if(previous&&previous.id!==id)pending.replaces={id:previous.id,version:previous.followVersion||0};
   sub.pendingFollows.push(pending);
  });
  const credential=encodeURIComponent(id+'.'+model.id+'.'+confirmation);
  const url=model.url?publicOrigin+'/?follow-confirm='+credential+'#model/'+model.id:publicOrigin+'/model/'+(model.slug||model.id)+'/#follow-confirm='+credential;
  await sendEmail({to:email,subject:'Confirm Update me — '+model.name,text:'Confirm that you want emails when '+model.name+' is updated or new models are uploaded. No news or general announcements.\n\n'+url+'\n\nThis link expires in 24 hours. If you did not request this, ignore this email.'},'lpw-follow-confirm/'+confirmation,env);
  return {message:'Check your email to confirm Update me. It stays off until you confirm.'};
 };
}
