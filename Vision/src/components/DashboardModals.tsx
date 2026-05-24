"use client";

import React from "react";
import Modal from "./Modal";
import { Search, Calendar, History, UserCog, TrendingUp } from "lucide-react";

interface AllModalsProps {
  recentObsModalOpen: boolean;
  setRecentObsModalOpen: (open: boolean) => void;
  recentObservations: any[];
  setSelectedObs: (obs: any) => void;
  missedObsModalOpen: boolean;
  setMissedObsModalOpen: (open: boolean) => void;
  missedObservationsStats: any[];
  wowChartsModalOpen: boolean;
  setWowChartsModalOpen: (open: boolean) => void;
  wowChartsData: any[];
  selectedObs: any;
  setSelectedObsNull: () => void;
  getAvatarColor: (name: string) => string;
  getInitials: (name: string) => string;
}

const AllModals = ({
  recentObsModalOpen,
  setRecentObsModalOpen,
  recentObservations,
  setSelectedObs,
  missedObsModalOpen,
  setMissedObsModalOpen,
  missedObservationsStats,
  wowChartsModalOpen,
  setWowChartsModalOpen,
  wowChartsData,
  selectedObs,
  setSelectedObsNull,
  getAvatarColor,
  getInitials
}: AllModalsProps) => {
  return (
    <>
      {/* 1. All Recent Observations Modal */}
      <Modal 
        isOpen={recentObsModalOpen} 
        onClose={() => setRecentObsModalOpen(false)}
        title="All Recent Observations"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentObservations.map((obs, i) => (
            <div 
              key={i} 
              className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-brand-blue/30 cursor-pointer transition-all"
              onClick={() => { setSelectedObs(obs); setRecentObsModalOpen(false); }}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: getAvatarColor(obs.agentName) }}>
                    {getInitials(obs.agentName)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{obs.agentName}</h4>
                    <p className="text-xs text-gray-400">{obs.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-brand-blue">{obs.rating}%</div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase">Score</div>
                </div>
              </div>
              <div className="pt-2 border-t border-white/5 text-xs text-gray-400">
                Coached by <span className="text-gray-200 font-bold">{obs.coachName}</span> • {obs.department}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* 2. Neglected Agents Modal */}
      <Modal 
        isOpen={missedObsModalOpen} 
        onClose={() => setMissedObsModalOpen(false)}
        title="All Neglected Agents"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase font-black text-gray-400">
                <th className="pb-3 px-2">Agent Name</th>
                <th className="pb-3 px-2">Coach</th>
                <th className="pb-3 px-2">LOB</th>
                <th className="pb-3 px-2 text-right">Weeks Missed</th>
              </tr>
            </thead>
            <tbody>
              {missedObservationsStats.map((agent, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-2 font-bold text-white">{agent.name}</td>
                  <td className="py-4 px-2 text-gray-400">{agent.coach}</td>
                  <td className="py-4 px-2 text-gray-400">{agent.lob}</td>
                  <td className="py-4 px-2 text-right">
                    <span className="bg-rose-500/10 text-rose-500 px-2 py-1 rounded-lg font-black text-sm border border-rose-500/20">
                      {agent.totalWeeksMissed}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* 3. WoW Rankings Modal */}
      <Modal 
        isOpen={wowChartsModalOpen} 
        onClose={() => setWowChartsModalOpen(false)}
        title="Week-over-Week Rankings"
      >
        <div className="space-y-2">
          {wowChartsData.map((agent, i) => {
            const wowColor = agent.wow > 0 ? 'text-emerald-500' : agent.wow < 0 ? 'text-rose-500' : 'text-gray-400';
            return (
              <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded bg-brand-blue/10 flex items-center justify-center text-brand-blue font-black">{i+1}</div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{agent.name}</h4>
                    <p className="text-[10px] text-gray-500">{agent.lob} • Coach: {agent.coach}</p>
                  </div>
                </div>
                <div className="flex gap-8 items-center">
                  <div className="text-center">
                    <div className="text-sm font-bold text-white">{agent.thisWeek}</div>
                    <div className="text-[9px] text-gray-500 uppercase">This Week</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-gray-400">{agent.lastWeek}</div>
                    <div className="text-[9px] text-gray-500 uppercase">Last Week</div>
                  </div>
                  <div className={`w-12 text-right font-black text-sm ${wowColor}`}>
                    {agent.wow > 0 ? '▲' : agent.wow < 0 ? '▼' : '—'} {Math.abs(agent.wow)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* 4. Single Observation Detail Modal */}
      <Modal 
        isOpen={!!selectedObs} 
        onClose={setSelectedObsNull}
        title="Observation Detail"
      >
        {selectedObs && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-brand-blue/10 rounded-2xl border border-brand-blue/20">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: getAvatarColor(selectedObs.agentName) }}>
                {getInitials(selectedObs.agentName)}
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">{selectedObs.agentName}</h3>
                <p className="text-brand-blue font-bold">{selectedObs.department}</p>
              </div>
              <div className="ml-auto text-right">
                <div className="text-4xl font-black text-brand-blue">{selectedObs.rating}%</div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Final Score</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Coach</label>
                <div className="text-white font-bold">{selectedObs.coachName}</div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Date</label>
                <div className="text-white font-bold">{selectedObs.date}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default AllModals;
