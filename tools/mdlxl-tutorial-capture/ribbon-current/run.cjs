// Records and encodes the FX tutorial clips for the given locales (default: all six).
// Usage: node run.cjs [en es ru zh fr de]
// Each capture runs through MDLxL's scripts/hidden-run.ps1 on the invisible desktop; nothing shows on screen.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), crypto = require('node:crypto');
const APP = process.env.LPW_APP || 'D:/Claude/MDLxL/.claude/worktrees/ribbon-app';
const WORK = process.env.LPW_WORK || 'D:/Claude/ribbontut-work';
const NODE = process.env.LPW_NODE || 'D:/Claude/tools/node/node.exe';
const PLAYWRIGHT = process.env.MDLXL_PLAYWRIGHT_MODULE || 'D:/Claude/tools/node_modules/playwright-core';
const args = process.argv.slice(2);
const locales = args.length ? args : ['en', 'es', 'ru', 'zh', 'fr', 'de'];
const temp = WORK + '/tmp';
fs.mkdirSync(temp, { recursive: true });
const hashFile = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
// The renderer bundle and catalogs must not change between locales.
const fingerprint = () => {
  const bundle = crypto.createHash('sha256');
  for (const name of fs.readdirSync(APP + '/dist/assets').sort()) bundle.update(name).update(fs.readFileSync(APP + '/dist/assets/' + name));
  return { index: hashFile(APP + '/dist/index.html'), assets: bundle.digest('hex'), locales: Object.fromEntries(['es', 'ru', 'zh', 'fr', 'de'].map(l => [l, hashFile(APP + '/src/locales/' + l + '.json')])) };
};
const built = fingerprint();
fs.writeFileSync(WORK + '/capture-build.json', JSON.stringify({ app: APP, revision: cp.execFileSync('git', ['-C', APP, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), fingerprint: built }, null, 2));
// Removes a folder inside WORK; links inside are unlinked first, never followed.
const removeTree = target => {
  target = path.resolve(target);
  if (!target.startsWith(path.resolve(WORK) + path.sep)) throw Error('Cleanup outside work folder ' + target);
  if (!fs.existsSync(target)) return;
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (fs.lstatSync(p).isSymbolicLink()) fs.unlinkSync(p); else if (e.isDirectory()) walk(p); } };
  walk(target);
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 });
};
for (const locale of locales) {
  const out = WORK + '/captures/' + locale;
  const env = { ...process.env, TEMP: temp, TMP: temp, LPW_LOCALE: locale, LPW_APP: APP, LPW_WORK: WORK, MDLXL_PLAYWRIGHT_MODULE: PLAYWRIGHT,
    MDLXL_HIDDEN_COMMAND: '"' + NODE.replaceAll('/', '\\') + '" "' + path.resolve(__dirname, 'capture.cjs') + '"' };
  delete env.ELECTRON_RUN_AS_NODE; delete env.LPW_DEBUG; delete env.LPW_SCAN;
  // A capture that fails one of its checks is recorded once more from the start before the run stops.
  let run;
  for (let attempt = 0; attempt < 2; attempt++) {
    run = cp.spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', APP + '/scripts/hidden-run.ps1', '-WorkDir', APP], { env, encoding: 'utf8', windowsHide: true, timeout: 900000 });
    if (run.status === 0 && !fs.existsSync(out + '/error.txt') && fs.existsSync(out + '/done.json')) break;
    if (attempt === 0) console.log(locale + ': recording again after ' + (fs.existsSync(out + '/error.txt') ? fs.readFileSync(out + '/error.txt', 'utf8').split(/\r?\n/)[0] :'status ' + run.status));
  }
  if (run.status !== 0 || fs.existsSync(out + '/error.txt') || !fs.existsSync(out + '/done.json'))
    throw Error(locale + ': capture failed ' + run.status + ' ' + (fs.existsSync(out + '/error.txt') ? fs.readFileSync(out + '/error.txt', 'utf8') : run.stdout + run.stderr));
  if (JSON.stringify(fingerprint()) !== JSON.stringify(built)) throw Error('App build changed during capture');
  const enc = cp.spawnSync(process.execPath, [path.resolve(__dirname, 'encode.mjs'), locale], { env, encoding: 'utf8', windowsHide: true });
  process.stdout.write(enc.stdout || '');
  if (enc.status !== 0) throw Error(enc.stderr || 'encode failed');
  if (!process.env.LPW_KEEPRAW) removeTree(out + '/raw');
  for (const name of fs.readdirSync(out)) if (name.startsWith('profile-')) removeTree(out + '/' + name);
  console.log('DONE ' + locale);
}
