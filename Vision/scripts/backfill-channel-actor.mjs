/**
 * backfill-channel-actor.mjs — one-time repair.
 * Re-fetches the Intercom activity log, matches each stored channel_change alert by
 * its event id (embedded in dedup_key), and rewrites `detail` to name the actor
 * (metadata.update_by_name) when an RTA — not the agent — made the change.
 * Rows whose event has already churned out of the activity log can't be corrected
 * (Intercom no longer exposes who did them) and are left as-is.
 * Run: node --env-file=.env.local scripts/backfill-channel-actor.mjs
 */
import { createClient } from '@supabase/supabase-js';

const TOKEN = process.env.INTERCOM_API_TOKEN;
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BASE = 'https://api.intercom.io';
const headers = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json', 'Intercom-Version': '2.11' };

const chText = (c) => (c === 'phone' ? 'Voice' : c === 'conversations' ? 'Messaging' : c === 'both' ? 'Both' : c || 'unknown');

// 1) Pull as much of the activity log as we can (deep pagination), index by event id.
const since = Math.floor(Date.now() / 1000) - 24 * 3600;
let url = `${BASE}/admins/activity_logs?created_at_after=${since}`;
const byEventId = new Map();
for (let i = 0; i < 60 && url; i++) {
  const j = await fetch(url, { headers }).then((r) => r.json());
  for (const ev of j.activity_logs || []) {
    if (ev.activity_type !== 'admin_channel_change') continue;
    const meta = ev.metadata || {};
    byEventId.set(String(ev.id), {
      performedBy: String(ev.performed_by?.id || ''),
      updateBy: meta.update_by != null ? String(meta.update_by) : null,
      updateByName: meta.update_by_name || null,
      channel: meta.channel_availability || null,
    });
  }
  url = j.pages?.next || null;
}
console.log(`Indexed ${byEventId.size} channel_change events from the activity log.`);

// 2) Read recent stored channel_change rows.
const { data: rows, error } = await supabase
  .from('behavior_events')
  .select('id, teammate_name, detail, dedup_key')
  .eq('behavior', 'channel_change')
  .order('at', { ascending: false })
  .limit(200);
if (error) { console.error(error); process.exit(1); }

// 3) For each, recompute detail and update if it changed and we know the actor.
let updated = 0, unmatched = 0, unchanged = 0;
for (const r of rows) {
  const eventId = String(r.dedup_key || '').split(':')[2] || '';
  const ev = byEventId.get(eventId);
  if (!ev) { unmatched++; continue; }
  const affected = r.dedup_key.split(':')[1];
  const byOther = ev.updateBy && ev.updateBy !== affected;
  const actor = byOther ? (ev.updateByName || `admin ${ev.updateBy}`) : null;
  const detail = actor
    ? `Channel changed to "${chText(ev.channel)}" by ${actor}`
    : `Switched own channel to "${chText(ev.channel)}"`;
  if (detail === r.detail) { unchanged++; continue; }
  const { error: upErr } = await supabase.from('behavior_events').update({ detail }).eq('id', r.id);
  if (upErr) { console.error(`  update failed for ${r.id}:`, upErr.message); continue; }
  console.log(`  ✓ ${r.teammate_name}: ${detail}`);
  updated++;
}

console.log(`\nDone. updated=${updated}  unchanged=${unchanged}  unmatched(churned out)=${unmatched}`);
