const dayMs=24*60*60*1000;
const greens=['#83e69a','#63c37b','#48985f'];
const dateFormat=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',timeZone:'Europe/Amsterdam'});

export function modelUpdateTag(timestamp,now=Date.now(),isNew=false){
 const time=Date.parse(timestamp),age=now-time;
 if(!Number.isFinite(time)||age<0||age>=3*dayMs)return null;
 const day=Math.floor(age/dayMs);
 return {label:isNew?'New!':'Updated '+dateFormat.format(time),colour:greens[day],day,nextAt:time+(day+1)*dayMs};
}

// Variants published together are one launch. Later publications update that card.
export function groupModelUpdate(ids,updates){
 const variants=ids.map(id=>updates[id]).filter(Boolean);
 // A legacy record without a publication date already existed before a new variant.
 const firstPublication=Math.min(...variants.map(variant=>Date.parse(variant.publishedAt)||0));
 const record={};
 for(const {publishedAt,updatedAt} of variants){
  const publication=Date.parse(publishedAt);
  if(publication===firstPublication)record.publishedAt=publishedAt;
  const change=publication>firstPublication&&publication>(Date.parse(updatedAt)||0)?publishedAt:updatedAt;
  if(Date.parse(change)>(Date.parse(record.updatedAt)||0))record.updatedAt=change;
 }
 return record;
}

export function modelUpdateTagMarkup(id){
 const safe=String(id).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return `<span class="model-update-tag" data-model-updated="${safe}" hidden></span>`;
}

export function mountModelUpdateTags(root,updates,{now=()=>Date.now(),setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let timer;
 function refresh(){
  clearTimer(timer);
  const time=now();let next=Infinity;
  for(const element of root.querySelectorAll('[data-model-updated]')){
   const record=updates[element.dataset.modelUpdated];
   const info=modelUpdateTag(record?.updatedAt,time)||modelUpdateTag(record?.publishedAt,time,true);
   element.hidden=!info;
   if(info){element.textContent=info.label;element.style.color=info.colour;element.dataset.day=String(info.day);next=Math.min(next,info.nextAt);}
  }
  if(Number.isFinite(next))timer=setTimer(refresh,Math.max(1,next-time));
 }
 refresh();
 root.ownerDocument.addEventListener('visibilitychange',refresh);
 return ()=>{clearTimer(timer);root.ownerDocument.removeEventListener('visibilitychange',refresh);};
}
