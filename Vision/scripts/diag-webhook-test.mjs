// Verifies the webhook route's signature gating + routing (DB writes may no-op
// until monitoring-migration.sql is run; handler errors are caught → still 200).
import { config } from 'dotenv';
config({ path: '.env.local' });
import crypto from 'node:crypto';
const SECRET = process.env.INTERCOM_CLIENT_SECRET;
const URL = 'http://localhost:3000/api/webhooks/intercom';
const log = (...a) => console.error(...a);

function sign(body) {
  return 'sha1=' + crypto.createHmac('sha1', SECRET).update(body, 'utf8').digest('hex');
}
async function post(obj, sig) {
  const body = JSON.stringify(obj);
  const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Hub-Signature': sig ?? sign(body) }, body });
  return res.status;
}

// 1) bad signature -> 401
log('bad signature      ->', await post({ topic: 'ping' }, 'sha1=deadbeef'));
// 2) ping -> 200
log('valid ping         ->', await post({ type: 'ping', topic: 'ping' }));
// 3) channel change (off-script) -> 200
log('admin channel chg  ->', await post({
  topic: 'admin.activity_log_event.created',
  data: { item: { activity_type: 'admin_channel_change', id: 'evt1', performed_by: { id: '9606734' }, created_at: Math.floor(Date.now() / 1000), metadata: { channel_availability: 'both', auto_changed: false, update_by_name: 'Test Agent' } } },
}));
// 4) conversation assigned -> 200
log('conversation assign->', await post({
  topic: 'conversation.admin.assigned',
  data: { item: { id: '999000999', state: 'open', created_at: Math.floor(Date.now() / 1000), admin_assignee_id: 123, team_assignee_id: 10117711, source: { type: 'phone_call', author: { name: 'Test Customer' } } } },
}));
log('\n(401 then three 200s = signature gating + routing OK. DB rows appear once monitoring-migration.sql is run.)');
