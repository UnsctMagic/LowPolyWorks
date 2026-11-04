import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function fixture(){
 let observe,tick;const requests=[],decoders=[],errors=[];
 const hosts=['first','second'].map(animation=>({dataset:{animation},querySelector:selector=>selector==='canvas'?{getContext:()=>({drawImage(){}})}:{hidden:true}}));
 const root={isConnected:true,querySelectorAll:()=>hosts};
 const context=vm.createContext({AbortController,performance:{now:()=>0},console:{error:(...args)=>errors.push(args)},requestAnimationFrame:callback=>{tick=callback},IntersectionObserver:class{constructor(callback){observe=callback}observe(){}disconnect(){}},fetch:(url,{signal})=>new Promise((resolve,reject)=>{requests.push({url,signal,resolve});signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')))}),ImageDecoder:class{constructor(){this.tracks={ready:Promise.resolve(),selectedTrack:{frameCount:1}};decoders.push(this)}async decode(){return{image:{close(){}}}}close(){this.closed=true}}});
 const source=fs.readFileSync(new URL('../dist/mdlxl/tutorials/playback.js',import.meta.url),'utf8');
 vm.runInContext(source.replace('export function','function')+';globalThis.mount=mountTutorialPlayers;',context);
 context.mount(root,Object.fromEntries(hosts.map(host=>[host.dataset.animation,{url:host.dataset.animation+'.gif',durations:[100],cues:[],ranges:[]}])));
 return{root,hosts,requests,decoders,errors,visible(index,value){observe([{target:hosts[index],isIntersecting:value,intersectionRatio:value?1:0}])},tick(){tick(0)}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('hidden tutorials request no GIFs; only a visible clip downloads',async()=>{
 const view=fixture();assert.equal(view.requests.length,0);
 view.visible(0,true);assert.deepEqual(view.requests.map(r=>r.url),['first.gif']);
 view.requests[0].resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});await settle();
 assert.equal(view.decoders.length,1);assert.equal(view.hosts[0]._tutorialPlayer.ready,true);
 assert.equal(view.hosts[1]._tutorialPlayer.decoder,null);
});

test('scrolling away aborts a pending clip, and returning starts a fresh request',async()=>{
 const view=fixture();view.visible(0,true);view.visible(0,false);assert(view.requests[0].signal.aborted);
 view.visible(0,true);assert.equal(view.requests.length,2);await settle();
 view.requests[1].resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});await settle();
 assert.equal(view.decoders.length,1);assert.equal(view.hosts[0]._tutorialPlayer.ready,true);assert.deepEqual(view.errors,[]);
});

test('leaving a language or tutorial container releases pending media and decoders',async()=>{
 const view=fixture();view.visible(0,true);view.requests[0].resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});await settle();
 view.visible(1,true);view.root.isConnected=false;view.tick();await settle();
 assert(view.decoders[0].closed);assert(view.requests[1].signal.aborted);assert.deepEqual(view.errors,[]);
});

test('all six indexes preserve the accepted metadata and exact standalone GIF bytes',async()=>{
 for(const language of ['', 'es','ru','zh','fr','de']){
  const base=new URL('../dist/mdlxl/tutorials/'+(language?language+'/':''),import.meta.url);
  const animations=(await import(new URL('animation-data.js',base))).default,index=JSON.parse(fs.readFileSync(new URL('animation-index.json',base)));
  assert.deepEqual(Object.keys(index),Object.keys(animations));assert(fs.statSync(new URL('animation-index.json',base)).size<80000);
  for(const [id,{gif,...metadata}]of Object.entries(animations)){
   const {url,...actual}=index[id];assert.deepEqual(actual,metadata,language+'/'+id);
   // Strip the root URL explicitly: the site serves dist as its document root.
   const bytes=fs.readFileSync(new URL('../dist'+url.split('?')[0],import.meta.url));
   assert(bytes.equals(Buffer.from(gif,'base64')),language+'/'+id);
  }
 }
});


test('tutorial still images reserve layout space before lazy loading',()=>{
 for(const locale of ['', 'es','ru','zh','fr','de']){
  const html=fs.readFileSync(new URL('../dist/mdlxl/tutorials/'+(locale?locale+'/':'')+'content.html',import.meta.url),'utf8');
  for(const [tag]of html.matchAll(/<img\b[^>]*>/g)){
   assert(/\bwidth="[1-9][0-9]*"/.test(tag),locale+' image has no reserved width');
   assert(/\bheight="[1-9][0-9]*"/.test(tag),locale+' image has no reserved height');
  }
 }
});
