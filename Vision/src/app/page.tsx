"use client";

import { useState } from "react";
import { 
  Menu, LayoutDashboard, Users, UserCog, HandHeart, HelpCircle, 
  Settings, ChevronDown, Check, X, Bell 
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";

// --- Mock Data ---

const AVATAR_URLS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
];

const coachesData = [
  { name: 'Sarah Mitchell', desc: 'Staff observation & coaching line acts & courses', badge: '09', badgeColor: 'bg-brand-blue text-white' },
  { name: 'James Cooper', desc: 'Observation Score from coaching', badge: '09', badgeColor: 'bg-brand-blue text-white' },
  { name: 'Emily Chen', desc: 'Staff creation Agency Scores more specific data & analysis', badge: '09', badgeColor: 'bg-accent-red text-white' },
];

const assignedAgentsData = [
  { name: 'Laura Kim', desc: 'Staff analysis & for target development in teams', badge: '09', badgeColor: 'bg-accent-red text-white' },
  { name: 'Marcus Webb', desc: 'Staff creation Agency Scores more specific data & analysis', badge: '09', badgeColor: 'bg-brand-blue text-white' },
  { name: 'Diana Ross', desc: 'Staff creation Agency Scores more specific data & analysis', badge: '09', badgeColor: 'bg-accent-red text-white' },
  { name: 'Tyler James', desc: 'Staff creation Agency Scores more specific data & analysis', badge: '09', badgeColor: 'bg-brand-blue text-white' },
];

const staffData = [
  { name: 'Jake Cajes', desc: 'Observation Scores', pct: '1.35%', meta: 'Coach 330 (15%)' },
  { name: 'Mikaela Barrera', desc: 'Line Observation Activity scoring', pct: '1.55%', meta: 'Coaches' },
  { name: 'John Ortega', desc: 'Line Compliance & aging results...', pct: '1.35%', meta: 'Coaches' },
  { name: 'Chui Goh', desc: 'Enter Compliance & co-range coaching', pct: '1.45%', meta: '-4.90' },
  { name: 'Kyla Serion', desc: 'Enter Coordination controls notes...', pct: '1.38%', meta: '+125.8 3% Ins' },
  { name: 'Zaira Kinol', desc: 'Center & operate adv trans...', pct: '1.17%', meta: '13%' },
  { name: 'Irene Estravela', desc: 'Observation Activity scoring', pct: '1.42%', meta: 'Coach 210 (12%)' },
  { name: 'Krizha Abia', desc: 'Line Compliance & scoring', pct: '1.28%', meta: 'Coaches' },
  { name: 'Korina Alcantara', desc: 'Observation Scores analysis', pct: '1.60%', meta: '+8% above' },
  { name: 'Charbel Mahinay', desc: 'Staff coaching session notes', pct: '1.33%', meta: 'Coach 115 (9%)' },
  { name: 'Erwin Verano', desc: 'Compliance & quality review', pct: '1.50%', meta: '+12.3%' },
  { name: 'JM Piñero', desc: 'Enter Coordination controls notes...', pct: '1.22%', meta: '-2.10' },
  { name: 'Karl Mag-usara', desc: 'Center & operate adv trans...', pct: '1.38%', meta: 'Coaches' },
  { name: 'Shiela Bologa', desc: 'Line Observation Activity scoring', pct: '1.47%', meta: '+6% above' },
  { name: 'Gazelle Bulalacao', desc: 'Observation Scores review', pct: '1.55%', meta: 'Coach 220 (14%)' },
  { name: 'Joenesse Bonghanoy', desc: 'Staff coaching & compliance', pct: '1.40%', meta: '+9.5%' },
  { name: 'Alyssa Reyes', desc: 'Line Compliance & aging results...', pct: '1.31%', meta: 'Coaches' },
  { name: 'Elaine Roxas', desc: 'Center & quality coaching', pct: '1.25%', meta: '-1.80' },
  { name: 'May-Ann Montegrejo', desc: 'Enter Compliance & co-range coaching', pct: '1.52%', meta: '+11% above' },
  { name: 'Xavy Cuerpo', desc: 'Observation Activity & scoring', pct: '1.44%', meta: 'Coach 190 (10%)' },
];

const barData1 = [
  { name: 'Jan', val: 35 }, { name: 'Feb', val: 50 }, { name: 'Mar', val: 28 },
  { name: 'Apr', val: 45 }, { name: 'May', val: 60 }, { name: 'Jun', val: 42 },
  { name: 'Jul', val: 55 }, { name: 'Aug', val: 48 }
];

const barData2 = [
  { name: 'Line 1', val: 20 }, { name: 'Line 2', val: 45 }, { name: 'Line Agents', val: 30 },
  { name: 'Score Incl', val: 60 }, { name: 'Total Score', val: 80 }
];

const lineData = [
  { name: '1', val: 20 }, { name: '2', val: 45 }, { name: '3', val: 35 },
  { name: '4', val: 70 }, { name: '5', val: 55 }, { name: '6', val: 80 }
];

const donutData1 = [
  { name: 'A', value: 35, color: '#4F7DF3' },
  { name: 'B', value: 40, color: '#1E3A6E' },
  { name: 'C', value: 25, color: '#F97316' },
];

const donutData2 = [
  { name: 'A', value: 30, color: '#4F7DF3' },
  { name: 'B', value: 35, color: '#1E3A6E' },
  { name: 'C', value: 20, color: '#F97316' },
  { name: 'D', value: 15, color: '#10B981' },
];

// --- Helpers ---
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string) {
  const colors = ['#4F7DF3','#F59E0B','#10B981','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316','#14B8A6','#6366F1'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Dashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [modalOpen, setModalOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [rating, setRating] = useState(0);

  const openObservationModal = (name: string) => {
    setSelectedAgent(name);
    setModalOpen(true);
  };

  const closeModals = () => {
    setModalOpen(false);
    setRatingModalOpen(false);
  };

  const proceedToRating = () => {
    setModalOpen(false);
    setRatingModalOpen(true);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-body)] font-sans text-[var(--text-primary)]">
      
      {/* --- SIDEBAR --- */}
      <aside 
        className={`bg-white border-r border-[var(--border-light)] flex flex-col transition-all duration-300 z-20 shadow-[var(--shadow-sm)]
          ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}`}
      >
        <div className="p-5 flex justify-center items-center">
          <div className={`bg-white rounded-xl flex items-center justify-center shadow-sm overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-10 h-10 p-1' : 'w-[60px] h-[66px] p-1.5'}`}>
            <svg width={sidebarCollapsed ? "24" : "36"} height={sidebarCollapsed ? "28" : "44"} viewBox="0 0 120 148" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8 L12 100 L30 100 L30 68 L58 68 L78 100 L98 100 L74 64 C88 58 96 46 96 32 C96 14 82 8 62 8 Z M30 24 L58 24 C72 24 78 28 78 38 C78 48 72 54 58 54 L30 54 Z" fill="#1E293B"/>
              {!sidebarCollapsed && <text x="60" y="132" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="22" letterSpacing="3" fill="#1E293B">RESIDENT</text>}
            </svg>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 flex flex-col gap-1 overflow-y-auto hide-scrollbar">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            collapsed={sidebarCollapsed} 
            active={activeView === "dashboard"}
            onClick={() => setActiveView("dashboard")}
          />

          <div className="my-1">
            <div 
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-[var(--text-secondary)] font-medium hover:bg-slate-50 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
              onClick={() => {
                if (sidebarCollapsed) {
                  setSidebarCollapsed(false);
                  setTimeout(() => setAgentsOpen(true), 300);
                } else {
                  setAgentsOpen(!agentsOpen);
                }
              }}
              title={sidebarCollapsed ? "Agents" : ""}
            >
              <div className="flex items-center gap-3">
                <Users size={20} />
                {!sidebarCollapsed && <span>Agents</span>}
              </div>
              {!sidebarCollapsed && (
                <ChevronDown size={16} className={`transition-transform duration-200 ${agentsOpen ? 'rotate-180' : ''}`} />
              )}
            </div>
            
            {/* Submenu */}
            <div className={`overflow-hidden transition-all duration-300 ${!sidebarCollapsed && agentsOpen ? 'max-h-64 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
              <div className="pl-11 pr-3 flex flex-col gap-1 border-l-2 border-slate-100 ml-5 py-1">
                {['All Agents', 'Sales Agents', 'Support Agents', 'Service Recovery', 'Other'].map(item => (
                  <div key={item} className="px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--brand-blue)] hover:bg-slate-50 rounded-md cursor-pointer transition-colors">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <NavItem 
            icon={<UserCog size={20} />} 
            label="Coaches" 
            collapsed={sidebarCollapsed} 
            active={activeView === "coaches"}
            onClick={() => setActiveView("coaches")}
          />
        </nav>

        <div className="p-3 border-t border-[var(--border-light)] flex flex-col gap-1">
          <NavItem icon={<HandHeart size={20} />} label="Support" collapsed={sidebarCollapsed} />
          <NavItem icon={<HelpCircle size={20} />} label="Help" collapsed={sidebarCollapsed} />
          <NavItem icon={<Settings size={20} />} label="Settings" collapsed={sidebarCollapsed} />
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* HEADER */}
        <header className="h-[72px] bg-white border-b border-[var(--border-light)] flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Resident Home <span className="text-[var(--text-tertiary)] font-medium mx-2">|</span> Vision
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 rounded-lg p-1 flex">
              <button className="px-4 py-1.5 text-sm font-semibold rounded-md bg-white text-[var(--text-primary)] shadow-sm">
                Coached
              </button>
            </div>
            
            <div className="h-8 w-[1px] bg-slate-200"></div>
            
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-blue to-indigo-400 text-white flex items-center justify-center font-bold text-sm shadow-sm cursor-pointer">
              JG
            </div>
          </div>
        </header>

        {/* SCROLLABLE VIEW AREA */}
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          
          {/* VIEW: DASHBOARD */}
          {activeView === "dashboard" && (
            <div className="max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Column 1 */}
                <div className="flex flex-col gap-6">
                  {/* Card: Coaching Activity */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="font-bold text-lg">Staff Coaching Activity</h2>
                      <button className="text-slate-400 hover:text-slate-600"><Menu size={16} /></button>
                    </div>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData1}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                          <Bar dataKey="val" fill="#4F7DF3" radius={[4, 4, 0, 0]} barSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Card: Absenteeism */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="font-bold text-lg">Absenteeism</h2>
                      <button className="text-slate-400 hover:text-slate-600"><Menu size={16} /></button>
                    </div>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData2}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                          <Bar dataKey="val" fill="#10B981" radius={[4, 4, 0, 0]} barSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Card: Recent Coaches */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="font-bold text-lg">Recent Coaches</h2>
                      <span className="text-xs font-semibold text-brand-blue bg-brand-blue-light px-2.5 py-1 rounded-full">View All</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {coachesData.map((coach, i) => (
                        <AgentRow key={i} coach={coach} idx={i} onClick={() => openObservationModal(coach.name)} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="flex flex-col gap-6">
                  {/* Card: Observation Scores */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="font-bold text-lg">Observation Scores</h2>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">Monthly</span>
                    </div>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                          <Line type="monotone" dataKey="val" stroke="#4F7DF3" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 6}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Card: Mastered Observability */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <h2 className="font-bold text-lg mb-2">Mastered Observability</h2>
                    <div className="h-[200px] w-full flex items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData1} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                            {donutData1.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-slate-800">75%</span>
                        <span className="text-xs text-slate-500">Mastery</span>
                      </div>
                    </div>
                  </div>

                  {/* Card: Assigned Agents */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <h2 className="font-bold text-lg mb-4">Assigned Agents</h2>
                    <div className="flex flex-col gap-3">
                      {assignedAgentsData.map((agent, i) => (
                        <AgentRow key={i} coach={agent} idx={i+3} onClick={() => openObservationModal(agent.name)} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Column 3 */}
                <div className="flex flex-col gap-6">
                  {/* Card: Compliance Analytics */}
                  <div className="bg-[var(--text-primary)] text-white rounded-2xl p-5 shadow-[var(--shadow-md)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-10 -mt-10 pointer-events-none"></div>
                    <div className="flex justify-between items-center mb-4 relative z-10">
                      <h2 className="font-bold text-lg">Compliance Analytics</h2>
                    </div>
                    <div className="h-[200px] w-full relative z-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData}>
                          <Line type="monotone" dataKey="val" stroke="#10B981" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#1E293B', stroke: '#10B981'}} />
                          <Tooltip contentStyle={{backgroundColor: '#1E293B', borderColor: '#334155', color: '#fff', borderRadius: '8px'}} itemStyle={{color: '#fff'}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Card: Completion Scores */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <h2 className="font-bold text-lg mb-2">Completion Scores</h2>
                    <div className="h-[200px] w-full flex items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData2} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                            {donutData2.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-brand-blue">88%</span>
                        <span className="text-xs text-slate-500">Completed</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VIEW: COACHES */}
          {activeView === "coaches" && (
            <div className="max-w-[1000px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">Coaches List</h2>
                  <p className="text-[var(--text-secondary)] mt-1">Manage and observe all assigned coaches.</p>
                </div>
                <div className="bg-white border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] shadow-sm">
                  Showing <span className="font-bold text-[var(--text-primary)]">{staffData.length}</span> coaches
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-[var(--shadow-sm)] border border-[var(--border-light)] overflow-hidden">
                <div className="flex flex-col">
                  {staffData.map((staff, i) => {
                    const initials = getInitials(staff.name);
                    const color = getAvatarColor(staff.name);
                    return (
                      <div 
                        key={i} 
                        onClick={() => openObservationModal(staff.name)}
                        className="flex items-center gap-4 p-4 border-b border-[var(--border-light)] last:border-b-0 hover:bg-slate-50 cursor-pointer transition-colors group"
                      >
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner"
                          style={{ backgroundColor: color }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[var(--text-primary)] truncate">{staff.name}</h3>
                          <p className="text-sm text-[var(--text-secondary)] truncate">{staff.desc}</p>
                        </div>
                        <div className="text-right hidden sm:block shrink-0 min-w-[80px]">
                          <span className="font-bold text-brand-blue">{staff.pct}</span>
                        </div>
                        <div className="text-right hidden md:block shrink-0 min-w-[120px]">
                          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{staff.meta}</span>
                        </div>
                        <div className="text-slate-300 group-hover:text-brand-blue transition-colors pl-2">
                          <ChevronDown className="-rotate-90" size={20} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* --- MODALS --- */}
      
      {/* Observation Modal */}
      {modalOpen && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={closeModals}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[800px] flex flex-col max-h-[90vh] relative z-10 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--border-light)] flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold">Observation Details {selectedAgent}</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Review activity and compliance metrics.</p>
              </div>
              <button onClick={closeModals} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Agent Name</label>
                  <div className="font-semibold text-lg">{selectedAgent}</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Observation Details</label>
                  <div className="font-semibold text-lg">{selectedAgent}</div>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Feedback Notes</label>
                <div className="flex flex-col gap-4">
                  {[
                    { name: selectedAgent, text: 'Observation scoring analysis false points. Entry as to analysis, and the not lifted do it are contributing battery some coach co-analysis.' },
                    { name: 'Analytics', text: 'Time coaching/processing to line totalizing commit bent the inner fold and gate yet that one positive source point.' }
                  ].map((fb, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-[var(--border-light)]">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                        style={{ backgroundColor: getAvatarColor(fb.name) }}
                      >
                        {getInitials(fb.name)}
                      </div>
                      <div>
                        <div className="font-bold text-sm mb-1">{fb.name}</div>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{fb.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-[var(--border-light)] flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
              <button onClick={closeModals} className="px-5 py-2.5 rounded-lg font-semibold text-slate-600 hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={proceedToRating} className="px-5 py-2.5 rounded-lg font-semibold bg-brand-blue text-white shadow-md shadow-brand-blue/20 hover:bg-brand-blue-hover transition-all hover:-translate-y-0.5">
                Observe Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingModalOpen && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={closeModals}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[500px] flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--border-light)] flex justify-between items-center">
              <h2 className="text-xl font-bold">Rate Observation</h2>
              <button onClick={closeModals} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md mb-4"
                style={{ backgroundColor: getAvatarColor(selectedAgent) }}
              >
                {getInitials(selectedAgent)}
              </div>
              <h3 className="text-xl font-bold mb-1">{selectedAgent}</h3>
              <p className="text-sm text-slate-500 mb-8">Set the observation score below.</p>
              
              <div className="text-5xl font-black text-brand-blue mb-6 tracking-tighter">
                {rating}
              </div>
              
              <input 
                type="range" 
                min="0" max="10" 
                value={rating} 
                onChange={(e) => setRating(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue mb-8"
              />
              
              <div className="flex justify-between w-full text-xs font-bold text-slate-400">
                <span>0</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>
            
            <div className="p-6 border-t border-[var(--border-light)] flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
              <button onClick={closeModals} className="px-5 py-2.5 rounded-lg font-semibold text-slate-600 hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={closeModals} className="px-5 py-2.5 rounded-lg font-semibold bg-brand-blue text-white shadow-md shadow-brand-blue/20 hover:bg-brand-blue-hover transition-all hover:-translate-y-0.5">
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- Subcomponents ---

function NavItem({ icon, label, collapsed, active, onClick }: { icon: React.ReactNode, label: string, collapsed: boolean, active?: boolean, onClick?: () => void }) {
  return (
    <div 
      className={`flex items-center px-3 py-2.5 rounded-lg cursor-pointer font-medium transition-colors
        ${active 
          ? 'bg-brand-blue-light text-brand-blue' 
          : 'text-[var(--text-secondary)] hover:bg-slate-50 hover:text-[var(--text-primary)]'}
        ${collapsed ? 'justify-center' : ''}
      `}
      onClick={onClick}
      title={collapsed ? label : ""}
    >
      <div className="shrink-0">{icon}</div>
      {!collapsed && <span className="ml-3 truncate">{label}</span>}
    </div>
  );
}

function AgentRow({ coach, idx, onClick }: { coach: { name: string, desc: string, badge?: string, badgeColor?: string }, idx: number, onClick: () => void }) {
  return (
    <div onClick={onClick} className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-[var(--border-light)] hover:bg-slate-50 cursor-pointer transition-all group">
      <div className="relative shrink-0">
        <img src={AVATAR_URLS[idx % AVATAR_URLS.length]} alt={coach.name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
        <span className={`absolute -bottom-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white ${coach.badgeColor}`}>
          {coach.badge}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm truncate text-[var(--text-primary)]">{coach.name}</h3>
        <p className="text-xs text-[var(--text-tertiary)] truncate">{coach.desc}</p>
      </div>
      <div className="shrink-0 text-slate-300 group-hover:text-brand-blue transition-colors">
        <Check size={18} />
      </div>
    </div>
  );
}
