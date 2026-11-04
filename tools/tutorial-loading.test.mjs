import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {tutorialLanguages} from '../dist/mdlxl/tutorials/languages.js';

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

function gifDurations(bytes){
 let offset=13+((bytes[10]&128)?3*2**((bytes[10]&7)+1):0),delay=100;const durations=[],blocks=()=>{while(bytes[offset])offset+=bytes[offset]+1;offset++;};
 while(offset<bytes.length){const token=bytes[offset++];if(token===0x3b)break;if(token===0x21){if(bytes[offset++]===0xf9){const size=bytes[offset++];delay=bytes.readUInt16LE(offset+1)*10;offset+=size+1;}else blocks();}else if(token===0x2c){const flags=bytes[offset+8];offset+=9;if(flags&128)offset+=3*2**((flags&7)+1);offset++;blocks();durations.push(delay);}else throw Error('Invalid GIF token '+token);}
 return durations;
}

test('all language indexes match standalone GIF bytes, timings and bounded key cues',()=>{
 for(const {id:language} of tutorialLanguages){
  const base=new URL('../dist/mdlxl/tutorials/'+(language==='en'?'':language+'/'),import.meta.url),index=JSON.parse(fs.readFileSync(new URL('animation-index.json',base)));
  assert(fs.statSync(new URL('animation-index.json',base)).size<80000);
  for(const [id,data]of Object.entries(index)){
   assert(!Object.hasOwn(data,'gif'),language+'/'+id+' embeds media');
   const bytes=fs.readFileSync(new URL('../dist'+data.url.split('?')[0],import.meta.url)),hash=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16);
   assert.equal(data.url,'/mdlxl/tutorials/'+(language==='en'?'':language+'/')+id+'.gif?v='+hash);
   assert.deepEqual(data.durations,gifDurations(bytes),language+'/'+id+' timing');
   for(const cue of data.cues)assert(cue.startFrame>=0&&cue.endFrame>cue.startFrame&&cue.endFrame<=data.durations.length,language+'/'+id+' cue');
   for(const range of data.ranges)assert(range.start>=0&&range.end>=range.start&&range.end<=data.durations.length,language+'/'+id+' range');
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

test('published tutorials contain no embedded GIF payload files',()=>{
 for(const locale of ['', 'es','ru','zh','fr','de','mordor']){
  const directory=new URL('../dist/mdlxl/tutorials/'+(locale?locale+'/':''),import.meta.url);
  assert.deepEqual(fs.readdirSync(directory).filter(name=>/(?:^|-)animation-data\.js$/.test(name)),[],locale||'en');
 }
});
