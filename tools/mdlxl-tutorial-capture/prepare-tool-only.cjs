const fs=require('fs');const root='D:/Codex/french-german/captures';
const patch=(p,a,b)=>{let s=fs.readFileSync(p,'utf8');if(s.includes(b))return;if(!s.includes(a))throw Error('Missing patch marker '+p);fs.writeFileSync(p,s.replace(a,b));};
for(const locale of ['fr','de']){
 for(const kind of ['anchor','align','live','corpse'])patch(`${root}/${locale}/${kind}.cjs`,'JSON.stringify({size,targets,language:locale}));}','JSON.stringify({size,targets,language:locale}));}if(process.env.LPW_TOOL_ONLY===\'1\'){app.exit(0);return;}');
 patch(`${root}/${locale}/glow.cjs`,'JSON.stringify({x:mainTarget.x,y:mainTarget.y}));','JSON.stringify({x:mainTarget.x,y:mainTarget.y}));if(process.env.LPW_TOOL_ONLY===\'1\'){app.exit(0);return;}');
}
patch(root+'/ribbon.cjs',"await c.targets('ribbon-emtr-tool',['.emitter-tool']);","await c.targets('ribbon-emtr-tool',['.emitter-tool']);if(process.env.LPW_TOOL_ONLY==='1')return;");
patch(root+'/optixl.cjs',"await c.targets('optixl-tool',['.optimizer-tool']);","await c.targets('optixl-tool',['.optimizer-tool']);if(process.env.LPW_TOOL_ONLY==='1')return;");
patch(root+'/capture-common.cjs','getWC:()=>wc,setAlt:b=>alt=b});await end();','getWC:()=>wc,setAlt:b=>alt=b});if(process.env.LPW_TOOL_ONLY===\'1\'){fs.writeFileSync(out+\'/\'+kind+\'-tool-done.json\',JSON.stringify({passed:true,locale,kind}));return;}await end();');
