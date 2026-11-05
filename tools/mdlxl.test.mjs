import {readFileSync,readdirSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {markdown,notesSource,downloadUrl,creditLine,officialNotes,renderMdlxl} from '../dist/mdlxl.js';

test('release Markdown keeps prose, links and formatting without executing HTML',()=>{
 const html=markdown('# Update\n\n- **Saved** `Geosets[0]`\n- [Details](https://github.com/UnsctMagic/MDLxL/pull/109)\n\n<img src=x onerror=alert(1)>\n[jump](javascript:alert(1))');
 assert(html.includes('<strong>Saved</strong>'));
 assert(html.includes('<code>Geosets[0]</code>'));
 assert(html.includes('href="https://github.com/UnsctMagic/MDLxL/pull/109"'));
 assert(!html.includes('<img'));
 assert(!html.includes('href="javascript:'));
});
test('English patch notes follow the published tag instead of a fixed version',()=>{
 assert.equal(notesSource({body:'[English](https://github.com/UnsctMagic/MDLxL/blob/v0.99.1/docs/RELEASE-0.99.1.md)'}),'https://raw.githubusercontent.com/UnsctMagic/MDLxL/v0.99.1/docs/RELEASE-0.99.1.md');
 assert.equal(notesSource({body:'Inline release notes'}),null);
 assert.equal(notesSource({body:'[English](https://example.org/notes.md)'}),null);
});
test('download selects the application ZIP, not source or checksums, for a future release',()=>{
 const assets=[{name:'MDLxL-FFmpeg-corresponding-source.zip',browser_download_url:'source'},{name:'MDLxL-0.99.1-win32-x64.zip.sha256',browser_download_url:'checksum'},{name:'MDLxL-0.99.1-win32-x64.zip',browser_download_url:'application'}];
 assert.equal(downloadUrl({tag_name:'v0.99.1',assets}),'application');
 assert.equal(downloadUrl({tag_name:'v0.99.1',assets:[]}),null);
 assert.equal(downloadUrl({tag_name:'v0.99.2',assets}),null);
});
test('official multilingual posts and legacy translated notes use their owning source',()=>{
 assert.equal(officialNotes({body:'[English](https://www.lowpolyworks.com/mdlxl/?version=0.20.0&lang=en)'}),true);
 assert.equal(officialNotes({body:'[English](https://www.lowpolyworks.com.evil.test/mdlxl/)'}),false);
 assert.equal(notesSource({body:'[Русский](https://github.com/UnsctMagic/MDLxL/blob/v0.19.0/docs/RELEASE-0.19.0-RU.md)'},'ru'),'https://raw.githubusercontent.com/UnsctMagic/MDLxL/v0.19.0/docs/RELEASE-0.19.0-RU.md');
});
test('credits distinguish creator profiles from the resources they made',()=>{
 const links=[...creditLine('HerrDave, POMEXI, rubberduck — 60 Free GIMP / Krita Brushes. Rodrigo Fuenzalida and Nicolas Massi — Pirata One.').matchAll(/href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(m=>[m[2],m[1]]);
 assert.deepEqual(links,[
  ['HerrDave','https://www.hiveworkshop.com/members/herrdave.234820/'],
  ['POMEXI','https://www.hiveworkshop.com/members/pomexi.326199/'],
  ['rubberduck','https://opengameart.org/users/rubberduck'],
  ['60 Free GIMP / Krita Brushes','https://opengameart.org/content/60-free-gimp-krita-brushes'],
  ['Rodrigo Fuenzalida','https://www.behance.net/erreefe'],
  ['Nicolas Massi','https://github.com/nmassi'],
  ['Pirata One','https://fonts.google.com/specimen/Pirata+One']
 ]);
 assert(!creditLine('<script>alert("HerrDave")</script>').includes('<script>'));
});

test('the permanent download stays usable and tracked while release metadata is unavailable',async t=>{
 globalThis.location={hash:'#project/mdlxl/preview'};globalThis.document={title:''};
 t.after(()=>{delete globalThis.location;delete globalThis.document;});
 const button={},panel={},version={},source={};let markup='';
 const app={get innerHTML(){return markup;},set innerHTML(value){markup=value;},querySelector:selector=>({'#mdlxl-download':button,'#mdlxl-content':panel,'#mdlxl-version':version,'#mdlxl-ffmpeg-source':source}[selector])};
 t.mock.method(globalThis,'fetch',async()=>({ok:false,status:403}));
 const events=[];await renderMdlxl(app,()=>true,(...args)=>events.push(args));
 assert(markup.includes('href="https://github.com/UnsctMagic/MDLxL/releases/latest/download/MDLxL-win32-x64.zip"'));
 assert(!markup.includes('aria-disabled="true"'));assert.equal(button.href,'https://github.com/UnsctMagic/MDLxL/releases/latest/download/MDLxL-win32-x64.zip');
 button.onclick();assert.deepEqual(events,[['download','mdlxl','zip']]);assert.equal(source.onclick,undefined);
});
import {tutorialLanguages,tutorialText} from '../dist/mdlxl/tutorials/languages.js';
test('French and German have tutorial pickers and native release-note sources',()=>{
 for(const [language,label,suffix] of [['fr','Français','FR'],['de','Deutsch','DE']]){
  assert(tutorialLanguages.some(item=>item.id===language&&item.label===label));
  assert(tutorialText[language]?.loading);
  const url='https://github.com/UnsctMagic/MDLxL/blob/v0.99.1/docs/RELEASE-0.99.1-'+suffix+'.md';
  assert.equal(notesSource({body:'['+label+']('+url+')'},language),url.replace('github.com/UnsctMagic/MDLxL/blob/','raw.githubusercontent.com/UnsctMagic/MDLxL/'));
 }
});

test('the next fixed-name portable release remains downloadable',()=>{
 assert.equal(downloadUrl({tag_name:'v0.39.0',assets:[{name:'MDLxL-win32-x64.zip',browser_download_url:'fixed-application'}]}),'https://github.com/UnsctMagic/MDLxL/releases/latest/download/MDLxL-win32-x64.zip');
});

test('French and German cover every current Spanish tutorial and its native media',()=>{
 const base=new URL('../dist/mdlxl/tutorials/',import.meta.url);
 const html=locale=>readFileSync(new URL(locale+'/content.html',base),'utf8');
 const ids=source=>[...source.matchAll(/<article\b[^>]*id="tutorial-([^"]+)"/g)].map(match=>match[1]);
 const media=locale=>readdirSync(new URL(locale+'/',base)).filter(name=>/\.(?:gif|png)$/.test(name)).sort();
 const expected=ids(html('es'));assert(expected.includes('fx'),'Spanish inventory includes published FX guide');
 for(const locale of ['fr','de']){
  assert.deepEqual(ids(html(locale)),expected,locale+' tutorial coverage');
  assert.deepEqual(media(locale),media('es'),locale+' native media inventory');
  assert(html(locale).includes('/mdlxl/tutorials/fx/?lang='+locale),locale+' FX route');
 }
});

test('the fixed application asset uses the permanent latest-download URL',()=>{
 const assets=[{name:'MDLxL-FFmpeg-corresponding-source.zip',browser_download_url:'source'},{name:'MDLxL-win32-x64.zip.sha256',browser_download_url:'checksum'},{name:'MDLxL-win32-x64.zip',browser_download_url:'https://github.com/UnsctMagic/MDLxL/releases/download/v0.38.2/MDLxL-win32-x64.zip'}];
 assert.equal(downloadUrl({tag_name:'v0.38.2',assets}),'https://github.com/UnsctMagic/MDLxL/releases/latest/download/MDLxL-win32-x64.zip');
});
