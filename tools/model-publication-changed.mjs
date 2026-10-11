import {readFileSync,appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// Compare Git blob identities for the catalogue's actual download files.
// Cosmetic catalogue edits and ordinary website deployments do not run the mailer.
export async function changedModels(before,after,fileId){
 const fingerprint=async(model,ref)=>JSON.stringify((await Promise.all(['models/'+model.file,...(model.downloadPack?[model.downloadPack]:[])].map(path=>fileId(ref,decodeURIComponent(new URL(path,'https://www.lowpolyworks.com/').pathname.slice(1)))))).sort());
 const old=new Map(await Promise.all(before.map(async model=>[model.id,await fingerprint(model,'before')])));
 return (await Promise.all(after.map(async model=>old.get(model.id)!==await fingerprint(model,'after')?model.id:null))).filter(Boolean);
}

export async function publicationChanges(event,{repository,token,fetchApi=fetch}){
 const run=event.workflow_run;
 const api=async path=>{
  const response=await fetchApi('https://api.github.com/repos/'+repository+'/'+path,{headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Publication metadata unavailable (HTTP '+response.status+')');
  return response.json();
 };
 let previous;
 for(let page=1;!previous;page++){
  const data=await api('actions/workflows/'+run.workflow_id+'/runs?status=success&per_page=100&page='+page);
  previous=data.workflow_runs.find(row=>row.id!==run.id&&row.head_branch===run.head_branch&&row.created_at<=run.created_at&&row.head_sha!==run.head_sha);
  if(!data.workflow_runs.length)break;
 }
 if(!previous)return [];
 const cache=new Map();
 const tree=sha=>{if(!cache.has(sha))cache.set(sha,api('git/trees/'+sha).then(data=>new Map(data.tree.map(entry=>[entry.path,entry]))));return cache.get(sha);};
 const roots=await Promise.all([previous.head_sha,run.head_sha].map(sha=>api('git/commits/'+sha).then(commit=>commit.tree.sha)));
 const fileId=async(ref,path)=>{
  let sha=roots[ref==='before'?0:1];
  for(const part of path.split('/')){const entry=(await tree(sha)).get(part);if(!entry)throw Error('Published download is missing: '+path);sha=entry.sha;}
  return sha;
 };
 const catalogue=async ref=>{const blob=await api('git/blobs/'+await fileId(ref,'catalogue.json'));return JSON.parse(Buffer.from(blob.content,'base64').toString());};
 const [before,after]=await Promise.all([catalogue('before'),catalogue('after')]);
 return changedModels(before,after,fileId);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH));
 const ids=event.workflow_run?await publicationChanges(event,{repository:process.env.GITHUB_REPOSITORY,token:process.env.GITHUB_TOKEN}):[];
 appendFileSync(process.env.GITHUB_OUTPUT,'changed='+Boolean(ids.length)+'\n');
 console.log(ids.length?'Published model files changed: '+ids.join(', '):'No model uploads or download changes; notification check skipped.');
}
