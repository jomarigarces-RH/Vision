import { config } from 'dotenv';
config({ path: '.env.local' });
const TOKEN = process.env.INTERCOM_API_TOKEN;
const log = (...a) => console.error(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const H = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json', 'Content-Type': 'application/json', 'Intercom-Version': 'Unstable' };
function parseCSV(t) { const rows = []; let i = 0, f = '', row = [], q = false; const pf = () => { row.push(f); f = ''; }, pr = () => { rows.push(row); row = []; }; while (i < t.length) { const c = t[i]; if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i += 2; continue; } q = false; i++; continue; } f += c; i++; continue; } if (c === '"') { q = true; i++; continue; } if (c === ',') { pf(); i++; continue; } if (c === '\r') { i++; continue; } if (c === '\n') { pf(); pr(); i++; continue; } f += c; i++; } if (f.length || row.length) { pf(); pr(); } const h = rows.shift(); return rows.filter((r) => r.length > 1).map((r) => { const o = {}; h.forEach((x, idx) => (o[x] = r[idx])); return o; }); }
async function exp(dataset, attrs, start, end) {
  const r = await fetch('https://api.intercom.io/export/reporting_data/enqueue', { method: 'POST', headers: H, body: JSON.stringify({ dataset_id: dataset, attribute_ids: attrs, start_time: start, end_time: end }) });
  const j = await r.json(); const id = j.job_identifier; if (!id) throw new Error('enqueue ' + JSON.stringify(j).slice(0, 150));
  let url = null; for (let k = 0; k < 40; k++) { await sleep(2500); const s = await fetch(`https://api.intercom.io/export/reporting_data/${id}`, { headers: H }); const sj = await s.json(); if (sj.status?.startsWith('complete')) { url = sj.download_url; break; } if (sj.status === 'failed') throw new Error('failed'); }
  const d = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/octet-stream', 'Intercom-Version': 'Unstable' } });
  return parseCSV(await d.text());
}
function pstRange(dateStr) { const [y, m, d] = dateStr.split('-').map(Number); const off = (ms) => { const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date(ms)); const o = {}; p.forEach((x) => (o[x.type] = x.value)); return Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute, +o.second) - ms; }; let ms = Date.UTC(y, m - 1, d); const a = off(ms); ms -= a; const b = off(ms); if (b !== a) ms += a - b; return { start: Math.floor(ms / 1000), end: Math.floor(ms / 1000) + 86400 }; }

const date = process.argv[2] || '2026-05-29';
const { start, end } = pstRange(date);
const classify = (t) => { const b = String(t).replace(/\s*-\s*(Voice|Chat|Email|SMS)\s*$/i, '').trim(); if (b.toLowerCase() === 'service recovery') return 'serviceRecovery'; if (/sales/i.test(b)) return 'sales'; if (/support/i.test(b)) return 'support'; return null; };
const ANS = new Set(['Answered', 'Abandoned in CSAT rating']);
const AB = new Set(['Abandoned in queue', 'Abandoned on hold', 'No answer']);

// 1) per-call dataset (ground truth for total call count)
const call = await exp('call', ['call.call_id', 'call.call_direction', 'call.call_state', 'call.call_answer_time'], start, end);
const callInbound = call.filter((r) => /inbound/i.test(r.call_direction));
log(`\n=== ${date} VOICE CHECK ===`);
log(`'call' dataset: ${call.length} rows, ${new Set(call.map((r) => r.call_id)).size} unique call_id; inbound=${callInbound.length}`);

// 2) call_team_stats (what the dashboard uses)
const ts = await exp('call_team_stats', ['call.call_id', 'call.call_direction', 'call.call_answer_time', 'call.call_queue_time', 'call.call_talk_time', 'call.call_state', 'team.call_team_id'], start, end);
const tsInbound = ts.filter((r) => /inbound/i.test(r.call_direction));
log(`'call_team_stats': ${ts.length} rows, ${new Set(ts.map((r) => r.call_id)).size} unique call_id; inbound=${tsInbound.length}`);
const tsMappedInbound = tsInbound.filter((r) => classify(r.call_team_id));
log(`  inbound mapped to a core LOB team: ${tsMappedInbound.length}  (excluded ${tsInbound.length - tsMappedInbound.length} in non-core teams)`);

// answer-time distribution (mapped inbound, answered)
const answeredRows = tsMappedInbound.filter((r) => ANS.has(r.call_state));
const stat = (label, vals) => {
  const a = vals.filter((v) => !isNaN(v) && v >= 0).sort((x, y) => x - y);
  const pct = (p) => a[Math.floor(a.length * p)] ?? 0;
  log(`${label}: n=${a.length} min=${a[0]} p25=${pct(.25)} p50=${pct(.5)} p75=${pct(.75)} p90=${pct(.9)} max=${a[a.length - 1]}`);
  log(`    ≤20s: ${a.filter((v) => v <= 20).length}  ≤30s: ${a.filter((v) => v <= 30).length}  ≤60s: ${a.filter((v) => v <= 60).length}  ≤75s: ${a.filter((v) => v <= 75).length}`);
};
log('\nFor ANSWERED inbound calls (mapped):');
stat('  call_answer_time', answeredRows.map((r) => Number(r.call_answer_time)));
stat('  call_queue_time ', answeredRows.map((r) => Number(r.call_queue_time)));

// 3) per-LOB table (what the dashboard shows) — dedupe transfers
const byId = new Map();
for (const r of tsInbound) { const p = byId.get(r.call_id); if (!p) byId.set(r.call_id, r); else if (!ANS.has(p.call_state) && ANS.has(r.call_state)) byId.set(r.call_id, r); }
const dedup = [...byId.values()];
const lobs = { support: {}, sales: {}, serviceRecovery: {} };
for (const k of Object.keys(lobs)) lobs[k] = { off: 0, ans: 0, ab: 0, w75: 0, w20: 0, asaT: 0, asaN: 0, talkT: 0, talkN: 0 };
for (const r of dedup) { const L = classify(r.call_team_id); if (!L) continue; const m = lobs[L]; const at = Number(r.call_answer_time), tk = Number(r.call_talk_time); if (ANS.has(r.call_state)) { m.off++; m.ans++; if (!isNaN(at)) { m.asaT += at; m.asaN++; if (at <= 75) m.w75++; if (at <= 20) m.w20++; } if (!isNaN(tk) && tk > 0) { m.talkT += tk; m.talkN++; } } else if (AB.has(r.call_state)) { m.off++; m.ab++; } }
log(`\nLOB              offered  answered  aband   SLA(≤75s)  SLA(≤20s)  abandon%   ASA    AHT`);
for (const [k, m] of Object.entries(lobs)) log(`${k.padEnd(16)} ${String(m.off).padStart(6)} ${String(m.ans).padStart(8)} ${String(m.ab).padStart(6)}   ${(m.off ? m.w75 / m.off * 100 : 0).toFixed(1).padStart(6)}%   ${(m.off ? m.w20 / m.off * 100 : 0).toFixed(1).padStart(6)}%   ${(m.off ? m.ab / m.off * 100 : 0).toFixed(1).padStart(6)}%  ${Math.round(m.asaT / (m.asaN || 1))}s  ${Math.round(m.talkT / (m.talkN || 1))}s`);
log('\nCompare these per-LOB numbers to your Five9 daily report (Service Level, ASA, Abandon %, calls offered/handled per queue).');
