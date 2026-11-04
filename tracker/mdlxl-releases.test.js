import test from 'node:test';
import assert from 'node:assert/strict';
import {mdlxlReleaseDownloads} from './lib/mdlxl-releases.js';
import {createReportHandler} from './api/report.js';
import {createHandler} from './api/publishing.js';
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(body){this.body=body;},end(){}});
test('release metadata includes zero-install releases, counts only app ZIPs and refreshes every request',async()=>{
 let count=3,calls=0;
 const fetchApi=async(url,options)=>{calls++;assert.equal(url,'https://api.github.com/repos/UnsctMagic/MDLxL/releases?per_page=100');assert.equal(options.cache,'no-store');return {ok:true,json:async()=>[
 {tag_name:'v0.38.2',assets:[{name:'MDLxL-win32-x64.zip',download_count:count},{name:'MDLxL-win32-x64.zip.sha256',download_count:88},{name:'MDLxL-FFmpeg-corresponding-source.zip',download_count:99}]},
 {tag_name:'v0.38.0',assets:[{name:'MDLxL-0.38.0-win32-x64.zip',download_count:7}]},
 {tag_name:'v0.38.1',draft:true,assets:[{name:'MDLxL-0.38.1-win32-x64.zip',download_count:1}]},
 {tag_name:'test-build',assets:[]}
 ]};};
 assert.deepEqual(await mdlxlReleaseDownloads({fetchApi}),[['0.38.2',3],['0.38.0',7]]);count=4;
 assert.deepEqual(await mdlxlReleaseDownloads({fetchApi}),[['0.38.2',4],['0.38.0',7]]);assert.equal(calls,2);
});
test('GitHub outages retain unknown counts rather than invented zeros',async t=>{
 t.mock.method(console,'warn',()=>{});
 assert.equal(await mdlxlReleaseDownloads({fetchApi:async()=>({ok:false,status:403})}),null);
 assert.equal(await mdlxlReleaseDownloads({fetchApi:async()=>{throw Error('offline');}}),null);
});
test('private reader and owner analytics load current release metadata only after authorization',async()=>{
 let calls=0;const releases=[['0.38.2',0]],loadReleases=async()=>{calls++;return releases;},summary=async()=>({updates:{downloads:2,versions:[{version:'0.38.0',downloads:2}]}}),loadModels=async()=>[];
 const report=createReportHandler({summary,loadModels,loadReleases,env:{USAGE_READ_TOKEN:'test-only'}});
 let res=response();await report({url:'/api/report',method:'GET',headers:{}},res);assert.equal(res.statusCode,401);assert.equal(calls,0);
 res=response();await report({url:'/api/report',method:'GET',headers:{authorization:'Bearer test-only'}},res);assert.equal(res.statusCode,200);assert.deepEqual(res.body.mdlxlReleaseDownloads,releases);assert.equal(res.body.updates.downloads,2);assert.equal(res.headers['Cache-Control'],'private, no-store');
 let role='contributor';const service={execute:async()=>({author:{role}})},owner=createHandler(service,{summary,loadModels,loadReleases,env:{}});
 res=response();await owner({url:'/api/publishing?action=analytics',method:'GET',headers:{}},res);assert.equal(res.statusCode,403);assert.equal(calls,1);
 role='owner';res=response();await owner({url:'/api/publishing?action=analytics',method:'GET',headers:{}},res);assert.equal(res.statusCode,200);assert.deepEqual(res.body.mdlxlReleaseDownloads,releases);assert.equal(calls,2);
});
