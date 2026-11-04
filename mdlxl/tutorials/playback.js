export function mountTutorialPlayers(root, animations) {
const players=[];
function at(starts,time){let lo=0,hi=starts.length-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(starts[m]<=time)lo=m;else hi=m-1}return lo}
for(const host of root.querySelectorAll('[data-animation]')){
 const data=animations[host.dataset.animation],canvas=host.querySelector('canvas'),key=host.querySelector('.tutorial-hotkey'),ctx=canvas.getContext('2d',{alpha:false}),starts=[];let sum=0;for(const d of data.durations){starts.push(sum);sum+=d}
 // Continuous instructional cues include the lead-in, keeping the badge stable across repeats.
 const firstCue=data.cues[0],leadCue=firstCue&&data.cues.at(-1).endFrame===data.durations.length&&data.cues.every((c,i)=>!i||data.cues[i-1].endFrame===c.startFrame)?firstCue:null;
 const p={host,visible:false,request:null,decoder:null,ready:false,busy:false,start:null,last:-1,lastLoop:-1,currentKey:'',keySince:0,holdUntil:0,generation:0};
 p.draw=async(now)=>{if(!p.visible||p.busy||!p.decoder||!p.ready||now<p.holdUntil)return;if(p.start===null)p.start=now;const elapsed=Math.max(0,now-p.start),loop=Math.floor(elapsed/sum),frame=at(starts,elapsed%sum),cue=data.cues.find(c=>frame>=c.startFrame&&frame<c.endFrame)||(leadCue&&frame<leadCue.startFrame?leadCue:null),label=cue?.key||'';
 if(loop===p.lastLoop&&frame===p.last)return;
 if(p.currentKey&&label!==p.currentKey&&now-p.keySince<1000){const wait=1000-(now-p.keySince);p.holdUntil=now+wait;p.start+=wait;return}
 p.busy=true;const generation=p.generation;try{const result=await p.decoder.decode({frameIndex:frame});if(generation===p.generation&&p.visible){ctx.drawImage(result.image,0,0);if(label!==p.currentKey){key.textContent=label;key.hidden=!label;p.keySince=performance.now();p.currentKey=label;}p.last=frame;p.lastLoop=loop;host.dataset.frame=String(frame);host.dataset.key=label;host.dataset.phase=data.ranges.find(r=>frame>=r.start&&frame<r.end)?.phase||'';host.dataset.time=String(starts[frame]);}result.image.close()}catch(error){if(generation===p.generation)console.error('Tutorial playback',error)}finally{p.busy=false}};
 p.close=()=>{p.request?.abort();p.request=null;p.decoder?.close();p.decoder=null;p.ready=false};
 p.open=async()=>{
  if(p.decoder||p.request)return;
  const request=new AbortController();p.request=request;
  try{
   const response=await fetch(data.url,{signal:request.signal});if(!response.ok)throw Error('Tutorial GIF could not load');
   const bytes=await response.arrayBuffer();if(p.request!==request||!p.visible||!root.isConnected)return;
   const decoder=new ImageDecoder({data:bytes,type:'image/gif',preferAnimation:true});p.decoder=decoder;
   await decoder.tracks.ready;if(p.decoder!==decoder)return;
   if(decoder.tracks.selectedTrack.frameCount!==data.durations.length)throw Error('GIF frame count mismatch');
   p.ready=true;p.draw(performance.now());
  }catch(error){if(!request.signal.aborted&&root.isConnected)console.error('Tutorial decoder',error)}
  finally{if(p.request===request)p.request=null}
 };

 host._tutorialPlayer=p;players.push(p);
}
const observer=new IntersectionObserver(entries=>{for(const e of entries){const p=e.target._tutorialPlayer,visible=e.isIntersecting&&e.intersectionRatio>=.25;if(visible===p.visible)continue;p.visible=visible;p.generation++;p.start=null;p.last=-1;p.lastLoop=-1;p.currentKey='';p.holdUntil=0;p.host.querySelector('.tutorial-hotkey').hidden=true;if(visible)p.open();else p.close();}},{threshold:[0,.25]});for(const p of players)observer.observe(p.host);
function tick(now){if(!root.isConnected){observer.disconnect();for(const p of players){p.visible=false;p.generation++;p.close()}return}for(const p of players)p.draw(now);requestAnimationFrame(tick)}requestAnimationFrame(tick);
}
