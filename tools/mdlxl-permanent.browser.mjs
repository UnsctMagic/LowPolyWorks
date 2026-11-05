import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.MDLXL_REAL_PLAYWRIGHT||'playwright-core');
const source=fs.readFileSync(new URL('../dist/mdlxl.js',import.meta.url),'utf8'),language=fs.readFileSync(new URL('../dist/mdlxl-languages.js',import.meta.url),'utf8');
const permanent='https://github.com/UnsctMagic/MDLxL/releases/latest/download/MDLxL-win32-x64.zip';
const browser=await chromium.launch({headless:true}),page=await browser.newPage();
try{
 await page.route('https://www.lowpolyworks.com/mdlxl.js*',route=>route.fulfill({contentType:'text/javascript',body:source}));
 await page.route('https://www.lowpolyworks.com/mdlxl-languages.js*',route=>route.fulfill({contentType:'text/javascript',body:language}));
 await page.route('https://api.github.com/**',route=>route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({message:'API rate limit exceeded'})}));
 await page.route(permanent,route=>route.fulfill({contentType:'application/zip',headers:{'Content-Disposition':'attachment; filename="MDLxL-win32-x64.zip"'},body:'isolated download fixture; public bytes verified separately'}));
 await page.goto('https://www.lowpolyworks.com/mdlxl/?tracking-test=1',{waitUntil:'domcontentloaded'});
 const download=page.locator('#mdlxl-download');await download.waitFor();
 assert.equal(await download.getAttribute('aria-disabled'),null,'The permanent download must stay enabled when GitHub metadata returns 403');
 assert.equal(await download.getAttribute('href'),permanent,'The Download button must use the permanent latest URL');
 const transfer=page.waitForEvent('download');await download.click();const file=await transfer;assert.equal(file.url(),permanent);assert.equal(file.suggestedFilename(),'MDLxL-win32-x64.zip');await file.cancel();
 for(const locale of ['fr','de']){await page.locator('.mdlxl-language select').selectOption(locale);assert.equal(await download.getAttribute('href'),permanent);assert.equal(await download.getAttribute('aria-disabled'),null);}
 console.log(JSON.stringify({pass:1,fail:0,skip:0,checks:['real production entry with candidate modules','permanent Download enabled during GitHub 403','real click starts correct named download','French/German shell keeps permanent link']}));
}finally{await browser.close();}
