import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../dist/mdlxl/tutorials/playback.js',import.meta.url),'utf8');
function player({durations=[100,100,100,100],cues=[{startFrame:0,endFrame:4,key:'Z'}]}={}){
 let now=0;const changes=[];
 const key={_text:'',_hidden:true,get textContent(){return this._text},set textContent(value){this._text=value;changes.push({at:now,type:'text',value})},get hidden(){return this._hidden},set hidden(value){this._hidden=value;changes.push({at:now,type:'hidden',value})}};
 const canvas={getContext:()=>({drawImage(){}})},host={dataset:{animation:'clip'},querySelector:selector=>selector==='canvas'?canvas:key};
 const root={isConnected:true,querySelectorAll:()=>[host]};
 const context=vm.createContext({performance:{now:()=>now},console,requestAnimationFrame(){},IntersectionObserver:class{observe(){} disconnect(){}}});
 vm.runInContext(source.replace('export function','function')+';globalThis.mount=mountTutorialPlayers;',context);
 context.mount(root,{clip:{durations,cues,ranges:[]}});
 const p=host._tutorialPlayer;p.visible=true;p.ready=true;p.decoder={async decode(){return{image:{close(){}}}}};
 return{p,key,changes,async draw(time){now=time;await p.draw(time)}};
}

test('a held shortcut keeps the same DOM label while animation frames advance',async()=>{
 const view=player();for(const at of [0,100,200,300,400,500])await view.draw(at);
 assert.deepEqual(view.changes.filter(x=>x.type==='text').map(x=>x.value),['Z']);
 assert.equal(view.key.hidden,false);
});

test('a shortcut decoded near the end of a loop remains readable after the wrap',async()=>{
 const view=player({durations:Array(40).fill(100),cues:[{startFrame:9,endFrame:39,key:'Z'}]});
 await view.draw(0);await view.draw(3800);await view.draw(4000);
 assert.equal(view.key.hidden,false,'loop wrap must not flash off a just-displayed shortcut');
 await view.draw(4700);assert.equal(view.key.hidden,false);
 await view.draw(4800);assert.equal(view.key.hidden,true);
 const shown=view.changes.find(x=>x.type==='hidden'&&!x.value),hidden=view.changes.find(x=>x.type==='hidden'&&x.value);
 assert(hidden.at-shown.at>=1000);
});

test('a new shortcut replaces the label directly, without hiding between keys',async()=>{
 const view=player({durations:[1100,1100],cues:[{startFrame:0,endFrame:1,key:'Shift + LMB'},{startFrame:1,endFrame:2,key:'Z'}]});
 await view.draw(0);await view.draw(1100);
 assert.equal(view.key.textContent,'Z');assert.equal(view.key.hidden,false);
 assert(!view.changes.some(x=>x.type==='hidden'&&x.value));
});

test('a clip without a shortcut keeps the overlay absent',async()=>{
 const view=player({cues:[]});for(const at of [0,100,300,400])await view.draw(at);
 assert.equal(view.key.hidden,true);assert.equal(view.changes.length,0);
});

test('continuous action cues keep the shortcut through the lead-in and repeated loops',async()=>{
 const view=player({durations:Array(40).fill(100),cues:[{startFrame:9,endFrame:40,key:'Z'}]});
 for(const at of [0,900,2000,3900,4000,4100,4900,7900])await view.draw(at);
 assert.equal(view.key.hidden,false);
 assert.deepEqual(view.changes.filter(x=>x.type==='text').map(x=>x.value),['Z']);
 assert(!view.changes.some(x=>x.type==='hidden'&&x.value));
 });
