import test from 'node:test';
import assert from 'node:assert/strict';
import {markdown,notesSource,downloadUrl} from '../dist/mdlxl.js';

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
