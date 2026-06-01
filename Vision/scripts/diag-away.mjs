import { config } from 'dotenv';
config({ path: '.env.local' });

const TOKEN = process.env.INTERCOM_API_TOKEN;
const BASE = 'https://api.intercom.io';
const H = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json', 'Content-Type': 'application/json', 'Intercom-Version': '2.11' };
const log = (...a) => console.error(...a);

// 1) Who is away right now per /admins, and does the admin object expose any reason field?
const adminsRes = await fetch(`${BASE}/admins`, { headers: H }).then((r) => r.json());
const admins = adminsRes.admins || [];
log(`\n=== /admins (${admins.length}) — away_mode_enabled + ALL keys on one away admin ===`);
const awayAdmin = admins.find((a) => a.away_mode_enabled);
if (awayAdmin) log('away admin full object:\n' + JSON.stringify(awayAdmin, null, 2));
else log('(no admin currently away)');

const interesting = admins.filter((a) => /irene|christian/i.test(a.name || ''));
log(`\n=== target admins ===`);
for (const a of interesting) log(`  ${a.name.padEnd(20)} id=${a.id} away_mode_enabled=${a.away_mode_enabled}`);

// 2) Recent admin_away_mode_change activity logs (24h) — what reasons + fields come through?
const since = Math.floor(Date.now() / 1000) - 24 * 3600;
let url = `${BASE}/admins/activity_logs?created_at_after=${since}`;
const events = [];
for (let i = 0; i < 12 && url; i++) {
  const j = await fetch(url, { headers: H }).then((r) => r.json());
  events.push(...(j.activity_logs || []));
  url = j.pages?.next || null;
}
log(`\n=== activity_logs (24h): ${events.length} total events ===`);
const byType = {};
for (const e of events) byType[e.activity_type] = (byType[e.activity_type] || 0) + 1;
log('types: ' + JSON.stringify(byType));

const away = events.filter((e) => e.activity_type === 'admin_away_mode_change');
log(`\n=== admin_away_mode_change: ${away.length} events (chronological) ===`);
for (const e of away.sort((a, b) => a.created_at - b.created_at)) {
  const who = e.performed_by?.name || e.performed_by?.email || e.performed_by?.id;
  log(`  ${new Date(e.created_at * 1000).toISOString()}  ${String(who).padEnd(18)}  meta=${JSON.stringify(e.metadata)}`);
}

// 3) Focus: the two stuck agents — every event we have for them
log(`\n=== ALL events for Irene / Christian ===`);
for (const e of events.filter((e) => /irene|christian/i.test(e.performed_by?.name || ''))) {
  log(`  ${new Date(e.created_at * 1000).toISOString()}  ${e.activity_type.padEnd(28)} meta=${JSON.stringify(e.metadata)}`);
}
