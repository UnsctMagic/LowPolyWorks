import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const root='D:/Codex/french-german/fx-captures',lang=process.argv[2]||'en',out=root+'/captures/'+lang,manifest=JSON.parse(fs.readFileSync(out+'/manifest.json')),data={},held=[];
function delays(b){let p=13+((b[10]&128)?3*(2**((b[10]&7)+1)):0),delay=100,a=[];const blocks=()=>{while(b[p])p+=b[p]+1;p++};while(p<b.length){const token=b[p++];if(token===0x3b)break;if(token===0x21){const ext=b[p++];if(ext===0xf9){const n=b[p++];delay=b.readUInt16LE(p+1)*10;p+=n+1}else blocks()}else if(token===0x2c){const flags=b[p+8];p+=9;if(flags&128)p+=3*(2**((flags&7)+1));p++;blocks();a.push(delay)}else throw Error('GIF token '+token)}return a}
for(const[clip,frames]of Object.entries(manifest)){
 // Keep a complete native compositor frame across short WebGL rebuilds.
 // This also checks the written BMPs, rather than trusting paint readiness.
 let previous=null;
 for(const [index,frame]of frames.entries()){
  const bmp=fs.readFileSync(frame.file);let white=0,black=0,flat=0,total=0;
  for(let y=125;y<580;y+=8)for(let x=240;x<825;x+=8){const i=54+(y*1100+x)*4,b=bmp[i],g=bmp[i+1],r=bmp[i+2];total++;if(r>246&&g>246&&b>246)white++;if(r<8&&g<8&&b<8)black++;if(Math.abs(r-204)<3&&Math.abs(g-204)<3&&Math.abs(b-204)<3)flat++;}
  if(white/total>.45||black/total>.94||flat/total>.985){if(!previous)throw Error('No complete starting frame '+clip);fs.copyFileSync(previous,frame.file);held.push({clip,index,phase:frame.phase,white:white/total,black:black/total,flat:flat/total});}else previous=frame.file;
 }
 const args=['-hide_banner','-loglevel','error','-y','-framerate','30','-i',out+'/raw/'+clip+'/%05d.bmp','-filter_complex','[0:v]split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=none','-frames:v',String(frames.length),'-gifflags','+offsetting+transdiff','-loop','0',out+'/'+clip+'.gif'];
 const result=spawnSync('D:/Claude/MDLxL/electron/ffmpeg/ffmpeg.exe',args,{encoding:'utf8',windowsHide:true,maxBuffer:1000000});if(result.status!==0)throw Error(result.stderr);
 const bytes=fs.readFileSync(out+'/'+clip+'.gif'),durations=delays(bytes),ranges=[],cues=[];if(durations.length!==frames.length)throw Error('Frame mismatch '+clip);
 for(const[f,i]of frames.map((f,i)=>[f,i])){if(ranges.at(-1)?.phase===f.phase)ranges.at(-1).end=i+1;else ranges.push({start:i,end:i+1,phase:f.phase});if(f.activeKey){if(cues.at(-1)?.endFrame===i&&cues.at(-1)?.key===f.activeKey)cues.at(-1).endFrame=i+1;else cues.push({startFrame:i,endFrame:i+1,key:f.activeKey})}}
 data[clip]={gif:bytes.toString('base64'),durations,ranges,cues};console.log(lang+'/'+clip+': '+frames.length+' frames, '+Math.round(bytes.length/1024)+' KB');
}
fs.writeFileSync(out+'/animation-data.js','window.FX_DATA=window.FX_DATA||{};window.FX_DATA['+JSON.stringify(lang)+']='+JSON.stringify(data)+';');
fs.writeFileSync(out+'/encoded.json',JSON.stringify({passed:true,heldIncompleteFrames:held,clips:Object.fromEntries(Object.entries(data).map(([id,d])=>[id,{frames:d.durations.length,duration:d.durations.reduce((a,b)=>a+b,0),phases:d.ranges,cues:d.cues}]))},null,2));
