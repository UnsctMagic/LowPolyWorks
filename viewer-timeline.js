export function timelineMarkup(){
 return '<div class="control-row viewer-timeline"><input id="animation-time" class="range" type="range" min="0" max="0" step="1" value="0" aria-label="Animation time" title="Scrub animation" disabled><span id="animation-time-label" aria-hidden="true">0.00 / 0.00 s</span></div>';
}
export function mountTimeline(container,seek){
 const input=container.querySelector('#animation-time'),label=container.querySelector('#animation-time-label');
 input.oninput=()=>seek(Number(input.value));
 let lastTime,lastDuration;
 return ({time,duration})=>{
  time=Math.round(time);duration=Math.round(duration);
  if(time===lastTime&&duration===lastDuration)return;
  lastTime=time;lastDuration=duration;
  input.max=String(duration);input.value=String(time);input.disabled=duration<=0;
  const elapsed=(time/1000).toFixed(2),total=(duration/1000).toFixed(2);
  label.textContent=elapsed+' / '+total+' s';
  input.setAttribute('aria-valuetext',elapsed+' of '+total+' seconds');
 };
}
