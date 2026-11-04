import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';

// Keep the accepted frames and cue tracks; only remove inline media from startup.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist/mdlxl/tutorials');
for(const locale of ['', 'es','ru','zh','fr','de','mordor']){
 const directory=path.join(root,locale),animations=(await import(pathToFileURL(path.join(directory,'animation-data.js')))).default,index={};
 for(const [id,{gif,...metadata}] of Object.entries(animations)){
  const bytes=fs.readFileSync(path.join(directory,id+'.gif'));
  if(!bytes.equals(Buffer.from(gif,'base64')))throw Error(`Standalone GIF differs from accepted animation: ${locale}/${id}`);
  const hash=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16);
  index[id]={...metadata,url:`/mdlxl/tutorials/${locale?locale+'/':''}${id}.gif?v=${hash}`};
 }
 const output=JSON.stringify(index)+'\n';
 fs.writeFileSync(path.join(directory,'animation-index.json'),output);
 console.log(`${locale||'en'}: ${Object.keys(index).length} unchanged GIFs; ${Buffer.byteLength(output)} bytes of metadata`);
}
