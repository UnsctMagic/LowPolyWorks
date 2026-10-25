// Counts how visitors play with Shredder for the Vault's Shredder's Stash.
// Interactions are tallied in this browser and sent as one batch when a page is hidden or closed, at most
// a few times a day, so his statistics cost few tracker writes. Opted-out browsers never tally or send.
import {recordShredder,usageAllowed} from './usage.js?v=20261025-amsterdam-days';

const KINDS = ['peek', 'grab', 'feed', 'crack', 'follow', 'attack'];
const PENDING = 'lowpolyworks.shredderPending', SENT = 'lowpolyworks.shredderSent', DAILY_SENDS = 4, MAX = 999;

function read(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

export function countShredder(kind) {
  if (!KINDS.includes(kind) || !usageAllowed()) return;
  // Read before writing so several open tabs add to the same tally.
  const pending = read(PENDING) || {};
  pending[kind] = Math.min(MAX, (pending[kind] || 0) + 1);
  write(PENDING, pending);
}

export function flushShredder() {
  if (!usageAllowed()) return;
  const pending = read(PENDING);
  if (!pending || !KINDS.some(kind => pending[kind] > 0)) return;
  const today = new Date().toISOString().slice(0, 10), sent = read(SENT);
  const sends = sent?.date === today ? sent.count : 0;
  if (sends >= DAILY_SENDS) return;   // Kept for the first send of another day.
  // Clear first so another tab cannot send the same counts.
  write(PENDING, {}); write(SENT, {date:today, count:sends + 1});
  const counts = Object.fromEntries(KINDS.filter(kind => pending[kind] > 0).map(kind => [kind, Math.min(MAX, pending[kind])]));
  recordShredder(counts).then(ok => {
    if (ok) return;
    // Put unsent counts back for a later page.
    const now = read(PENDING) || {};
    for (const [kind, value] of Object.entries(counts)) now[kind] = Math.min(MAX, (now[kind] || 0) + value);
    write(PENDING, now);
  });
}

addEventListener('pagehide', flushShredder);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushShredder(); });
