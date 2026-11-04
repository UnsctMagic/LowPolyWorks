const electronCapture=require('electron'),CaptureModule=require('module'),captureLoad=CaptureModule._load;
const HiddenCaptureWindow=new Proxy(electronCapture.BrowserWindow,{construct(Target,[options]){return new Target({...options,show:false,webPreferences:{...options.webPreferences,offscreen:true}})}});
const hiddenElectron=new Proxy(electronCapture,{get(target,key){return key==='BrowserWindow'?HiddenCaptureWindow:Reflect.get(target,key)}});
CaptureModule._load=function(name,...args){return name==='electron'?hiddenElectron:captureLoad.call(this,name,...args)};
(async()=>{const {translate}=await import('file:///D:/Codex/french-german/MDLxL/src/localization.js');const locale="fr";const localizeCode=code=>code.replace(/\[aria-label(\^?=)(\\?["'])(.*?)\2\]/g,(_,op,q,text)=>{let value=text;if(op==='^='&&text==='Select geoset ')value=translate('Select geoset 0',locale).replace(/0$/,'');else value=translate(text,locale);return '[aria-label'+op+q+value+q+']'}).replaceAll("startsWith('Grabthrough')",'startsWith('+JSON.stringify(translate('Grabthrough',locale))+')');
const fs=require('fs'),{app}=require('electron');
const root='D:/Codex/french-german/MDLxL',out='D:/Codex/french-german/captures/fr',kind='anchor';
process.env.MDLVIS_HEADLESS='1';process.env.MDLXL_TEST_HOOK='1';process.env.MDLXL_PROFILE=out+'/profile-'+kind+'-'+Date.now();fs.mkdirSync(process.env.MDLXL_PROFILE,{recursive:true});fs.writeFileSync(process.env.MDLXL_PROFILE+'/settings.json',JSON.stringify({preferences:{language:locale}}));process.argv.push(out+'/'+(kind==='anchor'?'cube':'spikes')+'.mdx');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let started=false;
app.on('browser-window-created',(_,win)=>{if(started)return;started=true;win.setBounds({x:-3000,y:0,width:1200,height:900});win.webContents.on('did-finish-load',async()=>{const wc=win.webContents;try{
const nativeExecute=wc.executeJavaScript.bind(wc);wc.executeJavaScript=(code,...args)=>nativeExecute(localizeCode(code),...args);win.hide();wc.setBackgroundThrottling(false);for(let n=0;n<100;n++){if(await wc.executeJavaScript('document.documentElement.lang')===locale)break;await sleep(50)}if(await wc.executeJavaScript('document.documentElement.lang')!==locale)throw Error('Wrong native language');await wc.executeJavaScript('document.fonts.ready.then(()=>true)');await sleep(1000);await wc.executeJavaScript(require(root+'/test/helpers/fiber-probe.cjs').PROBE_SOURCE);
await wc.executeJavaScript(`(()=>{const s=document.querySelector('[aria-label="View direction"]');s.value='${kind==='align'?'front':'perspective'}';s.dispatchEvent(new Event('change',{bubbles:true}));const r=document.querySelector('[aria-label="Render mode"]');r.value='wireframe';r.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(120);
const {down,up,mouse,shot,pulse,manifest}=await require(out+'/capture-keys.cjs')(wc,win,out);
const point=i=>wc.executeJavaScript(`(()=>{const s=findFiberState('[aria-label="3D model viewport"]',v=>v?.renderer&&v?.entries);const p=s.controls.target.clone().fromBufferAttribute(s.entries[0].geometry.attributes.position,${i}).project(s.camera),r=s.controls.domElement.getBoundingClientRect();return{x:Math.round(r.x+(p.x+1)*r.width/2),y:Math.round(r.y+(1-p.y)*r.height/2)}})()`);
const sel=kind+'-selection',act=kind+'-action',ids=kind==='align'?[6,13,20]:[0,3,4];
await shot(sel,700,'ready');
for(let i=0;i<3;i++){const p=await point(ids[i]);mouse('mouseMove',p.x,p.y);mouse('mouseDown',p.x,p.y,i?['shift']:[]);await shot(sel,1000/30,'select-vertex');mouse('mouseUp',p.x,p.y,i?['shift']:[]);await shot(sel,650,'selected')}
await pulse(sel,'z',[],kind==='anchor'?750:150,'resize-tool');await shot(sel,150,'release');
const p=await point(kind==='align'?13:0);down('1',kind==='align'?['shift']:[]);await shot(sel,150,'choose-point');
const a={x:p.x-24,y:p.y-24},b={x:p.x+24,y:p.y+24};mouse('mouseMove',a.x,a.y);mouse('mouseDown',a.x,a.y);
for(let i=0;i<=36;i++){mouse('mouseMove',a.x+(b.x-a.x)*i/36,a.y+(b.y-a.y)*i/36,['leftButtonDown']);await shot(sel,1000/30,'point-marquee')}
mouse('mouseUp',b.x,b.y);up('1',kind==='align'?['shift']:[]);await shot(sel,950,'point-set');
await wc.executeJavaScript("document.querySelector('[data-hotkey=scale]').style.outline=''");{const pic=await win.capturePage({stayHidden:true,stayAwake:true}),size=pic.getSize();fs.writeFileSync(out+'/'+kind+'-tool.png',pic.toPNG());const targets=await wc.executeJavaScript('('+"()=>[\"[data-hotkey=scale]\"].map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{selector,x:r.x+r.width/2,y:r.y+r.height/2}})"+')()');fs.writeFileSync(out+'/'+kind+'-targets.json',JSON.stringify({size,targets,language:locale}));}if(process.env.LPW_TOOL_ONLY==='1'){app.exit(0);return;}await wc.executeJavaScript("document.querySelector('[data-hotkey=scale]').style.outline=''");
await shot(act,900,'ready');mouse('mouseMove',760,440);mouse('mouseDown',760,440);
for(let i=1;i<=45;i++){mouse('mouseMove',760-(kind==='align'?300:78)*i/45,440,['leftButtonDown']);await shot(act,1000/30,'resize-drag')}
mouse('mouseUp',760-(kind==='align'?300:78),440);await shot(act,1400,'result');
if(kind==='align'){
 const rot='align-rotation';await shot(rot,850,'front-result');await pulse(rot,'e',['shift'],150,'rotate-tool');await shot(rot,200,'release');wc.debugger.attach('1.3');
 const send=(type,x,y,buttons)=>wc.debugger.sendCommand('Input.dispatchMouseEvent',{type,x,y,buttons,button:'left',clickCount:1,modifiers:0});
 await send('mouseMoved',560,440,0);await send('mousePressed',560,440,1);
 for(let i=1;i<=66;i++){await send('mouseMoved',560+170*i/66,440-45*i/66,1);await shot(rot,1000/30,'rotate-up-and-sideways')}
 await send('mouseReleased',730,395,0);wc.debugger.detach();await shot(rot,1800,'raised-side-result');
}
fs.writeFileSync(out+'/'+kind+'-manifest.json',JSON.stringify(manifest));
}catch(e){fs.writeFileSync(out+'/'+kind+'-error.txt',e.stack||String(e))}finally{app.exit(0)}})});require(root+'/electron/main.cjs');


})().catch(e=>{require("fs").writeFileSync("D:/Codex/french-german/captures/fr/anchor-setup-error.txt",e.stack||String(e));require("electron").app.exit(1)});