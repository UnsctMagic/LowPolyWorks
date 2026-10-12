const dayMs=24*60*60*1000;
const greens=['#83e69a','#63c37b','#48985f'];

export function modelUpdateTag(publishedAt,now=Date.now()){
 const time=Date.parse(publishedAt),age=now-time;
 if(!Number.isFinite(time)||age<0||age>=3*dayMs)return null;
 const day=Math.floor(age/dayMs);
 return {label:'New!',colour:greens[day],day,nextAt:time+(day+1)*dayMs};
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
   const info=modelUpdateTag(updates[element.dataset.modelUpdated]?.publishedAt,time);
   element.hidden=!info;
   if(info){element.textContent=info.label;element.style.color=info.colour;element.dataset.day=String(info.day);next=Math.min(next,info.nextAt);}
  }
  if(Number.isFinite(next))timer=setTimer(refresh,Math.max(1,next-time));
 }
 refresh();
 root.ownerDocument.addEventListener('visibilitychange',refresh);
 return ()=>{clearTimer(timer);root.ownerDocument.removeEventListener('visibilitychange',refresh);};
}
