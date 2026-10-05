import {showcaseRowPose} from './vendor/mdlxl/app/showcase-timeline.js';
import {billboardCameraCorrection} from './vendor/mdlxl/app/preview-pose.js';

export function viewerPlaybackSample(model,sequence,clock,revision,loop){
 const s=model.Sequences[sequence];loop??=!s.NonLooping;
 const animationRow=loop?{speed:1,loop:true,useDuration:true}:{speed:1,loop:false,useDuration:true,finishEffects:true,durationLoops:1,cycleSeconds:(s.Interval[1]-s.Interval[0])/1000};
 const pose=showcaseRowPose(s,animationRow,clock),frame=loop?pose.frame:Math.min(s.Interval[1]-.01,pose.frame);
 return {...pose,frame,animationRow,clipTime:clock,sequenceIndex:sequence,globalTime:clock,revision,segment:sequence};
}
export function setWarcraftCamera(native,camera){
 native.setCamera(camera.position.toArray(),camera.quaternion.clone().multiply(billboardCameraCorrection).toArray());
}
