import {effectDefaults} from './viewer-event-data.js';
const labels={sounds:'Sounds',events:'Events',spawns:'Spawns',emitters:'Emitters'};
const tips={sounds:'Sounds: first loop, or press Play to hear another pass',events:'Event objects: footprints and splats',spawns:'Spawn objects',emitters:'Particle and ribbon emitters'};
const storageKey='lowpolyworks.viewer.sounds';
export function readEffectSettings(){
 let sounds=true;
 try{sounds=localStorage.getItem(storageKey)!=='false';}catch(error){console.warn('Sound preference could not be read.',error);}
 return {...effectDefaults,sounds};
}
export function effectControlsMarkup(){
 return '<div class="viewer-effects" role="group" aria-label="Model effects">'+Object.keys(labels).map(key=>'<label title="'+tips[key]+'"><input type="checkbox" data-viewer-effect="'+key+'" checked disabled><span>'+labels[key]+'</span></label>').join('')+'</div>';
}
export function mountEffectControls(container,viewer){
 for(const input of container.querySelectorAll('[data-viewer-effect]')){
  const key=input.dataset.viewerEffect;
  input.checked=viewer.effects()[key];input.disabled=false;
  input.onchange=()=>{
   viewer.effect(key,input.checked);
   if(key==='sounds')try{localStorage.setItem(storageKey,String(input.checked));}catch(error){console.warn('Sound preference could not be saved.',error);}
  };
 }
}
