import {MOUSE} from 'three';
import {EditorCameraControls,preserveShiftCameraAction,zoomEditorCamera} from './vendor/mdlxl/app/editor-camera-controls.js';
import {bindScrollSensitivity,pointerSensitivityValue} from './vendor/mdlxl/app/viewport-performance.js';

// Navigation settings and capture ordering from MDLxL's vertex Viewport.
export function bindVertexCamera(camera,canvas,onModeChange){
 const controls=new EditorCameraControls(camera,canvas);
 controls.enableDamping=false;
 controls.mouseButtons={LEFT:MOUSE.ROTATE,MIDDLE:null,RIGHT:MOUSE.PAN};
 const preferences={cameraBindings:{right:'pan',middle:'toggle'},pointerSensitivity:1,scrollSensitivity:2.5,fineSensitivity:.2,wheelMode:'rotate',rightScrollAdjust:true};
 let mode='rotate',zoomDrag=null;
 canvas.tabIndex=0;
 function setMode(value){mode=value;onModeChange?.(mode);}
 function cancelGesture(){zoomDrag=null;controls.enabled=true;}
 const unbindScroll=bindScrollSensitivity(canvas,{
  getPreferences:()=>preferences,
  onChange:value=>preferences.scrollSensitivity=value,
  onPointerChange:value=>preferences.pointerSensitivity=value,
  onPointerAdjustment:cancelGesture,
  onCameraModeToggle:()=>setMode(mode==='rotate'?'work':'rotate'),
  onWheel:(_event,sensitivity)=>controls.zoomSpeed=sensitivity,
 });
 function pointerDown(event){
  canvas.focus();
  const action=event.button===2?'move':event.button===1?'toggle':event.altKey?'rotate':mode;
  controls.enabled=true;
  controls.rotateSpeed=controls.panSpeed=pointerSensitivityValue(preferences.pointerSensitivity);
  const mouseAction=value=>value==='move'?MOUSE.PAN:value==='rotate'?MOUSE.ROTATE:null;
  controls.mouseButtons.RIGHT=preserveShiftCameraAction(MOUSE.PAN,event);
  controls.mouseButtons.MIDDLE=null;
  controls.mouseButtons.LEFT=preserveShiftCameraAction(mouseAction(action),event);
  if(event.shiftKey&&action!=='work')controls.rotateSpeed=controls.panSpeed*=preferences.fineSensitivity;
  if(event.button===0&&action==='zoom'){
   zoomDrag={id:event.pointerId,y:event.clientY,zoom:camera.zoom,sensitivity:preferences.pointerSensitivity};
   controls.enabled=false;canvas.setPointerCapture(event.pointerId);
  }
 }
 function pointerMove(event){
  if(!zoomDrag||event.pointerId!==zoomDrag.id)return;
  zoomEditorCamera(camera,zoomDrag.zoom*Math.exp(-(event.clientY-zoomDrag.y)*zoomDrag.sensitivity*.01));
  controls.update();
 }
 function pointerUp(event){if(zoomDrag?.id===event.pointerId)cancelGesture();}
 canvas.addEventListener('pointerdown',pointerDown,true);
 canvas.addEventListener('pointermove',pointerMove);
 canvas.addEventListener('pointerup',pointerUp);
 canvas.addEventListener('pointercancel',pointerUp);
 return {controls,setMode,dispose(){unbindScroll();canvas.removeEventListener('pointerdown',pointerDown,true);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',pointerUp);controls.dispose();}};
}
