import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const player=fs.readFileSync(new URL('../dist/mdlxl/tutorials/playback.js',import.meta.url),'utf8');
function fixture(cues,{mobile=false}={}){
  const tracks=[];
  const video={
    dataset:{tutorialVideo:'clip.mp4'},
    textTracks:tracks,
    closest:()=>({dataset:{animation:'clip'}}),
    addTextTrack(kind,label){
      const track={kind,label,cues:[],addCue(cue){this.cues.push(cue)}};
      tracks.push(track);
      return track;
    },
    pause(){}
  };
  const article={querySelectorAll:()=>[video]};
  const mount=vm.runInNewContext(player.replace('export function','function')+'\nmountTutorialPlayers',{
    matchMedia:query=>({matches:mobile&&query.includes('max-width')}),
    IntersectionObserver:class{observe(){} disconnect(){}},
    VTTCue:class{constructor(startTime,endTime,text){Object.assign(this,{startTime,endTime,text})}}
  });
  const metadata={clip:{durations:[500,500,500,500,500,500],cues}};
  return {tracks,mount:()=>mount(article,metadata)};
}

test('native captions keep the original cue times and intentional gaps',()=>{
  const view=fixture([{startFrame:2,endFrame:4,key:'Ctrl'}]);
  view.mount();
  const [track]=view.tracks;
  assert.equal(track.mode,'showing');
  assert.equal(track.cues[0].startTime,1);
  assert.equal(track.cues[0].endTime,2);
  assert.equal(track.cues[0].text,'Ctrl');
  assert.equal(track.cues[0].line,78);
});

test('continuous cues include the lead-in and switch directly to the next cue',()=>{
  const view=fixture([{startFrame:1,endFrame:3,key:'Shift + LMB'},{startFrame:3,endFrame:6,key:'Z'}],{mobile:true});
  view.mount();
  const [a,b]=view.tracks[0].cues;
  assert.equal(a.startTime,0);
  assert.equal(a.endTime,b.startTime);
  assert.equal(b.endTime,3);
  assert.equal(b.line,63);
});

test('reopening a guide keeps one caption track on its existing video',()=>{
  const view=fixture([{startFrame:0,endFrame:6,key:'Z'}]);
  view.mount()();
  view.mount();
  assert.equal(view.tracks.length,1);
});

test('recordings without cues use the native player without a caption track',()=>{
  const view=fixture([]);
  view.mount();
  assert.equal(view.tracks.length,0);
});
