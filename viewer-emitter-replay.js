import {NativeParticleSimulation,particleTimelineAt,copyParticleSimulationToPreview,setEmitterPreviewPose} from './viewer-emitter-runtime.js?v=20261122-emitter-drag';
import {setWarcraftCamera} from './viewer-effects.js?v=20261006-classic-portrait-controls';

// EMTR's bounded replay and frozen simulation, connected to the website clock.
// Natural playback continues through the existing native renderer after a seek.
export function createEmitterReplay(native){
 let sequence=0,target=0,pending=false,simulation=null;
 return {
  get active(){return pending||!!simulation;},
  get busy(){return pending;},
  seek(index,time){
   if(index!==sequence)simulation=null;
   sequence=index;target=time;pending=true;
  },
  clear(){pending=false;simulation=null;},
  render(camera,frame){
   if(!simulation){
    const start=native.model.Sequences[sequence].Interval[0];
    // Website global tracks start at zero, independently of the authored clip offset.
    simulation=new NativeParticleSimulation(native.model,sequence,{maxLive:Infinity,timeline:[{at:0,frame:start,global:0,fx:0,poseRate:1,fxRate:1}]});
   }
   setWarcraftCamera(simulation.native,camera);
   const result=simulation.advance(target,{budgetMs:5});
   pending=!result.complete;
   if(pending){
    setEmitterPreviewPose(native,sequence,frame,target);
    return false;
   }
   simulation.refresh();
   // The live adapter ages ribbons with simulated deltas against a wall-clock
   // anchor. Synchronize that anchor before transferring EMTR's frozen state.
   native.ribbonsController.update(0);
   const phase=particleTimelineAt(simulation.timeline,target);
   copyParticleSimulationToPreview(simulation,native,{...phase,frame});
   // EMTR tracks exact burst events separately. Restore the native left-key
   // marker so resuming does not emit that already-replayed burst a second time.
   for(const emitter of native.particlesController.emitters)
    if(emitter.props.Squirt&&emitter.props.EmissionRate?.Keys)
     emitter.squirtFrame=native.particlesController.interp.findKeyframes(emitter.props.EmissionRate)?.left?.Frame??-1;
   const offset=Date.now()-phase.fx;
   for(const emitter of native.ribbonsController.emitters)
    for(let i=0;i<emitter.creationTimes.length;i++)emitter.creationTimes[i]+=offset;
   return true;
  }
 };
}
