import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {prepare, LIMIT, routeRules, sync, fingerprint} from './cloudflare-hosting.mjs';
import {createAssetWorker} from '../cloudflare/asset-worker.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function fixture(t) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'lpw-hosting-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const site=path.join(root,'site'),out=path.join(root,'out');await fs.mkdir(site);
  await fs.writeFile(path.join(site,'index.html'),'<title>LowPolyWorks</title>');
  return {root,site,out};
}
test('preparation separates files at the exact limit, preserves original bytes, and reruns safely',async t=>{
  const {site,out}=await fixture(t);
  const boundary=await fs.open(path.join(site,'boundary.bin'),'w');await boundary.truncate(LIMIT);await boundary.close();
  const big=await fs.open(path.join(site,'large.js'),'w');await big.truncate(LIMIT+1);await big.close();
  const before=await fingerprint(createReadStream(path.join(site,'large.js')));
  const manifest=await prepare({site,out});
  assert.equal(manifest.oversized.length,1);assert.equal(manifest.oversized[0].size,LIMIT+1);
  assert.equal((await fs.stat(path.join(out,'pages/boundary.bin'))).size,LIMIT);
  await assert.rejects(fs.stat(path.join(out,'pages/large.js')),{code:'ENOENT'});
  assert.deepEqual(await fingerprint(createReadStream(path.join(site,'large.js'))),before);
  assert(manifest.oversized[0].key.endsWith('/large.js'));
  await prepare({site,out});
  assert.equal(await fs.readFile(path.join(out,'pages/index.html'),'utf8'),'<title>LowPolyWorks</title>');
});
test('build never deletes an unowned output directory',async t=>{
  const {site,out}=await fixture(t);await fs.mkdir(out);await fs.writeFile(path.join(out,'user-file'),'keep');
  await assert.rejects(prepare({site,out}),/not owned/);assert.equal(await fs.readFile(path.join(out,'user-file'),'utf8'),'keep');
});
test('preview rewrites only API references in generated copies; production copies source exactly',async t=>{
  const {site,out}=await fixture(t),script="fetch('https://lowpolyworks-vault.lowpolyworks-internal-tracker.workers.dev/api/publishing'); const author='https://lowpolyworks-vault.lowpolyworks-internal-tracker.workers.dev/author.html';";
  await fs.writeFile(path.join(site,'app.js'),script);
  const preview=await prepare({site,out,preview:true});assert.deepEqual(preview.transformed,['app.js']);
  const copy=await fs.readFile(path.join(out,'pages/app.js'),'utf8');assert(copy.includes("fetch('/__preview-backend/api/publishing')"));assert(copy.includes('/author.html'));
  assert.equal(await fs.readFile(path.join(site,'app.js'),'utf8'),script);
  const production=await prepare({site,out});assert.deepEqual(production.transformed,[]);assert.equal(await fs.readFile(path.join(out,'pages/app.js'),'utf8'),script);
});
test('routes handle new files, long paths and more than 100 assets without routing the whole site',()=>{
  const urls=Array.from({length:130},(_,i)=>`/tutorials/language-${i}/animation.js`);
  urls.push('/tutorials/'+'long-'.repeat(30)+'/file.js','/hello world/a.js');
  const rules=routeRules(urls);assert(rules.length<=100);assert(rules.every(rule=>rule.length<=100));assert(!rules.includes('/*'));
  for(const url of urls){const encoded=url.split('/').map(encodeURIComponent).join('/');assert(rules.some(rule=>rule.endsWith('*')?encoded.startsWith(rule.slice(0,-1)):encoded===rule),url);}
  assert(!rules.some(rule=>rule.endsWith('*')?'/style.css'.startsWith(rule.slice(0,-1)):rule==='/style.css'));
});
function workerFixture() {
  const bytes=Buffer.from('0123456789abcdefghijklmnopqrstuvwxyz'),sha256=digest(bytes),uploaded=new Date('2026-11-05T00:00:00Z');let heads=0,gets=0;
  const object={size:bytes.length,customMetadata:{sha256},httpEtag:'"r2-etag"',uploaded,writeHttpMetadata(headers){headers.set('Content-Type','wrong/type');}};
  const env={ASSETS:{fetch:async()=>new Response('static')},LARGE_ASSETS:{head:async()=>{heads++;return object;},get:async(_key,options)=>{gets++;const range=options?.range;return {body:range?bytes.subarray(range.offset,range.offset+range.length):bytes};}}};
  const worker=createAssetWorker({'/large.js':{key:'hash/large.js',sha256,size:bytes.length,type:'text/javascript; charset=utf-8'}});
  const request=(headers={},method='GET')=>worker.fetch(new Request('https://site.pages.dev/large.js?version=1',{method,headers}),env);
  return {worker,env,request,bytes,object,counts:()=>({heads,gets})};
}
test('R2 response streams exact bytes with JavaScript MIME, cache headers, ETag, and HEAD without a body read',async()=>{
  const f=workerFixture(),head=await f.request({},'HEAD');assert.equal(head.status,200);assert.equal(await head.text(),'');assert.equal(head.headers.get('content-length'),String(f.bytes.length));assert.equal(f.counts().gets,0);
  const full=await f.request();assert.equal(full.status,200);assert.match(full.headers.get('content-type'),/javascript/);assert.equal(full.headers.get('etag'),'"r2-etag"');assert.equal(full.headers.get('accept-ranges'),'bytes');assert.match(full.headers.get('cache-control'),/must-revalidate/);assert(Buffer.from(await full.arrayBuffer()).equals(f.bytes));
});
test('conditional requests use HTTP precedence and avoid body reads',async()=>{
  const f=workerFixture();
  for(const headers of [{'If-None-Match':'W/"r2-etag"'},{'If-None-Match':'"other", "r2-etag"'},{'If-None-Match':'*'},{'If-Modified-Since':'Thu, 05 Nov 2026 00:00:00 GMT'}])assert.equal((await f.request(headers)).status,304);
  assert.equal((await f.request({'If-Match':'"wrong"'})).status,412);
  assert.equal((await f.request({'If-Match':'W/"r2-etag"'})).status,412);
  assert.equal((await f.request({'If-Unmodified-Since':'Wed, 04 Nov 2026 00:00:00 GMT'})).status,412);
  assert.equal(f.counts().gets,0);
  assert.equal((await f.request({'If-None-Match':'"different"','If-Modified-Since':'Thu, 05 Nov 2026 00:00:00 GMT'})).status,200);
});
test('byte ranges include closed, open, suffix, clamped, unsatisfiable and If-Range cases',async()=>{
  const f=workerFixture();
  for(const [range,expected,contentRange] of [['bytes=2-5','2345','bytes 2-5/36'],['bytes=33-','xyz','bytes 33-35/36'],['bytes=-3','xyz','bytes 33-35/36'],['bytes=34-100','yz','bytes 34-35/36'],['bytes=-100',f.bytes.toString(),'bytes 0-35/36']]){
    const response=await f.request({Range:range});assert.equal(response.status,206);assert.equal(await response.text(),expected);assert.equal(response.headers.get('content-range'),contentRange);
  }
  for(const range of ['bytes=36-','bytes=5-2','bytes=-0'])assert.equal((await f.request({Range:range})).status,416);
  for(const range of ['nonsense','bytes=0-1,4-5'])assert.equal((await f.request({Range:range})).status,200);
  assert.equal((await f.request({Range:'bytes=0-2','If-Range':'"old"'})).status,200);
  assert.equal((await f.request({Range:'bytes=0-2','If-Range':'"r2-etag"'})).status,206);
});
test('unknown routes use static serving, mutations are rejected, and missing/corrupt release objects fail closed',async()=>{
  const f=workerFixture();assert.equal(await (await f.worker.fetch(new Request('https://site.pages.dev/style.css'),f.env)).text(),'static');
  assert.equal((await f.request({},'POST')).status,405);
  f.object.customMetadata.sha256='wrong';assert.equal((await f.request()).status,503);
  f.env.LARGE_ASSETS.head=async()=>null;assert.equal((await f.request()).status,503);
});
test('R2 synchronization skips verified immutable objects and fails on metadata mismatch or access errors',async()=>{
  const asset={path:'large.js',key:'sha256/hash/large.js',size:42,sha256:'hash'};
  const result=await sync({oversized:[asset]},{send:async()=>({ContentLength:42,Metadata:{sha256:'hash'}}),destroy(){}});assert.deepEqual(result,{uploaded:0,skipped:1});
  await assert.rejects(sync({oversized:[asset]},{send:async()=>({ContentLength:41,Metadata:{sha256:'hash'}}),destroy(){}}),/unexpected metadata/);
  await assert.rejects(sync({oversized:[asset]},{send:async()=>{throw Object.assign(Error('Access denied'),{$metadata:{httpStatusCode:403}});},destroy(){}}),/Access denied/);
});

test('preview proxy preserves public backend behavior without forwarding author credentials',async()=>{
  const original=globalThis.fetch;let forwarded;
  globalThis.fetch=async(url,options)=>{forwarded={url:String(url),options};return new Response('public feed',{headers:{'Set-Cookie':'lpw_session=secret','Access-Control-Allow-Origin':'https://www.lowpolyworks.com'}});};
  try{
    const worker=createAssetWorker({},'https://backend.example');
    const response=await worker.fetch(new Request('https://preview.pages.dev/__preview-backend/api/publishing?action=feed',{headers:{Cookie:'lpw_session=private',Authorization:'Bearer private',Origin:'https://preview.pages.dev'}}),{});
    assert.equal(forwarded.url,'https://backend.example/api/publishing?action=feed');assert.equal(forwarded.options.headers.get('Origin'),'https://www.lowpolyworks.com');assert(!forwarded.options.headers.has('Cookie'));assert(!forwarded.options.headers.has('Authorization'));assert(!response.headers.has('Set-Cookie'));assert.equal(await response.text(),'public feed');
  }finally{globalThis.fetch=original;}
});

test('a replacement at the same URL gets a new immutable key while the old release mapping stays valid',async t=>{
  const {site,out}=await fixture(t);const file=path.join(site,'large.js');
  let handle=await fs.open(file,'w');await handle.truncate(LIMIT+1);await handle.close();
  const oldRelease=await prepare({site,out});const oldKey=oldRelease.oversized[0].key;
  handle=await fs.open(file,'r+');await handle.write(Buffer.from('x'),0,1,0);await handle.close();
  const replacement=await prepare({site,out});
  assert.notEqual(replacement.oversized[0].key,oldKey);assert.equal(oldRelease.oversized[0].key,oldKey);assert(oldKey.endsWith('/large.js'));assert(replacement.oversized[0].key.endsWith('/large.js'));
});

test('a production release with no oversized assets needs no Function or catch-all route',async t=>{
  const {site,out}=await fixture(t);const manifest=await prepare({site,out});assert.equal(manifest.oversized.length,0);
  await assert.rejects(fs.stat(path.join(out,'pages/_worker.js')),{code:'ENOENT'});await assert.rejects(fs.stat(path.join(out,'pages/_routes.json')),{code:'ENOENT'});
});

test('existing public tools URLs are copied as static assets',async t=>{
  const {site,out}=await fixture(t);await fs.mkdir(path.join(site,'tools'));await fs.writeFile(path.join(site,'tools/model-updates.mjs'),'export const published=true;');
  const manifest=await prepare({site,out});assert(manifest.files.some(file=>file.path==='tools/model-updates.mjs'));assert.equal(await fs.readFile(path.join(out,'pages/tools/model-updates.mjs'),'utf8'),'export const published=true;');
});
