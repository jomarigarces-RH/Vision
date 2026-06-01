/**
 * diag-lob.mjs
 * Shows which Intercom agents matched a LOB from the staff table and which didn't.
 * Run: node scripts/diag-lob.mjs
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const TOKEN  = process.env.INTERCOM_API_TOKEN;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TOKEN || !SB_URL || !SB_KEY) {
  console.error('Missing env vars (INTERCOM_API_TOKEN / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(SB_URL, SB_KEY);

// ── helpers (mirrors monitor.ts) ─────────────────────────────────────────────
const norm = s => (s || '').toLowerCase().normalize('NFKD').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = s => norm(s).split(' ').filter(Boolean);
function lobKey(lob) {
  const l = (lob || '').toLowerCase();
  if (l.includes('spanish')) return 'spanish';
  if (l.includes('sales'))   return 'sales';
  if (l.includes('support')) return 'support';
  if (l.includes('special')) return 'specialty';
  return null;
}
function buildResolver(staff) {
  const byFirstLast = new Map();
  const byFirst     = new Map();
  for (const s of staff) {
    const lob = lobKey(s.lob);
    if (!lob) continue;
    const t = tokens(s.agent_name || '');
    if (!t.length) continue;
    const first = t[0], last = t[t.length - 1];
    byFirstLast.set(`${first}|${last}`, { lob, staffName: s.agent_name });
    if (!byFirst.has(first)) byFirst.set(first, []);
    byFirst.get(first).push({ lob, staffName: s.agent_name });
  }
  return (name) => {
    const t = tokens(name || '');
    if (!t.length) return { lob: null, reason: 'empty name' };
    const first = t[0], last = t[t.length - 1];
    // exact first+last match
    if (byFirstLast.has(`${first}|${last}`)) {
      const m = byFirstLast.get(`${first}|${last}`);
      return { lob: m.lob, reason: `matched "${m.staffName}"` };
    }
    // last is an initial
    if (last.length === 1) {
      for (const [k, m] of byFirstLast) {
        const [f, l] = k.split('|');
        if (f === first && l.startsWith(last)) return { lob: m.lob, reason: `initial match "${m.staffName}"` };
      }
    }
    // middle token as surname
    for (const tok of t.slice(1)) {
      if (byFirstLast.has(`${first}|${tok}`)) {
        const m = byFirstLast.get(`${first}|${tok}`);
        return { lob: m.lob, reason: `middle-token match "${m.staffName}"` };
      }
    }
    // unambiguous first name
    const set = byFirst.get(first);
    if (set && set.length === 1) return { lob: set[0].lob, reason: `first-name only → "${set[0].staffName}"` };
    if (set && set.length > 1) {
      const names = set.map(x => `${x.staffName} (${x.lob})`).join(', ');
      return { lob: null, reason: `ambiguous first name — matches: ${names}` };
    }
    return { lob: null, reason: 'no staff row found' };
  };
}
// ─────────────────────────────────────────────────────────────────────────────

async function fetchAdmins() {
  const res = await fetch('https://api.intercom.io/admins', {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
  });
  const json = await res.json();
  return (json.admins || []).filter(a => a.has_inbox_seat);
}

// ── main ──────────────────────────────────────────────────────────────────────
const [admins, { data: staff }] = await Promise.all([
  fetchAdmins(),
  supabase.from('staff').select('agent_name, nickname, lob'),
]);

console.log(`\nIntercom agents with inbox seat: ${admins.length}`);
console.log(`Staff roster rows: ${staff.length}\n`);

const resolve = buildResolver(staff);

const matched   = [];
const unrouted  = [];

for (const a of admins) {
  const { lob, reason } = resolve(a.name);
  const row = { id: a.id, intercomName: a.name, lob, reason };
  if (lob) matched.push(row);
  else     unrouted.push(row);
}

console.log('═══════════════════════════════════════════════════════════');
console.log(`  UNROUTED (${unrouted.length}) — no LOB could be assigned`);
console.log('═══════════════════════════════════════════════════════════');
for (const r of unrouted.sort((a,b) => (a.intercomName||'').localeCompare(b.intercomName||''))) {
  console.log(`  ✗  "${r.intercomName}"  →  ${r.reason}`);
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`  MATCHED (${matched.length}) — LOB resolved`);
console.log('═══════════════════════════════════════════════════════════');
for (const r of matched.sort((a,b) => (a.lob||'').localeCompare(b.lob||''))) {
  console.log(`  ✓  "${r.intercomName}"  →  ${r.lob}  (${r.reason})`);
}

console.log('\n── Staff rows with no lobKey (skipped from resolver) ──────');
for (const s of staff) {
  if (!lobKey(s.lob)) console.log(`  !  agent_name="${s.agent_name}"  lob="${s.lob}"`);
}
