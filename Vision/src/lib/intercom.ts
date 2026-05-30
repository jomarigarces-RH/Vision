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

// ---------------------------------------------------------------------------
// Team -> LOB classification (by name). Mirrors the user's confirmed rules.
// ---------------------------------------------------------------------------

/** Strip the " - Voice|Chat|Email|SMS" suffix and return the base department. */
export function teamBaseName(teamName: string): string {
  return String(teamName || '').replace(/\s*-\s*(Voice|Chat|Email|SMS)\s*$/i, '').trim();
}

/**
 * Map a team name to one of the 3 dashboard LOBs, or null to exclude.
 *  - exactly "Service Recovery"  -> serviceRecovery (NOT Recovery Escalations etc.)
 *  - contains "Sales"             -> sales
 *  - contains "Support"           -> support
 *  - everything else (Retail, Transit, Recall, Secure Payment, B2B, generic
 *    "Spanish Agents", escalations, internal/unassigned) -> excluded
 */
export function classifyLob(teamName: string): Lob | null {
  const base = teamBaseName(teamName);
  if (!base) return null;
  if (base.toLowerCase() === 'service recovery') return 'serviceRecovery';
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
  const enq = await fetch(`${BASE}/export/reporting_data/enqueue`, {
    method: 'POST',
    headers: exportHeaders(),
    body: JSON.stringify({ dataset_id: datasetId, attribute_ids: attributeIds, start_time: start, end_time: end }),
  });
  const enqJson = await enq.json();
  const jobId = enqJson?.job_identifier;
  if (!jobId) throw new Error(`export(${datasetId}) enqueue failed: ${JSON.stringify(enqJson).slice(0, 200)}`);

  let downloadUrl: string | null = null;
  for (let i = 0; i < 18; i++) {
    await sleep(2500); // ~45s budget
    const st = await fetch(`${BASE}/export/reporting_data/${jobId}`, { headers: exportHeaders() });
    const stJson = await st.json();
    if (typeof stJson?.status === 'string' && stJson.status.startsWith('complete')) {
      downloadUrl = stJson.download_url;
      break;
    }
    if (stJson?.status === 'failed') throw new Error(`export(${datasetId}) job failed`);
  }
  if (!downloadUrl) throw new Error(`export(${datasetId}) timed out`);

  const dl = await fetch(downloadUrl, { headers: exportHeaders('application/octet-stream') });
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
  const data = await fetch(`${BASE}/teams`, { headers: apiHeaders() }).then((r) => r.json());
  const map = new Map<string, string>();
  for (const t of data?.teams || []) map.set(String(t.id), t.name);
  teamCache = { at: Date.now(), map };
  return map;
}

/** admin_id -> { name, email } (cached 5 min). */
export async function getAdmins(): Promise<Map<string, { name: string; email: string }>> {
  if (adminCache && Date.now() - adminCache.at < CACHE_MS) return adminCache.map;
  const data = await fetch(`${BASE}/admins`, { headers: apiHeaders() }).then((r) => r.json());
  const map = new Map<string, { name: string; email: string }>();
  for (const ad of data?.admins || []) map.set(String(ad.id), { name: ad.name, email: ad.email });
  adminCache = { at: Date.now(), map };
  return map;
}

export type ActivityEvent = {
  id: string;
  activity_type: string; // admin_away_mode_change | admin_channel_change | admin_login_success | admin_logout | ...
  performed_by?: { id?: string; email?: string };
  metadata?: Record<string, unknown> | null;
  created_at: number;
};

/** Admin activity-log events since a unix time (paginated). Powers presence/away/channel/off-script. */
export async function getActivityLogs(sinceUnix: number): Promise<ActivityEvent[]> {
  let url: string | null = `${BASE}/admins/activity_logs?created_at_after=${sinceUnix}`;
  const out: ActivityEvent[] = [];
  for (let i = 0; i < 20 && url; i++) {
    const j: { activity_logs?: ActivityEvent[]; pages?: { next?: string | null } } = await fetch(url, { headers: apiHeaders() }).then((r) => r.json());
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

/** All currently-open conversations (paginated). For reconcile, queue depth, and live workload. */
export async function getOpenConversations(): Promise<OpenConversation[]> {
  const out: OpenConversation[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < 100; page++) {
    const body: Record<string, unknown> = {
      query: { field: 'state', operator: '=', value: 'open' },
      pagination: { per_page: 150, ...(startingAfter ? { starting_after: startingAfter } : {}) },
    };
    const res = await fetch(`${BASE}/conversations/search`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) });
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
