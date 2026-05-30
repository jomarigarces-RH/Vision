// Reconcile readback: aggregate agent_state + live_conversations the way the UI will.
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const log = (...a) => console.error(...a);
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { data: agents } = await sb.from('agent_state').select('*');
const { data: convs } = await sb.from('live_conversations').select('*').eq('state', 'open');

const by = (rows, key) => rows.reduce((m, r) => ((m[r[key] ?? 'null'] = (m[r[key] ?? 'null'] || 0) + 1), m), {});

log('AGENTS', agents.length);
log('  presence  ', JSON.stringify(by(agents, 'presence')));
log('  by lob    ', JSON.stringify(by(agents, 'lob')));
log('  away rsn  ', JSON.stringify(by(agents.filter((a) => a.presence === 'away'), 'away_reason')));
log('  channel   ', JSON.stringify(by(agents, 'channel')));
const withWork = agents.filter((a) => a.calls_open + a.chats_open + a.emails_open > 0);
log('  w/ open work', withWork.length, ' top:', withWork.sort((a, b) => (b.calls_open+b.chats_open+b.emails_open)-(a.calls_open+a.chats_open+a.emails_open)).slice(0,5).map((a)=>`${a.name}=${a.calls_open}c/${a.chats_open}ch/${a.emails_open}e[${a.lob}]`));

log('\nOPEN CONVERSATIONS', convs.length);
log('  by channel', JSON.stringify(by(convs, 'channel')));
log('  by lob    ', JSON.stringify(by(convs, 'lob')));
const queue = convs.filter((c) => !c.assignee_id); // unassigned = in queue
log('  IN QUEUE (unassigned)', queue.length);
log('    queue by lob+chan', JSON.stringify(queue.reduce((m,c)=>{const k=`${c.lob}/${c.channel}`;m[k]=(m[k]||0)+1;return m;},{})));
const oldest = queue.filter((c)=>c.created_at_ic).sort((a,b)=>new Date(a.created_at_ic)-new Date(b.created_at_ic))[0];
if (oldest) log('    oldest in queue', oldest.created_at_ic, `${oldest.lob}/${oldest.channel}`, `(${Math.round((Date.now()-new Date(oldest.created_at_ic))/60000)}min)`);
