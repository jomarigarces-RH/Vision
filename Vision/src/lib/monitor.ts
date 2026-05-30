/**
 * Agent-monitoring snapshot — the heavy lifting runs HERE (on Vercel), not in
 * the browser and not in Supabase. Free-tier strategy:
 *   - Intercom fetch + all aggregation happen server-side and are cached in
 *     module memory (TTL). N open dashboards polling => at most one Intercom
 *     pull + one compute per TTL window (concurrent calls collapse onto one).
 *   - The client renders agents/queue straight from this JSON (Vercel
 *     bandwidth is generous) — it does NOT read the big tables from Supabase.
 *   - Supabase is only the persistence layer (so webhooks have a base state)
 *     and the realtime channel for behavior_events alerts (tiny volume). Since
 *     no client subscribes to agent_state / live_conversations, their writes
 *     produce no delivered realtime messages.
 *   - Closed conversations are pruned so the DB stays well under 500 MB.
 */
import { supabase } from '@/lib/supabase';
import {
  channelFromSourceType,
  classifyMonitorGroup,
  getActivityLogs,
  getAdminsDetailed,
  getLiveConversations,
  getOpenEmailCount,
  getTeams,
} from '@/lib/intercom';

export type Presence = 'online' | 'away' | 'offline';

export type MonitorAgent = {
  teammate_id: string;
  name: string | null;
  presence: Presence;
  away_reason: string | null;
  away_since: string | null;
  channel: string | null;
  channel_auto: boolean | null;
  lob: string | null;
  calls_open: number;
  chats_open: number;
  emails_open: number;
  last_event_at: string | null;
};

export type QueueGroup = { voice: number; chat: number; oldestWaitingAt: string | null };

export type MonitorSnapshot = {
  generatedAt: string;
  cached: boolean;
  agents: MonitorAgent[];
  queue: Record<string, QueueGroup>; // keyed by lob group + 'null'
  handling: { Voice: number; Chat: number };
  emailBacklog: number; // open email conversations org-wide (count only)
  presence: { online: number; away: number; offline: number };
  awayBreakdown: [string, number][];
  counts: { agents: number; liveConversations: number; staleClosed: number };
};

const TTL_MS = 45 * 1000;
const QUEUE_KEYS = ['support', 'sales', 'specialty', 'spanish', 'null'];

// --- Agent LOB = their ROLE from the staff roster (NOT the contact's team) ---
const norm = (s: string) => (s || '').toLowerCase().normalize('NFKD').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
const nameTokens = (s: string) => norm(s).split(' ').filter(Boolean);
function lobKey(lob: string | null): string | null {
  const l = (lob || '').toLowerCase();
  if (l.includes('spanish')) return 'spanish';
  if (l.includes('sales')) return 'sales';
  if (l.includes('support')) return 'support';
  if (l.includes('special')) return 'specialty';
  return null;
}

type StaffRow = { agent_name: string | null; nickname: string | null; lob: string | null };
/** Build a fuzzy name -> role(lob) resolver from the staff roster. */
function buildLobResolver(staff: StaffRow[]): (name: string | null) => string | null {
  const byFirstLast = new Map<string, string>();
  const byFirst = new Map<string, Set<string>>();
  for (const s of staff) {
    const lob = lobKey(s.lob);
    if (!lob) continue;
    const t = nameTokens(s.agent_name || '');
    if (!t.length) continue;
    const first = t[0];
    const last = t[t.length - 1];
    byFirstLast.set(`${first}|${last}`, lob);
    if (!byFirst.has(first)) byFirst.set(first, new Set());
    byFirst.get(first)!.add(lob);
  }
  return (name) => {
    const t = nameTokens(name || '');
    if (!t.length) return null;
    const first = t[0];
    const last = t[t.length - 1];
    if (byFirstLast.has(`${first}|${last}`)) return byFirstLast.get(`${first}|${last}`)!;
    // last is an initial ("Roxy B.") -> match a staff first name whose last starts with it
    if (last.length === 1) {
      for (const [k, lob] of byFirstLast) {
        const [f, l] = k.split('|');
        if (f === first && l.startsWith(last)) return lob;
      }
    }
    // try any middle token as the surname
    for (const tok of t.slice(1)) if (byFirstLast.has(`${first}|${tok}`)) return byFirstLast.get(`${first}|${tok}`)!;
    // unambiguous first-name fallback
    const set = byFirst.get(first);
    if (set && set.size === 1) return [...set][0];
    return null;
  };
}

let staffCache: { at: number; rows: StaffRow[] } | null = null;
async function getStaff(): Promise<StaffRow[]> {
  if (staffCache && Date.now() - staffCache.at < 10 * 60 * 1000) return staffCache.rows;
  const { data } = await supabase.from('staff').select('agent_name, nickname, lob');
  staffCache = { at: Date.now(), rows: (data as StaffRow[]) || [] };
  return staffCache.rows;
}

// Away reasons that actually mean the agent is OFF SHIFT (not on a working break),
// so they should read as Offline, not Away. Generic "Away"/no-reason = the
// /admins baseline with no break selected => treat as off shift too.
const OFFLINE_REASON = /done for the day|offline transition|offline|logged out|end of shift|shift ended|out of office/i;
function isOffShift(reason: string | null): boolean {
  if (!reason) return true;
  const r = reason.trim();
  if (r.toLowerCase() === 'away') return true;
  return OFFLINE_REASON.test(r);
}

let cache: { at: number; snap: MonitorSnapshot } | null = null;
let inFlight: Promise<MonitorSnapshot> | null = null;

/** Cached, concurrency-collapsed snapshot. Pass force=true to bypass the cache. */
export async function getMonitorSnapshot(force = false): Promise<MonitorSnapshot> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return { ...cache.snap, cached: true };
  if (inFlight) return inFlight; // a compute is already running — ride along
  inFlight = computeAndPersist()
    .then((snap) => {
      cache = { at: Date.now(), snap };
      return snap;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

async function computeAndPersist(): Promise<MonitorSnapshot> {
  // All Intercom pulls run concurrently. Email is fetched as a COUNT (the open
  // email backlog is ~94% of open conversations and paginating it blows the
  // 60s cap); Voice/Chat/SMS — the live-critical channels — come in full.
  const sinceUnix = Math.floor(Date.now() / 1000) - 12 * 3600; // a shift's worth — we only need each agent's latest away-reason/channel
  const [admins, teams, events, convs, emailBacklog, staff] = await Promise.all([
    getAdminsDetailed(),
    getTeams(),
    getActivityLogs(sinceUnix, 40).catch(() => []),
    getLiveConversations(),
    getOpenEmailCount().catch(() => 0),
    getStaff().catch(() => []),
  ]);
  const nameById = new Map(admins.map((a) => [a.id, a.name || null]));
  const resolveLob = buildLobResolver(staff);

  // 1) Presence baseline from /admins (seat-holders only).
  const drafts = new Map<string, MonitorAgent>();
  for (const a of admins) {
    if (!a.has_inbox_seat) continue;
    drafts.set(a.id, {
      teammate_id: a.id,
      name: a.name || null,
      presence: a.away_mode_enabled ? 'away' : 'online',
      away_reason: a.away_mode_enabled ? 'Away' : null,
      away_since: null,
      channel: null,
      channel_auto: null,
      lob: resolveLob(a.name), // the agent's ROLE from the staff roster
      calls_open: 0,
      chats_open: 0,
      emails_open: 0,
      last_event_at: null,
    });
  }

  // 2) Enrich away-reason / channel / timestamps from activity logs.
  const lastAwayOn = new Map<string, { reason: string | null; at: string }>();
  const lastChannel = new Map<string, { channel: string | null; auto: boolean | null }>();
  const lastEventAt = new Map<string, string>();
  for (const ev of [...events].sort((x, y) => x.created_at - y.created_at)) {
    const id = String(ev.performed_by?.id || '');
    if (!id || !drafts.has(id)) continue;
    const meta = (ev.metadata || {}) as Record<string, unknown>;
    const atIso = new Date(ev.created_at * 1000).toISOString();
    lastEventAt.set(id, atIso);
    if (ev.activity_type === 'admin_away_mode_change') {
      if (meta.away_mode) lastAwayOn.set(id, { reason: (meta.away_status_reason as string) || null, at: atIso });
      else lastAwayOn.delete(id);
    } else if (ev.activity_type === 'admin_channel_change') {
      lastChannel.set(id, {
        channel: (meta.channel_availability as string) ?? null,
        auto: typeof meta.auto_changed === 'boolean' ? (meta.auto_changed as boolean) : null,
      });
    }
  }
  // Last-known channel from what we've already persisted (Intercom's REST API
  // does NOT expose an agent's current channel availability — only change events
  // do — so we carry forward the last value learned from activity logs / webhooks
  // instead of blanking it each run).
  const { data: persisted } = await supabase.from('agent_state').select('teammate_id, channel, channel_auto');
  const prevChannel = new Map((persisted || []).map((r: any) => [String(r.teammate_id), { channel: r.channel as string | null, auto: r.channel_auto as boolean | null }]));

  for (const [id, d] of drafts) {
    const a = lastAwayOn.get(id);
    if (d.presence === 'away' && a) {
      d.away_reason = a.reason || 'Away';
      d.away_since = a.at;
    }
    const c = lastChannel.get(id);
    if (c) {
      d.channel = c.channel;
      d.channel_auto = c.auto;
    } else {
      const p = prevChannel.get(id); // carry forward last-known
      if (p) {
        d.channel = p.channel;
        d.channel_auto = p.auto;
      }
    }
    d.last_event_at = lastEventAt.get(id) || null;

    // Off-shift away reasons (Done for the day, Offline Transition, generic Away)
    // read as Offline, not Away.
    if (d.presence === 'away' && isOffShift(d.away_reason)) d.presence = 'offline';
  }

  // 3) Open conversations -> live rows + per-agent workload + queue aggregate.
  const nowIso = new Date().toISOString();
  const liveRows: Array<Record<string, unknown>> = [];
  const handling = { Voice: 0, Chat: 0 };
  const queue: Record<string, QueueGroup> = {};
  for (const k of QUEUE_KEYS) queue[k] = { voice: 0, chat: 0, oldestWaitingAt: null };

  for (const c of convs as Array<Record<string, any>>) {
    const convId = String(c.id);
    const channel = channelFromSourceType(c?.source?.type);
    const teamName = c.team_assignee_id ? teams.get(String(c.team_assignee_id)) || '' : '';
    const lob = teamName ? classifyMonitorGroup(teamName) : null;
    const assigneeId = c.admin_assignee_id ? String(c.admin_assignee_id) : null;
    const createdIso = c.created_at ? new Date(c.created_at * 1000).toISOString() : null;
    liveRows.push({
      conversation_id: convId,
      channel,
      team_name: teamName || null,
      lob,
      assignee_id: assigneeId,
      assignee_name: assigneeId ? nameById.get(assigneeId) ?? null : null,
      state: 'open',
      customer_name: c?.source?.author?.name || null,
      created_at_ic: createdIso,
      updated_at: nowIso,
    });

    if (assigneeId) {
      const d = drafts.get(assigneeId);
      if (d) {
        if (channel === 'Voice') d.calls_open++;
        else if (channel === 'Chat') d.chats_open++;
      }
      // assigned & open = in progress
      if (channel === 'Voice') handling.Voice++;
      else if (channel === 'Chat') handling.Chat++;
    } else {
      // unassigned & open = waiting (Voice/Chat are the live queue)
      const g = queue[lob || 'null'];
      if (channel === 'Voice' || channel === 'Chat') {
        if (channel === 'Voice') g.voice++;
        else g.chat++;
        if (createdIso && (!g.oldestWaitingAt || createdIso < g.oldestWaitingAt)) g.oldestWaitingAt = createdIso;
      }
    }
  }

  const agents = [...drafts.values()];

  // 4) Persist (so webhooks have a base state) + prune.
  const staleClosed = await persist(agents, liveRows, nowIso);

  const presence = { online: 0, away: 0, offline: 0 };
  const awayMap = new Map<string, number>();
  for (const a of agents) {
    presence[a.presence]++;
    if (a.presence === 'away') awayMap.set(a.away_reason || 'Away', (awayMap.get(a.away_reason || 'Away') || 0) + 1);
  }

  return {
    generatedAt: nowIso,
    cached: false,
    agents,
    queue,
    handling,
    emailBacklog,
    presence,
    awayBreakdown: [...awayMap.entries()].sort((x, y) => y[1] - x[1]),
    counts: { agents: agents.length, liveConversations: liveRows.length, staleClosed },
  };
}

async function persist(agents: MonitorAgent[], liveRows: Array<Record<string, unknown>>, nowIso: string): Promise<number> {
  try {
    const agentRows = agents.map((a) => ({ ...a, updated_at: nowIso }));
    await supabase.from('agent_state').upsert(agentRows, { onConflict: 'teammate_id' });
    await supabase.from('live_conversations').upsert(liveRows, { onConflict: 'conversation_id' });

    // Close rows that were open before but are gone from this snapshot — but ONLY
    // the channels this snapshot actually fetched (Voice/Chat/SMS). Email rows are
    // maintained by webhooks; we never page them here, so we must not close them.
    const MANAGED = ['Voice', 'Chat', 'SMS'];
    const openIds = new Set(liveRows.map((r) => r.conversation_id as string));
    const { data: priorOpen } = await supabase
      .from('live_conversations')
      .select('conversation_id, channel')
      .eq('state', 'open')
      .in('channel', MANAGED);
    const stale = (priorOpen || []).map((r) => r.conversation_id).filter((id) => !openIds.has(id));
    if (stale.length) {
      await supabase
        .from('live_conversations')
        .update({ state: 'closed', closed_at: nowIso, updated_at: nowIso })
        .in('conversation_id', stale);
    }
    // Prune long-closed rows to keep the table small (free-tier DB size).
    const cutoff = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    await supabase.from('live_conversations').delete().eq('state', 'closed').lt('updated_at', cutoff);
    return stale.length;
  } catch {
    return 0; // persistence is best-effort; the snapshot JSON is the source for the UI
  }
}
