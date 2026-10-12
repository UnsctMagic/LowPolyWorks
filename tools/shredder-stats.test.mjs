import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';

// usage.js and shredder-stats.js as one script: imports and exports removed.
const source = name => fs.readFileSync(new URL('../dist/' + name, import.meta.url), 'utf8').replace(/^import.*?;\r?\n/gm, '').replace(/^export /gm, '');
const code = source('visitor-id.js').replace('function browserVisitorId', 'function savedVisitorId') +
  '\nconst USAGE_ENDPOINT="https://tracker.invalid/api/events";\n' + source('usage.js') + '\n' + source('shredder-stats.js');

function browser({search = '', ok = true} = {}) {
  const saved = new Map(), events = [], listeners = {}, doc = {visibilityState:'visible', addEventListener:(type, fn) => { listeners['doc:' + type] = fn; }};
  const localStorage = {getItem:key => saved.has(key) ? saved.get(key) : null, setItem:(key, value) => saved.set(key, String(value))};
  const context = vm.createContext({location:{hostname:'www.lowpolyworks.com', search}, URLSearchParams, crypto:{randomUUID}, localStorage, console:{warn(){}},
    document:doc, addEventListener:(type, fn) => { listeners[type] = fn; },
    fetch:async (_url, options) => { events.push(JSON.parse(options.body)); return {ok}; }});
  vm.runInContext(code, context);
  const play = kind => vm.runInContext(`countShredder(${JSON.stringify(kind)})`, context);
  const leave = async () => { listeners.pagehide(); await new Promise(resolve => setTimeout(resolve, 0)); };
  return {saved, events, play, leave, pending:() => JSON.parse(saved.get('lowpolyworks.shredderPending') || '{}')};
}

test('play is tallied in the browser and sent as one batch when the page is left', async () => {
  const b = browser();
  b.play('peek'); b.play('peek'); b.play('feed'); b.play('scratch');
  assert.equal(b.events.length, 0, 'nothing is sent while playing');
  await b.leave();
  assert.equal(b.events.length, 1); assert.deepEqual(b.events[0].counts, {peek:2, feed:1});
  assert.deepEqual(b.pending(), {});
  await b.leave(); assert.equal(b.events.length, 1, 'no play, no event');
});

test('at most four batches a day; the rest waits for the next day', async () => {
  const b = browser();
  for (let page = 0; page < 6; page++) { b.play('grab'); await b.leave(); }
  assert.equal(b.events.length, 4);
  assert.deepEqual(b.pending(), {grab:2});
  b.saved.set('lowpolyworks.shredderSent', JSON.stringify({date:'2000-01-01', count:4}));
  await b.leave();
  assert.equal(b.events.length, 5); assert.deepEqual(b.events[4].counts, {grab:2});
});

test('an opted-out browser never tallies or sends play', async () => {
  const b = browser({search:'?tracking-opt-out'});
  b.play('feed'); await b.leave();
  assert.equal(b.events.length, 0); assert.equal(b.saved.get('lowpolyworks.shredderPending'), undefined);
});

test('a failed send keeps the counts for a later page', async () => {
  const b = browser({ok:false});
  b.play('crack'); await b.leave();
  assert.equal(b.events.length, 1); assert.deepEqual(b.pending(), {crack:1});
});
