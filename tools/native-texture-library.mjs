// Prepare native preview assets once; uploaded/downloadable models stay untouched.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mdlxl=process.argv[2]||'C:/Users/PC/Documents/ChatGPT/MDLxL',archives=process.argv[3]||'D:/WarcraftStuff';
const {Mpq}=createRequire(import.meta.url)(path.join(mdlxl,'electron/mpq.cjs'));
const index=JSON.parse(await fs.readFile(path.join(root,'dist/textures.json'),'utf8')),readers=[],names=new Set(),failures=[];
await fs.mkdir(path.join(root,'dist/textures/native-bank'),{recursive:true});let added=0,bytesAdded=0;
try{
 for(const name of ['war3patch.mpq','war3x.mpq','war3xlocal.mpq','war3.mpq']){const file=path.join(archives,name);try{await fs.access(file);}catch(error){if(error.code==='ENOENT')continue;throw error;}readers.push(await Mpq.open(file));}
 for(const reader of readers){const list=await reader.read('(listfile)');if(list)for(const name of list.toString().split(/\r?\n/))if(/\.blp$/i.test(name))names.add(name);}
 for(const name of names){
  const key=name.toLowerCase();if(index[key])continue;
  let bytes;for(const reader of readers){try{bytes=await reader.read(name);}catch(error){failures.push({name,error:error.message});continue;}if(bytes)break;}
  if(!bytes)continue;
  if(!/^BLP[12]$/.test(bytes.subarray(0,4).toString())){failures.push({name,error:'Not a BLP texture'});continue;}
  const hash=createHash('sha256').update(bytes).digest('hex'),file='textures/native-bank/'+hash+'.blp';
  try{await fs.access(path.join(root,'dist',file));}catch(error){if(error.code!=='ENOENT')throw error;await fs.writeFile(path.join(root,'dist',file),bytes);bytesAdded+=bytes.length;}
  index[key]=file;added++;
 }
 await fs.writeFile(path.join(root,'dist/textures.json'),JSON.stringify(index));
 await fs.mkdir(path.join(root,'output'),{recursive:true});await fs.writeFile(path.join(root,'output/native-texture-library.json'),JSON.stringify({added,bytesAdded,total:Object.keys(index).length,failures},null,2));
 console.log(JSON.stringify({added,megabytes:Math.round(bytesAdded/1024/1024),total:Object.keys(index).length,failures:failures.length}));
}finally{for(const reader of readers)await reader.close();}
