/**
 * Backfill SLA metrics for a range of Pacific calendar days by calling the
 * sync API once per day (so it uses the exact same computation as live syncs).
 *
 * Usage:
 *   node scripts/backfill-sla.mjs                 # last 7 days (incl. today)
 *   node scripts/backfill-sla.mjs 14              # last 14 days
 *   node scripts/backfill-sla.mjs 2026-05-01 2026-05-29   # explicit range
 *
 * Env: BASE_URL (default http://localhost:3000) — point at your deployment to
 * backfill production.
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000';

function pstToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

const args = process.argv.slice(2);
let dates = [];
if (args.length === 2) {
  for (let d = args[0]; d <= args[1]; d = addDays(d, 1)) dates.push(d);
} else {
  const n = args[0] ? Number(args[0]) : 7;
  const today = pstToday();
  for (let i = n - 1; i >= 0; i--) dates.push(addDays(today, -i));
}

console.log(`Backfilling ${dates.length} day(s) via ${BASE}: ${dates[0]} … ${dates[dates.length - 1]}`);
for (const date of dates) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}/api/intercom/sync?date=${date}`, { method: 'POST' });
    const j = await res.json();
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    if (!res.ok) {
      console.log(`  ✗ ${date}  ${res.status}  ${j.error || ''}`);
    } else {
      const d = j.diagnostics || {};
      console.log(`  ✓ ${date}  (${secs}s)  calls=${d.voiceCallRows ?? '?'} convs=${d.conversationRows ?? '?'}`);
    }
  } catch (err) {
    console.log(`  ✗ ${date}  ${err.message}`);
  }
}
console.log('Done.');
