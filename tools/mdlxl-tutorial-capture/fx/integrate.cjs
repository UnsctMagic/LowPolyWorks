const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),root='D:/Codex/french-german/fx-captures',site='D:/Codex/french-german/LowPolyWorks/dist/mdlxl/tutorials',locale=process.argv[2];
if(!['fr','de'].includes(locale))throw Error('fr/de');
const out=root+'/captures/'+locale,ctx={window:{}};vm.runInNewContext(fs.readFileSync(out+'/animation-data.js','utf8'),ctx);
const added=ctx.window.FX_DATA[locale],p=site+'/'+locale+'/animation-index.json',base=JSON.parse(fs.readFileSync(p)),before=JSON.stringify(base);
if(Object.keys(added).sort().join(',')!=='fx-adjust,fx-animations,fx-apply,fx-choose')throw Error('Unexpected FX inventory');
for(const[name,{gif,...metadata}]of Object.entries(added)){
 if(base[name])throw Error('FX entry already exists');
 const bytes=fs.readFileSync(out+'/'+name+'.gif');if(!bytes.equals(Buffer.from(gif,'base64')))throw Error('Encoded GIF differs '+name);
 const hash=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16);
 base[name]={...metadata,url:'/mdlxl/tutorials/'+locale+'/'+name+'.gif?v='+hash};fs.copyFileSync(out+'/'+name+'.gif',site+'/'+locale+'/'+name+'.gif');
}
fs.copyFileSync(out+'/fx-adjust.png',site+'/'+locale+'/fx-card.png');fs.writeFileSync(p,JSON.stringify(base)+'\n');
fs.copyFileSync(out+'/fx-adjust.png','D:/Codex/french-german/report/tutorial-fx-'+locale+'-native.png');
const baseline=JSON.parse(fs.readFileSync(root+'/baseline.json')),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const[n,h]of Object.entries(baseline.assets))if(hash(site+'/'+n)!==h)throw Error('Old media changed '+n);
const retained=Object.fromEntries(Object.entries(base).filter(([name])=>!Object.hasOwn(added,name)));if(JSON.stringify(retained)!==before)throw Error('Old timing/key metadata changed');
console.log('Added only 4 FX GIFs/card/index records for '+locale+'; older media and metadata unchanged');
