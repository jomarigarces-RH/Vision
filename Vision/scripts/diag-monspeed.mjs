// Test cheaper open-conversation queries: filter by source.type (channel).
import { config } from 'dotenv';
config({ path: '.env.local' });
const TOKEN = process.env.INTERCOM_API_TOKEN;
const BASE = 'https://api.intercom.io';
const H = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json', 'Content-Type': 'application/json', 'Intercom-Version': '2.11' };
const log = (...a) => console.error(...a);
const ms = (t) => `${Math.round(performance.now() - t)}ms`;

async function search(label, valueExtra, perPage = 150) {
  const t = performance.now();
  const body = {
    query: { operator: 'AND', value: [{ field: 'state', operator: '=', value: 'open' }, ...valueExtra] },
    pagination: { per_page: perPage },
  };
  const res = await fetch(`${BASE}/conversations/search`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) { log(`${label.padEnd(28)} ${ms(t)}  HTTP ${res.status} ${JSON.stringify(data).slice(0, 120)}`); return; }
  log(`${label.padEnd(28)} ${ms(t)}  returned=${(data.conversations || []).length} total_count=${data.total_count}`);
}

// total open (cheap: per_page=1, just want total_count)
await search('open ALL (per_page=1)', [], 1);
// open voice only
await search('open VOICE', [{ field: 'source.type', operator: '=', value: 'phone_call' }]);
// open chat only
await search('open CHAT', [{ field: 'source.type', operator: '=', value: 'conversation' }]);
// open email only (count)
await search('open EMAIL (per_page=1)', [{ field: 'source.type', operator: '=', value: 'email' }], 1);
// voice + chat together via OR on source.type
{
  const t = performance.now();
  const body = {
    query: { operator: 'AND', value: [
      { field: 'state', operator: '=', value: 'open' },
      { operator: 'OR', value: [
        { field: 'source.type', operator: '=', value: 'phone_call' },
        { field: 'source.type', operator: '=', value: 'conversation' },
      ]},
    ]},
    pagination: { per_page: 150 },
  };
  const res = await fetch(`${BASE}/conversations/search`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const data = await res.json();
  log(`open VOICE+CHAT (OR)         ${ms(t)}  ok=${res.ok} returned=${(data.conversations || []).length} total_count=${data.total_count}`);
}
