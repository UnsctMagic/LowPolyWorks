import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {tutorialLanguages} from '../dist/mdlxl/tutorials/languages.js';

// The small index owns timing/key cues. GIF files are the only published media source.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist/mdlxl/tutorials');
for(const {id:language} of tutorialLanguages){
 const locale=language==='en'?'':language,directory=path.join(root,locale),file=path.join(directory,'animation-index.json'),animations=JSON.parse(fs.readFileSync(file)),index={};
 for(const [id,{url,...metadata}] of Object.entries(animations)){
  const bytes=fs.readFileSync(path.join(directory,id+'.gif'));
  const hash=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16);
  index[id]={...metadata,url:`/mdlxl/tutorials/${locale?locale+'/':''}${id}.gif?v=${hash}`};
 }
 fs.writeFileSync(file,JSON.stringify(index)+'\n');
 console.log(`${language}: ${Object.keys(index).length} standalone GIFs; ${fs.statSync(file).size} bytes of metadata`);
}
