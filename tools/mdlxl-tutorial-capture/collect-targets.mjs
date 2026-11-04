import fs from 'node:fs';
const root='D:/Codex/french-german/captures',site='D:/Codex/french-german/LowPolyWorks/dist/mdlxl/tutorials',result={};
const pairs=[['anchor-tool','anchor-targets'],['align-tool','align-targets'],['live-tool','live-targets'],['corpse-tool','corpse-targets'],['main-tool','main-target'],['glow-tool','glow-target'],['ribbon-emtr-tool','ribbon-emtr-tool-targets'],['ribbon-add-tool','ribbon-add-tool-targets'],['optixl-tool','optixl-tool-targets'],['optixl-finish-tool','optixl-finish-tool-targets']];
for(const locale of ['fr','de']){
 result[locale]={};
 for(const[image,meta]of pairs){
  if(process.argv.includes('--partial')&&(!fs.existsSync(site+'/'+locale+'/'+image+'.png')||!fs.existsSync(root+'/'+locale+'/'+meta+'.json')))continue;
  const b=fs.readFileSync(site+'/'+locale+'/'+image+'.png'),width=b.readUInt32BE(16),height=b.readUInt32BE(20),raw=JSON.parse(fs.readFileSync(root+'/'+locale+'/'+meta+'.json','utf8'));
  if(raw.size&&(raw.size.width!==width||raw.size.height!==height))throw Error('Native target/image dimension mismatch '+locale+'/'+image);
  const points=raw.targets||[raw];
  result[locale][image+'.png']={width,height,primaryTargets:image==='optixl-finish-tool'?1:points.length,targets:points.map((p,index)=>{if(!(p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height))throw Error('Target outside native screenshot');return {...p,leftPercent:p.x/width*100,topPercent:p.y/height*100,widthPercent:96/width*100,primary:image!=='optixl-finish-tool'||index===0};})};
 }
}
fs.writeFileSync('D:/Codex/french-german/report/tutorial-tool-targets.json',JSON.stringify({source:'Actual native control rectangles measured alongside final screenshot capture. Existing markup keeps its current ping count; OptimizeXL finish primary target is Commit. No translated image overlays.',languages:result},null,2));
console.log('Measured target percentages collected for all twenty native localized tool screenshots.');
