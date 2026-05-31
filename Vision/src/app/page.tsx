"use client";

import { useState, useEffect } from "react";
import { Menu, Activity, Settings as SettingsIcon, LogOut, Bell, Headphones, ClipboardList } from "lucide-react";
import AuthView from "@/components/AuthView";
import SettingsView from "@/components/SettingsView";
import SlaDashboardView from "@/components/SlaDashboardView";
import MonitorView from "@/components/MonitorView";
import ReportView from "@/components/ReportView";

type User = { name: string; email: string; role: string; preferences?: any };

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeView, setActiveView] = useState<"intercom-sla" | "monitoring" | "report" | "settings">("intercom-sla");
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
        <div className="p-5 flex flex-col justify-center items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Ashley Digital"
            className={`object-contain transition-all duration-300 ${sidebarCollapsed ? "w-9" : "w-[120px]"}`}
          />
          {(!sidebarCollapsed || isMobile) && (
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Ashley Digital</span>
          )}
        </div>

        <nav className="flex-1 px-3 py-2 flex flex-col gap-1 overflow-y-auto hide-scrollbar">
          <NavItem
            icon={<Activity size={20} />}
            label="Intercom SLA"
            collapsed={sidebarCollapsed}
            active={activeView === "intercom-sla"}
            onClick={() => setActiveView("intercom-sla")}
          />
          <NavItem
            icon={<Headphones size={20} />}
            label="Agent Monitoring"
            collapsed={sidebarCollapsed}
            active={activeView === "monitoring"}
            onClick={() => setActiveView("monitoring")}
          />
          <NavItem
            icon={<ClipboardList size={20} />}
            label="Behavior Report"
            collapsed={sidebarCollapsed}
            active={activeView === "report"}
            onClick={() => setActiveView("report")}
          />
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
              <span className="hidden sm:inline">Ashley Digital</span>
              <span className="sm:hidden">Ashley</span>
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
          {activeView === "monitoring" && <MonitorView />}
          {activeView === "report" && <ReportView />}
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
