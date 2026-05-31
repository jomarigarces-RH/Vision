import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { supabaseAdmin as supabase } from '@/lib/supabase'; // server-only; bypasses RLS
import {
  channelFromSourceType,
  classifyMonitorGroup,
  getAdmins,
  getTeams,
  pstDateString,
} from '@/lib/intercom';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CLIENT_SECRET = process.env.INTERCOM_CLIENT_SECRET;

/** Verify Intercom's X-Hub-Signature (sha1 HMAC of the raw body). */
function verifySignature(rawBody: string, header: string | null): boolean {
  if (!CLIENT_SECRET) {
    console.warn('[webhook] INTERCOM_CLIENT_SECRET not set — skipping verification (dev only)');
    return true;
  }
  if (!header) return false;
  const expected = 'sha1=' + crypto.createHmac('sha1', CLIENT_SECRET).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get('x-hub-signature'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  // Intercom ping when configuring the endpoint.
  if (payload?.type === 'ping' || payload?.topic === 'ping') return NextResponse.json({ ok: true });

  const topic: string = payload?.topic || '';
  const item = payload?.data?.item;

  try {
    if (topic.startsWith('conversation') && item) {
      await handleConversation(item);
    } else if (topic.startsWith('admin') && item) {
      await handleAdminActivity(item, payload);
    }
  } catch (err) {
    // Never make Intercom retry-storm us; log and ack.
    console.error('[webhook] handler error:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true });
}

// --- Conversation events: keep live_conversations current, detect unassignment ---

async function handleConversation(conv: any) {
  const convId = String(conv.id);
  const channel = channelFromSourceType(conv?.source?.type);
  const teams = await getTeams();
  const teamName = conv.team_assignee_id ? teams.get(String(conv.team_assignee_id)) || '' : '';
  const lob = teamName ? classifyMonitorGroup(teamName) : null;
  const newAssigneeId = conv.admin_assignee_id ? String(conv.admin_assignee_id) : null;
  const admins = await getAdmins();
  const assigneeName = newAssigneeId ? admins.get(newAssigneeId)?.name || null : null;
  const state = conv.state || 'open';
  const closed = state === 'closed';

  // Prior row to detect a self-unassignment (was assigned to an agent, now null).
  const { data: prior } = await supabase
    .from('live_conversations')
    .select('assignee_id, assignee_name')
    .eq('conversation_id', convId)
    .maybeSingle();

  await supabase.from('live_conversations').upsert(
    {
      conversation_id: convId,
      channel,
      team_name: teamName || null,
      lob,
      assignee_id: newAssigneeId,
      assignee_name: assigneeName,
      state: closed ? 'closed' : state,
      customer_name: conv?.source?.author?.name || null,
      created_at_ic: conv.created_at ? new Date(conv.created_at * 1000).toISOString() : null,
      closed_at: closed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'conversation_id' },
  );

  if (prior?.assignee_id && !newAssigneeId && !closed) {
    // Conversation went from assigned-to-an-agent → unassigned: record it (report),
    // no alert by default (policy: unassign is recorded, not alerted).
    const wl = await workloadFor(prior.assignee_id);
    await recordBehavior({
      teammate_id: prior.assignee_id,
      teammate_name: prior.assignee_name,
      lob,
      behavior: 'unassigned',
      conversation_id: convId,
      customer_name: conv?.source?.author?.name || null,
      workload: wl,
      is_alert: false,
      detail: `Unassigned a ${channel || 'conversation'} from themselves`,
      at: new Date(),
      dedup_key: `unassigned:${convId}:${Math.floor(Date.now() / 60000)}`,
    });
  }

  // Refresh the (new and old) assignee workload snapshots.
  if (newAssigneeId) await refreshAgentWorkload(newAssigneeId);
  if (prior?.assignee_id && prior.assignee_id !== newAssigneeId) await refreshAgentWorkload(prior.assignee_id);
}

// --- Admin activity events: presence, away+reason, channel (off-script) ---

async function handleAdminActivity(item: any, payload: any) {
  // For admin.activity_log_event.created, the item IS the activity log event.
  const ev = item?.activity_type ? item : payload?.data?.item;
  const type: string = ev?.activity_type || '';
  const adminId = String(ev?.performed_by?.id || ev?.performed_by?.admin_id || '');
  if (!adminId) return;
  const meta = ev?.metadata || {};
  const at = new Date((ev?.created_at || Math.floor(Date.now() / 1000)) * 1000);
  const date = pstDateString(at);
  const admins = await getAdmins();
  const name = admins.get(adminId)?.name || meta.update_by_name || null;

  if (type === 'admin_away_mode_change' || type === 'admin.away_mode_updated') {
    const away = !!meta.away_mode;
    await supabase.from('agent_state').upsert(
      {
        teammate_id: adminId,
        name,
        presence: away ? 'away' : 'online',
        away_reason: away ? meta.away_status_reason || 'Away' : null,
        away_since: away ? at.toISOString() : null,
        last_event_at: at.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'teammate_id' },
    );
    await supabase.from('agent_status_log').insert({
      teammate_id: adminId,
      name,
      event_type: away ? 'away_on' : 'away_off',
      away_reason: away ? meta.away_status_reason || 'Away' : null,
      auto_changed: meta.auto_changed ?? null,
      at: at.toISOString(),
      date,
    });
  } else if (type === 'admin_channel_change' || type === 'admin.channel_change') {
    const channel = meta.channel_availability || null;
    const auto = meta.auto_changed;
    await supabase.from('agent_state').upsert(
      { teammate_id: adminId, name, channel, channel_auto: auto ?? null, last_event_at: at.toISOString(), updated_at: new Date().toISOString() },
      { onConflict: 'teammate_id' },
    );
    await supabase.from('agent_status_log').insert({ teammate_id: adminId, name, event_type: 'channel_change', channel, auto_changed: auto ?? null, at: at.toISOString(), date });
    if (auto === false) {
      // Off-script: agent manually changed their channel.
      await recordBehavior({
        teammate_id: adminId,
        teammate_name: name,
        lob: null,
        behavior: 'channel_change',
        workload: await workloadFor(adminId),
        is_alert: true,
        detail: `Manually switched channel to "${channel}"`,
        at,
        dedup_key: `channel:${adminId}:${ev?.id || at.getTime()}`,
      });
    }
  } else if (type === 'admin_login_success' || type === 'admin.logged_in') {
    await supabase.from('agent_state').upsert({ teammate_id: adminId, name, presence: 'online', last_event_at: at.toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'teammate_id' });
    await supabase.from('agent_status_log').insert({ teammate_id: adminId, name, event_type: 'login', at: at.toISOString(), date });
  } else if (type === 'admin_logout' || type === 'admin.logged_out') {
    await supabase.from('agent_state').upsert({ teammate_id: adminId, name, presence: 'offline', last_event_at: at.toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'teammate_id' });
    await supabase.from('agent_status_log').insert({ teammate_id: adminId, name, event_type: 'logout', at: at.toISOString(), date });
  }
}

// --- helpers ---

async function workloadFor(assigneeId: string): Promise<{ calls: number; chats: number; emails: number }> {
  const { data } = await supabase
    .from('live_conversations')
    .select('channel')
    .eq('assignee_id', assigneeId)
    .eq('state', 'open');
  const wl = { calls: 0, chats: 0, emails: 0 };
  for (const r of data || []) {
    if (r.channel === 'Voice') wl.calls++;
    else if (r.channel === 'Chat') wl.chats++;
    else if (r.channel === 'Email') wl.emails++;
  }
  return wl;
}

async function refreshAgentWorkload(assigneeId: string) {
  const wl = await workloadFor(assigneeId);
  await supabase
    .from('agent_state')
    .upsert({ teammate_id: assigneeId, calls_open: wl.calls, chats_open: wl.chats, emails_open: wl.emails, updated_at: new Date().toISOString() }, { onConflict: 'teammate_id' });
}

async function recordBehavior(b: {
  teammate_id: string;
  teammate_name: string | null;
  lob: string | null;
  behavior: string;
  conversation_id?: string;
  call_id?: string;
  customer_name?: string | null;
  workload: { calls: number; chats: number; emails: number };
  is_alert: boolean;
  detail: string;
  at: Date;
  dedup_key: string;
}) {
  await supabase.from('behavior_events').upsert(
    {
      teammate_id: b.teammate_id,
      teammate_name: b.teammate_name,
      lob: b.lob,
      behavior: b.behavior,
      conversation_id: b.conversation_id || null,
      call_id: b.call_id || null,
      customer_name: b.customer_name || null,
      workload_calls: b.workload.calls,
      workload_chats: b.workload.chats,
      workload_emails: b.workload.emails,
      is_alert: b.is_alert,
      detail: b.detail,
      at: b.at.toISOString(),
      date: pstDateString(b.at),
      dedup_key: b.dedup_key,
    },
    { onConflict: 'dedup_key', ignoreDuplicates: true },
  );
}
