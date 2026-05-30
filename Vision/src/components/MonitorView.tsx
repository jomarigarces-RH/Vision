"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import {
  Phone, MessageSquare, Mail, Users, Coffee, Circle, RefreshCw,
  AlertTriangle, Bell, BellOff, Search, Clock, PhoneOff, UserMinus, Repeat,
  X, ChevronUp, ChevronDown, ChevronsUpDown, Volume2, VolumeX, PhoneIncoming,
  Maximize2, Minimize2,
} from 'lucide-react';

// ===== TYPES (mirror src/lib/monitor.ts snapshot payload) =====
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
};
type QueueGroup = { voice: number; chat: number; oldestWaitingAt: string | null };
type MonitorSnapshot = {
  generatedAt: string;
  agents: MonitorAgent[];
  queue: Record<string, QueueGroup>;
  handling: { Voice: number; Chat: number };
  emailBacklog: number;
  presence: { online: number; away: number; offline: number };
  awayBreakdown: [string, number][];
  counts: { agents: number; liveConversations: number };
};
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

type SortCol = 'agent' | 'state' | 'lob' | 'channel' | 'calls' | 'chats' | 'time';
const PRES_RANK: Record<string, number> = { online: 0, away: 1, offline: 2 };
// ms the agent has been in their current state (from away_since); -1 if unknown.
const stateMs = (a: { away_since: string | null }) => (a.away_since ? Date.now() - new Date(a.away_since).getTime() : -1);

const POLL_MS = 45 * 1000; // matches the server snapshot TTL
const BEHAVIOR_POLL_MS = 120 * 1000; // matches the behavior poller's server-side cache
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
};

export default function MonitorView() {
  const isVisible = usePageVisibility();
  const [snap, setSnap] = useState<MonitorSnapshot | null>(null);
  const [alerts, setAlerts] = useState<BehaviorEvent[]>([]);
  const [declines, setDeclines] = useState<BehaviorEvent[]>([]);
  const [declineMuted, setDeclineMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notify, setNotify] = useState(false);
  const [expanded, setExpanded] = useState<null | 'grid' | 'alerts' | 'declines'>(null);

  // grid filters (multi-select: empty set = all) + sort
  const [search, setSearch] = useState('');
  const [lobSel, setLobSel] = useState<Set<string>>(new Set());
  const [stateSel, setStateSel] = useState<Set<string>>(new Set());
  const [workOnly, setWorkOnly] = useState(false);
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
  };
  const filtersActive = search !== '' || lobSel.size > 0 || stateSel.size > 0 || workOnly;
  const toggleSort = (col: SortCol) =>
    setSort((s) => (s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: col === 'calls' || col === 'chats' || col === 'time' ? 'desc' : 'asc' }));

  const loadingRef = useRef(false);
  const alertIdsRef = useRef<Set<string>>(new Set());
  const declineIdsRef = useRef<Set<string>>(new Set());

  // ---- snapshot (heavy data) comes from Vercel, cached server-side ----------
  const loadSnapshot = useCallback(async (force = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/monitor/snapshot${force ? '?force=1' : ''}`);
      if (res.ok) setSnap(await res.json());
    } catch {
      /* keep last snapshot on screen */
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

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
    if (!isVisible) return;
    loadSnapshot();
    loadAlerts();
    loadDeclines();
    triggerBehaviorPoll();
    const snapInterval = setInterval(() => loadSnapshot(), POLL_MS);
    const behaviorInterval = setInterval(() => triggerBehaviorPoll(), BEHAVIOR_POLL_MS);
    const channel = supabase
      .channel('monitor-behavior')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'behavior_events' }, (p) => {
        const ev = p.new as BehaviorEvent;
        // live decline/miss stream
        if ((ev.behavior === 'declined_call' || ev.behavior === 'missed_call') && !declineIdsRef.current.has(ev.id)) {
          declineIdsRef.current.add(ev.id);
          setDeclines((prev) => [ev, ...prev].slice(0, 100));
        }
        // alert feed (+ optional browser notification) — excludes declines/misses
        const isDecline = ev.behavior === 'declined_call' || ev.behavior === 'missed_call';
        if (ev.is_alert && !isDecline && !alertIdsRef.current.has(ev.id)) {
          alertIdsRef.current.add(ev.id);
          setAlerts((prev) => [ev, ...prev].slice(0, 60));
          if (notify && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(`${BEHAVIOR_META[ev.behavior]?.label || 'Alert'} — ${ev.teammate_name || 'agent'}`, { body: ev.detail || '' });
          }
        }
      })
      .subscribe();
    return () => {
      clearInterval(snapInterval);
      clearInterval(behaviorInterval);
      supabase.removeChannel(channel);
    };
  }, [isVisible, loadSnapshot, loadAlerts, loadDeclines, triggerBehaviorPoll, notify]);

  const toggleNotify = async () => {
    if (!notify && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
    }
    setNotify((n) => !n);
  };

  const agents = snap?.agents ?? [];
  const handling = snap?.handling ?? { Voice: 0, Chat: 0 };
  const presence = snap?.presence ?? { online: 0, away: 0, offline: 0 };
  const queue = snap?.queue ?? {};
  const emailBacklog = snap?.emailBacklog ?? 0;
  const totalVoiceWait = Object.values(queue).reduce((n, g) => n + g.voice, 0);
  const totalChatWait = Object.values(queue).reduce((n, g) => n + g.chat, 0);
  const totalWork = handling.Voice + handling.Chat;

  const gridAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = agents
      .filter((a) => a.name)
      .filter((a) => !q || a.name!.toLowerCase().includes(q))
      .filter((a) => lobSel.size === 0 || lobSel.has(a.lob || 'null'))
      .filter((a) => stateSel.size === 0 || stateSel.has(a.presence))
      .filter((a) => !workOnly || a.calls_open + a.chats_open > 0);
    const dir = sort.dir === 'asc' ? 1 : -1;
    const cmp = (a: MonitorAgent, b: MonitorAgent): number => {
      switch (sort.col) {
        case 'agent': return dir * (a.name || '').localeCompare(b.name || '');
        case 'lob': return dir * lobLabel(a.lob).localeCompare(lobLabel(b.lob));
        case 'channel': return dir * (a.channel || '~').localeCompare(b.channel || '~');
        case 'calls': return dir * (a.calls_open - b.calls_open);
        case 'chats': return dir * (a.chats_open - b.chats_open);
        case 'time': return dir * (stateMs(a) - stateMs(b));
        case 'state':
        default: return dir * ((PRES_RANK[a.presence] ?? 3) - (PRES_RANK[b.presence] ?? 3) || (a.away_reason || '').localeCompare(b.away_reason || ''));
      }
    };
    // stable secondary sort by workload then name so ties are sensible
    return filtered.sort((a, b) => cmp(a, b) || b.calls_open + b.chats_open - (a.calls_open + a.chats_open) || (a.name || '').localeCompare(b.name || ''));
  }, [agents, search, lobSel, stateSel, workOnly, sort]);

  // Expand: the chosen panel becomes an overlay over the monitor area; others hide.
  const panelClass = (id: 'grid' | 'alerts' | 'declines', base: string) =>
    expanded === id
      ? 'absolute inset-0 z-30 flex flex-col rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] shadow-2xl'
      : expanded
      ? 'hidden'
      : base;
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
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {loading ? 'syncing…' : snap ? `updated ${fmtAgo(snap.generatedAt)} ago` : '—'}
          </span>
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
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1 text-base font-bold ${q.voice > 0 ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}>
                    <Phone size={13} />{q.voice}
                  </span>
                  <span className={`flex items-center gap-1 text-base font-bold ${q.chat > 0 ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}>
                    <MessageSquare size={13} />{q.chat}
                  </span>
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
                </tr>
              </thead>
              <tbody>
                {gridAgents.map((a) => (
                  <tr key={a.teammate_id} className="border-b border-[var(--border-light)]/40 hover:bg-white/5">
                    <td className="max-w-[170px] truncate px-3 py-1.5 font-semibold">{a.name}</td>
                    <td className="px-2 py-1.5"><StateBadge presence={a.presence} reason={a.away_reason} /></td>
                    <td className="px-2 py-1.5 font-medium text-[var(--text-secondary)]">{a.away_since ? fmtAgo(a.away_since) : '—'}</td>
                    <td className="px-2 py-1.5 text-[var(--text-secondary)]">{lobLabel(a.lob)}</td>
                    <td className="px-2 py-1.5">
                      {a.channel ? (
                        <span className="text-[var(--text-secondary)]">{channelLabel(a.channel)}</span>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">—</span>
                      )}
                      {a.channel_auto === false && <span title="Manually changed channel (off-script)" className="ml-1 text-amber-400">●</span>}
                    </td>
                    <Cell n={a.calls_open} tone="blue" />
                    <Cell n={a.chats_open} tone="violet" />
                  </tr>
                ))}
                {gridAgents.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-[var(--text-secondary)]">{snap ? 'No agents match.' : 'Loading…'}</td></tr>
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
                  <div key={ev.id} className="border-b border-[var(--border-light)]/40 px-3 py-2">
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
                        conv {ev.conversation_id || '—'}{ev.lob ? ` · ${lobLabel(ev.lob)}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
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

function Cell({ n, tone }: { n: number; tone: string }) {
  return (
    <td className="px-2 py-1.5 text-center">
      <span className={n > 0 ? `font-bold ${TONE[tone]}` : 'text-[var(--text-tertiary)]'}>{n}</span>
    </td>
  );
}
