// Real Vault controls against isolated owner/report fixtures; no production credentials or writes.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {summarize} from '../tracker/lib/events.js';
import {createHandler} from '../tracker/api/publishing.js';
import {mdlxlReleaseDownloads} from '../tracker/lib/mdlxl-releases.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.MDLXL_REAL_PLAYWRIGHT||'playwright-core');
const root=fileURLToPath(new URL('../tracker/',import.meta.url));
let releases=[{tag_name:'v0.38.0',draft:false,assets:[{name:'MDLxL-0.38.0-win32-x64.zip',download_count:7}]}],reports=0,direct=0;
const account={author:{role:'owner',name:'Test owner'},csrf:'test-only',unitArmies:[],unitCards:[],projects:[],modelEdits:{},removedModels:[],hiddenModels:[]};
const summary=summarize([],{models:[]});
summary.updates={downloads:2,versions:[{version:'0.38.0',downloads:2}]};
const analytics=createHandler({execute:async()=>account},{summary:async()=>summary,loadModels:async()=>[],loadReleases:()=>mdlxlReleaseDownloads({fetchApi:async()=>({ok:true,json:async()=>releases})}),env:{}});
const server=createServer(async(req,res)=>{try{
 if(req.url.startsWith('/api/publishing')){const action=new URL(req.url,'http://localhost').searchParams.get('action');res.setHeader('Content-Type','application/json');
  if(action==='me')res.end(JSON.stringify(account));
  else if(action==='analytics'){reports++;res.status=code=>{res.statusCode=code;return res;};res.json=body=>res.end(JSON.stringify(body));await analytics(req,res);}
  else res.end('{}');return;
 }
 const pathname=new URL(req.url,'http://localhost').pathname,file=pathname==='/'?'vaultofsecrets.html':pathname.slice(1);
 if(file.includes('..')){res.writeHead(400).end();return;}
 const bytes=await readFile(root+file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(bytes);
 }catch(error){res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true}),page=await browser.newPage();
try{
 page.on('pageerror',e=>console.error('PAGE',e.message));page.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text());});
 await page.route('https://www.lowpolyworks.com/**',route=>route.fulfill({contentType:'application/json',body:route.request().url().includes('catalogue.json')?'[]':'<html></html>'}));
 await page.route('https://api.github.com/**',route=>{direct++;return route.fulfill({contentType:'application/json',body:JSON.stringify(releases)});});
 await page.goto('http://127.0.0.1:'+server.address().port+'/#opted-out=1');
 await page.getByRole('button',{name:'Activity',exact:true}).click();
 const rows=page.locator('#mdlxl-updates tbody');
 await page.waitForFunction(()=>document.querySelector('#mdlxl-updates tbody')?.textContent.includes('0.38.0'));
 assert.match(await rows.innerText(),/0\.38\.0\s+2\s+7/);
 releases.unshift({tag_name:'v0.38.2',draft:false,assets:[{name:'MDLxL-win32-x64.zip',download_count:3},{name:'MDLxL-win32-x64.zip.sha256',download_count:99},{name:'MDLxL-FFmpeg-corresponding-source.zip',download_count:99}]});
 releases.unshift({tag_name:'v0.38.3',draft:true,assets:[]});
 await page.getByRole('button',{name:'Refresh',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#mdlxl-updates tbody')?.textContent.includes('0.38.2'),null,{timeout:5000}).catch(()=>{throw Error('Refresh must show newly published 0.38.2 with zero in-app installs');});
 assert.match(await rows.innerText(),/0\.38\.2\s+0\s+3/);assert(!((await rows.innerText()).includes('0.38.3')));
 assert.equal(await page.locator('#zip-total').innerText(),'10');assert.equal(await page.locator('#update-total').innerText(),'2');
 releases[1].assets[0].download_count=4;
 const seen=reports;await page.getByRole('button',{name:'Refresh',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#zip-total')?.textContent==='11');
 assert(reports>seen);assert.match(await rows.innerText(),/0\.38\.2\s+0\s+4/);assert.equal(direct,0,'Vault must not depend on the owner browser GitHub API quota');
 console.log(JSON.stringify({pass:1,fail:0,skip:0,checks:['new zero-install release after actual Refresh','permanent and historical ZIP counts','draft excluded','refreshed count','owner-only report metadata; no browser GitHub dependency']}));
}catch(error){console.error((await page.locator('body').innerText()).slice(-3000));throw error;}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
