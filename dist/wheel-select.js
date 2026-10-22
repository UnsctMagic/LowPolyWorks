// Mouse wheel over a dropdown steps through its options and fires change, like MDLVis's sequence list.
export function wheelSelect(select){
 if(select.dataset.wheelSelect)return;
 select.dataset.wheelSelect='on';
 let travel=0;
 select.addEventListener('wheel',event=>{
  if(select.disabled||select.options.length<2)return;
  event.preventDefault();
  travel+=event.deltaMode?event.deltaY*40:event.deltaY;
  if(Math.abs(travel)<40)return;
  const index=Math.max(0,Math.min(select.options.length-1,select.selectedIndex+Math.sign(travel)));travel=0;
  if(index===select.selectedIndex)return;
  select.selectedIndex=index;select.dispatchEvent(new Event('change',{bubbles:true}));
 },{passive:false});
}
