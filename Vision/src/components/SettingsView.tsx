"use client";

import React, { useState, useEffect } from 'react';

import { 
  User, 
  Settings as SettingsIcon, 
  ShieldCheck, 
  Camera, 
  Moon, 
  Sun, 
  Clock, 
  Eye, 
  RefreshCcw, 
  UserMinus, 
  CheckCircle2,
  AlertCircle,
  Save,
  UserPlus
} from 'lucide-react';

interface SettingsViewProps {
  user: { name: string; email: string; role: string; preferences?: any };
  onUpdateUser: (userData: any) => void;
}

export default function SettingsView({ user, onUpdateUser }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'admin'>('profile');
  const [name, setName] = useState(user.name);
  const [timezone, setTimezone] = useState(user.preferences?.timezone || 'UTC');
  const [defaultView, setDefaultView] = useState(user.preferences?.defaultView || 'Past week');
  const [darkMode, setDarkMode] = useState(false);
  const [avatar, setAvatar] = useState(user.preferences?.avatar || '');
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // Backend logic replacements
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    if (user.role === 'admin' && activeTab === 'admin') {
      fetch('/api/auth?type=listUsers&email=' + encodeURIComponent(user.email))
        .then(res => res.json())
        .then(data => setAllUsers(data || []))
        .catch(err => console.error(err));
    }
  }, [user.role, activeTab, user.email]);

  const callUpdateSettings = async (updates: any) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ type: 'updateSettings', email: user.email, ...updates })
    });
    return await res.json();
  };

  const callManageUser = async (userId: string, action: string) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ type: 'manageUser', email: user.email, userId, action })
    });
    return await res.json();
  };


  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const handleToggleDarkMode = () => {
    const newDark = !darkMode;
    setDarkMode(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSaveProfile = async () => {
    try {
      await callUpdateSettings({ 
        name, 
        timezone, 
        avatar, 
        defaultView 
      });
      onUpdateUser({ ...user, name, preferences: { timezone, avatar, defaultView } });
      setStatus({ type: 'success', msg: 'Profile updated successfully!' });
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    }
  };

  const handleAdminAction = async (userId: string, action: string) => {
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      const res = await callManageUser(userId, action);
      if (res.error) throw new Error(res.error);
      setStatus({ type: 'success', msg: `User ${action}ed successfully!` });
      // Refresh user list
      const updatedList = await fetch('/api/auth?type=listUsers&email=' + encodeURIComponent(user.email)).then(r => r.json());
      setAllUsers(updatedList || []);
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Account Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your profile, preferences, and system access.</p>
      </div>

      {status && (
        <div className={`mb-6 p-4 rounded-2xl border flex items-center gap-3 animate-in slide-in-from-top-2 ${
          status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="font-bold text-sm">{status.msg}</p>
          <button onClick={() => setStatus(null)} className="ml-auto text-current opacity-50 hover:opacity-100 font-bold text-xs uppercase">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${
              activeTab === 'profile' ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <User size={20} />
            Profile
          </button>
          <button 
            onClick={() => setActiveTab('preferences')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${
              activeTab === 'preferences' ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <SettingsIcon size={20} />
            Preferences
          </button>
          {user.role === 'admin' && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${
                activeTab === 'admin' ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck size={20} />
              Admin Hub
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
          
          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <div className="animate-in fade-in duration-300">
              <div className="flex items-center gap-6 mb-10">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-700 shadow-lg">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} className="text-slate-300" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-brand-blue text-white rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg shadow-brand-blue/20">
                    <Camera size={16} />
                    <input type="file" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                         const reader = new FileReader();
                         reader.onloadend = () => setAvatar(reader.result as string);
                         reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">{user.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">{user.email}</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-brand-blue-light dark:bg-brand-blue/10 text-brand-blue text-[10px] font-black uppercase tracking-widest rounded-full border border-brand-blue/20">
                    {user.role} Account
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-brand-blue focus:bg-white dark:focus:bg-slate-800 rounded-2xl outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Timezone</label>
                  <select 
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-brand-blue focus:bg-white dark:focus:bg-slate-800 rounded-2xl outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                  >
                    <option value="UTC">UTC (Universal Time)</option>
                    <option value="EST">EST (Eastern Time)</option>
                    <option value="PST">PST (Pacific Time)</option>
                    <option value="PHT">PHT (Philippine Time)</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button 
                  onClick={handleSaveProfile}
                  className="bg-brand-blue text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-brand-blue/20 hover:bg-blue-600 transition-all flex items-center gap-2"
                >
                  <Save size={18} />
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* TAB: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="animate-in fade-in duration-300 space-y-8">
              <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${darkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-500'}`}>
                    {darkMode ? <Moon size={24} /> : <Sun size={24} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white">Dark Mode</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Easier on the eyes in low light.</p>
                  </div>
                </div>
                <button 
                  onClick={handleToggleDarkMode}
                  className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${darkMode ? 'bg-indigo-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${darkMode ? 'left-7 shadow-lg' : 'left-1'}`} />
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock size={16} />
                  Default Dashboard View
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['Today', 'Past week', 'Month to date'].map(view => (
                    <button
                      key={view}
                      onClick={() => setDefaultView(view)}
                      className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all ${
                        defaultView === view 
                          ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' 
                          : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      {view}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: ADMIN */}
          {activeTab === 'admin' && (
            <div className="animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">User Management</h3>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{allUsers?.length || 0} Registered Users</span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {allUsers?.map((u: any) => (
                  <div key={u._id} className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-3xl flex items-center justify-between group hover:border-brand-blue/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center font-bold text-brand-blue shadow-sm">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-slate-800 dark:text-slate-200">{u.name}</h5>
                          {u.isRevoked && (
                            <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase rounded-full">Revoked</span>
                          )}
                          {u.role === 'admin' && (
                            <span className="px-2 py-0.5 bg-brand-blue-light dark:bg-brand-blue/10 text-brand-blue text-[9px] font-black uppercase rounded-full">Admin</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-medium">{u.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleAdminAction(u._id, 'resetPassword')}
                        title="Reset Password"
                        className="p-2.5 text-slate-400 hover:text-brand-blue hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm"
                      >
                        <RefreshCcw size={16} />
                      </button>
                      {u.isRevoked ? (
                        <button 
                          onClick={() => handleAdminAction(u._id, 'restore')}
                          title="Restore Access"
                          className="p-2.5 text-slate-400 hover:text-emerald-500 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm"
                        >
                          <UserPlus size={16} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleAdminAction(u._id, 'revoke')}
                          title="Revoke Access"
                          disabled={u.email === user.email}
                          className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm disabled:opacity-30"
                        >
                          <UserMinus size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
