import test from 'node:test';
import assert from 'node:assert/strict';
import {changedModels,publicationChanges} from './model-publication-changed.mjs';

test('only a new catalogue model or changed downloadable bytes trigger a publication check',async()=>{
 const before=[{id:'a',name:'A',file:'a.mdx',downloadPack:'downloads/a.zip'}],same=[{...before[0],name:'New title',credits:'New credits',image:'new.png'}];
 const files={before:{'models/a.mdx':'a','downloads/a.zip':'pack'},after:{'models/a.mdx':'a','downloads/a.zip':'pack','models/b.mdx':'b'}};const fileId=async(ref,path)=>files[ref][path];
 assert.deepEqual(await changedModels(before,same,fileId),[]);assert.deepEqual(await changedModels(before,[],fileId),[]);
 files.after['downloads/a.zip']='new-pack';assert.deepEqual(await changedModels(before,same,fileId),['a']);files.after['downloads/a.zip']='pack';
 assert.deepEqual(await changedModels(before,[...same,{id:'b',file:'b.mdx'}],fileId),['b']);
});

test('the event gate compares against the previous successful deployment, including several commits of model changes',async()=>{
 const event={workflow_run:{id:3,workflow_id:9,created_at:'2026-10-11T12:00:00Z',head_branch:'gh-pages',head_sha:'new'}},requests=[];
 const responses={
  'actions/workflows/9/runs?status=success&per_page=100&page=1':{workflow_runs:[{...event.workflow_run},{id:4,head_sha:'future',head_branch:'gh-pages',created_at:'2026-10-11T13:00:00Z'},{id:2,head_sha:'old',head_branch:'gh-pages',created_at:'2026-10-10T12:00:00Z'}]},
  'git/commits/old':{tree:{sha:'old-root'}},'git/commits/new':{tree:{sha:'new-root'}},
  'git/trees/old-root':{tree:[{path:'catalogue.json',sha:'old-catalogue'},{path:'models',sha:'old-models'}]},
  'git/trees/new-root':{tree:[{path:'catalogue.json',sha:'new-catalogue'},{path:'models',sha:'new-models'}]},
  'git/blobs/old-catalogue':{content:Buffer.from(JSON.stringify([{id:'a',file:'a.mdx'}])).toString('base64')},
  'git/blobs/new-catalogue':{content:Buffer.from(JSON.stringify([{id:'a',file:'a.mdx'},{id:'b',file:'b.mdx'}])).toString('base64')},
  'git/trees/old-models':{tree:[{path:'a.mdx',sha:'same-bytes'}]},'git/trees/new-models':{tree:[{path:'a.mdx',sha:'same-bytes'},{path:'b.mdx',sha:'new-bytes'}]},
 };
 const ids=await publicationChanges(event,{repository:'owner/repo',token:'test',fetchApi:async url=>{const path=url.split('/owner/repo/')[1];requests.push(path);assert(responses[path],path);return {ok:true,json:async()=>responses[path]};}});
 assert.deepEqual(ids,['b']);assert.equal(new Set(requests).size,requests.length);
});
