import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

// The stored byte fingerprint makes a model replacement refresh its tag while
// page, artwork, credit and changelog edits keep the existing update time.
export function syncModelUpdates(root,now=Date.now()){
 const file=path.join(root,'model-updates.json');
 const previous=fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;
 const updates=previous?JSON.parse(previous):{version:1,models:{}};
 const rows=JSON.parse(fs.readFileSync(path.join(root,'catalogue.json'),'utf8'));
 for(const row of rows){
  const sha256=createHash('sha256').update(fs.readFileSync(path.join(root,'models',row.file))).digest('hex');
  const old=updates.models[row.id];
  updates.models[row.id]={sha256,...(old?.updatedAt?{updatedAt:old.updatedAt}:{}),...(old&&old.sha256!==sha256?{updatedAt:new Date(now).toISOString()}:{} )};
 }
 const output=JSON.stringify(updates,null,2)+'\n';
 if(output!==previous)fs.writeFileSync(file,output);
 return updates;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const siteIndex=process.argv.indexOf('--site');
 const root=path.resolve(siteIndex<0?'dist':process.argv[siteIndex+1]);
 syncModelUpdates(root);
 console.log('Model update tags synchronized with the downloadable file bytes.');
}
