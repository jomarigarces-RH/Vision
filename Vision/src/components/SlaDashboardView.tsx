"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { 
  Activity, Users, Clock, MessageSquare, Phone, 
  CheckCircle2, AlertCircle, Settings, Mail, ChevronDown,
  TrendingDown, RefreshCw, BarChart3, X, Camera, Copy,
  Download, Calendar, ChevronLeft, ChevronRight, Zap
} from 'lucide-react';

// ===== TYPES =====
type ChannelData = {
  inbound: string; abandoned: string; absenteeism: string; absentCount: number;
  sla: string; status: 'passed' | 'failed' | 'warning'; frt: string; aht: string;
  outbound: string; missed: string; inQueue: string; aat?: string; holdTime?: string;
  abandonRate: string;
};
type LOBData = { title: string; chat: ChannelData; voice: ChannelData };
type OpsLogSection = { applicable: boolean; selected: string[]; custom: string; showCustom: boolean };

// ===== PRESETS =====
const OPS_LOG_PRESETS = {
  mitigations: [
    'Offered Restday Overtime/ Pre or Post Shift Overtime',
    'Break Schedule Adjustments',
    'IT Ticket Created',
    'Crossskilled agents as a counteract on a increasing abandoned rates',
    'Cancelled offline activities',
    'Movements has been posted to WFM_callout channel'
  ],
  causes: [
    'Power Outage',
    'Work Interruption (Emergency)',
    'System issues',
    'Unexpected high call volume during overnight',
    'Unexpected high call volume'
  ]
};

const DEFAULT_CHANNEL: ChannelData = {
  inbound: '0', abandoned: '0', absenteeism: '0%', absentCount: 0,
  sla: '100.00%', status: 'passed', frt: '0s', aht: '0s',
  outbound: '0', missed: '0', inQueue: '0s', aat: '0s', holdTime: '0s',
  abandonRate: '0.0%'
};

// ===== MAIN COMPONENT =====
export default function SlaDashboardView() {
  const isVisible = usePageVisibility();
  const [activeTab, setActiveTab] = useState('overview');
  const [cpOpen, setCpOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDark] = useState(true);
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: '', show: false });

  // Date state
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [calSelecting, setCalSelecting] = useState<'from' | 'to'>('from');
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());

  // SLA Thresholds
  const [slaTargets, setSlaTargets] = useState({ voice: 80, chat: 80 });

  // Data
  const [globalAbsent, setGlobalAbsent] = useState({ pct: '0%', count: 0 });
  const [ops, setOps] = useState<Record<string, LOBData>>({
    support: { title: 'Support Operations', chat: { ...DEFAULT_CHANNEL }, voice: { ...DEFAULT_CHANNEL } },
    sales: { title: 'Sales Operations', chat: { ...DEFAULT_CHANNEL }, voice: { ...DEFAULT_CHANNEL } },
    serviceRecovery: { title: 'Service Recovery', chat: { ...DEFAULT_CHANNEL }, voice: { ...DEFAULT_CHANNEL } },
  });
  const [emailData, setEmailData] = useState({ closed: 0, assigned: 0, replied: 0, sent: 0, topAgents: [] as { name: string; count: number }[] });
  const [opsLog, setOpsLog] = useState<Record<string, OpsLogSection>>({
    mitigations: { applicable: false, selected: [], custom: '', showCustom: false },
    causes: { applicable: false, selected: [], custom: '', showCustom: false },
    keynotes: { applicable: false, selected: [], custom: '', showCustom: false },
  });
  const [dataHealth, setDataHealth] = useState<'good' | 'issue' | 'critical'>('good');

  // Helpers
  const fmtDate = (s: string) => {
    if (!s) return '—';
    const [y, m, d] = s.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[m - 1]} ${d}, ${y}`;
  };
  const parsePct = (v: string) => parseFloat(String(v).replace('%', '')) || 0;
  const showToastMsg = (msg: string) => { setToast({ msg, show: true }); setTimeout(() => setToast({ msg: '', show: false }), 3500); };
  const getTimeStr = () => {
    const now = new Date();
    const h = now.toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: true });
    return `Time of Report: ${h.split(':')[0]}:00 ${h.includes('PM') ? 'PM' : 'AM'} PST`;
  };

  // Real Data Fetching
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: metrics, error: metricsErr } = await supabase
        .from('ops_metrics')
        .select('*')
        .eq('date', endDate);

      if (metricsErr) throw metricsErr;

      setOps(prev => {
        const next = { ...prev };
        metrics?.forEach(m => {
          const dept = (m.department || '').toLowerCase();
          const lobKey = dept.includes('sales') ? 'sales' : 
                         dept.includes('recovery') ? 'serviceRecovery' : 'support';
          const channelKey = m.channel === 'Chat' ? 'chat' : 'voice';
          const inbound = m.inbound_count || 0;
          const abandoned = m.abandoned_count || 0;
          const abandonRate = inbound > 0 ? ((abandoned / inbound) * 100).toFixed(1) + '%' : '0.0%';
          const slaVal = m.sla_percent || (inbound > 0 ? (m.passed_count / inbound * 100) : 100);
          const target = channelKey === 'chat' ? slaTargets.chat : slaTargets.voice;
          
          next[lobKey][channelKey] = {
            ...next[lobKey][channelKey],
            inbound: String(inbound),
            abandoned: String(abandoned),
            abandonRate: abandonRate,
            sla: slaVal.toFixed(2) + '%',
            status: slaVal >= target ? 'passed' : 'failed',
            frt: (m.frt_seconds || 0) + 's',
            aht: (m.handle_seconds || 0) + 's',
            inQueue: (m.wait_seconds || 0) + 's'
          };
        });
        return next;
      });

      const { data: absData } = await supabase.from('absenteeism').select('*').eq('date', endDate).maybeSingle();
      if (absData) setGlobalAbsent({ pct: absData.rate + '%', count: absData.absent_count });

      const { data: eData } = await supabase.from('email_productivity').select('*').eq('date', endDate).maybeSingle();
      if (eData) setEmailData({ closed: eData.closed_count, assigned: eData.assigned_count, replied: eData.replied_count, sent: eData.sent_count, topAgents: (eData.top_agents as any) || [] });

      const { data: logs } = await supabase.from('ops_log').select('*').eq('date', endDate);
      if (logs) {
        setOpsLog(prev => {
          const next = { ...prev };
          logs.forEach(l => {
            const key = l.type.toLowerCase();
            if (next[key]) next[key] = { applicable: true, selected: l.selected_items || [], custom: l.custom_notes || '', showCustom: !!l.custom_notes };
          });
          return next;
        });
      }
      setDataHealth('good');
    } catch (err: any) {
      console.error('Fetch Error:', err.message);
      setDataHealth('issue');
    } finally {
      setLoading(false);
    }
  }, [endDate, slaTargets]);

  const syncIntercom = useCallback(async () => {
    // Only sync if looking at Today
    const today = new Date().toISOString().split('T')[0];
    if (endDate !== today) return;

    try {
      setLoading(true);
      const res = await fetch('/api/intercom/sync', { method: 'POST' });
      if (res.ok) {
        showToastMsg('Intercom metrics synced successfully!');
        // No need to call fetchData() because Realtime listener will handle it!
      }
    } catch (err) {
      console.error('Sync Error:', err);
    } finally {
      setLoading(false);
    }
  }, [endDate]);

  // Initial Fetch & Realtime - Visibility Aware
  useEffect(() => {
    if (!isVisible) return;

    // Trigger sync on load
    syncIntercom();
    fetchData();
    
    // Auto-sync every 5 minutes
    const syncInterval = setInterval(() => syncIntercom(), 5 * 60 * 1000);

    console.log('SLA Dashboard: Subscribing to Realtime (Page Visible)');
    const channel = supabase
      .channel('sla-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_metrics' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absenteeism' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_log' }, () => fetchData())
      .subscribe();
      
    return () => { 
      console.log('SLA Dashboard: Unsubscribing (Tab Hidden or Unmount)');
      clearInterval(syncInterval);
      supabase.removeChannel(channel); 
    };
  }, [fetchData, syncIntercom, isVisible]);

  // UI Handlers
  const togglePreset = (field: string, preset: string) => {
    setOpsLog(prev => {
      const section = { ...prev[field] };
      const idx = section.selected.indexOf(preset);
      if (idx === -1) section.selected = [...section.selected, preset];
      else section.selected = section.selected.filter(s => s !== preset);
      return { ...prev, [field]: section };
    });
  };

  const setPreset = (type: string) => {
    const t = new Date();
    const ds = (dt: Date) => dt.toISOString().split('T')[0];
    switch (type) {
      case 'today': setStartDate(ds(t)); setEndDate(ds(t)); break;
      case 'yesterday': { const yd = new Date(); yd.setDate(yd.getDate() - 1); setStartDate(ds(yd)); setEndDate(ds(yd)); break; }
      case 'thisWeek': { const ws = new Date(); ws.setDate(ws.getDate() - ws.getDay()); setStartDate(ds(ws)); setEndDate(ds(t)); break; }
      case 'lastWeek': { const lws = new Date(); lws.setDate(lws.getDate() - lws.getDay() - 7); const lwe = new Date(); lwe.setDate(lwe.getDate() - lws.getDay() - 1); setStartDate(ds(lws)); setEndDate(ds(lwe)); break; }
      case 'thisMonth': { const ms = new Date(); ms.setDate(1); setStartDate(ds(ms)); setEndDate(ds(t)); break; }
    }
  };

  // Calendar pick
  const calPick = (ds: string) => {
    if (calSelecting === 'from') {
      setStartDate(ds);
      if (endDate < ds) setEndDate(ds);
      setCalSelecting('to');
    } else {
      if (ds < startDate) setStartDate(ds);
      else setEndDate(ds);
      setCalSelecting('from');
    }
  };

  return (
    <div className="flex-1 bg-[#0a0a0a] text-[#f0f0f0] font-[Inter,sans-serif] overflow-y-auto hide-scrollbar text-[14px] relative">
      {/* TOAST */}
      <div className={`fixed bottom-6 right-6 z-[300] px-4 py-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-[#d0d0d0] text-[0.82rem] font-semibold flex items-center gap-2 transition-all duration-300 ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2.5 pointer-events-none'}`}>
        <CheckCircle2 size={16} className="text-[#10b981] shrink-0" />
        {toast.msg}
      </div>

      <div className="max-w-[1400px] mx-auto p-5 pb-10">
        {/* ===== HEADER ===== */}
        <header className="flex flex-wrap justify-between items-start gap-4 mb-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[1.6rem] font-extrabold tracking-[-0.03em] flex items-center gap-2 cursor-pointer group">
              Intercom SLA Report
              <RefreshCw size={18} onClick={() => syncIntercom()} className={`text-[#4f7df3] transition-all duration-500 ${loading ? 'rotate-180 opacity-50' : 'opacity-100'}`} />
            </h1>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[0.78rem] text-[#a0a0a0] font-medium">Real-time Operations & Workforce Metrics</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#a0a0a0] text-[0.75rem] font-bold">
                <Clock size={12} /> {getTimeStr()}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all select-none border-[#10b981] bg-[#10b981]/10`}>
              <div className={`w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981] animate-pulse`} />
              <span className={`text-[0.65rem] font-extrabold text-[#10b981] tracking-widest`}>REALTIME CONNECTED</span>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[0.7rem] font-extrabold cursor-pointer transition-transform hover:scale-105 ${dataHealth === 'good' ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]' : dataHealth === 'issue' ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]' : 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'}`}>
              <CheckCircle2 size={14} />
              <span>{dataHealth === 'good' ? 'Data Healthy' : dataHealth === 'issue' ? 'Data Issues' : 'Critical'}</span>
            </div>
            <button onClick={() => setCpOpen(true)} className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#ccc] text-[0.75rem] font-bold hover:border-[#4f7df3] hover:text-[#4f7df3] transition-all cursor-pointer">
              <Settings size={14} />
              <span>Control Panel</span>
            </button>
          </div>
        </header>

        {/* ===== TABS & GLOBAL ABSENTEEISM ===== */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <div className="flex p-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-[30px] gap-0.5">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'support', label: 'Support' },
              { key: 'sales', label: 'Sales' },
              { key: 'serviceRecovery', label: 'Service Recovery' },
              { key: 'weekly', label: '📊 Weekly' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-3xl text-[0.78rem] font-bold transition-all cursor-pointer ${activeTab === tab.key ? 'bg-[#2a2a2a] text-white shadow-lg' : 'text-[#a0a0a0] hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3.5 px-4.5 py-2 rounded-[30px] bg-[#1a1a1a] border border-[#2a2a2a]">
            <div className="flex items-center gap-1.5 text-[0.72rem] font-bold text-[#a0a0a0] uppercase tracking-widest">
              <Activity size={16} /> Global Absenteeism
            </div>
            <span className="text-[1.1rem] font-black">{globalAbsent.pct}</span>
            <span className="text-[0.7rem] font-extrabold px-2.5 py-0.5 rounded-lg bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20">
              {globalAbsent.count} Absent
            </span>
          </div>
        </div>

        {/* ===== CONTENT PANELS ===== */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Consolidated Summary Table */}
            <div className="bg-[#141414] border border-[#222] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2a2a2a]">
                <h2 className="text-[0.75rem] font-extrabold uppercase tracking-[0.06em] text-[#a0a0a0]">Operations Summary (Consolidated)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      {['LOB', 'Voice In', 'Voice SLA', 'Aband.', 'Chat In', 'Chat SLA', 'FRT'].map(h => (
                        <th key={h} className="p-3 text-[0.65rem] font-extrabold uppercase tracking-widest text-[#555] border-b-2 border-[#2a2a2a]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(ops).map(([key, d]) => (
                      <tr key={key} className="hover:bg-[#4f7df3]/5 transition-colors border-b border-[#2a2a2a]">
                        <td className="p-3 text-[0.85rem] font-extrabold text-[#a0a0a0]">{d.title.split(' ')[0]}</td>
                        <td className="p-3 text-[0.85rem] font-bold">{d.voice.inbound}</td>
                        <td className={`p-3 text-[0.85rem] font-black ${parsePct(d.voice.sla) < slaTargets.voice ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>{d.voice.sla}</td>
                        <td className="p-3 text-[0.85rem] font-bold text-amber-500">{d.voice.abandonRate}</td>
                        <td className="p-3 text-[0.85rem] font-bold">{d.chat.inbound}</td>
                        <td className={`p-3 text-[0.85rem] font-black ${parsePct(d.chat.sla) < slaTargets.chat ? 'text-[#ef4444]' : 'text-[#6366f1]'}`}>{d.chat.sla}</td>
                        <td className="p-3 text-[0.75rem] font-bold opacity-60 text-brand-blue">{d.chat.frt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Three Column LOB Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {Object.entries(ops).map(([key, d]) => (
                <LOBGroupCard key={key} data={d} slaTargets={slaTargets} />
              ))}
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Email */}
              <div className="lg:col-span-3 bg-[#141414] border border-[#222] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
                <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
                  <Mail size={14} className="text-[#4f7df3]" />
                  <h2 className="text-[0.75rem] font-extrabold uppercase tracking-[0.06em] text-[#a0a0a0]">Resident Home – Email Productivity</h2>
                </div>
                <div className="p-4 flex flex-wrap gap-5">
                  <div className="grid grid-cols-2 gap-2.5 flex-[3] min-w-[180px]">
                    <EmailStat label="Total Closed" value={emailData.closed} cls="blue" />
                    <EmailStat label="Total Assigned" value={emailData.assigned} cls="indigo" />
                    <EmailStat label="Total Replied" value={emailData.replied} cls="green" />
                    <EmailStat label="Replies Sent" value={emailData.sent} cls="purple" />
                  </div>
                  <div className="flex-[2] border-l border-[#2a2a2a] pl-5 min-w-[160px]">
                    <div className="text-[0.7rem] font-extrabold uppercase tracking-widest text-[#a0a0a0] mb-2.5 flex items-center gap-1.5">
                      <BarChart3 size={12} /> Top 5 Agents
                    </div>
                    {emailData.topAgents.length > 0 ? (
                      <div className="space-y-1.5">
                        {emailData.topAgents.map((a, i) => (
                          <div key={i} className="flex items-center justify-between p-1.5 px-2 rounded-md border border-[#2a2a2a] bg-white/[0.02]">
                            <span className="text-[0.68rem] font-bold text-[#555] w-4">{i + 1}.</span>
                            <span className="text-[0.78rem] font-semibold flex-1 px-1.5">{a.name}</span>
                            <span className="text-[0.75rem] font-extrabold px-1.5 py-0.5 rounded border border-[#2a2a2a] bg-[#1a1a1a]">{a.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[0.68rem] italic text-[#555]">No data yet.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ops Log */}
              <div className="lg:col-span-2 bg-[#141414] border border-[#222] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
                <div className="px-4 py-3 border-b border-[#2a2a2a] flex justify-between items-center">
                  <h2 className="text-[0.75rem] font-extrabold uppercase tracking-[0.06em] text-[#a0a0a0]">Shift Operations Log</h2>
                  <span className="text-[8px] font-black px-2 py-0.5 bg-white/5 rounded border border-white/10 text-white/30 tracking-widest uppercase">WFM Notes</span>
                </div>
                <div className="p-4 space-y-4">
                  {opsLog.mitigations.applicable && (
                    <LogSection label="Mitigations made:" dotColor="bg-[#f59e0b]" items={opsLog.mitigations.selected} custom={opsLog.mitigations.custom} />
                  )}
                  {opsLog.causes.applicable && (
                    <LogSection label="Causes of High Abandonment:" dotColor="bg-[#ef4444]" items={opsLog.causes.selected} custom={opsLog.causes.custom} />
                  )}
                  {opsLog.keynotes.applicable && (
                    <LogSection label="Keynotes:" dotColor="bg-[#10b981]" items={opsLog.keynotes.selected} custom={opsLog.keynotes.custom} />
                  )}
                  {!opsLog.mitigations.applicable && !opsLog.causes.applicable && !opsLog.keynotes.applicable && (
                    <div className="flex flex-col items-center justify-center text-center py-6">
                      <div className="w-10 h-10 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center mb-2.5">
                        <CheckCircle2 size={20} className="text-[#10b981]" />
                      </div>
                      <div className="text-[0.9rem] font-extrabold text-[#10b981] uppercase tracking-widest mb-1">Casual Business</div>
                      <div className="text-[0.72rem] text-[#a0a0a0] max-w-[280px] leading-relaxed">All systems normal.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detail Views */}
        {(['support', 'sales', 'serviceRecovery'] as const).map(lobKey => (
          activeTab === lobKey && (
            <DetailView key={lobKey} title={ops[lobKey].title} data={ops[lobKey]} slaTargets={slaTargets} />
          )
        ))}

        {activeTab === 'weekly' && (
          <div className="bg-[#141414] border border-[#222] rounded-2xl p-8 text-center text-[0.78rem] text-[#555] italic">
            Weekly timeline data visualization coming soon.
          </div>
        )}
      </div>

      {/* ===== CONTROL PANEL SIDEBAR ===== */}
      <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[99] transition-opacity ${cpOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setCpOpen(false)} />
      <aside className={`fixed top-0 bottom-0 w-[450px] bg-[#141414] border-l border-[#222] z-[100] flex flex-col transition-all duration-[300ms] ${cpOpen ? 'right-0' : '-right-[460px]'}`}>
        <div className="flex justify-between items-center px-5 py-4 border-b border-[#222] sticky top-0 bg-[#141414] z-10">
          <div className="flex items-center gap-2 text-[0.88rem] font-bold text-[#f0f0f0]">
            <Settings size={16} /> Control Panel
          </div>
          <button onClick={() => setCpOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#a0a0a0] hover:bg-[#2a2a2a] hover:text-white transition-all cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-6 hide-scrollbar">
          {/* DATE RANGE */}
          <CPSection title="Date Range">
            <div className="flex flex-wrap gap-1 mb-3">
              {[['today', 'Today'], ['yesterday', 'Yesterday'], ['thisWeek', 'This Week'], ['lastWeek', 'Last Week'], ['thisMonth', 'This Month']].map(([k, l]) => (
                <button key={k} onClick={() => setPreset(k)} className="px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-[0.68rem] font-bold text-[#a0a0a0] hover:border-[#4f7df3] hover:text-[#4f7df3] transition-all cursor-pointer">{l}</button>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              <div onClick={() => setCalSelecting('from')} className={`flex-1 p-2 px-2.5 rounded-lg border cursor-pointer transition-all ${calSelecting === 'from' ? 'border-[#4f7df3] bg-[#4f7df3]/5' : 'border-[#2a2a2a]'}`}>
                <div className="text-[0.6rem] font-extrabold uppercase tracking-widest text-[#4f7df3] mb-0.5">From</div>
                <div className="text-[0.78rem] font-bold">{fmtDate(startDate)}</div>
              </div>
              <div onClick={() => setCalSelecting('to')} className={`flex-1 p-2 px-2.5 rounded-lg border cursor-pointer transition-all ${calSelecting === 'to' ? 'border-[#4f7df3] bg-[#4f7df3]/5' : 'border-[#2a2a2a]'}`}>
                <div className="text-[0.6rem] font-extrabold uppercase tracking-widest text-[#4f7df3] mb-0.5">To</div>
                <div className="text-[0.78rem] font-bold">{fmtDate(endDate)}</div>
              </div>
            </div>
            <MiniCalendar year={calYear} month={calMonth} startDate={startDate} endDate={endDate} onPick={calPick} onPrev={() => { setCalMonth(p => p === 0 ? 11 : p - 1); if (calMonth === 0) setCalYear(p => p - 1); }} onNext={() => { setCalMonth(p => p === 11 ? 0 : p + 1); if (calMonth === 11) setCalYear(p => p + 1); }} />
            <button onClick={() => fetchData()} className="w-full mt-3 py-2.5 rounded-lg bg-[#4f7df3] text-white text-[0.75rem] font-bold flex items-center justify-center gap-2 hover:opacity-85 cursor-pointer">
              <Download size={13} /> Update Dashboard
            </button>
          </CPSection>

          {/* DASHBOARD VIEW */}
          <CPSection title="Dashboard View">
            <div className="flex flex-wrap gap-1">
              {[['overview', 'Overview'], ['support', 'Support'], ['sales', 'Sales'], ['serviceRecovery', 'Service Recovery'], ['weekly', '📊 Weekly']].map(([k, l]) => (
                <button key={k} onClick={() => { setActiveTab(k); setCpOpen(false); }} className={`px-4 py-2 rounded-lg border text-[0.7rem] font-bold transition-all cursor-pointer ${activeTab === k ? 'bg-[#4f7df3]/10 text-[#4f7df3] border-[#4f7df3]' : 'text-[#a0a0a0] border-[#2a2a2a]'}`}>{l}</button>
              ))}
            </div>
          </CPSection>

          {/* SLA THRESHOLDS */}
          <CPSection title="SLA High-Target Thresholds (%)">
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[0.65rem] font-semibold text-[#555]">Voice Target</label><input type="number" value={slaTargets.voice} onChange={e => setSlaTargets(p => ({ ...p, voice: Number(e.target.value) || 0 }))} className="w-full mt-1 px-2 py-1.5 rounded-md border border-[#2a2a2a] bg-[#0f0f0f] text-[0.78rem] outline-none" /></div>
              <div><label className="text-[0.65rem] font-semibold text-[#555]">Chat Target</label><input type="number" value={slaTargets.chat} onChange={e => setSlaTargets(p => ({ ...p, chat: Number(e.target.value) || 0 }))} className="w-full mt-1 px-2 py-1.5 rounded-md border border-[#2a2a2a] bg-[#0f0f0f] text-[0.78rem] outline-none" /></div>
            </div>
          </CPSection>

          {/* OPS LOG */}
          <CPSection title="Shift Operations Log">
            {[
              { key: 'mitigations', dot: 'bg-[#f59e0b]', title: 'Mitigations Made' },
              { key: 'causes', dot: 'bg-[#ef4444]', title: 'Causes of High Abandoned Rates' },
              { key: 'keynotes', dot: 'bg-[#10b981]', title: 'Keynotes' },
            ].map(f => (
              <div key={f.key} className="mb-4 pb-3 border-b border-dashed border-[#2a2a2a] last:border-0">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-1.5 text-[0.72rem] font-bold text-[#f0f0f0]">
                    <div className={`w-2 h-2 rounded-full ${f.dot}`} /> {f.title}
                  </div>
                  <label className="flex items-center gap-1.5 text-[0.68rem] font-bold text-[#a0a0a0] cursor-pointer">
                    <input type="checkbox" checked={opsLog[f.key].applicable} onChange={e => setOpsLog(prev => ({ ...prev, [f.key]: { ...prev[f.key], applicable: e.target.checked } }))} className="accent-[#4f7df3]" /> Applicable
                  </label>
                </div>
                {opsLog[f.key].applicable && f.key !== 'keynotes' && (
                  <div className="flex flex-wrap gap-1.5">
                    {(OPS_LOG_PRESETS as any)[f.key]?.map((p: string) => (
                      <button key={p} onClick={() => togglePreset(f.key, p)} className={`px-2.5 py-1 rounded-full border text-[0.68rem] font-semibold transition-all cursor-pointer ${opsLog[f.key].selected.includes(p) ? 'bg-[#4f7df3]/10 text-[#4f7df3] border-[#4f7df3]' : 'text-[#a0a0a0] border-[#2a2a2a]'}`}>{p}</button>
                    ))}
                  </div>
                )}
                {opsLog[f.key].applicable && f.key === 'keynotes' && (
                  <textarea value={opsLog[f.key].custom} onChange={e => setOpsLog(prev => ({ ...prev, [f.key]: { ...prev[f.key], custom: e.target.value } }))} placeholder="Type keynotes..." className="w-full mt-2 px-2 py-2 rounded-md border border-[#2a2a2a] bg-[#0f0f0f] text-[0.75rem] min-h-[60px] outline-none" />
                )}
              </div>
            ))}
          </CPSection>

          {/* WEBHOOK */}
          <CPSection title="Webhook Integration">
            <div className="p-3 bg-[#1a1a1a] border border-[#222] rounded-xl text-[0.7rem] leading-relaxed">
              <div className="mb-2 text-[#a0a0a0]"><strong>Target Endpoint:</strong><br /><code className="text-[#4f7df3] break-all">.../api/webhooks/intercom</code></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" /> <span className="text-[#10b981] font-bold uppercase tracking-widest text-[0.6rem]">Realtime Listening</span></div>
            </div>
          </CPSection>

          <button onClick={() => { setCpOpen(false); showToastMsg('Dashboard preferences updated.'); }} className="w-full py-3 rounded-xl bg-[#4f7df3] text-white text-[0.82rem] font-black hover:opacity-90 transition-opacity cursor-pointer mb-6 uppercase tracking-widest">
            Apply Changes
          </button>
        </div>
      </aside>
    </div>
  );
}

// ===== SUB COMPONENTS =====
function CPSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[0.65rem] font-extrabold uppercase tracking-[0.1em] text-[#555] pb-2 border-b border-[#222] mb-3">{title}</div>
      {children}
    </div>
  );
}

function LOBGroupCard({ data, slaTargets }: { data: LOBData; slaTargets: { voice: number; chat: number } }) {
  const parsePct = (v: string) => parseFloat(String(v).replace('%', '')) || 0;
  const chatOk = parsePct(data.chat.sla) >= slaTargets.chat;
  const voiceOk = parsePct(data.voice.sla) >= slaTargets.voice;

  return (
    <div className="bg-[#141414] border border-[#222] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.5)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a2a2a] flex justify-between items-center bg-white/[0.01]">
        <h2 className="text-[0.75rem] font-extrabold uppercase tracking-[0.06em] text-[#a0a0a0]">{data.title}</h2>
      </div>
      {/* Chat */}
      <div className="p-4 pt-6 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3.5 py-1 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center gap-1.5 text-[0.65rem] font-black uppercase tracking-widest z-10 whitespace-nowrap">
          <MessageSquare size={12} className="text-[#3b82f6]" /> Chat
          <span className={`text-[0.55rem] font-extrabold px-1.5 py-px rounded-full ml-1.5 ${chatOk ? 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20' : 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20'}`}>{chatOk ? 'Passed' : 'Failed'}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-3 mb-3">
          <MetricMini label="Chat Inbound" value={data.chat.inbound} />
          <MetricMini label="Queue Wait" value={data.chat.inQueue} />
          <MetricMini label="FRT / AHT" value={`${data.chat.frt} / ${data.chat.aht}`} />
          <MetricMini label="Abandon Rate" value={data.chat.abandonRate} />
        </div>
        <SLARow value={data.chat.sla} ok={chatOk} />
      </div>
      {/* Divider */}
      <div className="relative h-7 mx-0">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-[1.5px] border-dashed border-[#2a2a2a]" />
        <div className="w-[18px] h-[18px] rounded-full bg-[#0a0a0a] border border-[#222] absolute left-[-9px] top-1/2 -translate-y-1/2 z-10" />
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center gap-1.5 text-[0.65rem] font-black uppercase tracking-widest z-10 whitespace-nowrap">
          <Phone size={11} className="text-[#6366f1]" /> Voice
          <span className={`text-[0.55rem] font-extrabold px-1.5 py-px rounded-full ml-1.5 ${voiceOk ? 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20' : 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20'}`}>{voiceOk ? 'Passed' : 'Failed'}</span>
        </div>
        <div className="w-[18px] h-[18px] rounded-full bg-[#0a0a0a] border border-[#222] absolute right-[-9px] top-1/2 -translate-y-1/2 z-10" />
      </div>
      {/* Voice */}
      <div className="p-4 pt-5 pb-5">
        <div className="grid grid-cols-2 gap-x-2 gap-y-3 mb-3">
          <MetricMini label="Voice Inbound" value={data.voice.inbound} />
          <MetricMini label="Queue Wait" value={data.voice.inQueue} />
          <MetricMini label="AHT" value={data.voice.aht} />
          <MetricMini label="Abandon Rate" value={data.voice.abandonRate} />
        </div>
        <SLARow value={data.voice.sla} ok={voiceOk} />
      </div>
    </div>
  );
}

function DetailView({ title, data, slaTargets }: { title: string; data: LOBData; slaTargets: { voice: number; chat: number } }) {
  const parsePct = (v: string) => parseFloat(String(v).replace('%', '')) || 0;
  function DetailCard({ label, value, highlight, isSLA }: any) {
    let cls = 'p-4 rounded-xl border border-[#2a2a2a] bg-white/[0.03]';
    let vcls = 'text-[1.6rem] font-black';
    if (isSLA) { cls = 'p-4 rounded-xl border border-[#6366f1]/30 bg-[#6366f1]/5'; vcls += ' text-[#6366f1]'; }
    else if (highlight === 'alert') { cls = 'p-4 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5'; vcls += ' text-[#ef4444]'; }
    return (
      <div className={cls}>
        <div className="text-[0.65rem] font-bold uppercase tracking-widest text-[#a0a0a0] mb-2">{label}</div>
        <div className={vcls}>{value}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#222]">
        <h2 className="text-[1.2rem] font-extrabold">{title} — Detailed Performance</h2>
      </div>
      <div className="bg-[#141414] border border-[#222] rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#2a2a2a] bg-white/[0.03]">
          <div className="w-[30px] h-[30px] rounded-lg bg-[#6366f1]/10 flex items-center justify-center"><Phone size={16} className="text-[#6366f1]" /></div>
          <h3 className="text-[0.72rem] font-extrabold uppercase tracking-[0.06em]">Voice Operations</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-4">
          <DetailCard label="Service Level" value={data.voice.sla} isSLA={true} />
          <DetailCard label="Inbound" value={data.voice.inbound} />
          <DetailCard label="Abandoned" value={data.voice.abandoned} />
          <DetailCard label="Abandon Rate" value={data.voice.abandonRate} highlight={parsePct(data.voice.abandonRate) > 10 ? 'alert' : ''} />
          <DetailCard label="Avg Queue" value={data.voice.inQueue} />
          <DetailCard label="Handle Time" value={data.voice.aht} />
        </div>
      </div>
      <div className="bg-[#141414] border border-[#222] rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#2a2a2a] bg-white/[0.03]">
          <div className="w-[30px] h-[30px] rounded-lg bg-[#4f7df3]/10 flex items-center justify-center"><MessageSquare size={16} className="text-[#3b82f6]" /></div>
          <h3 className="text-[0.72rem] font-extrabold uppercase tracking-[0.06em]">Chat Operations</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-4">
          <DetailCard label="Service Level" value={data.chat.sla} isSLA={true} />
          <DetailCard label="Inbound" value={data.chat.inbound} />
          <DetailCard label="Abandoned" value={data.chat.abandoned} />
          <DetailCard label="Abandon Rate" value={data.chat.abandonRate} highlight={parsePct(data.chat.abandonRate) > 10 ? 'alert' : ''} />
          <DetailCard label="Avg Queue" value={data.chat.inQueue} />
          <DetailCard label="FRT / AHT" value={`${data.chat.frt} / ${data.chat.aht}`} />
        </div>
      </div>
    </div>
  );
}

function MetricMini({ label, value, badge }: { label: string; value: string; badge?: number }) {
  return (
    <div>
      <div className="text-[0.65rem] font-bold uppercase tracking-widest text-[#a0a0a0] mb-0.5">{label}</div>
      <div className="flex items-center gap-1.5">
        <span className="text-[0.95rem] font-extrabold">{value}</span>
        {badge !== undefined && badge > 0 && (
          <span className="text-[0.55rem] font-extrabold px-1.5 py-0.5 rounded bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20">{badge}</span>
        )}
      </div>
    </div>
  );
}

function SLARow({ value, ok }: { value: string; ok: boolean }) {
  return (
    <div className={`p-2.5 rounded-xl border flex justify-between items-center col-span-2 ${ok ? 'bg-white/[0.03] border-[#222]' : 'bg-[#ef4444]/5 border-[#ef4444]/20'}`}>
      <div className={`flex items-center gap-1.5 text-[0.68rem] font-extrabold uppercase tracking-widest ${ok ? 'text-[#a0a0a0]' : 'text-[#ef4444]'}`}>
        <Activity size={12} /> SLA
      </div>
      <div className={`text-[1.3rem] font-black ${ok ? '' : 'text-[#ef4444]'}`}>{value}</div>
    </div>
  );
}

function EmailStat({ label, value, cls }: { label: string; value: number; cls: string }) {
  const colors: Record<string, string> = { blue: 'text-[#3b82f6]', indigo: 'text-[#6366f1]', green: 'text-[#10b981]', purple: 'text-[#a855f7]' };
  return (
    <div className="p-3 rounded-xl border border-[#2a2a2a] bg-white/[0.03]">
      <div className={`text-[0.65rem] font-bold uppercase tracking-widest mb-1 ${colors[cls]}`}>{label}</div>
      <div className="text-[1.4rem] font-black">{value}</div>
    </div>
  );
}

function LogSection({ label, dotColor, items, custom }: { label: string; dotColor: string; items: string[]; custom: string }) {
  const all = [...(items || []), ...(custom ? [custom] : [])];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[0.82rem] font-bold">
        <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        {label}
      </div>
      {all.length > 0 ? (
        <ul className="list-disc pl-5 space-y-1">
          {all.map((item, i) => (
            <li key={i} className="text-[0.78rem] text-[#a0a0a0] leading-relaxed">{item}</li>
          ))}
        </ul>
      ) : (
        <div className="text-[0.68rem] italic text-[#555] pl-4">No notes.</div>
      )}
    </div>
  );
}

function MiniCalendar({ year, month, startDate, endDate, onPick, onPrev, onNext }: any) {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const leftM = month === 0 ? 11 : month - 1;
  const leftY = month === 0 ? year - 1 : year;
  const today = new Date().toISOString().split('T')[0];

  function renderMonth(my: number, mm: number) {
    const firstDay = new Date(my, mm, 1).getDay();
    const daysInMonth = new Date(my, mm + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${my}-${String(mm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isStart = ds === startDate;
      const isEnd = ds === endDate;
      const inRange = startDate && endDate && ds > startDate && ds < endDate;
      const isToday = ds === today;
      let cls = 'text-center text-[0.68rem] font-semibold text-[#a0a0a0] py-1.5 rounded-md cursor-pointer transition-colors hover:bg-[#4f7df3]/10 hover:text-[#4f7df3]';
      if (isStart || isEnd) cls = 'text-center text-[0.68rem] font-extrabold bg-[#4f7df3] text-white py-1.5 rounded-md cursor-pointer';
      else if (inRange) cls = 'text-center text-[0.68rem] font-semibold bg-[#4f7df3]/10 text-[#4f7df3] py-1.5 rounded-none cursor-pointer';
      if (isToday && !isStart && !isEnd) cls += ' !text-[#4f7df3] !font-extrabold border-b border-[#4f7df3]';
      cells.push(<div key={d} className={cls} onClick={() => onPick(ds)}>{d}</div>);
    }
    return cells;
  }

  return (
    <div className="flex gap-2 p-2 bg-white/[0.02] border border-[#222] rounded-xl">
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1.5 px-0.5">
          <button onClick={onPrev} className="text-[0.7rem] text-[#a0a0a0] hover:text-[#4f7df3] p-1 rounded transition-colors cursor-pointer"><ChevronLeft size={14} /></button>
          <span className="text-[0.72rem] font-extrabold">{MONTHS[leftM]} {leftY}</span>
          <span />
        </div>
        <div className="grid grid-cols-7 gap-px">
          {DAYS.map(d => <div key={d} className="text-center text-[0.58rem] font-extrabold text-[#555] uppercase py-0.5">{d}</div>)}
          {renderMonth(leftY, leftM)}
        </div>
      </div>
      <div className="flex-1 border-l border-[#222] pl-2">
        <div className="flex justify-between items-center mb-1.5 px-0.5">
          <span />
          <span className="text-[0.72rem] font-extrabold">{MONTHS[month]} {year}</span>
          <button onClick={onNext} className="text-[0.7rem] text-[#a0a0a0] hover:text-[#4f7df3] p-1 rounded transition-colors cursor-pointer"><ChevronRight size={14} /></button>
        </div>
        <div className="grid grid-cols-7 gap-px">
          {DAYS.map(d => <div key={d} className="text-center text-[0.58rem] font-extrabold text-[#555] uppercase py-0.5">{d}</div>)}
          {renderMonth(year, month)}
        </div>
      </div>
    </div>
  );
}
