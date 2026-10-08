// Resolve rendering dependencies without changing the supplied/downloadable MDX.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {parseMDX} from '../dist/vendor/war3-model.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [id, ...args] = process.argv.slice(2);
if (!id || args.length % 2) throw Error('Usage: node tools/model-textures.mjs <catalogue-id> [--mdlxl path] [--archives path] [--game path]');
const options = Object.fromEntries(Array.from({length:args.length / 2}, (_, i) => [args[i * 2], args[i * 2 + 1]]));
for (const key of Object.keys(options)) if (!['--mdlxl', '--archives', '--game'].includes(key)) throw Error(`Unknown option ${key}`);
const mdlxl = path.resolve(options['--mdlxl'] || path.join(os.homedir(), 'Documents/ChatGPT/MDLxL'));
const archives = path.resolve(options['--archives'] || 'D:/WarcraftStuff');
const game = path.resolve(options['--game'] || 'D:/Warcraft III');
const rows = JSON.parse(await fs.readFile(path.join(root, 'dist/catalogue.json'), 'utf8'));
const row = rows.find(entry => entry.id === id);
if (!row) throw Error(`Unknown catalogue ID: ${id}`);
const modelPath = path.join(root, 'dist/models', row.file);
const bytes = await fs.readFile(modelPath);
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const originalHash = digest(bytes);
const model = parseMDX(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
const indexPath = path.join(root, 'dist/textures.json');
const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
const needed = [...new Set(model.Textures.filter(t => t.Image && ![1, 2].includes(t.ReplaceableId)).map(t => t.Image))];
const missing = [];
for (const name of needed) {
  const file = row.textureFiles?.[name.toLowerCase()] || index[name.toLowerCase()];
  if (file) await fs.access(path.join(root, 'dist', file));
  else missing.push(name);
}
if (!missing.length) { console.log(`${id}: all ${needed.length} rendering textures are available; MDX unchanged.`); process.exit(0); }
const require = createRequire(import.meta.url);
const {Mpq} = require(path.join(mdlxl, 'electron/mpq.cjs'));
const readers = [], records = [], unresolved = [];
let casc;
try {
  const entries = await fs.readdir(archives).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    console.warn(`Classic archive folder unavailable: ${archives}; using the installed CASC source.`);
    return [];
  });
  for (const name of ['war3patch.mpq', 'war3x.mpq', 'war3xlocal.mpq', 'war3.mpq']) {
    const actual = entries.find(entry => entry.toLowerCase() === name);
    if (actual) readers.push({file:path.join(archives, actual), reader:await Mpq.open(path.join(archives, actual))});
  }
  for (const name of missing) {
    let data, source;
    for (const entry of readers) {
      data = await entry.reader.read(name);
      if (data) { source = entry.file; break; }
    }
    if (!data) {
      if (!casc) {
        const {CascReader} = require(path.join(mdlxl, 'electron/casc.cjs'));
        casc = new CascReader(game, root);
      }
      data = await casc.read(name);
      source = game;
    }
    if (!data) { unresolved.push(name); continue; }
    if (!/^BLP[12]$/.test(data.subarray(0, 4).toString())) throw Error(`Expected exact BLP rendering asset for ${name}; got ${data.subarray(0, 4).toString()}`);
    const sha256 = digest(data), file = `textures/native-${sha256.slice(0, 16)}.blp`;
    await fs.writeFile(path.join(root, 'dist', file), data);
    index[name.toLowerCase()] = file;
    records.push({name, source, file, bytes:data.length, sha256});
  }
} finally {
  for (const entry of readers) await entry.reader.close();
  casc?.close();
}
if (digest(await fs.readFile(modelPath)) !== originalHash) throw Error('Model bytes changed during texture resolution.');
if (unresolved.length) throw Error(`Unavailable in local native sources (check supplied custom assets):\n${unresolved.join('\n')}`);
await fs.writeFile(indexPath, JSON.stringify(index));
await fs.mkdir(path.join(root, 'output/model-textures'), {recursive:true});
await fs.writeFile(path.join(root, 'output/model-textures', id + '.json'), JSON.stringify({id, model:row.file, modelSha256:originalHash, textures:records}, null, 2) + '\n');
console.log(JSON.stringify({id, modelSha256:originalHash, resolved:records, modelUnchanged:true}, null, 2));
