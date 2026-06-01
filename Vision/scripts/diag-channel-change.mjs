/**
 * diag-channel-change.mjs
 * Dumps the FULL structure of recent admin_channel_change activity-log events so we
 * can see who performed the change vs. whose channel changed.
 * Run: node --env-file=.env.local scripts/diag-channel-change.mjs
 */
const TOKEN = process.env.INTERCOM_API_TOKEN;
if (!TOKEN) { console.error('Missing INTERCOM_API_TOKEN'); process.exit(1); }

const BASE = 'https://api.intercom.io';
const headers = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json', 'Intercom-Version': '2.11' };

// Look back 24h.
const since = Math.floor(Date.now() / 1000) - 24 * 3600;

// Build an id -> name map from /admins so we can label ids.
const adminsRes = await fetch(`${BASE}/admins`, { headers }).then(r => r.json());
const nameById = new Map((adminsRes.admins || []).map(a => [String(a.id), a.name]));
const label = (id) => `${id}${nameById.has(String(id)) ? ` (${nameById.get(String(id))})` : ''}`;

let url = `${BASE}/admins/activity_logs?created_at_after=${since}`;
const events = [];
for (let i = 0; i < 20 && url; i++) {
  const j = await fetch(url, { headers }).then(r => r.json());
  events.push(...(j.activity_logs || []));
  url = j.pages?.next || null;
}

const channelChanges = events.filter(e => e.activity_type === 'admin_channel_change');
console.log(`\nFetched ${events.length} activity events in last 24h.`);
console.log(`admin_channel_change events: ${channelChanges.length}\n`);

for (const e of channelChanges.slice(0, 15)) {
  console.log('───────────────────────────────────────────────');
  console.log('  performed_by:', e.performed_by ? label(e.performed_by.id) : '(none)');
  console.log('  created_at  :', new Date(e.created_at * 1000).toISOString());
  console.log('  metadata    :', JSON.stringify(e.metadata, null, 2));
  // dump any other top-level keys we might be missing
  const known = new Set(['activity_type', 'performed_by', 'created_at', 'metadata', 'id']);
  const extra = Object.keys(e).filter(k => !known.has(k));
  if (extra.length) console.log('  OTHER KEYS  :', JSON.stringify(Object.fromEntries(extra.map(k => [k, e[k]])), null, 2));
}

// Also show one raw event in full, untouched, so we don't miss anything.
if (channelChanges.length) {
  console.log('\n\n=== FULL RAW FIRST EVENT ===');
  console.log(JSON.stringify(channelChanges[0], null, 2));
}
