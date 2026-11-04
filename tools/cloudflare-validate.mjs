import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {fingerprint,LIMIT} from './cloudflare-hosting.mjs';
import {parseMDX} from '../dist/vendor/war3-model.mjs';
import {parseCompatibleMdx} from '../dist/warcraft-mdx-compatibility.js';

const out=path.resolve('.cloudflare-build'),manifest=JSON.parse(await fs.readFile(path.join(out,'manifest.json'),'utf8'));
const root=manifest.source,entries=new Map(manifest.files.map(file=>[file.path,file]));
for(const file of manifest.files){
  const source=await fingerprint(createReadStream(path.join(root,file.path)));
  assert.equal(source.sha256,file.sourceSha256||file.sha256,`Source changed: ${file.path}`);
  if(file.key){assert(file.size>LIMIT);continue;}
  const staged=await fingerprint(createReadStream(path.join(out,'pages',file.path)));
  assert.equal(staged.sha256,file.sha256,`Staged bytes changed: ${file.path}`);assert(staged.size<=LIMIT);
}
const rows=JSON.parse(await fs.readFile(path.join(root,'catalogue.json'),'utf8'));
const textures=JSON.parse(await fs.readFile(path.join(root,'textures.json'),'utf8'));
const armies=JSON.parse(await fs.readFile(path.join(root,'armies.json'),'utf8'));
const expected=JSON.parse(await fs.readFile(new URL('./model-hashes.json',import.meta.url),'utf8'));
const exists=name=>assert(entries.has(name),`Missing published asset: ${name}`);
for(const entry of expected)assert.equal(entries.get('models/'+entry.file)?.sha256,entry.sha256,`Model inventory hash: ${entry.file}`);
for(const file of Object.values(textures))exists(file);
for(const row of rows){
  const file='models/'+row.file;exists(file);exists(`model/${row.slug||row.id}/index.html`);exists('thumbs/unit-'+row.id+'.png');
  if(row.downloadPack)exists(row.downloadPack);
  assert(armies.some(army=>army.id===row.army),`Unknown army: ${row.id}`);
  if(row.sha256||row.sourceModelSha256)assert.equal(entries.get(file).sha256,(row.sha256||row.sourceModelSha256).toLowerCase(),`Catalogue SHA-256: ${row.id}`);
  const bytes=await fs.readFile(path.join(root,file));const model=row.mdxCompatibility==='ribbon-color'?parseCompatibleMdx(bytes):parseMDX(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
  for(const texture of model.Textures.filter(texture=>texture.Image&&![1,2].includes(texture.ReplaceableId))){const render=row.textureFiles?.[texture.Image.toLowerCase()]||textures[texture.Image.toLowerCase()];assert(render,`Unresolved texture: ${row.id}: ${texture.Image}`);exists(render);}
}
const {tutorialLanguages}=await import(pathToFileURL(path.join(root,'mdlxl/tutorials/languages.js')));
for(const {id} of tutorialLanguages){const language=id==='en'?'':id+'/';exists('mdlxl/tutorials/'+language+'animation-index.json');exists('mdlxl/tutorials/'+language+'content.html');}
exists('whiteout/whiteout-paint-blp.wasm');exists('robots.txt');exists('sitemap.xml');
console.log(`Validated ${manifest.files.length} source/staged SHA-256 hashes, ${rows.length} model files, native textures, downloads, share pages, all ${tutorialLanguages.length} supported tutorial languages, and Pages file-size limits.`);
