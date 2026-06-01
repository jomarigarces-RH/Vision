"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import {
  Phone, MessageSquare, Mail, Users, Coffee, Circle, RefreshCw,
  AlertTriangle, Bell, BellOff, Search, Clock, PhoneOff, UserMinus, Repeat,
  X, ChevronUp, ChevronDown, ChevronsUpDown, Volume2, VolumeX, PhoneIncoming,
  Maximize2, Minimize2, Copy, ExternalLink, PictureInPicture2,
} from 'lucide-react';

// ===== TYPES (mirror src/lib/monitor.ts snapshot payload) =====
type AgentConv = { id: string; ch: 'Voice' | 'Chat' | 'Email' };
type MonitorAgent = {
  teammate_id: string;
  name: string | null;
  presence: 'online' | 'away' | 'offline';
  away_reason: string | null;
  away_since: string | null;
  channel: string | null;
  channel_auto: boolean | null;
  lob: string | null;
  calls_open: number;
  chats_open: number;
  emails_open: number;
  convs: AgentConv[];
};
type QueueGroup = { voice: number; chat: number; oldestWaitingAt: string | null; voiceConvId?: string; chatConvId?: string };
type MonitorSnapshot = {
  generatedAt: string;
  appId: string;
  agents: MonitorAgent[];
  queue: Record<string, QueueGroup>;
  handling: { Voice: number; Chat: number };
  emailBacklog: number;
  presence: { online: number; away: number; offline: number };
  awayBreakdown: [string, number][];
  counts: { agents: number; liveConversations: number };
};
// Realtime row shapes (subset of the Supabase tables we subscribe to).
type AgentStateRow = {
  teammate_id: string;
  presence: 'online' | 'away' | 'offline';
  away_reason: string | null;
  away_since: string | null;
  channel: string | null;
  channel_auto: boolean | null;
  lob: string | null;
  calls_open: number;
  chats_open: number;
  emails_open: number;
  updated_at: string;
};
type LiveConvRow = {
  conversation_id: string;
  channel: string | null;
  lob: string | null;
  assignee_id: string | null;
  state: string | null;
  created_at_ic: string | null;
};
const QUEUE_KEYS = ['support', 'sales', 'specialty', 'spanish', 'null'];

type BehaviorEvent = {
  id: string;
  teammate_name: string | null;
  lob: string | null;
  behavior: string;
  conversation_id: string | null;
  customer_name: string | null;
  workload_calls: number | null;
  workload_chats: number | null;
  workload_emails: number | null;
  is_alert: boolean | null;
  detail: string | null;
  at: string;
};

const LOB_GROUPS = [
  { key: 'support', label: 'Support' },
  { key: 'sales', label: 'Sales' },
  { key: 'specialty', label: 'Specialty' },
  { key: 'spanish', label: 'Spanish' },
  { key: 'null', label: 'Unrouted' },
] as const;
const STATE_OPTS = [
  { key: 'online', label: 'Online' },
  { key: 'away', label: 'Away' },
  { key: 'offline', label: 'Offline' },
] as const;
const lobLabel = (l: string | null) => (l ? LOB_GROUPS.find((g) => g.key === l)?.label || l : 'Unrouted');

type SortCol = 'agent' | 'state' | 'lob' | 'channel' | 'calls' | 'chats' | 'emails' | 'time';
const PRES_RANK: Record<string, number> = { online: 0, away: 1, offline: 2 };
// ms the agent has been in their current state (from away_since); -1 if unknown.
const stateMs = (a: { away_since: string | null }) => (a.away_since ? Date.now() - new Date(a.away_since).getTime() : -1);

const POLL_MS = 20 * 1000; // align with the snapshot's 22s server cache (TTL_MS): polling
// faster just refetches identical cached data, so 20s ~halves Vercel invocations + Supabase
// egress vs. the old 12s with no freshness loss. The 75s self-heal force-refresh still applies.
const BEHAVIOR_POLL_MS = 120 * 1000; // matches the behavior poller's server-side cache

// Overbreak: away longer than the allowed limit for the reason -> glow + anchor.
const OVERBREAK_MIN: Record<string, number> = { break: 15, lunch: 60 };
const reasonKind = (r: string | null): 'break' | 'lunch' | null => {
  const s = (r || '').toLowerCase();
  if (/lunch/.test(s)) return 'lunch';
  if (/break|brb/.test(s)) return 'break';
  return null;
};
const overbreakMins = (a: { presence: string; away_reason: string | null; away_since: string | null }): number => {
  if (a.presence !== 'away' || !a.away_since) return 0;
  const kind = reasonKind(a.away_reason);
  if (!kind) return 0;
  const mins = (Date.now() - new Date(a.away_since).getTime()) / 60000;
  return mins > OVERBREAK_MIN[kind] ? Math.round(mins - OVERBREAK_MIN[kind]) : 0;
};
const intercomConvUrl = (appId: string, id: string) => `https://app.intercom.com/a/inbox/${appId}/inbox/conversation/${id}`;
const fmtAgo = (iso: string | null) => {
  if (!iso) return '';
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h}h${min % 60 ? ` ${min % 60}m` : ''}` : `${Math.floor(h / 24)}d`;
};
const channelLabel = (c: string | null) =>
  c === 'phone' ? 'Voice' : c === 'conversations' ? 'Messaging' : c === 'both' ? 'Both' : '—';

const BEHAVIOR_META: Record<string, { label: string; icon: React.ReactNode }> = {
  missed_call: { label: 'Missed call', icon: <PhoneOff size={13} /> },
  declined_call: { label: 'Declined call', icon: <PhoneOff size={13} /> },
  unassigned: { label: 'Unassigned self', icon: <UserMinus size={13} /> },
  no_action_timeout: { label: 'No action', icon: <Clock size={13} /> },
  channel_change: { label: 'Channel change', icon: <Repeat size={13} /> },
  overbreak: { label: 'Overbreak', icon: <Coffee size={13} /> },
};

export default function MonitorView() {
  const [snap, setSnap] = useState<MonitorSnapshot | null>(null);
  const [alerts, setAlerts] = useState<BehaviorEvent[]>([]);
  const [declines, setDeclines] = useState<BehaviorEvent[]>([]);
  const [declineMuted, setDeclineMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notify, setNotify] = useState(false);
  const [expanded, setExpanded] = useState<null | 'grid' | 'alerts' | 'declines'>(null);
  const [convPop, setConvPop] = useState<{ x: number; y: number; label: string; convs: AgentConv[] } | null>(null);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  // Realtime overlays: live agent_state rows (override the snapshot when newer)
  // and the live open Voice/Chat set (drives queue + handling in real time).
  const [liveAgents, setLiveAgents] = useState<Map<string, AgentStateRow>>(new Map());
  const [liveConvs, setLiveConvs] = useState<Map<string, LiveConvRow>>(new Map());
  const liveConvsSeeded = useRef(false);
  const [, forceTick] = useState(0); // re-render so time-in-state / overbreak recompute

  // grid filters (multi-select: empty set = all) + sort
  const [search, setSearch] = useState('');
  const [lobSel, setLobSel] = useState<Set<string>>(new Set());
  const [stateSel, setStateSel] = useState<Set<string>>(new Set());
  const [workOnly, setWorkOnly] = useState(false);
  const [overbreakOnly, setOverbreakOnly] = useState(false);
  const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' }>({ col: 'state', dir: 'asc' });
  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, val: string) =>
    setter((prev) => {
      const next = new Set(prev);
      next.has(val) ? next.delete(val) : next.add(val);
      return next;
    });
  const clearFilters = () => {
    setSearch('');
    setLobSel(new Set());
    setStateSel(new Set());
    setWorkOnly(false);
    setOverbreakOnly(false);
  };
  // Anchor on a specific agent: clear other filters and search to their name so
  // they're guaranteed visible (used by alert clicks + notification clicks).
  const anchorAgent = (name: string | null) => {
    if (!name) return;
    setLobSel(new Set());
    setStateSel(new Set());
    setWorkOnly(false);
    setOverbreakOnly(false);
    setSearch(name);
    setExpanded(null);
  };
  const filtersActive = search !== '' || lobSel.size > 0 || stateSel.size > 0 || workOnly || overbreakOnly;
  const toggleSort = (col: SortCol) =>
    setSort((s) => (s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: col === 'calls' || col === 'chats' || col === 'emails' || col === 'time' ? 'desc' : 'asc' }));

  const loadingRef = useRef(false);
  const alertIdsRef = useRef<Set<string>>(new Set());
  const declineIdsRef = useRef<Set<string>>(new Set());
  // Heartbeat bookkeeping (last time each periodic task ran).
  const lastPollRef = useRef(0);
  const lastBehaviorRef = useRef(0);
  const lastReseedRef = useRef(0);

  // ---- snapshot (heavy data) comes from Vercel, cached server-side ----------
  const loadSnapshot = useCallback(async (force = false): Promise<MonitorSnapshot | null> => {
    if (loadingRef.current) return null;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/monitor/snapshot${force ? '?force=1' : ''}`);
      if (res.ok) {
        const data = (await res.json()) as MonitorSnapshot;
        // Never downgrade a populated grid to the server's empty fallback (which
        // it returns if a cold compute hit an Intercom hiccup) — keep last good.
        setSnap((prev) => (data.agents?.length === 0 && prev && prev.agents.length > 0 ? prev : data));
        return data;
      }
    } catch {
      /* keep last snapshot on screen */
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
    return null;
  }, []);

  // Poll; if the data is stale (server's background refresh stalled), force a
  // fresh compute so the dashboard self-heals instead of freezing.
  const pollSnapshot = useCallback(async () => {
    const data = await loadSnapshot(false);
    if (data && data.agents.length > 0 && Date.now() - new Date(data.generatedAt).getTime() > 75_000) {
      await loadSnapshot(true);
    }
  }, [loadSnapshot]);

  // ---- behavior_events: alerts + the live decline stream (read from Supabase) -
  const loadAlerts = useCallback(async () => {
    const { data } = await supabase
      .from('behavior_events')
      .select('*')
      .eq('is_alert', true)
      .not('behavior', 'in', '(declined_call,missed_call)') // declines live in their own feed
      .order('at', { ascending: false })
      .limit(60);
    if (data) {
      setAlerts(data as BehaviorEvent[]);
      alertIdsRef.current = new Set((data as BehaviorEvent[]).map((x) => x.id));
    }
  }, []);

  const loadDeclines = useCallback(async () => {
    const { data } = await supabase
      .from('behavior_events')
      .select('*')
      .in('behavior', ['declined_call', 'missed_call'])
      .order('at', { ascending: false })
      .limit(100);
    if (data) {
      setDeclines(data as BehaviorEvent[]);
      declineIdsRef.current = new Set((data as BehaviorEvent[]).map((x) => x.id));
    }
  }, []);

  // Seed the open Voice/Chat set for the realtime queue (small read; re-seeded
  // periodically to correct any missed realtime events).
  const seedLiveConvs = useCallback(async () => {
    const { data } = await supabase
      .from('live_conversations')
      .select('conversation_id, channel, lob, assignee_id, state, created_at_ic')
      .eq('state', 'open')
      .in('channel', ['Voice', 'Chat']);
    if (data) {
      setLiveConvs(new Map((data as LiveConvRow[]).map((r) => [r.conversation_id, r])));
      liveConvsSeeded.current = true;
    }
  }, []);

  // Trigger the server-side missed/declined poll (cached 2 min server-side, so
  // many tabs collapse onto one export). Realtime pushes the new rows.
  const triggerBehaviorPoll = useCallback(async () => {
    try {
      await fetch('/api/monitor/behavior');
    } catch {
      /* ignore */
    }
    loadDeclines();
    loadAlerts();
  }, [loadDeclines, loadAlerts]);

  useEffect(() => {
    // Initial load + realtime subscription. Runs the whole time the monitor is
    // MOUNTED (tab open) — we intentionally do NOT pause on tab-hidden, so the
    // Picture-in-Picture window keeps updating while you're in another tab/app.
    // It only stops when the tab/view is closed (unmount cleanup below). The
    // periodic polling/re-render is driven by a separate heartbeat effect (below)
    // whose timers survive tab backgrounding when a PiP window is open.
    loadSnapshot();
    loadAlerts();
    loadDeclines();
    seedLiveConvs();
    triggerBehaviorPoll();
    const channel = supabase
      .channel('monitor-rt')
      // --- behavior_events: alert feed + decline stream ---
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'behavior_events' }, (p) => {
        const ev = p.new as BehaviorEvent;
        if ((ev.behavior === 'declined_call' || ev.behavior === 'missed_call') && !declineIdsRef.current.has(ev.id)) {
          declineIdsRef.current.add(ev.id);
          setDeclines((prev) => [ev, ...prev].slice(0, 100));
        }
        const isDecline = ev.behavior === 'declined_call' || ev.behavior === 'missed_call';
        if (ev.is_alert && !isDecline && !alertIdsRef.current.has(ev.id)) {
          alertIdsRef.current.add(ev.id);
          setAlerts((prev) => [ev, ...prev].slice(0, 60));
          if (notify && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            const n = new Notification(`${BEHAVIOR_META[ev.behavior]?.label || 'Alert'} — ${ev.teammate_name || 'agent'}`, { body: ev.detail || '', tag: ev.id });
            n.onclick = () => {
              window.focus();
              anchorAgent(ev.teammate_name); // anchor: isolate that agent in the grid
              n.close();
            };
          }
        }
      })
      // --- agent_state: live presence / away / channel / workload ---
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_state' }, (p) => {
        const row = (p.eventType === 'DELETE' ? p.old : p.new) as AgentStateRow;
        if (!row?.teammate_id) return;
        setLiveAgents((prev) => {
          const n = new Map(prev);
          if (p.eventType === 'DELETE') n.delete(row.teammate_id);
          else n.set(row.teammate_id, row);
          return n;
        });
      })
      // --- live_conversations: live queue + handling (open Voice/Chat only) ---
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_conversations' }, (p) => {
        const row = (p.eventType === 'DELETE' ? p.old : p.new) as LiveConvRow;
        const id = row?.conversation_id;
        if (!id) return;
        const keep = p.eventType !== 'DELETE' && row.state === 'open' && (row.channel === 'Voice' || row.channel === 'Chat');
        setLiveConvs((prev) => {
          const n = new Map(prev);
          if (keep) n.set(id, row);
          else n.delete(id);
          return n;
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSnapshot, loadAlerts, loadDeclines, seedLiveConvs, triggerBehaviorPoll, notify]);

  // One heartbeat action, re-bound every render so it always sees fresh state +
  // callbacks. Polls the snapshot, runs the behavior poll, re-seeds the live
  // conv set, and forces a re-render so time-in-state / overbreak / the PiP all
  // stay live. Each sub-task fires on its own cadence (tracked via the refs).
  const heartbeat = () => {
    const now = Date.now();
    forceTick((n) => n + 1); // re-render: "Xm ago", overbreak glow, and the PiP mirror
    if (now - lastPollRef.current >= POLL_MS) { lastPollRef.current = now; pollSnapshot(); }
    if (now - lastBehaviorRef.current >= BEHAVIOR_POLL_MS) { lastBehaviorRef.current = now; triggerBehaviorPoll(); }
    if (now - lastReseedRef.current >= 120_000) { lastReseedRef.current = now; seedLiveConvs(); }
  };
  const heartbeatRef = useRef(heartbeat);
  heartbeatRef.current = heartbeat;

  // ---- HEARTBEAT via a Web Worker --------------------------------------------
  // The PiP froze because a backgrounded tab throttles setInterval to ~once/min
  // (the PiP window shares the opener's throttled event loop, so hosting timers
  // on it didn't help). A *Worker* runs on its own thread and delivers ticks as
  // postMessages, which are NOT subject to background-tab timer throttling — so
  // the grid AND the PiP keep refreshing while you're in another tab/app. It runs
  // the whole time the monitor is mounted; closing the tab/view terminates it.
  useEffect(() => {
    let worker: Worker | null = null;
    let url = '';
    let fallback: ReturnType<typeof setInterval> | null = null;
    const beat = () => heartbeatRef.current();
    try {
      const blob = new Blob(
        ['let id=setInterval(function(){postMessage(0)},4000);onmessage=function(e){if(e.data==="stop"){clearInterval(id)}}'],
        { type: 'application/javascript' },
      );
      url = URL.createObjectURL(blob);
      worker = new Worker(url);
      worker.onmessage = beat;
    } catch {
      fallback = setInterval(beat, 4000); // Worker blocked (rare) — degrade to a normal timer
    }
    return () => {
      if (worker) {
        try { worker.postMessage('stop'); worker.terminate(); } catch { /* ignore */ }
      }
      if (url) URL.revokeObjectURL(url);
      if (fallback) clearInterval(fallback);
    };
  }, []);

  const toggleNotify = async () => {
    if (!notify && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
    }
    setNotify((n) => !n);
  };

  // Picture-in-Picture: pop a compact, always-on-top live panel (grid + queue).
  // Uses the Document PiP API where available, else a normal pop-out window.
  const openPip = useCallback(async () => {
    if (pipWindow) {
      pipWindow.close();
      return;
    }
    try {
      const dpip = (window as unknown as { documentPictureInPicture?: { requestWindow: (o: { width: number; height: number }) => Promise<Window> } }).documentPictureInPicture;
      const w = dpip?.requestWindow ? await dpip.requestWindow({ width: 1040, height: 660 }) : window.open('', 'vision-pip', 'width=1040,height=660');
      if (!w) return;
      // Copy this document's styles (incl. CSS variables / Tailwind) into the PiP doc.
      for (const ss of Array.from(document.styleSheets)) {
        try {
          const css = Array.from(ss.cssRules).map((r) => r.cssText).join('\n');
          const style = w.document.createElement('style');
          style.textContent = css;
          w.document.head.appendChild(style);
        } catch {
          if (ss.href) {
            const link = w.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = ss.href;
            w.document.head.appendChild(link);
          }
        }
      }
      w.document.documentElement.className = document.documentElement.className;
      w.document.body.className = document.body.className;
      w.document.body.style.margin = '0';
      w.document.title = 'Vision — Live Monitor';
      w.addEventListener('pagehide', () => setPipWindow(null));
      setPipWindow(w);
    } catch {
      /* PiP not permitted */
    }
  }, [pipWindow]);

  // Close the PiP window if the dashboard unmounts.
  useEffect(() => () => pipWindow?.close(), [pipWindow]);

  const emailBacklog = snap?.emailBacklog ?? 0;
  const appId = snap?.appId ?? '';
  const genAt = snap?.generatedAt ? new Date(snap.generatedAt).getTime() : 0;

  // Grid agents = snapshot base, overlaid with any newer live agent_state row.
  const agents = useMemo(() => {
    const base = snap?.agents ?? [];
    return base.map((a) => {
      const rt = liveAgents.get(a.teammate_id);
      if (rt && new Date(rt.updated_at).getTime() > genAt) {
        return {
          ...a,
          presence: rt.presence,
          away_reason: rt.away_reason,
          away_since: rt.away_since,
          channel: rt.channel,
          channel_auto: rt.channel_auto,
          lob: rt.lob ?? a.lob,
          calls_open: rt.calls_open ?? a.calls_open,
          chats_open: rt.chats_open ?? a.chats_open,
          emails_open: rt.emails_open ?? a.emails_open,
        };
      }
      return a;
    });
  }, [snap, liveAgents, genAt]);

  // Presence counts follow the (possibly overlaid) agents.
  const presence = useMemo(() => {
    const p = { online: 0, away: 0, offline: 0 };
    for (const a of agents) p[a.presence]++;
    return p;
  }, [agents]);

  // Queue + handling from the live open Voice/Chat set (falls back to snapshot
  // until seeded).
  const { queue, handling } = useMemo(() => {
    if (!liveConvsSeeded.current) return { queue: snap?.queue ?? {}, handling: snap?.handling ?? { Voice: 0, Chat: 0 } };
    const q: Record<string, QueueGroup> = {};
    for (const k of QUEUE_KEYS) q[k] = { voice: 0, chat: 0, oldestWaitingAt: null };
    const h = { Voice: 0, Chat: 0 };
    // track the oldest waiting created_at per group+channel so we can link to it
    const oldestVoice: Record<string, string> = {};
    const oldestChat: Record<string, string> = {};
    for (const c of liveConvs.values()) {
      if (c.state !== 'open') continue;
      if (c.assignee_id) {
        if (c.channel === 'Voice') h.Voice++;
        else if (c.channel === 'Chat') h.Chat++;
      } else {
        const key = c.lob || 'null';
        const g = q[key];
        if (!g) continue;
        const at = c.created_at_ic || '';
        if (c.channel === 'Voice') {
          g.voice++;
          if (at && (!oldestVoice[key] || at < oldestVoice[key])) {
            oldestVoice[key] = at;
            g.voiceConvId = c.conversation_id;
          }
        } else if (c.channel === 'Chat') {
          g.chat++;
          if (at && (!oldestChat[key] || at < oldestChat[key])) {
            oldestChat[key] = at;
            g.chatConvId = c.conversation_id;
          }
        }
        if (at && (!g.oldestWaitingAt || at < g.oldestWaitingAt)) g.oldestWaitingAt = at;
      }
    }
    return { queue: q, handling: h };
  }, [snap, liveConvs]);

  const totalVoiceWait = Object.values(queue).reduce((n, g) => n + g.voice, 0);
  const totalChatWait = Object.values(queue).reduce((n, g) => n + g.chat, 0);
  const totalWork = handling.Voice + handling.Chat;
  const overbreakCount = agents.filter((a) => overbreakMins(a) > 0).length;

  const gridAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = agents
      .filter((a) => a.name)
      .filter((a) => !q || a.name!.toLowerCase().includes(q))
      .filter((a) => lobSel.size === 0 || lobSel.has(a.lob || 'null'))
      .filter((a) => stateSel.size === 0 || stateSel.has(a.presence))
      .filter((a) => !workOnly || a.calls_open + a.chats_open > 0)
      .filter((a) => !overbreakOnly || overbreakMins(a) > 0);
    const dir = sort.dir === 'asc' ? 1 : -1;
    const cmp = (a: MonitorAgent, b: MonitorAgent): number => {
      switch (sort.col) {
        case 'agent': return dir * (a.name || '').localeCompare(b.name || '');
        case 'lob': return dir * lobLabel(a.lob).localeCompare(lobLabel(b.lob));
        case 'channel': return dir * (a.channel || '~').localeCompare(b.channel || '~');
        case 'calls': return dir * (a.calls_open - b.calls_open);
        case 'chats': return dir * (a.chats_open - b.chats_open);
        case 'emails': return dir * (a.emails_open - b.emails_open);
        case 'time': return dir * (stateMs(a) - stateMs(b));
        case 'state':
        default: return dir * ((PRES_RANK[a.presence] ?? 3) - (PRES_RANK[b.presence] ?? 3) || (a.away_reason || '').localeCompare(b.away_reason || ''));
      }
    };
    // Overbreakers are ANCHORED to the very top (most-over first), regardless of
    // the chosen sort, so supervisors see them immediately.
    return filtered.sort((a, b) => {
      const oa = overbreakMins(a);
      const ob = overbreakMins(b);
      if (oa || ob) return ob - oa;
      return cmp(a, b) || b.calls_open + b.chats_open - (a.calls_open + a.chats_open) || (a.name || '').localeCompare(b.name || '');
    });
  }, [agents, search, lobSel, stateSel, workOnly, overbreakOnly, sort]);

  // Expand: the chosen panel becomes an overlay over the monitor area; others hide.
  const panelClass = (id: 'grid' | 'alerts' | 'declines', base: string) =>
    expanded === id
      ? 'absolute inset-0 z-30 flex flex-col rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] shadow-2xl'
      : expanded
      ? 'hidden'
      : base;
  const openConvPop = (e: React.MouseEvent, label: string, convs: AgentConv[]) => {
    if (!convs.length) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setConvPop({ x: Math.min(r.left, window.innerWidth - 300), y: r.bottom + 4, label, convs });
  };
  const ExpandBtn = ({ id }: { id: 'grid' | 'alerts' | 'declines' }) => (
    <button
      onClick={() => setExpanded(expanded === id ? null : id)}
      title={expanded === id ? 'Minimize' : 'Expand'}
      className="rounded-lg p-1 text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
    >
      {expanded === id ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
    </button>
  );

  return (
    <div className="relative flex h-full flex-col gap-3 p-3 sm:p-4 text-[var(--text-primary)]">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold tracking-tight">Agent Monitoring</h2>
          {(() => {
            const ageMs = snap ? Date.now() - new Date(snap.generatedAt).getTime() : Infinity;
            const stale = ageMs > 90_000;
            return (
              <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
                <span className={`inline-block h-2 w-2 rounded-full ${loading ? 'animate-ping bg-brand-blue' : stale ? 'bg-amber-400' : 'animate-pulse bg-emerald-400'}`} />
                {loading ? 'syncing…' : snap ? `live · updated ${fmtAgo(snap.generatedAt)} ago` : '—'}
              </span>
            );
          })()}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleNotify}
            title="Browser notifications for new alerts"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              notify ? 'bg-amber-500/15 text-amber-400' : 'text-[var(--text-secondary)] hover:bg-white/5'
            }`}
          >
            {notify ? <Bell size={14} /> : <BellOff size={14} />}
            Alerts
          </button>
          <button
            onClick={openPip}
            title="Pop out a floating live monitor (grid + queue)"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              pipWindow ? 'bg-brand-blue/15 text-brand-blue' : 'text-[var(--text-secondary)] hover:bg-white/5'
            }`}
          >
            <PictureInPicture2 size={14} />
            {pipWindow ? 'Close PiP' : 'Pop out'}
          </button>
          <button
            onClick={() => loadSnapshot(true)}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-brand-blue/10 px-3 py-1.5 text-xs font-semibold text-brand-blue transition-colors hover:bg-brand-blue/20 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* STATUS + HANDLING STRIP */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <Kpi icon={<Circle size={14} className="fill-emerald-400 text-emerald-400" />} label="Online" value={presence.online} tone="emerald" />
        <Kpi icon={<Coffee size={14} />} label="Away" value={presence.away} tone="amber" />
        <Kpi icon={<Circle size={14} className="text-slate-500" />} label="Offline" value={presence.offline} tone="slate" />
        <Kpi icon={<Phone size={14} />} label="On Calls" value={handling.Voice} tone="blue" />
        <Kpi icon={<MessageSquare size={14} />} label="On Chats" value={handling.Chat} tone="violet" />
        <Kpi icon={<Mail size={14} />} label="Email Backlog" value={emailBacklog} tone="slate" />
        <Kpi icon={<Users size={14} />} label="Handling" value={totalWork} tone="blue" />
      </div>

      {/* QUEUE CARDS BY GROUP */}
      <div>
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
          <span>Live Queue</span>
          <span className="text-amber-400">{totalVoiceWait} voice</span>
          <span className="text-violet-400">{totalChatWait} chat</span>
          <span className="font-medium normal-case text-[var(--text-secondary)]">waiting · email shown as backlog</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {LOB_GROUPS.map((g) => {
            const q = queue[g.key] || { voice: 0, chat: 0, oldestWaitingAt: null };
            const waiting = q.voice + q.chat;
            const oldStale = q.oldestWaitingAt && new Date(q.oldestWaitingAt).getTime() < Date.now() - 5 * 60000;
            return (
              <div key={g.key} className={`rounded-xl border bg-[var(--bg-card)] px-3 py-2 ${q.voice > 0 ? 'border-amber-500/40' : 'border-[var(--border-light)]'}`}>
                <div className="mb-1.5 flex items-center justify-between gap-1">
                  <span className="text-sm font-bold">{g.label}</span>
                  {waiting > 0 && <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-bold text-amber-400">{waiting}</span>}
                </div>
                <div className="flex items-center gap-3 text-base">
                  <QueueNum icon={<Phone size={13} />} n={q.voice} convId={q.voiceConvId} appId={appId} />
                  <QueueNum icon={<MessageSquare size={13} />} n={q.chat} convId={q.chatConvId} appId={appId} />
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)]">
                  <Clock size={11} />
                  {q.oldestWaitingAt ? (
                    <span className={oldStale ? 'font-bold text-amber-400' : ''}>oldest {fmtAgo(q.oldestWaitingAt)}</span>
                  ) : (
                    <span>clear</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN: agent grid + feeds */}
      <div className="flex min-h-0 flex-1 gap-3">
        {/* AGENT GRID */}
        <div className={panelClass('grid', 'flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)]')}>
          <div className="flex flex-col gap-2 border-b border-[var(--border-light)] p-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[160px] flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search agent…"
                  className="w-full rounded-lg bg-white/5 py-1.5 pl-8 pr-2 text-sm outline-none placeholder:text-[var(--text-tertiary)] focus:bg-white/10"
                />
              </div>
              <button
                onClick={() => setWorkOnly((w) => !w)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${workOnly ? 'bg-brand-blue/20 text-brand-blue' : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'}`}
              >
                With work
              </button>
              {filtersActive && (
                <button onClick={clearFilters} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10">
                  <X size={13} /> Clear
                </button>
              )}
              {overbreakCount > 0 && (
                <button
                  onClick={() => setOverbreakOnly((v) => !v)}
                  title="Show only agents over their break/lunch limit"
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold transition-colors ${
                    overbreakOnly ? 'bg-rose-500 text-white' : 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25'
                  }`}
                >
                  <AlertTriangle size={12} /> {overbreakCount} overbreak
                </button>
              )}
              <span className="ml-auto text-xs font-semibold text-[var(--text-secondary)]">{gridAgents.length} agents</span>
              <ExpandBtn id="grid" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">State</span>
              {STATE_OPTS.map((o) => (
                <Chip key={o.key} active={stateSel.has(o.key)} onClick={() => toggleSet(setStateSel, o.key)}>{o.label}</Chip>
              ))}
              <span className="ml-2 mr-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">LOB</span>
              {LOB_GROUPS.map((g) => (
                <Chip key={g.key} active={lobSel.has(g.key)} onClick={() => toggleSet(setLobSel, g.key)}>{g.label}</Chip>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--bg-card)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border-light)]">
                  <SortHeader col="agent" sort={sort} onSort={toggleSort} className="text-left">Agent</SortHeader>
                  <SortHeader col="state" sort={sort} onSort={toggleSort} className="text-left">State</SortHeader>
                  <SortHeader col="time" sort={sort} onSort={toggleSort} className="text-left">Time</SortHeader>
                  <SortHeader col="lob" sort={sort} onSort={toggleSort} className="text-left">LOB</SortHeader>
                  <SortHeader col="channel" sort={sort} onSort={toggleSort} className="text-left">Channel</SortHeader>
                  <SortHeader col="calls" sort={sort} onSort={toggleSort} className="text-center"><Phone size={12} className="inline" /></SortHeader>
                  <SortHeader col="chats" sort={sort} onSort={toggleSort} className="text-center"><MessageSquare size={12} className="inline" /></SortHeader>
                  <SortHeader col="emails" sort={sort} onSort={toggleSort} className="text-center"><Mail size={12} className="inline" /></SortHeader>
                </tr>
              </thead>
              <tbody>
                {gridAgents.map((a) => {
                  const over = overbreakMins(a);
                  return (
                    <tr
                      key={a.teammate_id}
                      className={`border-b border-[var(--border-light)]/40 ${over ? 'animate-pulse bg-rose-500/10 ring-1 ring-inset ring-rose-500/40' : 'hover:bg-white/5'}`}
                    >
                      <td className="max-w-[170px] truncate px-3 py-1.5 font-semibold">{a.name}</td>
                      <td className="px-2 py-1.5"><StateBadge presence={a.presence} reason={a.away_reason} /></td>
                      <td className={`px-2 py-1.5 font-medium ${over ? 'font-bold text-rose-400' : 'text-[var(--text-secondary)]'}`}>
                        {a.away_since ? fmtAgo(a.away_since) : '—'}
                        {over > 0 && <span className="ml-1 text-[11px]">(+{over}m over)</span>}
                      </td>
                      <td className="px-2 py-1.5 text-[var(--text-secondary)]">{lobLabel(a.lob)}</td>
                      <td className="px-2 py-1.5">
                        {a.channel ? (
                          <span className="text-[var(--text-secondary)]">{channelLabel(a.channel)}</span>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">—</span>
                        )}
                        {a.channel_auto === false && <span title="Manually changed channel (off-script)" className="ml-1 text-amber-400">●</span>}
                      </td>
                      <WorkloadCell n={a.calls_open} tone="blue" onOpen={(e) => openConvPop(e, 'Calls', a.convs.filter((c) => c.ch === 'Voice'))} />
                      <WorkloadCell n={a.chats_open} tone="violet" onOpen={(e) => openConvPop(e, 'Chats', a.convs.filter((c) => c.ch === 'Chat'))} />
                      <WorkloadCell n={a.emails_open} tone="slate" onOpen={(e) => openConvPop(e, 'Emails', a.convs.filter((c) => c.ch === 'Email'))} />
                    </tr>
                  );
                })}
                {gridAgents.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-[var(--text-secondary)]">{snap ? 'No agents match.' : 'Loading…'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT SIDEBAR: Alert Feed (top) + Decline Activity (bottom) */}
        <div className="flex w-[320px] shrink-0 flex-col gap-3">
          {/* ALERT FEED */}
          <div className={panelClass('alerts', 'flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)]')}>
            <div className="flex items-center gap-2 border-b border-[var(--border-light)] px-3 py-2">
              <AlertTriangle size={15} className="text-rose-400" />
              <span className="text-sm font-bold">Alert Feed</span>
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-400">{alerts.length}</span>
              <span className="ml-auto"><ExpandBtn id="alerts" /></span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {alerts.length === 0 && (
                <div className="p-4 text-center text-xs text-[var(--text-secondary)]">
                  No alerts. Off-script actions (manual channel changes, self-unassigns) show here in real time. Declined/missed calls live in the Decline Activity feed below.
                </div>
              )}
              {alerts.map((ev) => {
                const meta = BEHAVIOR_META[ev.behavior] || { label: ev.behavior, icon: <AlertTriangle size={13} /> };
                return (
                  <div
                    key={ev.id}
                    onClick={() => anchorAgent(ev.teammate_name)}
                    title="Click to find this agent in the grid"
                    className="cursor-pointer border-b border-[var(--border-light)]/40 px-3 py-2 hover:bg-white/5"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-rose-400">{meta.icon}</span>
                      <span className="text-xs font-bold">{meta.label}</span>
                      <span className="ml-auto text-[11px] font-medium text-[var(--text-secondary)]">{fmtAgo(ev.at)}</span>
                    </div>
                    <div className="mt-0.5 truncate text-sm font-semibold">{ev.teammate_name || 'Unknown'}</div>
                    {ev.detail && <div className="text-xs text-[var(--text-secondary)]">{ev.detail}</div>}
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-medium text-[var(--text-secondary)]">
                      {ev.lob && <span>{lobLabel(ev.lob)}</span>}
                      {ev.conversation_id && <span>conv {ev.conversation_id}</span>}
                      <span>{ev.workload_calls ?? 0}c/{ev.workload_chats ?? 0}ch/{ev.workload_emails ?? 0}e</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DECLINE ACTIVITY (live ring/decline stream, mutable) */}
          <div className={panelClass('declines', 'flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)]')}>
            <div className="flex items-center gap-2 border-b border-[var(--border-light)] px-3 py-2">
              <PhoneIncoming size={15} className="text-amber-400" />
              <span className="text-sm font-bold">Decline Activity</span>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-400">{declines.length}</span>
              <button
                onClick={() => setDeclineMuted((m) => !m)}
                title={declineMuted ? 'Unmute decline activity' : 'Mute decline activity'}
                className={`ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition-colors ${
                  declineMuted ? 'bg-white/5 text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)] hover:bg-white/5'
                }`}
              >
                {declineMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                {declineMuted ? 'Muted' : 'Mute'}
              </button>
              <ExpandBtn id="declines" />
            </div>
            {declineMuted ? (
              <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-[var(--text-tertiary)]">
                Muted — still recording to the report. Unmute to watch the live ring/decline stream.
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                {declines.length === 0 && (
                  <div className="p-4 text-center text-xs text-[var(--text-secondary)]">
                    Calls declined/missed by an agent who had 0 chats open (i.e. they were free) stream here — conversation id + agent + time.
                  </div>
                )}
                {declines.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2 border-b border-[var(--border-light)]/40 px-3 py-1.5">
                    <span className="text-amber-400">
                      {ev.behavior === 'missed_call' ? <PhoneOff size={14} /> : <PhoneIncoming size={14} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{ev.teammate_name || 'Unknown'}</span>
                        <span className="rounded bg-white/10 px-1 text-[10px] font-bold uppercase text-[var(--text-secondary)]">{ev.behavior === 'missed_call' ? 'missed' : 'declined'}</span>
                        <span className="ml-auto shrink-0 text-[11px] font-medium text-[var(--text-secondary)]">{fmtAgo(ev.at)}</span>
                      </div>
                      <div className="truncate text-[11px] text-[var(--text-secondary)]">
                        {ev.conversation_id ? (
                          <a href={intercomConvUrl(appId, ev.conversation_id)} target="_blank" rel="noreferrer" className="text-brand-blue hover:underline" onClick={(e) => e.stopPropagation()}>
                            conv {ev.conversation_id}
                          </a>
                        ) : (
                          'conv —'
                        )}
                        {ev.lob ? ` · ${lobLabel(ev.lob)}` : ''}
                      </div>
                      <div className="text-[11px] font-medium text-[var(--text-tertiary)]">
                        workload {ev.workload_calls ?? 0}c/{ev.workload_chats ?? 0}ch/{ev.workload_emails ?? 0}e
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PICTURE-IN-PICTURE: compact, always-on-top live monitor (grid + queue) */}
      {pipWindow &&
        createPortal(
          <div className="flex h-screen w-screen flex-col gap-2 bg-[var(--bg-body)] p-2 font-sans text-sm text-[var(--text-primary)]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold">
              <span className="flex items-center gap-1 text-emerald-400"><Circle size={8} className="fill-current" />{presence.online}</span>
              <span className="text-amber-400">Away {presence.away}</span>
              <span className="text-slate-400">Off {presence.offline}</span>
              <span className="text-brand-blue">Calls {handling.Voice}</span>
              <span className="text-violet-400">Chats {handling.Chat}</span>
              <span className="ml-auto text-amber-400">{totalVoiceWait} voice</span>
              <span className="text-violet-400">{totalChatWait} chat</span>
              <span className="font-medium text-[var(--text-secondary)]">waiting</span>
              {overbreakCount > 0 && <span className="rounded bg-rose-500/15 px-1.5 text-rose-400">{overbreakCount} overbreak</span>}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {LOB_GROUPS.map((g) => {
                const q = queue[g.key] || { voice: 0, chat: 0, oldestWaitingAt: null };
                const wait = q.voice + q.chat;
                return (
                  <div key={g.key} className={`rounded-lg border bg-[var(--bg-card)] px-2 py-1 ${q.voice > 0 ? 'border-amber-500/40' : 'border-[var(--border-light)]'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{g.label}</span>
                      {wait > 0 && <span className="text-[11px] font-bold text-amber-400">{wait}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-[13px]">
                      <QueueNum icon={<Phone size={11} />} n={q.voice} convId={q.voiceConvId} appId={appId} />
                      <QueueNum icon={<MessageSquare size={11} />} n={q.chat} convId={q.chatConvId} appId={appId} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)]">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-[var(--bg-card)] text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
                  <tr className="border-b border-[var(--border-light)]">
                    <th className="px-2 py-1 text-left font-bold">Agent</th>
                    <th className="px-1 text-left font-bold">State</th>
                    <th className="px-1 text-left font-bold">Time</th>
                    <th className="px-1 text-left font-bold">LOB</th>
                    <th className="px-1 text-center font-bold"><Phone size={11} className="inline" /></th>
                    <th className="px-1 text-center font-bold"><MessageSquare size={11} className="inline" /></th>
                    <th className="px-1 text-center font-bold"><Mail size={11} className="inline" /></th>
                  </tr>
                </thead>
                <tbody>
                  {gridAgents.map((a) => {
                    const over = overbreakMins(a);
                    return (
                      <tr key={a.teammate_id} className={`border-b border-[var(--border-light)]/40 ${over ? 'animate-pulse bg-rose-500/10' : ''}`}>
                        <td className="max-w-[160px] truncate px-2 py-0.5 font-semibold">{a.name}</td>
                        <td className="px-1"><StateBadge presence={a.presence} reason={a.away_reason} /></td>
                        <td className={`px-1 ${over ? 'font-bold text-rose-400' : 'text-[var(--text-secondary)]'}`}>{a.away_since ? fmtAgo(a.away_since) : '—'}{over > 0 ? ` +${over}m` : ''}</td>
                        <td className="px-1 text-[var(--text-secondary)]">{lobLabel(a.lob)}</td>
                        <td className={`px-1 text-center font-bold ${a.calls_open > 0 ? 'text-brand-blue' : 'text-[var(--text-tertiary)]'}`}>{a.calls_open}</td>
                        <td className={`px-1 text-center font-bold ${a.chats_open > 0 ? 'text-violet-400' : 'text-[var(--text-tertiary)]'}`}>{a.chats_open}</td>
                        <td className={`px-1 text-center font-bold ${a.emails_open > 0 ? 'text-slate-300' : 'text-[var(--text-tertiary)]'}`}>{a.emails_open}</td>
                      </tr>
                    );
                  })}
                  {gridAgents.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-[var(--text-secondary)]">No agents.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>,
          pipWindow.document.body,
        )}

      {/* Conversation-id popover (deep links to Intercom + copy) */}
      {convPop && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setConvPop(null)} />
          <div
            className="fixed z-50 w-[280px] rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] p-2 shadow-2xl"
            style={{ left: convPop.x, top: convPop.y }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-bold">{convPop.label} · {convPop.convs.length}</span>
              <button onClick={() => setConvPop(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={13} /></button>
            </div>
            <div className="max-h-[260px] overflow-y-auto">
              {convPop.convs.map((c) => (
                <div key={c.id} className="flex items-center gap-1 py-0.5">
                  <a
                    href={intercomConvUrl(appId, c.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 truncate font-mono text-[12px] text-brand-blue hover:underline"
                    title="Open in Intercom"
                  >
                    {c.id}
                  </a>
                  <button title="Copy ID" onClick={() => navigator.clipboard?.writeText(c.id)} className="rounded p-1 text-[var(--text-secondary)] hover:bg-white/10"><Copy size={12} /></button>
                  <a href={intercomConvUrl(appId, c.id)} target="_blank" rel="noreferrer" title="Open in Intercom" className="rounded p-1 text-[var(--text-secondary)] hover:bg-white/10"><ExternalLink size={12} /></a>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ===== small presentational pieces =====
const TONE: Record<string, string> = {
  emerald: 'text-emerald-400', amber: 'text-amber-400', violet: 'text-violet-400',
  blue: 'text-brand-blue', slate: 'text-slate-400',
};

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
        <span className={TONE[tone]}>{icon}</span>
        {label}
      </div>
      <div className={`mt-0.5 text-2xl font-bold leading-none ${TONE[tone]}`}>{value}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
        active ? 'bg-brand-blue/25 text-brand-blue ring-1 ring-brand-blue/40' : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

function SortHeader({
  col, sort, onSort, className = '', children,
}: { col: SortCol; sort: { col: SortCol; dir: 'asc' | 'desc' }; onSort: (c: SortCol) => void; className?: string; children: React.ReactNode }) {
  const active = sort.col === col;
  return (
    <th className={`px-2 py-2 font-bold ${className}`}>
      <button onClick={() => onSort(col)} className={`inline-flex items-center gap-0.5 hover:text-[var(--text-primary)] ${active ? 'text-brand-blue' : ''} ${className.includes('center') ? 'justify-center' : ''}`}>
        {children}
        {active ? (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronsUpDown size={11} className="opacity-40" />}
      </button>
    </th>
  );
}

function StateBadge({ presence, reason }: { presence: string | null; reason: string | null }) {
  if (presence === 'online') return <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400"><Circle size={8} className="fill-current" />Online</span>;
  if (presence === 'away')
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-amber-400">
        <Circle size={8} className="fill-current" />
        <span className="max-w-[140px] truncate">{reason || 'Away'}</span>
      </span>
    );
  // offline — show the reason when it's informative (Done for the day, etc.)
  const showReason = reason && reason.trim().toLowerCase() !== 'away';
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-400">
      <Circle size={8} className="fill-current" />
      <span className="max-w-[140px] truncate">{showReason ? reason : 'Offline'}</span>
    </span>
  );
}

// A queue voice/chat count that links to the oldest waiting conversation's inbox.
function QueueNum({ icon, n, convId, appId }: { icon: React.ReactNode; n: number; convId?: string; appId: string }) {
  const cls = `flex items-center gap-1 font-bold ${n > 0 ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`;
  if (convId && appId) {
    return (
      <a href={`https://app.intercom.com/a/inbox/${appId}/inbox/conversation/${convId}`} target="_blank" rel="noreferrer" title="Open oldest waiting in Intercom" className={`${cls} hover:underline`}>
        {icon}{n}
      </a>
    );
  }
  return <span className={cls}>{icon}{n}</span>;
}

function WorkloadCell({ n, tone, onOpen }: { n: number; tone: string; onOpen: (e: React.MouseEvent) => void }) {
  if (n <= 0) return <td className="px-2 py-1.5 text-center text-[var(--text-tertiary)]">0</td>;
  return (
    <td className="px-2 py-1.5 text-center">
      <button onClick={onOpen} title="Show conversations" className={`font-bold underline-offset-2 hover:underline ${TONE[tone]}`}>
        {n}
      </button>
    </td>
  );
}
