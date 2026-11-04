import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {S3Client, HeadObjectCommand, GetObjectCommand} from '@aws-sdk/client-s3';
import {Upload} from '@aws-sdk/lib-storage';

export const LIMIT = 25 * 1024 * 1024;
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = 'https://lowpolyworks-vault.lowpolyworks-internal-tracker.workers.dev';
const bucket = 'lowpolyworks-large-assets', pagesProject = 'lowpolyworks';
const outputRoot = path.join(project, '.cloudflare-build');
const mime = {'.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8','.xml':'application/xml','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.wasm':'application/wasm','.zip':'application/zip','.mp4':'video/mp4','.webm':'video/webm','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
export const contentType = name => mime[path.extname(name).toLowerCase()] || 'application/octet-stream';
export async function fingerprint(input) {
  const hash = createHash('sha256'); let size = 0;
  for await (const chunk of input) {hash.update(chunk); size += chunk.length;}
  return {sha256: hash.digest('hex'), size};
}
async function filesIn(root, prefix = '') {
  const files = [];
  for (const entry of (await fs.readdir(path.join(root, prefix), {withFileTypes: true})).sort((a,b)=>a.name.localeCompare(b.name, 'en'))) {
    if (['.git','.github','node_modules','.wrangler','.cloudflare-build','.cloudflare-source'].includes(entry.name) || (!prefix && entry.name === 'tools')) continue;
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw Error(`Site assets must be regular files: ${name}`);
    if (entry.isDirectory()) files.push(...await filesIn(root, name));
    else if (entry.isFile()) files.push(name);
  }
  return files;
}
export function routeRules(urls) {
  let rules = [...new Set(urls.map(url => url.split('/').map(encodeURIComponent).join('/')))].sort();
  const parent = rule => { const value = rule.endsWith('/*') ? rule.slice(0,-2) : rule; return value.slice(0,value.lastIndexOf('/')+1)+'*'; };
  rules = [...new Set(rules.map(rule => {while (rule.length > 100) rule = parent(rule); return rule;}))];
  const covers = (rule, url) => rule.endsWith('*') ? url.startsWith(rule.slice(0,-1)) : rule === url;
  rules = rules.filter((rule,i)=>!rules.some((other,j)=>i!==j && other!==rule && covers(other,rule)));
  while (rules.length > 100) {
    const candidates = [...new Set(rules.map(parent))].filter(rule => rule !== '/*');
    candidates.sort((a,b) => rules.filter(x=>covers(b,x)).length-rules.filter(x=>covers(a,x)).length || b.length-a.length || a.localeCompare(b));
    const chosen = candidates[0];
    if (!chosen) throw Error('Cannot fit oversized asset routes into Pages limits without routing the entire site. Split oversized root assets into directories.');
    const next = [...new Set([...rules.filter(rule=>!covers(chosen,rule)),chosen])];
    if (next.length === rules.length && next.every((r,i)=>r===rules[i])) throw Error('Unable to compact oversized routes');
    rules = next;
  }
  if (rules.includes('/*')) throw Error('Routing all static requests through Functions is prohibited');
  return rules.sort();
}
async function resetBuild(out) {
  const marker = path.join(out, '.hosting-build');
  try {
    const stat = await fs.lstat(out);
    if (stat.isSymbolicLink()) throw Error('Build output must not be a symlink');
    let ownership; try { ownership = await fs.readFile(marker,'utf8'); } catch { throw Error('Refusing to replace a directory not owned by this build'); }
    if (!ownership.startsWith('LowPolyWorks hosting build')) throw Error('Refusing to replace a directory not owned by this build');
    await fs.rm(out, {recursive:true});
  } catch(error) {if(error.code !== 'ENOENT') throw error;}
  await fs.mkdir(out,{recursive:true});
  await fs.writeFile(marker,'LowPolyWorks hosting build\n');
}
export async function prepare({site, out = outputRoot, preview = false, revision = ''}) {
  site = path.resolve(site); out = path.resolve(out);
  const relation = path.relative(out, site);
  const reverse = path.relative(site, out);
  if (!relation || (!relation.startsWith('..') && !path.isAbsolute(relation)) || (!reverse.startsWith('..') && !path.isAbsolute(reverse))) throw Error('Source and output directories must be separate');
  if (!(await fs.stat(path.join(site,'index.html'))).isFile()) throw Error('Site root has no index.html');
  await resetBuild(out);
  const stage = path.join(out,'pages'); await fs.mkdir(stage);
  const manifest = {version:1,revision,preview,source:site,files:[],oversized:[],transformed:[],generated:[]};
  for (const name of await filesIn(site)) {
    if (['_worker.js','_routes.json'].includes(name)) throw Error(`The source already owns ${name}; reconcile that hosting configuration before deployment.`);
    const sourceFile = path.join(site,name), meta = await fingerprint(createReadStream(sourceFile));
    const entry = {path:name,...meta,type:contentType(name)};
    if (meta.size > LIMIT) {
      entry.key = `sha256/${meta.sha256}/${name}`;
      manifest.oversized.push(entry);
    } else {
      const destination = path.join(stage,name); await fs.mkdir(path.dirname(destination),{recursive:true});
      if (preview && /\.(js|mjs|html|json)$/.test(name) && meta.size < 2*1024*1024) {
        const text = await fs.readFile(sourceFile,'utf8'), changed = text.replaceAll(backend+'/api/', '/__preview-backend/api/');
        if (text !== changed) {
          await fs.writeFile(destination,changed);
          entry.sourceSha256 = meta.sha256;
          Object.assign(entry,await fingerprint(createReadStream(destination)));
          manifest.transformed.push(name);
        } else await fs.copyFile(sourceFile,destination);
      } else await fs.copyFile(sourceFile,destination);
    }
    manifest.files.push(entry);
  }
  const assets = Object.fromEntries(manifest.oversized.map(entry=>['/'+entry.path,entry]));
  const routes = routeRules([...Object.keys(assets),...(preview?['/__preview-backend/api/publishing','/__preview-backend/api/events']:[])]);
  if (routes.length) {
    const worker = await fs.readFile(path.join(project,'cloudflare/asset-worker.mjs'),'utf8');
    await fs.writeFile(path.join(stage,'_worker.js'),`${worker}\nexport default createAssetWorker(${JSON.stringify(assets)}, ${JSON.stringify(preview ? backend : null)});\n`);
    await fs.writeFile(path.join(stage,'_routes.json'),JSON.stringify({version:1,include:routes,exclude:[]},null,2)+'\n');
    manifest.generated.push('_worker.js','_routes.json');
  }
  if (!manifest.files.some(file=>file.path==='404.html')) {
    await fs.writeFile(path.join(stage,'404.html'),'<!doctype html><title>Not found</title><h1>Not found</h1>\n'); manifest.generated.push('404.html');
  }
  if (preview) {await fs.appendFile(path.join(stage,'_headers'),'\n/*\n  X-Robots-Tag: noindex\n'); manifest.generated.push('_headers');}
  if (manifest.files.length - manifest.oversized.length + 4 > 20000) throw Error('Pages Free 20,000-file limit exceeded');
  await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(`Prepared ${manifest.files.length} source files (${manifest.files.reduce((n,f)=>n+f.size,0)} bytes); ${manifest.oversized.length} oversized assets (${manifest.oversized.reduce((n,f)=>n+f.size,0)} bytes); ${routes.length} Function routes.`);
  return manifest;
}
function credentials() {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID, token = process.env.CLOUDFLARE_API_TOKEN;
  if (!/^[a-f0-9]{32}$/.test(account||'') || !token || /\s/.test(token)) throw Error('Set CLOUDFLARE_ACCOUNT_ID and a standalone CLOUDFLARE_API_TOKEN in the environment');
  return {account,token};
}
export async function cf(endpoint, {method='GET',body}={}) {
  const {token} = credentials();
  const response = await fetch('https://api.cloudflare.com/client/v4'+endpoint,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(120000)});
  const data = await response.json();
  if (!response.ok || !data.success) throw Error(`Cloudflare ${method} ${endpoint}: HTTP ${response.status}; codes ${(data.errors||[]).map(e=>e.code).join(',')}`);
  return data;
}
async function s3Client() {
  const {account,token} = credentials();
  const verification = await cf('/user/tokens/verify');
  if (verification.result.status !== 'active' || !verification.result.id) throw Error('Cloudflare API token is not active');
  return new S3Client({region:'auto',endpoint:`https://${account}.r2.cloudflarestorage.com`,credentials:{accessKeyId:verification.result.id,secretAccessKey:createHash('sha256').update(token).digest('hex')},maxAttempts:3});
}
export async function provision() {
  const {account} = credentials();
  const buckets = await cf(`/accounts/${account}/r2/buckets`);
  if (!buckets.result.buckets.some(row=>row.name===bucket)) await cf(`/accounts/${account}/r2/buckets`,{method:'POST',body:{name:bucket,storageClass:'Standard'}});
  const projects = await cf(`/accounts/${account}/pages/projects`);
  if (!projects.result?.some(row=>row.name===pagesProject)) await cf(`/accounts/${account}/pages/projects`,{method:'POST',body:{name:pagesProject,production_branch:'gh-pages'}});
  console.log(`Provisioned/confirmed private R2 bucket ${bucket} (Standard) and Pages project ${pagesProject}; no custom domains or DNS changes.`);
}
export async function sync(manifest, client) {
  client ||= await s3Client();
  let uploaded = 0, skipped = 0;
  try {
    for (const asset of manifest.oversized) {
      let current;
      try {current = await client.send(new HeadObjectCommand({Bucket:bucket,Key:asset.key}));}
      catch(error) {if(error.$metadata?.httpStatusCode !== 404) throw error;}
      if (current) {
        if (current.ContentLength !== asset.size || current.Metadata?.sha256 !== asset.sha256) throw Error(`Immutable R2 object has unexpected metadata: ${asset.path}`);
        skipped++; console.log(`Unchanged R2: ${asset.path}`); continue;
      }
      const source = path.join(manifest.source,asset.path);
      const before = await fingerprint(createReadStream(source));
      if (before.sha256 !== asset.sha256 || before.size !== asset.size) throw Error(`Source changed after preparation: ${asset.path}`);
      console.log(`Uploading R2 (${asset.size} bytes): ${asset.path}`);
      await new Upload({client,queueSize:2,partSize:16*1024*1024,leavePartsOnError:false,params:{Bucket:bucket,Key:asset.key,Body:createReadStream(source),ContentType:asset.type,CacheControl:'public, max-age=0, must-revalidate',Metadata:{sha256:asset.sha256},StorageClass:'STANDARD'}}).done();
      const stored = await client.send(new GetObjectCommand({Bucket:bucket,Key:asset.key}));
      const actual = await fingerprint(stored.Body);
      if (actual.sha256 !== asset.sha256 || actual.size !== asset.size) throw Error(`R2 SHA-256 verification failed: ${asset.path}`);
      uploaded++;
    }
  } finally {client.destroy?.();}
  console.log(`R2 synchronization verified: ${uploaded} uploaded, ${skipped} unchanged.`);
  return {uploaded,skipped};
}
async function runNode(args) {
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{cwd:project,stdio:'inherit',env:process.env});
    child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`Command failed with exit ${code}`)));
  });
}
export async function deploy(manifest, {branch='migration-preview'}={}) {
  credentials();
  if (manifest.preview && branch === 'gh-pages') throw Error('Preview-transformed files cannot be deployed to the production branch');
  const started=Date.now();
  await runNode([path.join(project,'node_modules/wrangler/bin/wrangler.js'),'pages','deploy',path.join(outputRoot,'pages'),'--project-name',pagesProject,'--branch',branch,'--commit-hash',manifest.revision||'unknown','--commit-dirty=true']);
  const {account}=credentials();
  const deployments=await cf(`/accounts/${account}/pages/projects/${pagesProject}/deployments`);
  const deployment=deployments.result.find(row=>row.deployment_trigger?.metadata?.branch===branch && new Date(row.created_on).getTime()>=started-5000);
  if(!deployment || deployment.latest_stage?.status!=='success') throw Error('Cannot confirm successful Pages deployment');
  const result={id:deployment.id,url:deployment.url,branch,revision:manifest.revision,created:deployment.created_on,preview:manifest.preview};
  await fs.writeFile(path.join(outputRoot,'deployment.json'),JSON.stringify(result,null,2)+'\n');
  if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,`url=${result.url}\ndeployment_id=${result.id}\n`);
  console.log(`Confirmed deployment: ${result.url}`);return result;
}
async function mapLimit(items, limit, fn) {
  let index=0;const results=[];
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(index<items.length){const i=index++;results[i]=await fn(items[i],i);}}));
  return results;
}
export async function verify(manifest, base) {
  base = new URL(base).origin;
  const deadline=Date.now()+180000; let waiting=false;
  while(true){
    const ready=await fetch(base+'/',{method:'HEAD',signal:AbortSignal.timeout(15000)});
    if(ready.status===200)break;
    if(![404,522,523,524,530].includes(ready.status)||Date.now()>=deadline)throw Error('Deployment routing is not ready: HTTP '+ready.status);
    if(!waiting){console.log('Waiting for first-deployment edge routing (HTTP '+ready.status+')');waiting=true;}
    await new Promise(resolve=>setTimeout(resolve,5000));
  }
  const checked=[];
  const fetchAsset=async(asset)=>{
    const url=new URL('/'+asset.path.split('/').map(encodeURIComponent).join('/'),base);
    const response=await fetch(url,{signal:AbortSignal.timeout(180000)});
    if(!response.ok)throw Error(`HTTP ${response.status}: ${asset.path}`);
    const actual=await fingerprint(response.body);
    if(actual.sha256!==asset.sha256 || actual.size!==asset.size)throw Error(`Deployed SHA-256 mismatch: ${asset.path}`);
    if(/\.(js|mjs)$/.test(asset.path) && !/javascript/.test(response.headers.get('content-type')||''))throw Error(`Invalid JavaScript MIME type: ${asset.path}`);
    checked.push(asset.path);
  };
  await mapLimit(manifest.oversized,2,async asset=>{
    await fetchAsset(asset);
    const url=new URL('/'+asset.path,base);
    const head=await fetch(url,{method:'HEAD',headers:{'Accept-Encoding':'identity'}});
    if(head.status!==200 || (head.headers.has('content-length') && Number(head.headers.get('content-length'))!==asset.size) || !head.headers.get('etag'))throw Error(`HEAD failed: ${asset.path}`);
    const cached=await fetch(url,{headers:{'If-None-Match':head.headers.get('etag')}});
    if(cached.status!==304)throw Error(`Conditional GET failed: ${asset.path}`);
    const range=await fetch(url,{headers:{Range:'bytes=0-31'}});
    const handle=await fs.open(path.join(manifest.source,asset.path));const expected=Buffer.alloc(32);await handle.read(expected,0,32,0);await handle.close();
    if(range.status!==206 || range.headers.get('content-range')!==`bytes 0-31/${asset.size}` || !Buffer.from(await range.arrayBuffer()).equals(expected))throw Error(`Byte range failed: ${asset.path}`);
    const invalid=await fetch(url,{headers:{Range:`bytes=${asset.size}-`}});
    if(invalid.status!==416)throw Error(`Invalid byte range failed: ${asset.path}`);
  });
  const selected=manifest.files.filter(file=>!file.key && (/\.(js|mjs|css|json|html|wasm|woff2?|ttf|ico)$/.test(file.path) && file.size<2*1024*1024 || /\.(mdx|mdl|zip)$/.test(file.path)));
  await mapLimit(selected,12,fetchAsset);
  const notFound=await fetch(base+'/__hosting_missing_asset__.js');
  if(notFound.status!==404)throw Error('Missing assets must return HTTP 404');
  const result={url:base,revision:manifest.revision,verifiedFiles:checked.length,oversized:manifest.oversized.length,sha256:true,head:manifest.oversized.length?true:null,etag304:manifest.oversized.length?true:null,ranges:manifest.oversized.length?true:null,notFound404:true,checked};
  await fs.writeFile(path.join(outputRoot,'verification.json'),JSON.stringify(result,null,2)+'\n');
  console.log(`Verified ${checked.length} deployed files by SHA-256; ${manifest.oversized.length} oversized assets; 404 passed${manifest.oversized.length ? '; oversized HEAD, ETag/304 and ranges passed' : '; no oversized HTTP checks needed for this release'}.`);
  return result;
}
async function main() {
  const [command,...args]=process.argv.slice(2),value=(name,fallback)=>{const i=args.indexOf('--'+name);return i<0?fallback:args[i+1];};
  if(command==='prepare')return prepare({site:value('site','dist'),preview:args.includes('--preview'),revision:value('revision',process.env.GITHUB_SHA||'')});
  if(command==='provision')return provision();
  const manifest=JSON.parse(await fs.readFile(path.join(outputRoot,'manifest.json'),'utf8'));
  if(command==='sync')return sync(manifest);
  if(command==='deploy')return deploy(manifest,{branch:value('branch','migration-preview')});
  if(command==='verify')return verify(manifest,value('url',JSON.parse(await fs.readFile(path.join(outputRoot,'deployment.json'),'utf8')).url));
  throw Error('Use prepare, provision, sync, deploy or verify');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
