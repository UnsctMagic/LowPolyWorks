from pathlib import Path
import json,hashlib,numpy as np
from PIL import Image
root=Path('D:/Codex/french-german');cap=root/'fx-captures';checks=[]
for locale in ['fr','de']:
 p=json.loads((cap/'captures'/locale/'proof.json').read_text());cues=p['greenCues'];out=[]
 for name in ['fx-choose','fx-adjust','fx-apply','fx-animations']:
  active=[dict(c,maxGreenPixels=0,foundFrame=None) for c in cues if c['clip']==name]
  with Image.open(root/'LowPolyWorks/dist/mdlxl/tutorials'/locale/(name+'.gif')) as im:
   assert im.size==(1100,700) and im.info.get('loop')==0
   for index in range(im.n_frames):
    im.seek(index);im.load()
    for c in active:
     if not c['startFrame']<=index<c['endFrame']:continue
     x,y=c['point']['x'],c['point']['y'];box=(max(0,round(x-43)),max(0,round(y-43)),min(1100,round(x+43)),min(700,round(y+43)));a=np.array(im.crop(box).convert('RGB'));yy,xx=np.indices(a.shape[:2]);r=(xx+box[0]-x)**2+(yy+box[1]-y)**2;green=((a[:,:,1]>180)&(a[:,:,0]<140)&(a[:,:,2]>50)&(a[:,:,2]<210)&(r>15**2)&(r<41**2));count=int(np.count_nonzero(green))
     if count>c['maxGreenPixels']:c['maxGreenPixels']=count;c['foundFrame']=index
  for c in active:assert c['maxGreenPixels']>=20,(locale,name,c['selector'],c['maxGreenPixels'])
  out.extend(active)
 checks.append({'locale':locale,'cues':out,'greenRecordedCues':len(out)})
(root/'report/tutorial-fx-green-cues.json').write_text(json.dumps({'passed':True,'method':'Actual GIF pixel colours within native measured control ping annuli; every recorded cue frame interval examined','checks':checks},indent=2),encoding='utf8')
print('PASS native recorded green cues',sum(c['greenRecordedCues'] for c in checks))
