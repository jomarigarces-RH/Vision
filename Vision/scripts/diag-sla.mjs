import { config } from 'dotenv';
config({ path: '.env.local' });
const TOKEN = process.env.INTERCOM_API_TOKEN;
const log = (...a) => console.error(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const H = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json', 'Content-Type': 'application/json', 'Intercom-Version': 'Unstable' };
function parseCSV(t) { const rows = []; let i = 0, f = '', row = [], q = false; const pf = () => { row.push(f); f = ''; }, pr = () => { rows.push(row); row = []; }; while (i < t.length) { const c = t[i]; if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i += 2; continue; } q = false; i++; continue; } f += c; i++; continue; } if (c === '"') { q = true; i++; continue; } if (c === ',') { pf(); i++; continue; } if (c === '\r') { i++; continue; } if (c === '\n') { pf(); pr(); i++; continue; } f += c; i++; } if (f.length || row.length) { pf(); pr(); } const h = rows.shift(); return rows.filter((r) => r.length > 1).map((r) => { const o = {}; h.forEach((x, idx) => (o[x] = r[idx])); return o; }); }
async function exp(dataset, attrs, start, end) {
  const r = await fetch('https://api.intercom.io/export/reporting_data/enqueue', { method: 'POST', headers: H, body: JSON.stringify({ dataset_id: dataset, attribute_ids: attrs, start_time: start, end_time: end }) });
  const j = await r.json(); const id = j.job_identifier; if (!id) throw new Error('enqueue ' + JSON.stringify(j).slice(0, 200));
  let url = null; for (let k = 0; k < 40; k++) { await sleep(2500); const s = await fetch(`https://api.intercom.io/export/reporting_data/${id}`, { headers: H }); const sj = await s.json(); if (sj.status?.startsWith('complete')) { url = sj.download_url; break; } if (sj.status === 'failed') throw new Error('failed'); }
  const d = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/octet-stream', 'Intercom-Version': 'Unstable' } });
  return parseCSV(await d.text());
}
function pstRange(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const off = (ms) => { const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date(ms)); const o = {}; p.forEach((x) => (o[x.type] = x.value)); return Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute, +o.second) - ms; };
  let ms = Date.UTC(y, m - 1, d); const a = off(ms); ms -= a; const b = off(ms); if (b !== a) ms += a - b;
  return { start: Math.floor(ms / 1000), end: Math.floor(ms / 1000) + 86400 };
}

// 1) dump the SLA dataset's qualified attribute IDs
const ds = (await (await fetch('https://api.intercom.io/export/reporting_data/get_datasets', { headers: H })).json()).data.find((d) => d.id === 'conversation_sla_status_log');
log('conversation_sla_status_log default_time:', ds.default_time_attribute_id);
log('attributes (qualified_id :: name):');
ds.attributes.forEach((a) => { if (/sla|channel|team|state|metric|hit|miss/i.test(a.qualified_id + ' ' + (a.name || ''))) log(`  ${(a.qualified_id || '').padEnd(48)} ${a.name || ''}`); });

// 2) export for May 29 and compute hit rate for support chat & sales chat
const date = process.argv[2] || '2026-05-29';
const { start, end } = pstRange(date);
const chanA = 'standard.channel';
const teamA = 'team.currently_assigned_team_id';
const stateA = 'standard.sla_state';
const metricA = 'standard.sla_metric_type';
log(`\nusing channel=${chanA} team=${teamA} state=${stateA} metric=${metricA}`);
const rows = await exp('conversation_sla_status_log', [chanA, teamA, stateA, metricA].filter(Boolean), start, end);
log(`\n${date}: ${rows.length} SLA rows`);
const colChan = chanA.split('.').pop(), colTeam = teamA.split('.').pop(), colState = stateA.split('.').pop(), colMetric = metricA.split('.').pop();
log('cols:', Object.keys(rows[0] || {}).join(' | '));
log('channel values:', JSON.stringify([...new Set(rows.map((r) => r[colChan]))].slice(0, 8)));
log('state values:', JSON.stringify([...new Set(rows.map((r) => r[colState]))]));
log('metric_type values:', JSON.stringify([...new Set(rows.map((r) => r[colMetric]))]));
function rate(label, filter) {
  const f = rows.filter(filter);
  const states = {}; f.forEach((r) => (states[r[colState]] = (states[r[colState]] || 0) + 1));
  const hit = states['Hit'] || 0;
  const missed = states['Missed'] || 0;
  const total = f.length;
  log(`  ${label}: total=${total} states=${JSON.stringify(states)}`);
  log(`      hit/total=${total ? (hit / total * 100).toFixed(1) : 0}%  |  hit/(hit+missed)=${hit + missed ? (hit / (hit + missed) * 100).toFixed(1) : 0}%`);
}
const isChat = (r) => /chat/i.test(r[colChan]);
log('\n--- Support chat (Pre+Post Delivery Support - Chat) ---');
rate('all metrics', (r) => isChat(r) && /(pre|post) delivery support/i.test(r[colTeam]));
for (const mt of [...new Set(rows.map((r) => r[colMetric]))]) rate(`metric=${mt}`, (r) => isChat(r) && /(pre|post) delivery support/i.test(r[colTeam]) && r[colMetric] === mt);
log('\n--- Sales chat (Inbound Sales - Chat) ---');
rate('all metrics', (r) => isChat(r) && /sales/i.test(r[colTeam]) && !/recovery/i.test(r[colTeam]));
log('\n--- Support VOICE (Speed of answer) ---');
rate('all', (r) => /phone/i.test(r[colChan]) && /(pre|post) delivery support/i.test(r[colTeam]));
