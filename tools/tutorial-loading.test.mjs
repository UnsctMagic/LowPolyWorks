import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {tutorialLanguages} from '../dist/mdlxl/tutorials/languages.js';

const player = fs.readFileSync(new URL('../dist/mdlxl/tutorials/playback.js',import.meta.url),'utf8');
function fixture(reducedMotion=false){
  let intersection,disconnected=false;
  const videos=['first','second'].map(id=>({
    dataset:{tutorialVideo:id+'.mp4'},
    textTracks:[],
    closest:()=>null,
    hasAttribute(name){return Object.hasOwn(this,name)},
    play(){this.playing=true;return Promise.resolve()},
    pause(){this.playing=false}
  }));
  const article={isConnected:true,querySelectorAll:()=>videos};
  const mount=vm.runInNewContext(player.replace('export function','function')+'\nmountTutorialPlayers',{
    matchMedia:()=>({matches:reducedMotion}),
    IntersectionObserver:class{
      constructor(callback){intersection=callback}
      observe(){}
      disconnect(){disconnected=true}
    }
  });
  const stop=mount(article,{});
  return {
    article,videos,stop,get disconnected(){return disconnected},
    visible(index,ratio){intersection([{target:videos[index],isIntersecting:ratio>0,intersectionRatio:ratio}])}
  };
}

test('videos load only once they enter view and pause when scrolled away',()=>{
  const view=fixture();
  assert.ok(view.videos.every(video=>!video.hasAttribute('src')));
  view.visible(0,.24);
  assert.equal(view.videos[0].src,undefined);
  view.visible(0,.25);
  assert.equal(view.videos[0].src,'first.mp4');
  assert.equal(view.videos[0].playing,true);
  assert.equal(view.videos[1].src,undefined);
  view.visible(0,0);
  assert.equal(view.videos[0].playing,false);
  view.visible(0,1);
  assert.equal(view.videos[0].src,'first.mp4');
  assert.equal(view.videos[0].playing,true);
});

test('leaving the tutorial stops playback and disconnects the observer',()=>{
  const view=fixture();
  view.visible(0,1);
  view.stop();
  assert.equal(view.disconnected,true);
  assert.equal(view.videos[0].playing,false);
});

test('reduced motion waits for the viewer to play a visible clip',()=>{
  const view=fixture(true);
  view.visible(0,1);
  assert.equal(view.videos[0].src,'first.mp4');
  assert.equal(view.videos[0].playing,undefined);
});

function mp4Durations(bytes){
  const child=([start,end],tag)=>{
    for(let p=start;p<end;){
      const length=bytes.readUInt32BE(p);
      const type=bytes.toString('ascii',p+4,p+8);
      assert(length>=8&&p+length<=end,'Invalid MP4 box '+type);
      if(type===tag)return [p+8,p+length];
      p+=length;
    }
    throw Error('Missing MP4 box '+tag);
  };
  const media=child(child(child([0,bytes.length],'moov'),'trak'),'mdia');
  const [header]=child(media,'mdhd');
  const timescale=bytes.readUInt32BE(header+(bytes[header]===1?20:12));
  const [timing]=child(child(child(media,'minf'),'stbl'),'stts');
  const count=bytes.readUInt32BE(timing+4),durations=[];
  for(let n=0;n<count;n++){
    const entry=timing+8+n*8;
    const frames=bytes.readUInt32BE(entry);
    const milliseconds=bytes.readUInt32BE(entry+4)*1000/timescale;
    for(let i=0;i<frames;i++)durations.push(milliseconds);
  }
  return durations;
}

test('each language references standalone MP4 bytes and valid frame timings',()=>{
  const tutorialRoot=new URL('../dist/mdlxl/tutorials/',import.meta.url);
  for(const {id:language} of tutorialLanguages){
    const prefix=language==='en'?'':language+'/';
    const folder=new URL(prefix,tutorialRoot);
    const index=JSON.parse(fs.readFileSync(new URL('animation-index.json',folder),'utf8'));
    const markup=fs.readFileSync(new URL('content.html',folder),'utf8');
    for(const [id,data] of Object.entries(index)){
      assert(!Object.hasOwn(data,'gif'),language+'/'+id+' embeds media');
      const bytes=fs.readFileSync(new URL(id+'.mp4',folder));
      const hash=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16);
      assert.equal(data.url,'/mdlxl/tutorials/'+prefix+id+'.mp4?v='+hash);
      assert(markup.includes('data-tutorial-video="'+data.url+'"'),language+'/'+id+' has no player');
      assert.deepEqual(data.durations,mp4Durations(bytes),language+'/'+id+' timing');
      for(const cue of data.cues)assert(cue.startFrame>=0&&cue.endFrame>cue.startFrame&&cue.endFrame<=data.durations.length,language+'/'+id+' cue');
      for(const range of data.ranges)assert(range.start>=0&&range.end>=range.start&&range.end<=data.durations.length,language+'/'+id+' range');
    }
  }
});

test('tutorial videos reserve layout space before loading',()=>{
  for(const {id:language} of tutorialLanguages){
    const prefix=language==='en'?'':language+'/';
    const html=fs.readFileSync(new URL('../dist/mdlxl/tutorials/'+prefix+'content.html',import.meta.url),'utf8');
    for(const [tag] of html.matchAll(/<video\b[^>]*>/g)){
      assert(/\bwidth="[1-9][0-9]*"/.test(tag),language+' media has no reserved width');
      assert(/\bheight="[1-9][0-9]*"/.test(tag),language+' media has no reserved height');
    }
  }
});

test('the published tutorial tree has no GIF files or embedded payloads',()=>{
  const directory=new URL('../dist/mdlxl/tutorials/',import.meta.url);
  const leftovers=fs.readdirSync(directory,{recursive:true}).filter(name=>/\.gif$|(?:^|-)animation-data\.js$/i.test(name));
  assert.deepEqual(leftovers,[]);
});
