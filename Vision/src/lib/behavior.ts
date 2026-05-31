/**
 * Missed / declined call poller. Reads the call_teammate_stats reporting export
 * (one row per teammate offered a call, carrying declined/missed counts +
 * conversation id + customer + inbox + timestamp) and records each event to
 * behavior_events — which feeds BOTH the live "Decline Activity" stream and the
 * reporting dashboard.
 *
 * ALERT POLICY (per user): a miss/decline only fires an ALERT (is_alert=true)
 * when the agent had **0 chats open** at the time — i.e. they were free, not
 * legitimately busy on a chat. Everything is still recorded for the report and
 * the decline stream. We approximate "chats at the time" with the agent's
 * CURRENT chats_open from agent_state, which is accurate because this polls a
 * recent window in near-real-time.
 *
 * Runs on Vercel, cached in module memory (concurrent callers collapse onto one
 * export). Dedup_key prevents double-recording across overlapping polls.
 */
import { supabase } from './supabase';
import { classifyMonitorGroup, exportCallTeammateStats, pstDateString } from './intercom';

export type BehaviorPollResult = {
  generatedAt: string;
  cached: boolean;
  windowMinutes: number;
  rows: number;
  recorded: number;
  alerts: number;
};

const TTL_MS = 120 * 1000; // export latency is minutes anyway — poll at most every 2 min
const WINDOW_MIN = 45; // look back far enough to catch slightly-delayed export rows

let cache: { at: number; res: BehaviorPollResult } | null = null;
let inFlight: Promise<BehaviorPollResult> | null = null;

export async function pollBehavior(force = false): Promise<BehaviorPollResult> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return { ...cache.res, cached: true };
  if (!inFlight) {
    inFlight = run()
      .then((res) => {
        cache = { at: Date.now(), res };
        return res;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  // Never throw to the route: on failure serve the last result, or a benign zero.
  try {
    return await inFlight;
  } catch (e) {
    console.error('[behavior] poll failed:', e instanceof Error ? e.message : e);
    return cache ? { ...cache.res, cached: true } : { generatedAt: new Date().toISOString(), cached: false, windowMinutes: 0, rows: 0, recorded: 0, alerts: 0 };
  }
}

/** One-off poll over an explicit PST day range (for backfill / reporting). Not cached. */
export async function pollBehaviorRange(startUnix: number, endUnix: number): Promise<BehaviorPollResult> {
  return run(startUnix, endUnix);
}

async function run(startOverride?: number, endOverride?: number): Promise<BehaviorPollResult> {
  const end = endOverride ?? Math.floor(Date.now() / 1000);
  const start = startOverride ?? end - WINDOW_MIN * 60;

  const [rows, statesRes] = await Promise.all([
    exportCallTeammateStats(start, end),
    supabase.from('agent_state').select('name, chats_open, calls_open, emails_open'),
  ]);
  const wlByName = new Map((statesRes.data || []).map((s: any) => [s.name, s]));

  const events: Array<Record<string, unknown>> = [];
  for (const r of rows) {
    const declined = Number(r.call_teammate_declined_call_count) || 0;
    const missed = Number(r.call_teammate_missed_call_count) || 0;
    if (!declined && !missed) continue;

    const name = r.call_teammate_id || null;
    const wl = wlByName.get(name) || { chats_open: 0, calls_open: 0, emails_open: 0 };
    // Per user: ONLY record a miss/decline when the agent had 0 chats open (they
    // were free). A decline while on a chat is legitimate (busy) — skip it
    // entirely (keeps the feed + the report + the DB focused on real misbehavior).
    if ((wl.chats_open || 0) > 0) continue;
    const at = new Date(String(r.call_initiated_at || '').replace(' ', 'T') + 'Z');
    const atIso = isNaN(at.getTime()) ? new Date().toISOString() : at.toISOString();
    const lob = r.voice_routing_inbox ? classifyMonitorGroup(r.voice_routing_inbox) : null;
    const behavior = declined ? 'declined_call' : 'missed_call';
    const verb = declined ? 'Declined' : 'Missed';
    // These are all 0-chat by the guard above. is_alert stays false so they show
    // ONLY in the Decline Activity feed, never the Alert Feed (which is for
    // off-script channel changes etc.).
    const isAlert = false;

    events.push({
      teammate_name: name,
      lob,
      behavior,
      conversation_id: r.conversation_id || null,
      call_id: r.call_id || null,
      customer_name: r.customer_name || null,
      workload_calls: wl.calls_open || 0,
      workload_chats: wl.chats_open || 0,
      workload_emails: wl.emails_open || 0,
      is_alert: isAlert,
      detail: `${verb} call — ${r.call_state || 'inbound'}`,
      at: atIso,
      date: pstDateString(new Date(atIso)),
      dedup_key: `${behavior}:${r.call_id}:${name}`,
    });
  }

  if (events.length) {
    // Chunk to stay well within payload limits; ignoreDuplicates so re-polls are no-ops.
    for (let i = 0; i < events.length; i += 500) {
      await supabase.from('behavior_events').upsert(events.slice(i, i + 500), { onConflict: 'dedup_key', ignoreDuplicates: true });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    cached: false,
    windowMinutes: Math.round((end - start) / 60),
    rows: rows.length,
    recorded: events.length,
    alerts: events.filter((e) => e.is_alert).length,
  };
}
