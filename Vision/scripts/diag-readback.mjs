import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const log=(...a)=>console.error(...a);
const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const date=process.argv[2]||'2026-05-30';
const { data: ops } = await sb.from('ops_metrics').select('department,channel,inbound_count,passed_count,abandoned_count,frt_seconds,handle_seconds,wait_seconds').eq('date',date).order('department').order('channel');
log(`ops_metrics for ${date}:`);
log('DEPT                  CH     in  pass  aband  sla%   ab%   frt  aht  queue');
for (const r of ops||[]) {
  const sla=r.inbound_count?(r.passed_count/r.inbound_count*100).toFixed(1):'0.0';
  const ab=r.inbound_count?(r.abandoned_count/r.inbound_count*100).toFixed(1):'0.0';
  log(`${r.department.padEnd(20)} ${r.channel.padEnd(5)} ${String(r.inbound_count).padStart(4)} ${String(r.passed_count).padStart(5)} ${String(r.abandoned_count).padStart(6)}  ${sla.padStart(5)} ${ab.padStart(5)}  ${String(r.frt_seconds).padStart(4)} ${String(r.handle_seconds).padStart(4)} ${String(r.wait_seconds).padStart(5)}`);
}
const { data: em } = await sb.from('email_productivity').select('*').eq('date',date).maybeSingle();
log('\nemail_productivity:', JSON.stringify(em));
