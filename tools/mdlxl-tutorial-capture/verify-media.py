from pathlib import Path
import json,re,hashlib,sys
from PIL import Image
root=Path('D:/Codex/french-german/LowPolyWorks/dist/mdlxl/tutorials')
def read_data(folder):
 source=(folder/'animation-data.js').read_text(encoding='utf8')
 if source.startswith("import fx from './fx-animation-data.js?v=20261104-fr-de-fx';\nconst base="):
  base=json.loads(source.split('\nconst base=',1)[1].removesuffix(';\nexport default {...base,...fx};\n'))
  fx=json.loads((folder/'fx-animation-data.js').read_text(encoding='utf8').removeprefix('export default ').strip().removesuffix(';'))
  assert len(base)==25 and len(fx)==4 and not (base.keys() & fx.keys()),'FX companion partition mismatch'
  assert all(k.startswith('fx-') for k in fx),'Unexpected companion payload'
  return {**base,**fx}
 return json.loads(source.removeprefix('export default ').strip().removesuffix(';'))
report=[]
expected={p.name for p in (root/'es').glob('*.gif')}
for locale in ['fr','de']:
 d=root/locale
 actual={p.name for p in d.glob('*.gif')}
 assert actual==expected,(locale,'GIF set mismatch',sorted(expected-actual),sorted(actual-expected))
 data=read_data(d)
 assert {name+'.gif' for name in data}==expected,(locale,'embedded animation set')
 import base64
 for name,a in data.items():
  raw=(d/(name+'.gif')).read_bytes()
  assert raw==base64.b64decode(a['gif']),(locale,name,'embedded bytes differ')
  with Image.open(d/(name+'.gif')) as image,Image.open(root/'es'/(name+'.gif')) as reference:
   assert image.size==reference.size,(locale,name,'dimensions',image.size,reference.size)
   assert image.info.get('loop')==0,(locale,name,'GIF must loop forever')
   count=image.n_frames
   assert count==len(a['durations']),(locale,name,'frame count',count,len(a['durations']))
   assert a['ranges'][0]['start']==0 and a['ranges'][-1]['end']==count,(locale,name,'phase coverage')
   for i,r in enumerate(a['ranges']):
    assert r['start']<r['end'] and (i==0 or a['ranges'][i-1]['end']==r['start']),(locale,name,'phase gap')
   frames=[]
   for index in range(count):
    image.seek(index);image.load()
    duration=image.info.get('duration',0)
    assert duration==a['durations'][index] and duration>0,(locale,name,index,'duration')
    if index in [0,count//2,count-1]:
     # Measure representative full compositor frames; no image synthesis or text replacement.
     rgba=image.convert('RGB');colors=rgba.resize((96,64)).getcolors(6144)
     frames.append({'frame':index,'sampledColors':len(colors),'width':image.width,'height':image.height})
   for cue in a.get('cues',[]):
    assert 0<=cue['startFrame']<cue['endFrame']<=count,(locale,name,'cue range')
   report.append({'locale':locale,'name':name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'width':image.width,'height':image.height,'frames':count,'durationMs':sum(a['durations']),'decodedEntireLoop':True,'samples':frames})
 for p in d.glob('*.png'):
  with Image.open(p) as image:image.load();assert image.width>0 and image.height>0,(locale,p.name,'empty native screenshot')
 assert {p.name for p in d.glob('*.png')}=={p.name for p in (root/'es').glob('*.png')},(locale,'PNG mirror mismatch')
out=Path('D:/Codex/french-german/report/tutorial-media-verification.json')
out.write_text(json.dumps({'passed':True,'languages':['fr','de'],'tutorialsPerLanguage':8,'clipsPerLanguage':len(expected),'fullLoopsDecoded':len(report),'totalGifBytes':sum(x['bytes'] for x in report),'clips':report},indent=2),encoding='utf8')
print(f'PASS: {len(report)} full GIF loops decoded; all embedded bytes, frames, dimensions, durations, phase ranges, cues and PNG asset sets match.')
