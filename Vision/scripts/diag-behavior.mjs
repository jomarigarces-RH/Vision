import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const log = (...a) => console.error(...a);
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data, error } = await sb.from('behavior_events').select('*').order('at', { ascending: false }).limit(2000);
if (error) { log('ERR', error.message); process.exit(1); }
log('total recent behavior_events:', data.length);
const by = (k) => data.reduce((m, r) => ((m[r[k] ?? 'null'] = (m[r[k] ?? 'null'] || 0) + 1), m), {});
log('by behavior:', JSON.stringify(by('behavior')));
log('alerts (is_alert=true):', data.filter((r) => r.is_alert).length);
log('by lob:', JSON.stringify(by('lob')));
log('\nsample ALERTS (0-chat declines/misses):');
data.filter((r) => r.is_alert).slice(0, 6).forEach((r) => log(`  ${String(r.teammate_name).padEnd(20)} ${r.behavior.padEnd(13)} conv=${r.conversation_id} chats=${r.workload_chats} "${r.detail}" ${r.at}`));
log('\nsample NON-alert (had chats):');
data.filter((r) => !r.is_alert && /call/.test(r.behavior)).slice(0, 4).forEach((r) => log(`  ${String(r.teammate_name).padEnd(20)} ${r.behavior.padEnd(13)} chats=${r.workload_chats} "${r.detail}"`));
