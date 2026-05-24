"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell, PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, Clock, AlertCircle, CheckCircle, 
  MessageSquare, ChevronRight, Activity
} from 'lucide-react';

export default function SlaDashboardView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: metrics, error } = await supabase
          .from('intercom_sla_daily')
          .select('*')
          .order('date', { ascending: false })
          .limit(14);

        if (error) {
          console.error('SLA Fetch Error:', error);
          setData([]);
        } else {
          setData(metrics || []);
        }
      } catch (err) {
        console.error('SLA Exception:', err);
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);


  if (loading) return <div className="flex-1 flex items-center justify-center">Loading SLA Data...</div>;

  const today = data?.[0] || { inbound_count: 0, sla_passes: 0, sla_fails: 0 };
  const slaPct = today.inbound_count > 0 
    ? Math.round((today.sla_passes / today.inbound_count) * 100) 
    : 0;

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto hide-scrollbar bg-[#f8fafc]">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Intercom SLA Performance</h2>
          <p className="text-slate-500 text-sm">Real-time metrics from Intercom API & Webhooks</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-100">
          <Activity size={14} className="animate-pulse" /> LIVE SYNCING
        </div>
      </div>

      {/* TOP METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard 
          icon={<MessageSquare className="text-blue-500" />} 
          label="Total Inbound" 
          value={today.inbound_count} 
          color="blue"
        />
        <MetricCard 
          icon={<CheckCircle className="text-emerald-500" />} 
          label="SLA Passes (<75s)" 
          value={today.sla_passes} 
          color="emerald"
        />
        <MetricCard 
          icon={<AlertCircle className="text-rose-500" />} 
          label="SLA Fails (>75s)" 
          value={today.sla_fails} 
          color="rose"
        />
        <MetricCard 
          icon={<TrendingUp className="text-amber-500" />} 
          label="Overall SLA %" 
          value={`${slaPct}%`} 
          color="amber"
          isGauge={true}
          pct={slaPct}
        />
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">SLA Trend (14 Days)</h3>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(data || []).length > 0 ? [...data].reverse() : []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={(d) => (d.sla_passes / d.inbound_count * 100).toFixed(1)} 
                    name="SLA %" 
                    stroke="#4f7df3" 
                    strokeWidth={3} 
                    dot={{ fill: '#4f7df3', r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Volume Distribution</h3>
           <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(data || []).length > 0 ? [...data].reverse() : []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="sla_passes" name="Passes" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="sla_fails" name="Fails" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color, isGauge, pct }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-${color}-50`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-2">
          <h4 className="text-2xl font-black text-slate-800">{value}</h4>
          {isGauge && (
             <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
               <div 
                 className={`h-full transition-all duration-1000 ${pct > 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                 style={{ width: `${pct}%` }} 
               />
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
