import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {TEAM_COLORS} from '../dist/vendor/mdlxl/src/team-colors.js';
import {modelPage,mdlxlPage} from './model-pages.mjs';
import {parseMDX} from '../dist/vendor/war3-model.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(project, 'dist');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const exists = name => assert(fs.existsSync(path.join(root, name)), `Missing ${name}`);
const rows = read('catalogue.json');
const armies = read('armies.json');
const textures = read('textures.json');
const ids = new Set(rows.map(row => row.id));
const slugs = new Set(rows.map(row => row.slug || row.id));
const modelHashes = JSON.parse(fs.readFileSync(path.join(project, 'tools/model-hashes.json'), 'utf8'));
assert.equal(fs.readFileSync(path.join(root, 'mdlxl/index.html'), 'utf8'), mdlxlPage(fs.readFileSync(path.join(root, 'index.html'), 'utf8')), 'Stale MDLxL page. Run npm run build:model-pages.');
assert.equal(modelHashes.length, rows.length, 'Model hash inventory size');
for (const entry of modelHashes) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'models', entry.file))).digest('hex'), entry.sha256, `Model changed: ${entry.file}`);
}
assert.equal(ids.size, rows.length, 'Duplicate catalogue IDs');
assert.equal(slugs.size, rows.length, 'Duplicate model page names');
for (const file of ['server.mjs', 'tools/check-project.mjs', 'dist/app.js', 'dist/journal.js', 'dist/viewer.js', 'dist/viewer-effects.js', 'dist/website-camera-controls.js', 'tracker/author.js', 'tracker/api/publishing.js', 'tracker/lib/publishing.js', 'tracker/lib/publishing-state.js', 'tracker/lib/publishing-mail.js']) {
  execFileSync(process.execPath, ['--check', path.join(project, file)], {stdio: 'pipe'});
}
for (const file of Object.values(textures)) exists(file);
for (const row of rows) {
  assert(armies.some(army => army.id === row.army), `Unknown army for ${row.id}`);
  exists('models/' + row.file);
  const modelBytes = fs.readFileSync(path.join(root, 'models', row.file));
  const model = parseMDX(modelBytes.buffer.slice(modelBytes.byteOffset, modelBytes.byteOffset + modelBytes.byteLength));
  for (const texture of model.Textures.filter(texture => texture.Image && ![1, 2].includes(texture.ReplaceableId))) {
    const file = row.textureFiles?.[texture.Image.toLowerCase()] || textures[texture.Image.toLowerCase()];
    assert(file, `Missing rendering texture for ${row.id}: ${texture.Image}. Run node tools/model-textures.mjs ${row.id}.`);
    exists(file);
  }
  exists('thumbs/unit-' + row.id + '.png');
  const page = `model/${row.slug || row.id}/index.html`;
  exists(page);
  assert.equal(fs.readFileSync(path.join(root, page), 'utf8'), modelPage(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), row, fs.readFileSync(path.join(root, 'thumbs', `unit-${row.id}.png`))), `Stale model preview page: ${row.id}. Run npm run build:model-pages.`);
  for (const file of Object.values(row.textureFiles || {})) exists(file);
  if (row.downloadPack) exists(row.downloadPack);
  const expected = row.sha256 || row.sourceModelSha256;
  if (expected) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'models', row.file))).digest('hex').toLowerCase(), expected.toLowerCase(), `${row.id} model hash`);
}
for (const army of armies) {
  assert(TEAM_COLORS.some(colour => colour.rgbHex === army.colour), `Non-WC3 army colour: ${army.id}`);
  for (const [index, id] of army.models.entries()) {
    assert(ids.has(id), `Unknown formation model ${id}`);
    exists(`thumbs/formation-${id}-${['front', 'left', 'right'][index]}.png`);
  }
}
exists('ui/human-portrait-frame.png');
exists('ui/human-portrait-stone.png');
exists('ui/portrait-stone-seamless-v2.png');
exists('ui/portrait-stone-classic-v3.png');
for (const name of ['blue-stone-v1', 'slate-frame-v2', 'iron-chain-v2', 'portrait-stone-classic-v3', 'lowpolyworks-type-source', 'lowpolyworks-header-source', 'lowpolyworks-cleaned-source', 'warhammercraft-header-source', 'mdlxl-icon-256']) exists(`ui/${name}.webp`);
exists('ui/mdlxl-icon-256.png');
// Card pages load thumbs/*.webp; each must be built from the current PNG capture.
{
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'thumbs', 'webp-manifest.json'), 'utf8'));
  for (const name of fs.readdirSync(path.join(root, 'thumbs')).filter(name => /^(unit|formation)-.*\.png$/.test(name))) {
    exists('thumbs/' + name.replace(/\.png$/, '.webp'));
    const digest = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'thumbs', name))).digest('hex');
    assert.equal(manifest[name], digest, `Stale thumbs/${name.replace(/\.png$/, '.webp')}. Run python tools/optimize-ui.py`);
  }
}
exists('whiteout/whiteout-paint-blp.wasm');
console.log(`${rows.length} models, ${armies.length} armies, textures, downloads, unit cards, formation assets, and application syntax verified.`);
