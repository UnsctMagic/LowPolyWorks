import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {TEAM_COLORS} from '../dist/vendor/mdlxl/src/team-colors.js';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(project, 'dist');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const exists = name => assert(fs.existsSync(path.join(root, name)), `Missing ${name}`);
const rows = read('catalogue.json');
const armies = read('armies.json');
const textures = read('textures.json');
const ids = new Set(rows.map(row => row.id));
const modelHashes = JSON.parse(fs.readFileSync(path.join(project, 'tools/model-hashes.json'), 'utf8'));
assert.equal(modelHashes.length, rows.length, 'Model hash inventory size');
for (const entry of modelHashes) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'models', entry.file))).digest('hex'), entry.sha256, `Model changed: ${entry.file}`);
}
assert.equal(ids.size, rows.length, 'Duplicate catalogue IDs');
for (const file of ['server.mjs', 'tools/check-project.mjs', 'dist/app.js', 'dist/viewer.js', 'dist/viewer-effects.js', 'dist/website-camera-controls.js']) {
  execFileSync(process.execPath, ['--check', path.join(project, file)], {stdio: 'pipe'});
}
for (const file of Object.values(textures)) exists(file);
for (const row of rows) {
  assert(armies.some(army => army.id === row.army), `Unknown army for ${row.id}`);
  exists('models/' + row.file);
  exists('thumbs/unit-' + row.id + '.png');
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
exists('whiteout/whiteout-paint-blp.wasm');
console.log(`${rows.length} models, ${armies.length} armies, textures, downloads, unit cards, formation assets, and application syntax verified.`);
