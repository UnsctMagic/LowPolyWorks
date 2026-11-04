const fs=require('fs'),path=require('path');
module.exports=async function(wc,win,out){
const held=new Map();let mouseDown=false,mouseMods=[];
const norm=k=>({control:'Ctrl',ctrl:'Ctrl',shift:'Shift',alt:'Alt',meta:'Win'}[k.toLowerCase()]||k.toUpperCase());
const label=()=>{const mods=new Set(mouseDown?mouseMods:[]),keys=[];for(const [k,m]of held){m.forEach(v=>mods.add(v));keys.push(norm(k))}const parts=['control','alt','shift','meta'].filter(k=>mods.has(k)).map(norm).concat(keys);if(mouseDown)parts.push('LMB');return parts.length===1&&parts[0]==='LMB'?'':parts.join(' + ')};

const down=(k,m=[])=>{held.set(k,m.filter(v=>['control','alt','shift','meta'].includes(v)));wc.sendInputEvent({type:'keyDown',keyCode:k,modifiers:m})};
const up=(k,m=[])=>{wc.sendInputEvent({type:'keyUp',keyCode:k,modifiers:m});held.delete(k)};
const mouse=(type,x,y,m=[])=>{m=[...new Set([...m,...[...held.values()].flat()])];if(type==='mouseDown'){mouseDown=true;mouseMods=m.filter(v=>['control','alt','shift','meta'].includes(v))}if(type==='mouseUp'){mouseDown=false;mouseMods=[]}wc.sendInputEvent({type,x:Math.round(x),y:Math.round(y),button:'left',clickCount:1,modifiers:m})};
const manifest={};
const shot=async(clip,ms,phase='')=>{await new Promise(r=>setTimeout(r,40));const activeKey=label();const dir=out+'/raw/'+clip;fs.mkdirSync(dir,{recursive:true});const a=manifest[clip]||=[];const file=dir+'/'+String(a.length).padStart(3,'0')+'.png';fs.writeFileSync(file,(await win.capturePage({stayHidden:true,stayAwake:true})).crop({x:0,y:185,width:944,height:600}).toPNG());a.push({file,ms,activeKey,phase});};
const pulse=async(clip,k,m,ms,phase)=>{down(k,m);await shot(clip,ms,phase);up(k,m)};
return {down,up,mouse,shot,pulse,manifest,label,clear:()=>{held.clear();mouseDown=false;mouseMods=[]}};
};

