import test from 'node:test';
import assert from 'node:assert/strict';
import {markdown,notesSource,downloadUrl,creditLine} from '../dist/mdlxl.js';

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
 assert.equal(downloadUrl({assets}),'application');
 assert.equal(downloadUrl({assets:[]}),'https://github.com/UnsctMagic/MDLxL/releases/latest');
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
