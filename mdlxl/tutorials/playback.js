export function mountTutorialPlayers(root, animations) {
const players=[];
function at(starts,time){let lo=0,hi=starts.length-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(starts[m]<=time)lo=m;else hi=m-1}return lo}
for(const host of root.querySelectorAll('[data-animation]')){
 const data=animations[host.dataset.animation],canvas=host.querySelector('canvas'),key=host.querySelector('.tutorial-hotkey'),ctx=canvas.getContext('2d',{alpha:false}),starts=[];let sum=0;for(const d of data.durations){starts.push(sum);sum+=d}
 const p={host,visible:false,decoder:null,ready:false,busy:false,start:null,last:-1,lastLoop:-1,currentKey:'',keySince:0,holdUntil:0,generation:0};
 p.draw=async(now)=>{if(!p.visible||p.busy||!p.decoder||!p.ready||now<p.holdUntil)return;if(p.start===null)p.start=now;const elapsed=Math.max(0,now-p.start),loop=Math.floor(elapsed/sum),frame=at(starts,elapsed%sum),cue=data.cues.find(c=>frame>=c.startFrame&&frame<c.endFrame),label=cue?.key||'';
 if(loop===p.lastLoop&&frame===p.last)return;
 if(loop===p.lastLoop&&p.currentKey&&label!==p.currentKey&&now-p.keySince<1000){const wait=1000-(now-p.keySince);p.holdUntil=now+wait;p.start+=wait;return}
 p.busy=true;const generation=p.generation;try{const result=await p.decoder.decode({frameIndex:frame});if(generation===p.generation&&p.visible){ctx.drawImage(result.image,0,0);key.textContent=label;key.hidden=!label;if(label!==p.currentKey||loop!==p.lastLoop)p.keySince=performance.now();p.currentKey=label;p.last=frame;p.lastLoop=loop;host.dataset.frame=String(frame);host.dataset.key=label;host.dataset.phase=data.ranges.find(r=>frame>=r.start&&frame<r.end)?.phase||'';host.dataset.time=String(starts[frame]);}result.image.close()}catch(error){if(generation===p.generation)console.error('Tutorial playback',error)}finally{p.busy=false}};
 p.open=async()=>{if(p.decoder)return;const bytes=Uint8Array.from(atob(data.gif),c=>c.charCodeAt(0)),decoder=new ImageDecoder({data:bytes,type:'image/gif',preferAnimation:true});p.decoder=decoder;try{await decoder.tracks.ready;if(p.decoder!==decoder)return;if(decoder.tracks.selectedTrack.frameCount!==data.durations.length)throw Error('GIF frame count mismatch');p.ready=true;p.draw(performance.now())}catch(error){if(p.decoder===decoder)console.error('Tutorial decoder',error)}};

 host._tutorialPlayer=p;players.push(p);
}
const observer=new IntersectionObserver(entries=>{for(const e of entries){const p=e.target._tutorialPlayer,visible=e.isIntersecting&&e.intersectionRatio>=.25;if(visible===p.visible)continue;p.visible=visible;p.generation++;p.start=null;p.last=-1;p.lastLoop=-1;p.currentKey='';p.holdUntil=0;p.host.querySelector('.tutorial-hotkey').hidden=true;if(visible)p.open();else if(p.decoder){p.decoder.close();p.decoder=null;p.ready=false}}},{threshold:[0,.25]});for(const p of players)observer.observe(p.host);
function tick(now){if(!root.isConnected){observer.disconnect();for(const p of players){p.visible=false;p.generation++;p.decoder?.close();p.decoder=null}return}for(const p of players)p.draw(now);requestAnimationFrame(tick)}requestAnimationFrame(tick);
}