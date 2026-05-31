import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const log = (...a) => console.error(...a);
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { realtime: { params: { eventsPerSecond: 20 } } });

let got = 0;
const ch = sb
  .channel('diag-rt')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_state' }, (p) => { got++; log('  >> agent_state event:', p.eventType, p.new?.teammate_id || p.old?.teammate_id); })
  .subscribe((status, err) => log('subscribe status:', status, err ? ('err=' + err.message) : ''));

// give it time to connect, then bump one row to trigger an event
await new Promise((r) => setTimeout(r, 4000));
const { data: one } = await sb.from('agent_state').select('teammate_id').limit(1).maybeSingle();
if (one) {
  const { error } = await sb.from('agent_state').update({ updated_at: new Date().toISOString() }).eq('teammate_id', one.teammate_id);
  log('triggered update on', one.teammate_id, error ? ('UPDATE err=' + error.message) : 'ok');
} else log('no agent_state rows to bump');

await new Promise((r) => setTimeout(r, 6000));
log(`\nRESULT: received ${got} realtime event(s). ${got > 0 ? 'Realtime WORKS.' : 'Realtime NOT delivering — tables likely not in supabase_realtime publication / realtime disabled.'}`);
process.exit(0);
