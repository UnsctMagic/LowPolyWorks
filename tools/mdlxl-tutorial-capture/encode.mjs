// Same FFmpeg 30 fps global-palette encoder as the prior tutorial pipeline.
// Convert PNG screenshots to BMP as in the original encode.ps1; repeat held frames with local hardlinks.
import fs from 'node:fs';import path from 'node:path';import{spawnSync}from'node:child_process';
const root='D:/Codex/french-german/captures',locale=process.argv[2],kind=process.argv[3];
if(!['fr','de',...(process.env.LPW_PILOT==='1'?['en']:[])].includes(locale)||!['anchor','align','live','corpse','glow','ribbon','optixl'].includes(kind))throw Error('Expected locale and tutorial kind');
const out=root+'/'+locale,manifest=JSON.parse(fs.readFileSync(out+'/'+kind+'-manifest.json','utf8')),target=process.env.LPW_PILOT==='1'?root+'/pilot/'+locale:'D:/Codex/french-german/LowPolyWorks/dist/mdlxl/tutorials/'+locale;
fs.mkdirSync(target,{recursive:true});
function delays(b){let p=13+((b[10]&128)?3*(2**((b[10]&7)+1)):0),delay=100,a=[];const blocks=()=>{while(b[p])p+=b[p]+1;p++};while(p<b.length){const token=b[p++];if(token===0x3b)break;if(token===0x21){const ext=b[p++];if(ext===0xf9){const n=b[p++];delay=b.readUInt16LE(p+1)*10;p+=n+1}else blocks()}else if(token===0x2c){const flags=b[p+8];p+=9;if(flags&128)p+=3*(2**((flags&7)+1));p++;blocks();a.push(delay)}else throw Error('GIF token '+token)}return a}
const datafile=target+'/animation-data.js',data=fs.existsSync(datafile)?JSON.parse(fs.readFileSync(datafile,'utf8').replace(/^export default /,'').replace(/;\s*$/,'')):{};
const report=[];
for(const[name,frames]of Object.entries(manifest)){
 if(!frames.length)throw Error('No frames: '+name);
 let time=0,n=0;const ranges=[],expanded=[];
 for(const f of frames){time+=f.ms;const end=Math.round(time*30/1000);if(ranges.at(-1)?.phase===f.phase)ranges.at(-1).end=end;else ranges.push({start:n,end,phase:f.phase,activeKey:f.activeKey||''});while(n<end){expanded.push(f);n++;}}
 const encode=out+'/encode/'+name,converted=encode+'/source';fs.mkdirSync(converted,{recursive:true});
 const conversion=new Map();for(const f of frames)if(f.file.endsWith('.png')&&!conversion.has(f.file))conversion.set(f.file,converted+'/'+String(conversion.size).padStart(5,'0')+'.bmp');
 if(conversion.size){const request=encode+'/convert.json';fs.writeFileSync(request,JSON.stringify([...conversion].map(([source,target])=>({source,target}))));const r=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',root+'/convert-frames.ps1','-Manifest',request],{encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error(r.stderr||r.stdout);}
 for(let i=0;i<expanded.length;i++){const destination=encode+'/'+String(i).padStart(5,'0')+'.bmp';if(fs.existsSync(destination))fs.unlinkSync(destination);fs.linkSync(conversion.get(expanded[i].file)||expanded[i].file,destination)}
 const args=['-hide_banner','-loglevel','error','-y','-framerate','30','-i',encode+'/%05d.bmp','-filter_complex','[0:v]split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=none','-frames:v',String(n),'-gifflags','+offsetting+transdiff','-loop','0',out+'/'+name+'.gif'];
 const result=spawnSync('D:/Claude/MDLxL/electron/ffmpeg/ffmpeg.exe',args,{encoding:'utf8',windowsHide:true,maxBuffer:1000000});if(result.status!==0)throw Error(result.stderr);
 const bytes=fs.readFileSync(out+'/'+name+'.gif'),durations=delays(bytes);if(durations.length!==n)throw Error('Frame mismatch '+name+': '+durations.length+'/'+n);
 const width=bytes.readUInt16LE(6),height=bytes.readUInt16LE(8),expected=kind==='ribbon'||kind==='optixl'?[1100,700]:[944,600];if(width!==expected[0]||height!==expected[1])throw Error('Wrong GIF size '+name+': '+width+'x'+height);
 const cues=[];for(let i=0;i<expanded.length;i++){const key=expanded[i].activeKey;if(!key||key==='LMB')continue;if(cues.at(-1)?.key===key&&cues.at(-1)?.endFrame===i)cues.at(-1).endFrame=i+1;else cues.push({startFrame:i,endFrame:i+1,key})}
 // Preserve the accepted tutorial's held explanatory key cues for the first four guides.
 const cue=(frame,key)=>{if(cues.at(-1)?.key!==key)cues.push({startFrame:frame,key})};
 if(['anchor','align','live'].includes(kind)){
  cues.length=0;
  if(name.endsWith('-selection')&&kind!=='live'){const first=ranges.findIndex(r=>r.phase==='select-vertex'&&r.activeKey==='Shift + LMB');if(first>=0)cue(ranges[first+1].start,'Shift + LMB');if(kind==='anchor')cue(ranges.find(r=>r.phase==='resize-tool').start,'Z');cue(ranges.find(r=>r.phase==='point-marquee').start+1,kind==='anchor'?'1 + LMB':'Shift + 1 + LMB')}
  if(name==='anchor-action'||name==='align-action')cue(ranges.find(r=>r.phase==='resize-drag').start,'Z');
  if(name==='live-selection')cue(ranges.find(r=>r.phase==='front-marquee').start+1,'A + LMB');
  if(name==='live-action'){let prev='';for(const r of ranges){if(r.phase==='pick-result')cue(r.start,'A + LMB');if(r.phase==='expand-connected')cue(r.start,'Ctrl + E');if(r.phase==='separate-coordinates'&&prev!==r.phase)cue(r.start,'M');prev=r.phase}}
  for(let i=0;i<cues.length;i++){cues[i].endFrame=cues[i+1]?.startFrame??n;cues[i].startMs=durations.slice(0,cues[i].startFrame).reduce((a,b)=>a+b,0);cues[i].endMs=durations.slice(0,cues[i].endFrame).reduce((a,b)=>a+b,0);}
 }
 data[name]={gif:bytes.toString('base64'),durations,ranges,cues};fs.copyFileSync(out+'/'+name+'.gif',target+'/'+name+'.gif');report.push({name,width,height,frames:n,bytes:bytes.length,duration:durations.reduce((a,b)=>a+b,0),ranges,cues});
 const cards={'anchor-action':'anchor','align-action':'align','live-action':'live','corpse-finish':'corpse','glow-create':'glow'};
 if(cards[name]){const img=frames.at(-1).file;if(img.endsWith('.png'))fs.copyFileSync(img,target+'/tutorial-card-'+cards[name]+'.png');else {const shot=spawnSync('D:/Claude/MDLxL/electron/ffmpeg/ffmpeg.exe',['-hide_banner','-loglevel','error','-y','-i',img,'-frames:v','1',target+'/tutorial-card-'+cards[name]+'.png'],{encoding:'utf8',windowsHide:true});if(shot.status!==0)throw Error(shot.stderr)}}
 const safeEncode=path.resolve(encode);if(!safeEncode.startsWith(path.resolve(out,'encode')+path.sep))throw Error('Encoding cleanup outside task');fs.rmSync(safeEncode,{recursive:true});
 const raw=path.resolve(path.dirname(frames[0].file)),safe=path.resolve(out,'raw');if(!raw.startsWith(safe+path.sep))throw Error('Raw cleanup outside task');for(const entry of fs.readdirSync(raw,{withFileTypes:true}))if(entry.isSymbolicLink()||entry.isDirectory())throw Error('Unexpected link/directory in raw frames');fs.rmSync(raw,{recursive:true});
 console.log(locale+'/'+name+': '+n+' frames, '+Math.round(bytes.length/1024)+'KB');
}
fs.writeFileSync(datafile,'export default '+JSON.stringify(data)+';\n');fs.writeFileSync(out+'/'+kind+'-encoded.json',JSON.stringify({passed:true,pilot:process.env.LPW_PILOT==='1',locale,kind,clips:report},null,2));
const names=kind==='anchor'?['anchor-tool.png']:kind==='align'?['align-tool.png']:kind==='live'?['live-tool.png']:kind==='corpse'?['corpse-tool.png']:kind==='glow'?['glow-tool.png','main-tool.png']:kind==='ribbon'?['ribbon-emtr-tool.png','ribbon-add-tool.png','ribbon-card.png']:['optixl-tool.png','optixl-finish-tool.png','optixl-card.png'];
for(const name of names){if(!fs.existsSync(out+'/'+name))throw Error('Missing tool screenshot '+name);fs.copyFileSync(out+'/'+name,target+'/'+name)}
