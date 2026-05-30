import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const log = (...a) => console.error(...a);
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
for (const t of ['agent_state','agent_status_log','live_conversations','behavior_events']) {
  const { data, error } = await sb.from(t).select('*').limit(3);
  if (error) { log(`${t.padEnd(20)} ERROR ${error.message.slice(0,60)}`); continue; }
  log(`${t.padEnd(20)} rows(sampled)=${data.length}  cols=${data[0]?Object.keys(data[0]).length:'?'}`);
  if (data[0]) log('   e.g. '+JSON.stringify(data[0]).slice(0,160));
}
