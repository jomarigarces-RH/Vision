"use client";

import { useState, useEffect } from "react";
import { Menu, Activity, Settings as SettingsIcon, LogOut, Bell } from "lucide-react";
import AuthView from "@/components/AuthView";
import SettingsView from "@/components/SettingsView";
import SlaDashboardView from "@/components/SlaDashboardView";

type User = { name: string; email: string; role: string; preferences?: any };

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeView, setActiveView] = useState<"intercom-sla" | "settings">("intercom-sla");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("vision_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        /* ignore corrupt value */
      }
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarCollapsed(true);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem("vision_user", JSON.stringify(userData));
  };
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("vision_user");
  };

  if (!authChecked) return null;
  if (!user) return <AuthView onLogin={handleLogin} />;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-body)] font-sans text-[var(--text-primary)] relative">
      {isMobile && !sidebarCollapsed && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20" onClick={() => setSidebarCollapsed(true)} />
      )}

      {/* SIDEBAR */}
      <aside
        className={`bg-[var(--bg-card)] border-r border-[var(--border-light)] flex flex-col transition-all duration-300 z-30 shadow-[var(--shadow-sm)] h-full
          absolute md:relative
          ${sidebarCollapsed ? "-translate-x-full md:translate-x-0 md:w-[72px]" : "translate-x-0 w-[260px]"}`}
      >
        <div className="p-5 flex justify-center items-center">
          <div className={`bg-[var(--bg-card)] rounded-xl flex items-center justify-center shadow-sm overflow-hidden transition-all duration-300 ${sidebarCollapsed ? "w-10 h-10 p-1" : "w-[60px] h-[66px] p-1.5"}`}>
            <svg width={sidebarCollapsed ? "24" : "36"} height={sidebarCollapsed ? "28" : "44"} viewBox="0 0 120 148" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8 L12 100 L30 100 L30 68 L58 68 L78 100 L98 100 L74 64 C88 58 96 46 96 32 C96 14 82 8 62 8 Z M30 24 L58 24 C72 24 78 28 78 38 C78 48 72 54 58 54 L30 54 Z" fill="#ffffff" />
              {(!sidebarCollapsed || isMobile) && (
                <text x="60" y="132" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="22" letterSpacing="3" fill="#ffffff">RESIDENT</text>
              )}
            </svg>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 flex flex-col gap-1 overflow-y-auto hide-scrollbar">
          <NavItem
            icon={<Activity size={20} />}
            label="Intercom SLA"
            collapsed={sidebarCollapsed}
            active={activeView === "intercom-sla"}
            onClick={() => setActiveView("intercom-sla")}
          />
          {/* Agent Monitoring (Step 2) will be added here */}
        </nav>

        <div className="p-3 border-t border-[var(--border-light)] flex flex-col gap-1">
          <NavItem
            icon={<SettingsIcon size={20} />}
            label="Settings"
            collapsed={sidebarCollapsed}
            active={activeView === "settings"}
            onClick={() => setActiveView("settings")}
          />
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-[72px] bg-[var(--bg-card)] border-b border-[var(--border-light)] flex items-center justify-between px-3 sm:px-6 shrink-0 z-40 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors shrink-0">
              <Menu size={20} />
            </button>
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center truncate">
              <span className="hidden sm:inline">Resident Home</span>
              <span className="sm:hidden">Resident</span>
              <span className="text-[var(--text-tertiary)] font-medium mx-1 sm:mx-2">|</span>
              <span className="truncate">Vision</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors shrink-0">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>

            <div className="group relative">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-brand-blue to-indigo-400 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm cursor-pointer shrink-0 overflow-hidden">
                {user.preferences?.avatar ? (
                  <img src={user.preferences.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  getInitials(user.name)
                )}
              </div>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
                <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-800 mb-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
                <button onClick={() => setActiveView("settings")} className="w-full text-left px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-white/5 transition-all flex items-center gap-2">
                  <SettingsIcon size={14} />
                  Settings
                </button>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2">
                  <LogOut size={14} />
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scroll-smooth">
          {activeView === "intercom-sla" && <SlaDashboardView />}
          {activeView === "settings" && (
            <div className="p-6">
              <SettingsView
                user={user as any}
                onUpdateUser={(updated: User) => {
                  setUser(updated);
                  localStorage.setItem("vision_user", JSON.stringify(updated));
                }}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function NavItem({
  icon,
  label,
  collapsed,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      title={collapsed ? label : ""}
      className={`flex items-center px-3 py-2.5 rounded-lg cursor-pointer font-medium transition-colors
        ${active ? "bg-brand-blue/10 text-brand-blue" : "text-[var(--text-secondary)] hover:bg-white/5"}
        ${collapsed ? "justify-center" : "gap-3"}`}
    >
      <div className={active ? "text-brand-blue" : "text-[var(--text-tertiary)]"}>{icon}</div>
      {!collapsed && <span>{label}</span>}
    </div>
  );
}
