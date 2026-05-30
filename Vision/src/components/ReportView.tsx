"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  PhoneOff, PhoneIncoming, UserMinus, Repeat, Clock, Search, RefreshCw,
  ChevronLeft, ChevronRight, Download, X,
} from 'lucide-react';

type BehaviorEvent = {
  id: string;
  teammate_name: string | null;
  lob: string | null;
  behavior: string;
  conversation_id: string | null;
  call_id: string | null;
  customer_name: string | null;
  workload_calls: number | null;
  workload_chats: number | null;
  workload_emails: number | null;
  is_alert: boolean | null;
  detail: string | null;
  at: string;
  date: string;
};

const LOB_GROUPS = [
  { key: 'support', label: 'Support' },
  { key: 'sales', label: 'Sales' },
  { key: 'specialty', label: 'Specialty' },
  { key: 'spanish', label: 'Spanish' },
  { key: 'null', label: 'Unrouted' },
] as const;
const lobLabel = (l: string | null) => (l ? LOB_GROUPS.find((g) => g.key === l)?.label || l : 'Unrouted');

const BEHAVIORS = [
  { key: 'declined_call', label: 'Declined', icon: <PhoneIncoming size={13} />, tone: 'text-amber-400' },
  { key: 'missed_call', label: 'Missed', icon: <PhoneOff size={13} />, tone: 'text-rose-400' },
  { key: 'unassigned', label: 'Unassigned', icon: <UserMinus size={13} />, tone: 'text-violet-400' },
  { key: 'channel_change', label: 'Channel chg', icon: <Repeat size={13} />, tone: 'text-blue-400' },
  { key: 'no_action_timeout', label: 'No action', icon: <Clock size={13} />, tone: 'text-slate-400' },
] as const;
const bmeta = (k: string) => BEHAVIORS.find((b) => b.key === k);

const pstToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(new Date(iso));

export default function ReportView() {
  const [date, setDate] = useState(() => pstToday());
  const [rows, setRows] = useState<BehaviorEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [search, setSearch] = useState('');
  const [behaviorSel, setBehaviorSel] = useState<Set<string>>(new Set());
  const [alertOnly, setAlertOnly] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('behavior_events')
        .select('*')
        .eq('date', date)
        .order('at', { ascending: false })
        .limit(5000);
      setRows((data as BehaviorEvent[]) || []);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pull the day's missed/declined calls from Intercom into behavior_events,
  // then refetch. (Unassign/channel events are webhook-fed and accumulate live.)
  const backfill = useCallback(async () => {
    setBackfilling(true);
    try {
      await fetch(`/api/monitor/behavior?date=${date}`);
      await fetchData();
    } finally {
      setBackfilling(false);
    }
  }, [date, fetchData]);

  const shiftDay = (delta: number) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    setDate(new Intl.DateTimeFormat('en-CA').format(d));
  };
  const toggleBehavior = (k: string) =>
    setBehaviorSel((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  const filtersActive = search !== '' || behaviorSel.size > 0 || alertOnly;
  const clearFilters = () => {
    setSearch('');
    setBehaviorSel(new Set());
    setAlertOnly(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => !q || (r.teammate_name || '').toLowerCase().includes(q) || (r.conversation_id || '').includes(q))
      .filter((r) => behaviorSel.size === 0 || behaviorSel.has(r.behavior))
      .filter((r) => !alertOnly || r.is_alert);
  }, [rows, search, behaviorSel, alertOnly]);

  // pagination — reset to page 0 whenever the filtered set changes shape
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    setPage(0);
  }, [search, behaviorSel, alertOnly, date]);
  const safePage = Math.min(page, pageCount - 1);
  const paged = useMemo(() => filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE), [filtered, safePage]);

  // counts for the summary + LOB matrix (from the filtered set)
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const r of filtered) t[r.behavior] = (t[r.behavior] || 0) + 1;
    return t;
  }, [filtered]);
  const alertCount = useMemo(() => filtered.filter((r) => r.is_alert).length, [filtered]);

  const lobMatrix = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    for (const g of LOB_GROUPS) m[g.key] = {};
    for (const r of filtered) {
      const k = r.lob || 'null';
      (m[k] ||= {})[r.behavior] = (m[k][r.behavior] || 0) + 1;
    }
    return m;
  }, [filtered]);

  const exportCsv = () => {
    const head = ['Time (PST)', 'Agent', 'Behavior', 'LOB', 'Contact ID', 'Call ID', 'Customer', 'Calls', 'Chats', 'Emails', 'Alert', 'Detail'];
    const lines = filtered.map((r) =>
      [fmtTime(r.at), r.teammate_name, bmeta(r.behavior)?.label || r.behavior, lobLabel(r.lob), r.conversation_id, r.call_id, r.customer_name, r.workload_calls, r.workload_chats, r.workload_emails, r.is_alert ? 'YES' : '', r.detail]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `behavior-report-${date}.csv`;
    a.click();
  };

  return (
    <div className="flex h-full flex-col gap-3 p-3 sm:p-4 text-[var(--text-primary)]">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold tracking-tight">Behavior Report</h2>
          <span className="text-xs font-medium text-[var(--text-secondary)]">{loading ? 'loading…' : `${filtered.length} events`}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-white/5 p-0.5">
            <button onClick={() => shiftDay(-1)} className="rounded p-1 hover:bg-white/10"><ChevronLeft size={16} /></button>
            <input
              type="date"
              value={date}
              max={pstToday()}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent px-1 text-sm font-semibold outline-none [color-scheme:dark]"
            />
            <button onClick={() => shiftDay(1)} disabled={date >= pstToday()} className="rounded p-1 hover:bg-white/10 disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
          <button onClick={backfill} disabled={backfilling} className="flex items-center gap-1.5 rounded-lg bg-brand-blue/10 px-3 py-1.5 text-xs font-bold text-brand-blue hover:bg-brand-blue/20 disabled:opacity-50">
            <RefreshCw size={14} className={backfilling ? 'animate-spin' : ''} /> Load calls
          </button>
          <button onClick={exportCsv} disabled={!filtered.length} className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-white/10 disabled:opacity-40">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {BEHAVIORS.map((b) => (
          <button
            key={b.key}
            onClick={() => toggleBehavior(b.key)}
            className={`rounded-xl border bg-[var(--bg-card)] px-3 py-2 text-left transition-colors ${
              behaviorSel.has(b.key) ? 'border-brand-blue/60 ring-1 ring-brand-blue/40' : 'border-[var(--border-light)] hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
              <span className={b.tone}>{b.icon}</span>
              {b.label}
            </div>
            <div className={`mt-0.5 text-2xl font-bold leading-none ${b.tone}`}>{totals[b.key] || 0}</div>
          </button>
        ))}
        <button
          onClick={() => setAlertOnly((a) => !a)}
          className={`rounded-xl border bg-[var(--bg-card)] px-3 py-2 text-left transition-colors ${alertOnly ? 'border-rose-500/60 ring-1 ring-rose-500/40' : 'border-[var(--border-light)] hover:border-white/20'}`}
        >
          <div className="text-xs font-semibold text-[var(--text-secondary)]">Off-script alerts</div>
          <div className="mt-0.5 text-2xl font-bold leading-none text-rose-400">{alertCount}</div>
        </button>
      </div>

      {/* LOB MATRIX */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {LOB_GROUPS.map((g) => {
          const row = lobMatrix[g.key] || {};
          const total = Object.values(row).reduce((a, b) => a + b, 0);
          return (
            <div key={g.key} className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-bold">{g.label}</span>
                <span className="text-sm font-bold text-[var(--text-secondary)]">{total}</span>
              </div>
              <div className="space-y-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                {BEHAVIORS.filter((b) => row[b.key]).map((b) => (
                  <div key={b.key} className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><span className={b.tone}>{b.icon}</span>{b.label}</span>
                    <span className="font-bold">{row[b.key]}</span>
                  </div>
                ))}
                {!total && <span className="text-[var(--text-tertiary)]">—</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* TABLE */}
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-light)] p-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agent or Contact ID…"
              className="w-full rounded-lg bg-white/5 py-1.5 pl-8 pr-2 text-sm outline-none placeholder:text-[var(--text-tertiary)] focus:bg-white/10"
            />
          </div>
          {filtersActive && (
            <button onClick={clearFilters} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10">
              <X size={13} /> Clear
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--bg-card)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
              <tr className="border-b border-[var(--border-light)]">
                <th className="px-3 py-2 text-left font-bold">Time</th>
                <th className="px-2 py-2 text-left font-bold">Agent</th>
                <th className="px-2 py-2 text-left font-bold">Behavior</th>
                <th className="px-2 py-2 text-left font-bold">LOB</th>
                <th className="px-2 py-2 text-left font-bold">Contact ID</th>
                <th className="px-2 py-2 text-left font-bold">Workload</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r) => {
                const m = bmeta(r.behavior);
                return (
                  <tr key={r.id} className={`border-b border-[var(--border-light)]/40 hover:bg-white/5 ${r.is_alert ? 'bg-rose-500/5' : ''}`}>
                    <td className="whitespace-nowrap px-3 py-1.5 font-medium text-[var(--text-secondary)]">{fmtTime(r.at)}</td>
                    <td className="max-w-[160px] truncate px-2 py-1.5 font-semibold">{r.teammate_name || '—'}</td>
                    <td className="px-2 py-1.5">
                      <span className={`inline-flex items-center gap-1 font-semibold ${m?.tone || ''}`}>
                        {m?.icon}{m?.label || r.behavior}
                        {r.is_alert && <span className="ml-1 rounded bg-rose-500/15 px-1 text-[10px] font-bold text-rose-400">alert</span>}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-[var(--text-secondary)]">{lobLabel(r.lob)}</td>
                    <td className="px-2 py-1.5 font-mono text-[12px] text-[var(--text-secondary)]">{r.conversation_id || '—'}</td>
                    <td className="px-2 py-1.5 text-[var(--text-secondary)]">{r.workload_calls ?? 0}c/{r.workload_chats ?? 0}ch/{r.workload_emails ?? 0}e</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-[var(--text-secondary)]">
                    {loading ? 'Loading…' : rows.length === 0 ? 'No events for this day yet. Click "Load calls" to pull missed/declined calls from Intercom.' : 'No events match the filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-2 border-t border-[var(--border-light)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)]">
            <span>
              {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(0)} disabled={safePage === 0} className="rounded px-2 py-1 hover:bg-white/10 disabled:opacity-30">« First</button>
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} className="flex items-center rounded px-2 py-1 hover:bg-white/10 disabled:opacity-30"><ChevronLeft size={14} /> Prev</button>
              <span className="px-2 font-bold text-[var(--text-primary)]">Page {safePage + 1} / {pageCount}</span>
              <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1} className="flex items-center rounded px-2 py-1 hover:bg-white/10 disabled:opacity-30">Next <ChevronRight size={14} /></button>
              <button onClick={() => setPage(pageCount - 1)} disabled={safePage >= pageCount - 1} className="rounded px-2 py-1 hover:bg-white/10 disabled:opacity-30">Last »</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
