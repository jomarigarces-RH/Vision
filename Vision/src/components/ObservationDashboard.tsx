"use client";

import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { 
  Activity, Users, Phone, MessageSquare, CheckCircle2, 
  Search, Calendar, Filter, Download 
} from 'lucide-react';

interface ObservationDashboardProps {
  observationDataStats: any[];
  notObservedStats: any[];
  recentObservations: any[];
  observationTrendData: any[];
  lobsStats: any[];
  overallCompletion: number;
  missedObservationsStats: any[];
  wowChartsData: any[];
  notObsDept: string;
  setNotObsDept: (dept: string) => void;
  setRecentObsModalOpen: (open: boolean) => void;
  setSelectedObs: (obs: any) => void;
  setMissedObsModalOpen: (open: boolean) => void;
  setWowChartsModalOpen: (open: boolean) => void;
  getAvatarColor: (name: string) => string;
  getInitials: (name: string) => string;
}

const ObservationDashboard = ({
  observationDataStats,
  notObservedStats,
  recentObservations,
  observationTrendData,
  lobsStats,
  overallCompletion,
  missedObservationsStats,
  wowChartsData,
  notObsDept,
  setNotObsDept,
  setRecentObsModalOpen,
  setSelectedObs,
  setMissedObsModalOpen,
  setWowChartsModalOpen,
  getAvatarColor,
  getInitials
}: ObservationDashboardProps) => {
  
  function Select({ options, selected, onChange, placeholder }: any) {
    return (
      <select 
        value={selected} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#141414] border border-[#222] rounded-lg px-2 py-1.5 text-[11px] font-bold text-gray-300 outline-none focus:border-brand-blue"
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((o: any) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Column 1 */}
        <div className="flex flex-col gap-6">
          {/* Card: Observation Data */}
          <div className="bg-[var(--bg-card)] rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)] overflow-hidden">
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-bold text-lg text-[var(--text-primary)]">Observation Data</h2>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] font-medium mb-4">Observation count breakdown by LOB for the selected period.</p>
            
            <div className="w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-light)] text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">
                    <th className="py-3 px-2">Line of Business</th>
                    <th className="py-3 px-2 text-right text-brand-blue">Observations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-light)]">
                  {observationDataStats.map((row, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${row.name === 'Sales' ? 'bg-brand-blue' : row.name === 'Support' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className="text-sm font-bold text-[var(--text-primary)] opacity-80">{row.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right text-sm font-black text-brand-blue">
                        {row.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-white/5">
                    <td className="py-2 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase">Total</td>
                    <td className="py-2 px-2 text-right text-xs font-black text-[var(--text-primary)]">
                      {observationDataStats.reduce((acc, curr) => acc + curr.count, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Card: Missing Observation */}
          <div className="bg-[var(--bg-card)] rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
            <div className="mb-1">
              <h2 className="font-bold text-lg text-[var(--text-primary)]">Missing Observation</h2>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium">Coaches with the most unobserved agents during the selected period.</p>
            </div>
            <div className="flex justify-between items-center mb-4">
              <div className="w-32">
                <Select
                  options={['Sales', 'Support', 'Specialty']}
                  selected={notObsDept}
                  onChange={setNotObsDept}
                  placeholder="LOB..."
                />
              </div>
            </div>
            <div className="h-[200px] w-full relative">
              <ResponsiveContainer width="99%" height="100%">
                <BarChart data={notObservedStats} barGap={2}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                   <Tooltip
                     cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                     contentStyle={{ backgroundColor: '#141414', border: '1px solid #222', borderRadius: '8px' }}
                     formatter={(val: any, name: any, props: any) => [`${val} Agents`, props.payload.fullName]}
                   />
                   <Bar dataKey="val" fill="#EF4444" radius={[2, 2, 0, 0]} barSize={16} />
                   <XAxis
                     dataKey="name"
                     axisLine={false}
                     tickLine={false}
                     tick={{ fontSize: 8, fontWeight: 700, fill: 'var(--text-secondary)' }}
                     interval={0}
                   />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card: Recent Observations */}
          <div className="bg-[var(--bg-card)] rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
            <div className="mb-1">
              <h2 className="font-bold text-lg text-[var(--text-primary)]">Recent Observations</h2>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium">Latest Observation sessions recorded in the system.</p>
            </div>
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => setRecentObsModalOpen(true)}
                className="text-xs font-semibold text-brand-blue bg-brand-blue/10 px-2.5 py-1 rounded-full hover:bg-brand-blue hover:text-white transition-colors"
              >
                View All
              </button>
            </div>
            <div className="flex flex-col gap-3">
               {recentObservations.slice(0, 3).map((obs, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group"
                  onClick={() => setSelectedObs(obs)}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md" style={{ backgroundColor: getAvatarColor(obs.agentName) }}>
                    {getInitials(obs.agentName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">{obs.agentName}</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] font-medium">By {obs.coachName} • {obs.date}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-brand-blue">{obs.rating}%</div>
                    <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">Score</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2 */}
        <div className="flex flex-col gap-6">
          {/* Card: Observation Index */}
          <div className="bg-[var(--bg-card)] rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
            <div className="mb-1">
              <h2 className="font-bold text-lg text-[var(--text-primary)]">Observation Index</h2>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium">Daily observation trend lines per LOB over the selected period.</p>
            </div>
            <div className="h-[200px] w-full relative">
              <ResponsiveContainer width="99%" height="100%">
                <LineChart data={observationTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-secondary)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-secondary)' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#141414', border: '1px solid #222', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="Sales" stroke="#4F7DF3" strokeWidth={2} dot={{ r: 2 }} name="Sales" />
                  <Line type="monotone" dataKey="Support" stroke="#10B981" strokeWidth={2} dot={{ r: 2 }} name="Support" />
                  <Line type="monotone" dataKey="Specialty" stroke="#F59E0B" strokeWidth={2} dot={{ r: 2 }} name="Specialty" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card: LOB Completion Status */}
          <div className="bg-[var(--bg-card)] rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
            <div className="mb-2">
              <h2 className="font-bold text-lg text-[var(--text-primary)]">LOB Completion</h2>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium">Percentage of agents observed per department during the selected period.</p>
            </div>
            <div className="h-[200px] w-full flex items-center justify-center relative">
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie
                    data={lobsStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {lobsStats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#141414', border: '1px solid #222', borderRadius: '8px' }} formatter={(val: any) => `${val}% Completed`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-[var(--text-primary)]">{overallCompletion}%</span>
                <span className="text-xs text-[var(--text-secondary)]">Overall</span>
              </div>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {lobsStats.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></div>
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">{s.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Neglected Agents */}
          <div className="bg-[var(--bg-card)] rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
            <div className="mb-1 flex justify-between items-start">
              <div>
                <h2 className="font-bold text-lg text-[var(--text-primary)]">Neglected Agents</h2>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium">Agents with the most missed Observation Sessions.</p>
              </div>
              <button
                onClick={() => setMissedObsModalOpen(true)}
                className="text-[10px] font-bold text-brand-blue bg-brand-blue/10 px-2 py-1 rounded border border-brand-blue/20 hover:bg-brand-blue hover:text-white transition-colors"
              >
                VIEW ALL
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {missedObservationsStats.slice(0, 3).map((agent, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--border-light)] hover:bg-white/5 transition-all group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${i === 0 ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : i === 1 ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">{agent.name}</h4>
                    <p className="text-[10px] text-[var(--text-secondary)] font-medium">Coach: {agent.coach} • {agent.lob}</p>
                  </div>
                  <div className="text-right">
                     <div className="text-sm font-black text-rose-500">{agent.totalWeeksMissed}</div>
                     <div className="text-[8px] font-bold text-[var(--text-secondary)] uppercase">Weeks Missed</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3 */}
        <div className="flex flex-col gap-6">
          {/* Card: Observation Completion */}
          <div className="bg-[var(--bg-card)] rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
            <h2 className="font-bold text-lg mb-0.5 text-[var(--text-primary)]">Observation Completion (Agent)</h2>
            <p className="text-[11px] text-[var(--text-secondary)] font-medium mb-2">Progress bars showing LOB performance.</p>
            <div className="flex flex-col gap-4 mt-4">
              {lobsStats.map((stat, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-[var(--text-primary)]">{stat.name}</span>
                    <span className="text-[var(--text-secondary)] font-medium">{stat.observed} / {stat.total}</span>
                  </div>
                  <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${stat.value}%`, backgroundColor: stat.color }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm ${stat.value === 100 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-white/5 text-[var(--text-secondary)] border border-[var(--border-light)]'}`}>
                      {stat.value}% COMPLETE
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card: WOW Charts */}
          <div className="bg-[var(--bg-card)] rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
            <div className="mb-1">
              <h2 className="font-bold text-lg text-[var(--text-primary)]">WOW Charts</h2>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium">Weeek-over-Week performance.</p>
            </div>
            <div className="flex justify-between items-center mb-4 text-brand-blue font-bold text-xs uppercase cursor-pointer" onClick={() => setWowChartsModalOpen(true)}>
              View Full Rankings
            </div>
            <div className="flex flex-col gap-1.5">
                {wowChartsData.slice(0, 5).map((agent, i) => {
                  const wowColor = agent.wow > 0 ? 'text-emerald-500' : agent.wow < 0 ? 'text-rose-500' : 'text-slate-300';
                  return (
                    <div key={i} className="flex justify-between items-center p-2 hover:bg-white/5 rounded-lg border border-transparent hover:border-[var(--border-light)]">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-[10px] font-black">{i+1}</div>
                        <span className="text-[11px] font-bold text-[var(--text-primary)] truncate">{agent.name}</span>
                      </div>
                      <div className={`text-[10px] font-black ${wowColor}`}>
                        {agent.wow > 0 ? '▲' : agent.wow < 0 ? '▼' : '—'} {Math.abs(agent.wow)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObservationDashboard;
