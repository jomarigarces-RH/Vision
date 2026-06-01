/**
 * Intercom client for the SLA dashboard.
 *
 * ALL metrics come from the Reporting Data Export API (Intercom-Version:
 * Unstable) — the same source as Intercom's own reports, so the numbers match.
 *   - VOICE -> dataset `call_team_stats` (per-call answer/queue/talk time)
 *   - CHAT/EMAIL -> dataset `conversation` (channel, team, first response time,
 *     teammate reply counts, closing teammate name)
 *
 * The export is async: enqueue -> poll -> download CSV. It is fast and complete
 * regardless of volume (unlike the conversations search, which is rate-limited
 * and would time out on a full day). Team -> LOB mapping is by team NAME
 * (see memory: intercom-team-lob-mapping).
 */

const TOKEN = process.env.INTERCOM_API_TOKEN;
const BASE = 'https://api.intercom.io';
const V_EXPORT = 'Unstable';

export type Lob = 'support' | 'sales' | 'serviceRecovery';
export type Channel = 'Voice' | 'Chat' | 'Email' | 'SMS';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch with a hard timeout so a stalled connection can never hang the compute. */
async function fetchT(url: string, opts: RequestInit = {}, ms = 20000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Retry a flaky call (Intercom 429s / transient network) with linear backoff. */
async function withRetry<T>(fn: () => Promise<T>, tries = 3, delayMs = 700): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await sleep(delayMs * (i + 1));
    }
  }
  throw lastErr;
}

/** GET JSON with ok-check + retry; throws (after retries) so callers don't cache empties. */
async function getJson(url: string): Promise<any> {
  return withRetry(async () => {
    const res = await fetchT(url, { headers: apiHeaders() });
    if (!res.ok) throw new Error(`GET ${url.replace(BASE, '')} -> ${res.status}`);
    return res.json();
  });
}

// ---------------------------------------------------------------------------
// Team -> LOB classification (by name). Mirrors the user's confirmed rules.
// ---------------------------------------------------------------------------

/** Strip the " - Voice|Chat|Email|SMS" suffix and return the base department. */
export function teamBaseName(teamName: string): string {
  return String(teamName || '').replace(/\s*-\s*(Voice|Chat|Email|SMS)\s*$/i, '').trim();
}

/**
 * Map a team name to one of the 3 dashboard LOBs, or null to exclude.
 *  - any "Recovery" team (Service Recovery, Recovery Escalations, …)
 *                                 -> serviceRecovery — matches Intercom's combined
 *                                    "Service Recovery & Recovery Escalations" card
 *  - contains "Sales"             -> sales
 *  - contains "Support"           -> support
 *  - everything else (Retail, Transit, Recall, Secure Payment, B2B, generic
 *    "Spanish Agents", non-recovery escalations, internal/unassigned) -> excluded
 */
export function classifyLob(teamName: string): Lob | null {
  const base = teamBaseName(teamName);
  if (!base) return null;
  if (/recovery/i.test(base)) return 'serviceRecovery';
  if (/sales/i.test(base)) return 'sales';
  if (/support/i.test(base)) return 'support';
  return null;
}

export const LOB_DEPARTMENT: Record<Lob, string> = {
  support: 'Support Operations',
  sales: 'Sales Operations',
  serviceRecovery: 'Service Recovery',
};

// ---------------------------------------------------------------------------
// PST day boundaries -> unix seconds (DST-aware).
// ---------------------------------------------------------------------------

const TZ = 'America/Los_Angeles';

/** YYYY-MM-DD for the given instant in Pacific time. */
export function pstDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Offset (ms) of America/Los_Angeles relative to UTC at the given instant. */
function laOffsetMs(utcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(utcMs));
  const o: Record<string, string> = {};
  for (const p of parts) o[p.type] = p.value;
  const asUTC = Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute, +o.second);
  return asUTC - utcMs;
}

/** Unix seconds for a Pacific wall-clock midnight on the given YYYY-MM-DD. */
function pstMidnightUnix(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  let ms = Date.UTC(y, m - 1, d, 0, 0, 0); // first guess (treat as UTC)
  const off1 = laOffsetMs(ms);
  ms -= off1; // wall = UTC + off  =>  UTC = wall - off
  const off2 = laOffsetMs(ms);
  if (off2 !== off1) ms += off1 - off2; // correct across a DST boundary
  return Math.floor(ms / 1000);
}

/** [start, end) unix-second range covering the Pacific calendar day. */
export function pstDayRange(dateStr: string): { start: number; end: number } {
  const start = pstMidnightUnix(dateStr);
  const next = pstDateString(new Date((start + 36 * 3600) * 1000)); // next calendar day (DST-safe)
  const end = pstMidnightUnix(next);
  return { start, end };
}

// ---------------------------------------------------------------------------
// Reporting Data Export: enqueue -> poll -> download CSV.
// ---------------------------------------------------------------------------

/** Minimal RFC-4180-ish CSV parser (handles quotes & embedded commas/newlines). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\r') {
      /* skip */
    } else if (c === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  const header = rows.shift();
  if (!header) return [];
  return rows
    .filter((r) => r.length > 1)
    .map((r) => {
      const o: Record<string, string> = {};
      header.forEach((h, idx) => (o[h] = r[idx] ?? ''));
      return o;
    });
}

const exportHeaders = (accept = 'application/json') => ({
  Authorization: `Bearer ${TOKEN}`,
  Accept: accept,
  'Content-Type': 'application/json',
  'Intercom-Version': V_EXPORT,
});

/**
 * Run a reporting-data export and return the parsed rows.
 * `attributeIds` must be qualified (e.g. `call.call_answer_time`).
 * Throws on hard failure; callers decide whether to degrade gracefully.
 */
async function runExport(datasetId: string, attributeIds: string[], start: number, end: number): Promise<Record<string, string>[]> {
  // Enqueue with retry: firing 3 exports concurrently (plus the email search) can
  // trip Intercom's rate limit, returning no job_identifier. A transient miss here
  // was the cause of voice/chat silently zeroing out. Retry is cheap — a successful
  // enqueue + export normally completes in ~4s, far under the 60s budget.
  const jobId = await withRetry(async () => {
    const enq = await fetchT(`${BASE}/export/reporting_data/enqueue`, {
      method: 'POST',
      headers: exportHeaders(),
      body: JSON.stringify({ dataset_id: datasetId, attribute_ids: attributeIds, start_time: start, end_time: end }),
    });
    const enqJson = await enq.json();
    const id = enqJson?.job_identifier;
    if (!id) throw new Error(`export(${datasetId}) enqueue failed: ${JSON.stringify(enqJson).slice(0, 200)}`);
    return id as string;
  }, 3, 800);

  let downloadUrl: string | null = null;
  // Poll every 2s up to ~36s. Combined with the 18s download cap below, a single
  // export stays ≲54s — under Vercel's 60s function limit (the 504 budget).
  for (let i = 0; i < 18; i++) {
    await sleep(2000);
    const st = await fetchT(`${BASE}/export/reporting_data/${jobId}`, { headers: exportHeaders() });
    const stJson = await st.json();
    if (typeof stJson?.status === 'string' && stJson.status.startsWith('complete')) {
      downloadUrl = stJson.download_url;
      break;
    }
    if (stJson?.status === 'failed') throw new Error(`export(${datasetId}) job failed`);
  }
  if (!downloadUrl) throw new Error(`export(${datasetId}) timed out`);

  const dl = await fetchT(downloadUrl, { headers: exportHeaders('application/octet-stream') }, 18000);
  if (!dl.ok) throw new Error(`export(${datasetId}) download ${dl.status}`);
  return parseCsv(await dl.text());
}

// --- Voice (calls) ---------------------------------------------------------

export type CallRow = {
  call_id: string;
  call_direction: string;
  call_answer_time: string;
  call_queue_time: string;
  call_talk_time: string;
  call_state: string;
  call_team_id: string; // actually the team NAME
  [k: string]: string;
};

const CALL_ATTRS = [
  'call.call_id',
  'call.call_direction',
  'call.call_answer_time',
  'call.call_queue_time',
  'call.call_talk_time',
  'call.call_state',
  'team.call_team_id',
  'timestamp.call_initiated_at',
];

export function exportCalls(start: number, end: number): Promise<CallRow[]> {
  return runExport('call_team_stats', CALL_ATTRS, start, end) as Promise<CallRow[]>;
}

// --- Chat & Email (conversations) ------------------------------------------

export type ConvRow = {
  channel: string; // "Chat" | "Email" | "Phone call" | "SMS" | ...
  currently_assigned_team_id: string; // team NAME, or "Unassigned"
  // First HUMAN reply time, excluding time the chat waited in the Fin AI bot
  // inbox. This matches Intercom's own chat report (the plain first-response
  // time wrongly includes bot-inbox wait and tanks the SLA).
  first_response_time_excluding_bot_inbox: string; // seconds
  current_conversation_state: string; // "Open" | "Closed" | ...
  teammate_replies_count: string;
  first_closing_teammate_id: string; // teammate NAME
  currently_assigned_teammate_id: string; // teammate NAME
  [k: string]: string;
};

const CONV_ATTRS = [
  'standard.channel',
  'team.currently_assigned_team_id',
  'duration.first_response_time_excluding_bot_inbox',
  'standard.current_conversation_state',
  'standard.teammate_replies_count',
  'teammate.first_closing_teammate_id',
  'teammate.currently_assigned_teammate_id',
];

export function exportConversations(start: number, end: number): Promise<ConvRow[]> {
  return runExport('conversation', CONV_ATTRS, start, end) as Promise<ConvRow[]>;
}

// --- SLA status (chat/email hit rate, matches Intercom's "SLA hit rate") -----

export type SlaRow = {
  channel: string; // "Chat" | "Email" | "Phone call"
  currently_assigned_team_id: string; // team NAME
  sla_state: string; // "Hit" | "Missed" | "fixed"
  sla_metric_type: string; // "First response time" | "Speed of answer"
  [k: string]: string;
};

const SLA_ATTRS = [
  'standard.channel',
  'team.currently_assigned_team_id',
  'standard.sla_state',
  'standard.sla_metric_type',
];

export function exportSlaStatus(start: number, end: number): Promise<SlaRow[]> {
  return runExport('conversation_sla_status_log', SLA_ATTRS, start, end) as Promise<SlaRow[]>;
}

// --- Per-teammate call outcomes (missed / declined) ------------------------

export type CallTeammateRow = {
  conversation_id: string; // the "Contact ID"
  call_id: string;
  call_teammate_id: string; // teammate NAME
  call_direction: string;
  call_state: string; // "Answered" | "Abandoned in queue" | ...
  call_terminating_party_type: string; // "Customer" | "Teammate"
  call_teammate_declined_call_count: string;
  call_teammate_missed_call_count: string;
  customer_name: string;
  voice_routing_inbox: string; // inbox name -> LOB
  call_initiated_at: string; // "YYYY-MM-DD HH:MM:SS" (UTC)
  [k: string]: string;
};

const CALL_TEAMMATE_ATTRS = [
  'standard.conversation_id',
  'call.call_id',
  'teammate.call_teammate_id',
  'call.call_direction',
  'call.call_state',
  'call.call_terminating_party_type',
  'call.call_teammate_declined_call_count',
  'call.call_teammate_missed_call_count',
  'conversation.customer_name',
  'conversation.voice_routing_inbox',
  'timestamp.call_initiated_at',
];

/** Per-teammate call rows (one per teammate-offer), incl. declined/missed counts. */
export function exportCallTeammateStats(start: number, end: number): Promise<CallTeammateRow[]> {
  return runExport('call_teammate_stats', CALL_TEAMMATE_ATTRS, start, end) as Promise<CallTeammateRow[]>;
}

// --- App id (workspace) for building Intercom inbox deep links -------------
let appIdCache: string | null = null;
/** Intercom workspace id_code — used in inbox URLs. Cached for the process. */
export async function getAppId(): Promise<string> {
  if (appIdCache !== null) return appIdCache;
  try {
    const me = await fetchT(`${BASE}/me`, { headers: apiHeaders() }).then((r) => r.json());
    appIdCache = String(me?.app?.id_code || '');
  } catch {
    appIdCache = '';
  }
  return appIdCache;
}

// --- Per-agent open-email workload (NAME -> conversation ids) --------------
/**
 * Open email conversations grouped by their currently-assigned teammate NAME,
 * via the (fast) reporting export. Returns the conversation ids so the UI can
 * deep-link them. Window defaults to 21d to capture the open backlog.
 */
export async function exportOpenEmailByTeammate(windowDays = 21): Promise<{ byName: Map<string, string[]>; unassigned: number }> {
  const end = Math.floor(Date.now() / 1000);
  const start = end - windowDays * 86400;
  const rows = await runExport(
    'conversation',
    ['standard.conversation_id', 'standard.channel', 'standard.current_conversation_state', 'teammate.currently_assigned_teammate_id'],
    start,
    end,
  );
  const byName = new Map<string, string[]>();
  let unassigned = 0;
  for (const r of rows) {
    if (!/email/i.test(r.channel) || !/open/i.test(r.current_conversation_state)) continue;
    const a = r.currently_assigned_teammate_id;
    if (!a || /unassigned/i.test(a)) {
      unassigned++;
      continue;
    }
    if (!byName.has(a)) byName.set(a, []);
    if (r.conversation_id) byName.get(a)!.push(r.conversation_id);
  }
  return { byName, unassigned };
}

// ===========================================================================
// Agent Monitoring (Step 2) — live REST helpers
// ===========================================================================

const V_STABLE = '2.11';
const apiHeaders = () => ({
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'Intercom-Version': V_STABLE,
});

/**
 * Monitoring LOB grouping (4 buckets, covers ALL teams) — distinct from the
 * SLA dashboard's classifyLob. Spanish is its own group; everything not
 * Support/Sales/Spanish (Service Recovery, Recovery Escalations, B2B, Retail,
 * Legal Escalations, Secure Payment, Transit, Recall, Fiberglass…) is Specialty.
 */
export type MonitorGroup = 'support' | 'sales' | 'specialty' | 'spanish';
export function classifyMonitorGroup(teamName: string): MonitorGroup {
  const b = teamBaseName(teamName).toLowerCase();
  if (/spanish/.test(b)) return 'spanish';
  if (/sales/.test(b)) return 'sales';
  if (/support/.test(b)) return 'support';
  return 'specialty';
}

/** Channel bucket from a conversation source.type. */
export function channelFromSourceType(sourceType: string | undefined): Channel | null {
  switch (sourceType) {
    case 'phone_call':
      return 'Voice';
    case 'conversation':
      return 'Chat';
    case 'email':
      return 'Email';
    case 'sms':
      return 'SMS';
    default:
      return null;
  }
}

let teamCache: { at: number; map: Map<string, string> } | null = null;
let adminCache: { at: number; map: Map<string, { name: string; email: string }> } | null = null;
const CACHE_MS = 5 * 60 * 1000;

/** team_id -> team name (cached 5 min). */
export async function getTeams(): Promise<Map<string, string>> {
  if (teamCache && Date.now() - teamCache.at < CACHE_MS) return teamCache.map;
  try {
    const data = await getJson(`${BASE}/teams`);
    if (!Array.isArray(data?.teams)) throw new Error('teams: unexpected response');
    const map = new Map<string, string>();
    for (const t of data.teams) map.set(String(t.id), t.name);
    teamCache = { at: Date.now(), map };
    return map;
  } catch (e) {
    if (teamCache) return teamCache.map; // serve stale rather than fail the snapshot
    throw e;
  }
}

/** admin_id -> { name, email } (cached 5 min). */
export async function getAdmins(): Promise<Map<string, { name: string; email: string }>> {
  if (adminCache && Date.now() - adminCache.at < CACHE_MS) return adminCache.map;
  const data = await fetchT(`${BASE}/admins`, { headers: apiHeaders() }).then((r) => r.json());
  const map = new Map<string, { name: string; email: string }>();
  for (const ad of data?.admins || []) map.set(String(ad.id), { name: ad.name, email: ad.email });
  adminCache = { at: Date.now(), map };
  return map;
}

export type AdminDetail = {
  id: string;
  name: string;
  email: string;
  away_mode_enabled: boolean;   // true => "Away"; false => "Active" (can receive work)
  away_mode_reassign: boolean;
  has_inbox_seat: boolean;      // true => a real teammate who takes inbox work
};

/** Full admin records (presence baseline). Retries + throws on failure so the
 *  snapshot never caches an empty agent list from a transient 429. */
export async function getAdminsDetailed(): Promise<AdminDetail[]> {
  const data = await getJson(`${BASE}/admins`);
  if (!Array.isArray(data?.admins)) throw new Error('admins: unexpected response');
  return data.admins.map((ad: Record<string, unknown>) => ({
    id: String(ad.id),
    name: String(ad.name ?? ''),
    email: String(ad.email ?? ''),
    away_mode_enabled: !!ad.away_mode_enabled,
    away_mode_reassign: !!ad.away_mode_reassign,
    has_inbox_seat: !!ad.has_inbox_seat,
  }));
}

export type ActivityEvent = {
  id: string;
  activity_type: string; // admin_away_mode_change | admin_channel_change | admin_login_success | admin_logout | ...
  performed_by?: { id?: string; email?: string };
  metadata?: Record<string, unknown> | null;
  created_at: number;
};

/** Admin activity-log events since a unix time (paginated). Powers presence/away/channel/off-script. */
export async function getActivityLogs(sinceUnix: number, maxPages = 20): Promise<ActivityEvent[]> {
  let url: string | null = `${BASE}/admins/activity_logs?created_at_after=${sinceUnix}`;
  const out: ActivityEvent[] = [];
  for (let i = 0; i < maxPages && url; i++) {
    const j: { activity_logs?: ActivityEvent[]; pages?: { next?: string | null } } = await fetchT(url, { headers: apiHeaders() }).then((r) => r.json());
    out.push(...(j.activity_logs || []));
    url = j.pages?.next || null;
  }
  return out;
}

export type OpenConversation = {
  id: string;
  state: string;
  created_at: number;
  admin_assignee_id: number | null;
  team_assignee_id: number | null;
  source?: { type?: string };
  statistics?: { time_to_admin_reply?: number | null } | null;
};

/**
 * Currently-open conversations (paginated), optionally bounded to those created
 * after `createdAfterUnix` (default: last 48h) so a large open-email backlog
 * doesn't blow up the snapshot. For reconcile, queue depth, and live workload.
 */
export async function getOpenConversations(createdAfterUnix?: number): Promise<OpenConversation[]> {
  const since = createdAfterUnix ?? Math.floor(Date.now() / 1000) - 48 * 3600;
  const out: OpenConversation[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < 100; page++) {
    const body: Record<string, unknown> = {
      query: {
        operator: 'AND',
        value: [
          { field: 'state', operator: '=', value: 'open' },
          { field: 'created_at', operator: '>', value: since },
        ],
      },
      pagination: { per_page: 150, ...(startingAfter ? { starting_after: startingAfter } : {}) },
    };
    const res = await fetchT(`${BASE}/conversations/search`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`open conversations search ${res.status}`);
    const data = await res.json();
    const convs: OpenConversation[] = data?.conversations || [];
    if (!convs.length) break;
    out.push(...convs);
    startingAfter = data?.pages?.next?.starting_after;
    if (!startingAfter) break;
  }
  return out;
}

/**
 * Open Voice + Chat + SMS conversations in full detail (NOT email). These are
 * the live-critical channels (someone is actively waiting / being handled) and
 * there are few of them, so this returns in ~1 page. Email is excluded because
 * the open-email backlog is huge (~94% of open conversations) and paginating it
 * pushes the snapshot past Vercel's 60s cap — it's fetched as a count instead
 * (see getOpenEmailCount). source.type is a searchable field.
 */
export async function getLiveConversations(): Promise<OpenConversation[]> {
  const out: OpenConversation[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < 10; page++) {
    const body: Record<string, unknown> = {
      query: {
        operator: 'AND',
        value: [
          { field: 'state', operator: '=', value: 'open' },
          {
            operator: 'OR',
            value: [
              { field: 'source.type', operator: '=', value: 'phone_call' },
              { field: 'source.type', operator: '=', value: 'conversation' },
              { field: 'source.type', operator: '=', value: 'sms' },
            ],
          },
        ],
      },
      pagination: { per_page: 150, ...(startingAfter ? { starting_after: startingAfter } : {}) },
    };
    const data = await withRetry(async () => {
      const res = await fetchT(`${BASE}/conversations/search`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`live conversations search ${res.status}`);
      return res.json();
    });
    const convs: OpenConversation[] = data?.conversations || [];
    out.push(...convs);
    startingAfter = data?.pages?.next?.starting_after;
    if (!convs.length || !startingAfter) break;
  }
  return out;
}

/** Count of open email conversations (the backlog) — cheap (per_page=1, reads total_count). */
export async function getOpenEmailCount(): Promise<number> {
  const body = {
    query: { operator: 'AND', value: [
      { field: 'state', operator: '=', value: 'open' },
      { field: 'source.type', operator: '=', value: 'email' },
    ] },
    pagination: { per_page: 1 },
  };
  const res = await fetchT(`${BASE}/conversations/search`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) });
  if (!res.ok) return 0;
  const data = await res.json();
  return data?.total_count ?? 0;
}

// --- Email productivity (DAY-based, via Conversations Search) ---------------
// The reporting export windows the `conversation` dataset on CREATED date, so it
// can't count emails *closed/replied today* (they were created days earlier) —
// that's why the old panel read far too low. The Search API exposes the event
// timestamps (statistics.last_close_at / last_admin_reply_at / last_assignment_at)
// and last_closed_by_id, so we count by the actual event day instead. Verified
// against Intercom's "All users - email count" report (closed ≈ matches).

type SearchClause = { field: string; operator: string; value: unknown };
const EMAIL_SOURCE: SearchClause = { field: 'source.type', operator: '=', value: 'email' };
const inDay = (field: string, start: number, end: number): SearchClause[] => [
  { field, operator: '>', value: start },
  { field, operator: '<', value: end },
];

/** total_count for a conversations/search query (cheap; per_page=1). Single
 *  short-timeout attempt — these are secondary metrics, so on any hiccup we
 *  return 0 rather than risk extending the sync toward the Vercel timeout. */
export async function searchConvCount(value: SearchClause[]): Promise<number> {
  const body = { query: { operator: 'AND', value }, pagination: { per_page: 1 } };
  try {
    const res = await fetchT(`${BASE}/conversations/search`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) }, 10000);
    if (!res.ok) return 0;
    const data = await res.json();
    return data?.total_count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Email conversations CLOSED within [start,end): exact total (from total_count on
 * page 0) plus closes-per-admin-id (from statistics.last_closed_by_id) for the
 * leaderboard. HARD-BOUNDED (≤6 pages, ~20s wall-clock, 12s/call, break on any
 * error) so it can never push /api/intercom/sync past Vercel's function limit —
 * the unbounded version was the cause of the 504s. The `total` stays exact even
 * if later pages are skipped; only the leaderboard sample shrinks.
 */
export async function emailClosedByAdmin(start: number, end: number): Promise<{ total: number; byAdminId: Map<string, number> }> {
  const byAdminId = new Map<string, number>();
  let total = 0;
  let startingAfter: string | undefined;
  const deadline = Date.now() + 20_000;
  for (let page = 0; page < 6 && Date.now() < deadline; page++) {
    const body = {
      query: { operator: 'AND', value: [EMAIL_SOURCE, ...inDay('statistics.last_close_at', start, end)] },
      pagination: { per_page: 150, ...(startingAfter ? { starting_after: startingAfter } : {}) },
    };
    let data: { total_count?: number; conversations?: Array<{ statistics?: { last_closed_by_id?: number | null } }>; pages?: { next?: { starting_after?: string } } };
    try {
      const res = await fetchT(`${BASE}/conversations/search`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) }, 12000);
      if (!res.ok) break;
      data = await res.json();
    } catch {
      break; // timeout / network — keep what we have (total stays exact if page 0 landed)
    }
    if (page === 0) total = data?.total_count ?? 0;
    for (const c of data?.conversations || []) {
      const id = c.statistics?.last_closed_by_id;
      if (id) byAdminId.set(String(id), (byAdminId.get(String(id)) || 0) + 1);
    }
    startingAfter = data?.pages?.next?.starting_after;
    if (!data?.conversations?.length || !startingAfter) break;
  }
  return { total, byAdminId };
}

/** Count of email conversations that received a teammate reply within [start,end). */
export function countEmailRepliedInDay(start: number, end: number): Promise<number> {
  return searchConvCount([EMAIL_SOURCE, ...inDay('statistics.last_admin_reply_at', start, end)]);
}

/** Count of email conversations assigned to a teammate within [start,end). */
export function countEmailAssignedInDay(start: number, end: number): Promise<number> {
  return searchConvCount([EMAIL_SOURCE, ...inDay('statistics.last_assignment_at', start, end)]);
}
