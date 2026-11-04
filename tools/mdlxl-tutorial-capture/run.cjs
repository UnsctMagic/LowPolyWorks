const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root='D:/Codex/french-german/captures',native='D:/Codex/french-german/MDLxL',locale=process.argv[2],kinds=process.argv.slice(3);
if(!['fr','de',...(process.env.LPW_PILOT==='1'?['en']:[])].includes(locale)||!kinds.length||kinds.some(k=>!['anchor','align','live','corpse','glow','ribbon','optixl'].includes(k)))throw Error('Expected locale and kinds');
const out=root+'/'+locale,temporary=root+'/temp';fs.mkdirSync(temporary,{recursive:true});if(fs.existsSync(out+'/run-error.txt'))fs.unlinkSync(out+'/run-error.txt');
const removeTree=target=>{target=path.resolve(target);const safe=path.resolve(root);if(!target.startsWith(safe+path.sep))throw Error('Cleanup outside captures');const walk=d=>{for(const entry of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,entry.name);if(fs.lstatSync(p).isSymbolicLink()){if(fs.statSync(p).isDirectory())fs.rmdirSync(p);else fs.unlinkSync(p)}else if(entry.isDirectory())walk(p)}};walk(target);fs.rmSync(target,{recursive:true,force:true,maxRetries:6,retryDelay:250});};
const errors={anchor:['anchor-error.txt','anchor-setup-error.txt'],align:['align-error.txt','align-setup-error.txt'],live:['live-error.txt','live-setup-error.txt'],corpse:['capture-error.txt','corpse-setup-error.txt'],glow:['error.txt'],ribbon:['ribbon-error.txt'],optixl:['optixl-error.txt']};
const hashFile=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const fingerprint=()=>{const assets=native+'/dist/assets',bundle=crypto.createHash('sha256');for(const name of fs.readdirSync(assets).sort())bundle.update(name).update(fs.readFileSync(assets+'/'+name));return {index:hashFile(native+'/dist/index.html'),assets:bundle.digest('hex'),fr:hashFile(native+'/src/locales/fr.json'),de:hashFile(native+'/src/locales/de.json')}};
const built=fingerprint();fs.writeFileSync(out+'/capture-build.json',JSON.stringify({pilot:process.env.LPW_PILOT==='1',fingerprint:built},null,2));
const checkBuild=()=>{if(JSON.stringify(fingerprint())!==JSON.stringify(built))throw Error('Catalog or renderer changed during capture; re-record against a frozen build')};
async function run(kind){
 checkBuild();
 for(const n of errors[kind])if(fs.existsSync(out+'/'+n))fs.unlinkSync(out+'/'+n);
 const file=['ribbon','optixl'].includes(kind)?root+'/'+kind+'.cjs':out+'/'+kind+'.cjs';
 const env={...process.env,TEMP:temporary,TMP:temporary,LPW_LOCALE:locale,MDLXL_HIDDEN_COMMAND:'"D:\\Claude\\MDLxL\\node_modules\\electron\\dist\\electron.exe" "'+file.replaceAll('/','\\')+'"'};delete env.ELECTRON_RUN_AS_NODE;
 await new Promise((resolve,reject)=>{const child=cp.spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',native+'/scripts/hidden-run.ps1','-WorkDir',native],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);const timer=setTimeout(()=>{cp.spawnSync('taskkill',['/T','/F','/PID',String(child.pid)],{windowsHide:true});reject(Error('Timed out '+locale+'/'+kind));},360000);child.on('error',e=>{clearTimeout(timer);reject(e)});child.on('exit',code=>{clearTimeout(timer);fs.writeFileSync(out+'/'+kind+'-launch.log',log);if(code)reject(Error('Hidden capture exit '+code+' '+log));else resolve()})});
 const failure=errors[kind].find(n=>fs.existsSync(out+'/'+n));if(failure)throw Error(fs.readFileSync(out+'/'+failure,'utf8'));
 if(!fs.existsSync(out+'/'+kind+'-manifest.json'))throw Error('No manifest '+kind);
 const encoded=cp.spawnSync(process.execPath,[root+'/encode.mjs',locale,kind],{encoding:'utf8',windowsHide:true,env:{...process.env,TEMP:temporary,TMP:temporary},maxBuffer:1000000});process.stdout.write(encoded.stdout||'');if(encoded.status)throw Error(encoded.stderr||'Encoder failed');
 for(const name of fs.readdirSync(out))if(name.startsWith('profile-')||name.startsWith('capture-profile-')){const p=out+'/'+name;if(fs.statSync(p).isDirectory())removeTree(p)}
 checkBuild();console.log('DONE '+locale+'/'+kind);
}
(async()=>{for(const kind of kinds)await run(kind);console.log('ALL REQUESTED CAPTURES DONE '+locale)})().catch(e=>{fs.writeFileSync(out+'/run-error.txt',e.stack||String(e));console.error(e);process.exitCode=1});
