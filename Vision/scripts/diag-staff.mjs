import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const log = (...a) => console.error(...a);
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data, error } = await sb.from('staff').select('*').limit(5);
if (error) { log('staff ERROR:', error.message); } else {
  log('staff columns:', data[0] ? Object.keys(data[0]).join(', ') : '(empty)');
  log('staff rows sample:');
  data.forEach((r) => log('  ' + JSON.stringify(r)));
  const { count } = await sb.from('staff').select('*', { count: 'exact', head: true });
  log('staff total rows:', count);
}

// Probe a full Intercom admin object for any channel/availability field
const TOKEN = process.env.INTERCOM_API_TOKEN;
const H = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json', 'Intercom-Version': '2.11' };
const adm = await (await fetch('https://api.intercom.io/admins', { headers: H })).json();
log('\nadmin object keys:', adm?.admins?.[0] ? Object.keys(adm.admins[0]).join(', ') : '?');
log('sample admin:', JSON.stringify(adm?.admins?.find((a) => a.has_inbox_seat) || adm?.admins?.[0]));
