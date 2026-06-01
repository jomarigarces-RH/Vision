/**
 * Metric computation for the SLA dashboard. All inputs come from the Intercom
 * reporting export (see lib/intercom). Times are in seconds.
 *
 * Definitions (confirmed with the user):
 *  - Voice SLA = inbound calls answered within 75s  /  (answered + abandoned)
 *  - Chat SLA  = chats whose first (human) reply was within 75s  /  (answered + abandoned)
 *  - Abandon % = abandoned / inbound
 */

import {
  type CallRow,
  type Channel,
  type ConvRow,
  type Lob,
  type SlaRow,
  classifyLob,
  countEmailAssignedInDay,
  countEmailRepliedInDay,
  emailClosedByAdmin,
  exportCalls,
  exportConversations,
  exportSlaStatus,
  getAdmins,
  getOpenEmailCount,
  pstDayRange,
} from './intercom';

export const SLA_THRESHOLD_SEC = 75;

// Voice call-state buckets (live ACD calls only).
const VOICE_ANSWERED = new Set(['Answered', 'Abandoned in CSAT rating']); // connected to an agent
const VOICE_ABANDONED = new Set(['Abandoned in queue', 'Abandoned on hold', 'No answer']); // lost while waiting
// Callbacks / voicemail / routing states are intentionally NOT part of the live SLA base.

const LOBS: Lob[] = ['support', 'sales', 'serviceRecovery'];

export type ChannelAgg = {
  inbound: number; // offered (answered + abandoned)
  passed: number; // answered within threshold
  abandoned: number;
  frtSeconds: number; // avg speed-to-answer (voice) / first human reply (chat)
  handleSeconds: number; // avg talk time / AHT (voice)
  waitSeconds: number; // avg queue wait (voice)
};

export type EmailAgg = {
  closed: number; // emails CLOSED in the day (by close-event time)
  assigned: number; // emails assigned to a teammate in the day
  replied: number; // emails that got a teammate reply in the day
  sent: number; // current OPEN email backlog (shown as the 4th card, "Open")
  topAgents: { name: string; count: number }[]; // top closers in the day
};

export type DayMetrics = {
  date: string;
  voice: Record<Lob, ChannelAgg>;
  chat: Record<Lob, ChannelAgg>;
  email: EmailAgg;
  diagnostics: Record<string, unknown>;
};

const emptyAgg = (): ChannelAgg => ({ inbound: 0, passed: 0, abandoned: 0, frtSeconds: 0, handleSeconds: 0, waitSeconds: 0 });
const emptyLobMap = (): Record<Lob, ChannelAgg> => ({ support: emptyAgg(), sales: emptyAgg(), serviceRecovery: emptyAgg() });

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};
const avg = (sum: number, n: number) => (n > 0 ? Math.round(sum / n) : 0);

// ---------------------------------------------------------------------------
// Voice (call_team_stats)
// ---------------------------------------------------------------------------

/** Dedupe transfer rows: one row per call_id, preferring the team that answered. */
function dedupeCalls(rows: CallRow[]): CallRow[] {
  const byId = new Map<string, CallRow>();
  for (const r of rows) {
    const prev = byId.get(r.call_id);
    if (!prev) byId.set(r.call_id, r);
    else if (!VOICE_ANSWERED.has(prev.call_state) && VOICE_ANSWERED.has(r.call_state)) byId.set(r.call_id, r);
  }
  return [...byId.values()];
}

export function computeVoice(rows: CallRow[]): { byLob: Record<Lob, ChannelAgg>; excludedInbound: number } {
  const byLob = emptyLobMap();
  const acc: Record<Lob, { queueT: number; queueN: number; talkT: number; talkN: number }> = {
    support: { queueT: 0, queueN: 0, talkT: 0, talkN: 0 },
    sales: { queueT: 0, queueN: 0, talkT: 0, talkN: 0 },
    serviceRecovery: { queueT: 0, queueN: 0, talkT: 0, talkN: 0 },
  };
  let excludedInbound = 0;

  for (const r of dedupeCalls(rows)) {
    if (!/inbound/i.test(r.call_direction)) continue; // SLA is inbound only
    const lob = classifyLob(r.call_team_id);
    if (!lob) {
      excludedInbound++;
      continue;
    }
    const m = byLob[lob];
    const a = acc[lob];
    const state = r.call_state;
    // SLA is measured on time spent IN QUEUE (matches Five9 "Service Level"),
    // not call_answer_time which includes the IVR/greeting before the queue.
    const queueT = num(r.call_queue_time);
    const talkT = num(r.call_talk_time);

    if (VOICE_ANSWERED.has(state)) {
      m.inbound++;
      if (queueT !== null) {
        a.queueT += queueT;
        a.queueN++;
        if (queueT <= SLA_THRESHOLD_SEC) m.passed++; // answered within 75s in queue
      }
      if (talkT !== null && talkT > 0) {
        a.talkT += talkT;
        a.talkN++;
      }
    } else if (VOICE_ABANDONED.has(state)) {
      m.inbound++;
      m.abandoned++;
    }
    // else: callbacks / voicemail / routing — not part of the live SLA base
  }

  for (const lob of LOBS) {
    const queueAvg = avg(acc[lob].queueT, acc[lob].queueN); // ASA over answered calls
    byLob[lob].frtSeconds = queueAvg; // "speed to answer"
    byLob[lob].waitSeconds = queueAvg; // queue wait
    byLob[lob].handleSeconds = avg(acc[lob].talkT, acc[lob].talkN); // AHT
  }
  return { byLob, excludedInbound };
}

// ---------------------------------------------------------------------------
// Chat
//
// SLA % = Intercom's native "SLA hit rate" (Hit / all SLAs applied) from the
// conversation_sla_status_log dataset — this matches Intercom's report exactly
// (target + office-hours rules are baked in). Abandoned & avg first-reply time
// come from the conversation dataset for the detail view.
// ---------------------------------------------------------------------------

const isClosed = (state: string) => /closed/i.test(state);

export function computeChat(convRows: ConvRow[], slaRows: SlaRow[]): Record<Lob, ChannelAgg> {
  const byLob = emptyLobMap();
  const frt: Record<Lob, { sum: number; n: number }> = {
    support: { sum: 0, n: 0 },
    sales: { sum: 0, n: 0 },
    serviceRecovery: { sum: 0, n: 0 },
  };

  // 1) SLA hit rate (the headline number). inbound = SLAs applied, passed = Hit.
  for (const r of slaRows) {
    if (r.channel !== 'Chat') continue;
    if (r.sla_metric_type !== 'First response time') continue;
    const lob = classifyLob(r.currently_assigned_team_id);
    if (!lob) continue;
    byLob[lob].inbound++;
    if (r.sla_state === 'Hit') byLob[lob].passed++;
  }

  // 2) Abandoned (closed without a human reply) + avg first-reply time (detail).
  for (const r of convRows) {
    if (r.channel !== 'Chat') continue;
    const lob = classifyLob(r.currently_assigned_team_id);
    if (!lob) continue;
    const replies = num(r.teammate_replies_count) ?? 0;
    const responseT = num(r.first_response_time_excluding_bot_inbox);
    if (replies > 0 && responseT !== null) {
      frt[lob].sum += responseT;
      frt[lob].n++;
    } else if (isClosed(r.current_conversation_state)) {
      byLob[lob].abandoned++;
    }
  }
  for (const lob of LOBS) byLob[lob].frtSeconds = avg(frt[lob].sum, frt[lob].n);
  return byLob;
}

// ---------------------------------------------------------------------------
// Email (global productivity panel) — DAY-based via the Conversations Search API.
// ---------------------------------------------------------------------------

/**
 * DAY-based email productivity via the Conversations Search API (matches
 * Intercom's "All users - email count" report). The reporting export windows on
 * CREATED date so it can't see emails closed/replied today that were created
 * earlier — the Search API filters on the actual event timestamps instead.
 *  - closed   = emails whose last close happened in the day (≈ Intercom "Closed")
 *  - assigned = emails assigned in the day
 *  - replied  = emails that got a teammate reply in the day
 *  - sent     = current open email backlog (the 4th card)
 *  - topAgents= top closers in the day (statistics.last_closed_by_id -> admin name)
 */
export async function computeEmailDay(start: number, end: number): Promise<EmailAgg> {
  const [closedRes, replied, assigned, backlog, admins] = await Promise.all([
    emailClosedByAdmin(start, end),
    countEmailRepliedInDay(start, end),
    countEmailAssignedInDay(start, end),
    getOpenEmailCount().catch(() => 0),
    getAdmins().catch(() => new Map<string, { name: string; email: string }>()),
  ]);
  const topAgents = [...closedRes.byAdminId.entries()]
    .map(([id, count]) => ({ name: admins.get(id)?.name || `#${id}`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return { closed: closedRes.total, assigned, replied, sent: backlog, topAgents };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/** Fetch from Intercom and compute all metrics for a Pacific calendar day. */
export async function computeDayMetrics(dateStr: string): Promise<DayMetrics> {
  const { start, end } = pstDayRange(dateStr);
  const diagnostics: Record<string, unknown> = { dateStr, start, end };

  const settle = <T,>(p: Promise<T>) =>
    p.then((rows) => ({ ok: true as const, rows }), (err) => ({ ok: false as const, err: String(err?.message || err) }));

  const [voiceRes, convRes, slaRes, emailRes] = await Promise.all([
    settle(exportCalls(start, end)),
    settle(exportConversations(start, end)),
    settle(exportSlaStatus(start, end)),
    settle(computeEmailDay(start, end)), // day-based email via Search (not the export)
  ]);

  let voice = emptyLobMap();
  if (voiceRes.ok) {
    const { byLob, excludedInbound } = computeVoice(voiceRes.rows);
    voice = byLob;
    diagnostics.voiceCallRows = voiceRes.rows.length;
    diagnostics.voiceExcludedInbound = excludedInbound;
  } else {
    diagnostics.voiceError = voiceRes.err;
  }

  let chat = emptyLobMap();
  let email: EmailAgg = { closed: 0, assigned: 0, replied: 0, sent: 0, topAgents: [] };
  const convRows = convRes.ok ? convRes.rows : [];
  const slaRows = slaRes.ok ? slaRes.rows : [];
  if (convRes.ok) diagnostics.conversationRows = convRes.rows.length;
  else diagnostics.conversationError = convRes.err;
  if (slaRes.ok) diagnostics.slaRows = slaRes.rows.length;
  else diagnostics.slaError = slaRes.err;
  chat = computeChat(convRows, slaRows);
  if (emailRes.ok) {
    email = emailRes.rows;
    diagnostics.emailClosed = email.closed;
  } else {
    diagnostics.emailError = emailRes.err;
  }

  return { date: dateStr, voice, chat, email, diagnostics };
}

// ---------------------------------------------------------------------------
// Shape rows for Supabase
// ---------------------------------------------------------------------------

const DEPT: Record<Lob, string> = {
  support: 'Support Operations',
  sales: 'Sales Operations',
  serviceRecovery: 'Service Recovery',
};

export function toOpsMetricRows(m: DayMetrics) {
  const rows: Record<string, unknown>[] = [];
  const push = (lob: Lob, channel: Channel, a: ChannelAgg) => {
    rows.push({
      department: DEPT[lob],
      channel,
      date: m.date,
      inbound_count: a.inbound,
      passed_count: a.passed,
      abandoned_count: a.abandoned,
      frt_seconds: a.frtSeconds,
      handle_seconds: a.handleSeconds,
      wait_seconds: a.waitSeconds,
      updated_at: new Date().toISOString(),
    });
  };
  for (const lob of LOBS) {
    push(lob, 'Voice', m.voice[lob]);
    push(lob, 'Chat', m.chat[lob]);
  }
  return rows;
}

export function toEmailRow(m: DayMetrics) {
  return {
    date: m.date,
    total_closed: m.email.closed,
    total_assigned: m.email.assigned,
    total_replied: m.email.replied,
    replies_sent: m.email.sent,
    top_agents: m.email.topAgents,
    updated_at: new Date().toISOString(),
  };
}
