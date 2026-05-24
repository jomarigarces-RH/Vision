"use client";

import React, { useState } from 'react';
import { 
  Mail, Lock, ChevronRight, Eye, EyeOff, 
  AlertCircle, ShieldQuestion, ArrowLeft,
  Moon, Sun, Zap
} from 'lucide-react';

interface AuthViewProps {
  onLogin: (user: { name: string; email: string }) => void;
}

type AuthStep = 'email' | 'setup' | 'login' | 'forgot';

export default function AuthView({ onLogin }: AuthViewProps) {
  const [step, setStep] = useState<AuthStep>('email');
  const [isDark, setIsDark] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [securityQ, setSecurityQ] = useState('');
  const [securityA, setSecurityA] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbUser, setDbUser] = useState<any>(null);

  const checkEmailStatus = async (email: string) => {
    const res = await fetch(`/api/auth?type=checkEmail&email=${encodeURIComponent(email)}`);
    return await res.json();
  };

  const registerUser = async (data: any) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ type: 'register', ...data })
    });
    return await res.json();
  };

  const loginUser = async (data: any) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ type: 'login', ...data })
    });
    const result = await res.json();
    if (result.error) throw new Error(result.error);
    return result;
  };

  const resetWithSecurity = async (data: any) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ type: 'reset', ...data })
    });
    const result = await res.json();
    if (result.error) throw new Error(result.error);
    return result;
  };

  const handleNext = async () => {
    if (!email.includes('@')) {
      setError("Please enter a valid work email.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await checkEmailStatus(email);
      if (result.exists) {
        setDbUser(result);
        setStep(result.isFirstLogin ? 'setup' : 'login');
      } else {
        setError(result.error || "Access Denied: This email is not in the Vision Roster.");
      }
    } catch (err: any) {
      setError("Connection failure. Check your network.");
    } finally { setLoading(false); }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password too short."); return; }
    setLoading(true);
    try {
      await registerUser({ email, password, securityQuestion: securityQ, securityAnswer: securityA });
      onLogin({ name: dbUser?.name || 'User', email });
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await loginUser({ email, password });
      onLogin(res.user);
    } catch (err: any) { setError(err.message || "Invalid credentials."); } finally { setLoading(false); }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 font-[Inter,sans-serif] ${isDark ? 'dark bg-[#0a0a0a] text-[#f0f0f0]' : 'bg-[#f8fafc] text-[#1e293b]'}`}>
      
      {/* Background Decor */}
      <div className="fixed inset-0 bg-grid opacity-[0.03] pointer-events-none" />
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-blue/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Theme Toggle */}
      <button onClick={() => setIsDark(!isDark)} className="fixed top-6 right-6 z-50 p-3 rounded-full border border-border-light bg-card text-secondary hover:text-brand-blue transition-all cursor-pointer">
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-[440px]">
          
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-card rounded-3xl shadow-md border border-border-light mb-5 notched-divider overflow-hidden">
               <Zap size={40} className="text-brand-blue fill-brand-blue/20" />
            </div>
            <h1 className="text-[1.8rem] font-black tracking-tight leading-tight">Vision Control</h1>
            <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-secondary mt-2">Operations Command Hub v2.0</p>
          </div>

          <div className="bg-card border border-border-light rounded-[32px] p-10 shadow-md relative overflow-hidden">
            {/* Notched Decorators */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-border-light/20">
               <div className="h-full bg-brand-blue transition-all duration-700" style={{ width: step === 'email' ? '33%' : step === 'setup' ? '66%' : '100%' }} />
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-accent-red/10 border border-accent-red/20 flex gap-3 animate-in fade-in duration-300">
                <AlertCircle className="text-accent-red shrink-0" size={18} />
                <p className="text-[0.82rem] font-semibold text-accent-red leading-tight">{error}</p>
              </div>
            )}

            {/* Steps */}
            {step === 'email' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-[1.25rem] font-extrabold mb-2">Initialize Session</h2>
                <p className="text-[0.85rem] text-secondary mb-8">Enter your security credentials to access the console.</p>
                
                <div className="space-y-5">
                  <div className="group relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary group-focus-within:text-brand-blue transition-colors" size={20} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@residenthome.com"
                      className="w-full pl-12 pr-4 py-4 bg-body rounded-2xl border border-transparent focus:border-brand-blue focus:shadow-[0_0_15px_rgba(79,125,243,0.15)] outline-none transition-all font-semibold"
                      onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                    />
                  </div>
                  <button onClick={handleNext} disabled={loading} className="w-full py-4.5 rounded-2xl bg-brand-blue text-white font-black uppercase tracking-widest text-[0.75rem] shadow-lg shadow-brand-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2">
                    {loading ? <RefreshCw className="animate-spin" size={18} /> : <>Verify Identity <ChevronRight size={18} /></>}
                  </button>
                </div>
              </div>
            )}

            {step === 'login' && (
              <form onSubmit={handleLogin} className="animate-in slide-in-from-right-4 duration-500">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-[1.25rem] font-extrabold">Authenticated Context</h2>
                    <p className="text-[0.82rem] text-secondary mt-1">{email}</p>
                  </div>
                  <button type="button" onClick={() => setStep('email')} className="p-2 text-tertiary hover:text-brand-blue transition-colors cursor-pointer"><ArrowLeft size={20} /></button>
                </div>

                <div className="space-y-5">
                  <div className="group relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary group-focus-within:text-brand-blue transition-colors" size={20} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Security Token / Password"
                      className="w-full pl-12 pr-12 py-4 bg-body rounded-2xl border border-transparent focus:border-brand-blue outline-none transition-all font-semibold"
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary cursor-pointer">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-4.5 rounded-2xl bg-brand-blue text-white font-black uppercase tracking-widest text-[0.75rem] shadow-lg shadow-brand-blue/20 hover:scale-[1.02] transition-all cursor-pointer">
                    {loading ? "Decrypting..." : "Access Console"}
                  </button>
                  <button type="button" onClick={() => setStep('forgot')} className="w-full text-center text-[0.65rem] font-black uppercase tracking-widest text-tertiary hover:text-brand-blue transition-colors cursor-pointer">Forgot Credentials?</button>
                </div>
              </form>
            )}

            {step === 'setup' && (
              <form onSubmit={handleSetup} className="animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-[1.25rem] font-extrabold mb-2">Secret Clearance</h2>
                <p className="text-[0.85rem] text-secondary mb-8">Greetings, <span className="text-brand-blue font-bold">{dbUser?.name}</span>. Secure your profile to enter.</p>
                <div className="space-y-4">
                   <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary" size={18} />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New Password" className="w-full pl-12 pr-4 py-3.5 bg-body rounded-xl border border-transparent focus:border-brand-blue outline-none text-[0.9rem] font-semibold" />
                  </div>
                  <div className="relative">
                    <ShieldQuestion className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary" size={18} />
                    <select value={securityQ} onChange={e => setSecurityQ(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-body rounded-xl border border-transparent focus:border-brand-blue outline-none text-[0.85rem] font-bold appearance-none">
                      <option value="">Select Security Question</option>
                      <option value="pet">First Pet's Name</option>
                      <option value="city">Birth City</option>
                      <option value="school">Primary School</option>
                    </select>
                  </div>
                  <input type="text" value={securityA} onChange={e => setSecurityA(e.target.value)} placeholder="Secret Answer" className="w-full px-6 py-3.5 bg-body rounded-xl border border-transparent focus:border-brand-blue outline-none text-[0.9rem] font-semibold" />
                  <button type="submit" disabled={loading} className="w-full py-4.5 rounded-2xl bg-accent-green text-white font-black uppercase tracking-widest text-[0.7rem] shadow-lg shadow-accent-green/20 hover:scale-[1.02] transition-all cursor-pointer">Initialize Profile</button>
                </div>
              </form>
            )}
          </div>

          <p className="mt-8 text-center text-[0.65rem] font-black uppercase tracking-[0.3em] text-tertiary">
            &bull; Encrypted Session &bull; v2.0.4.12
          </p>
        </div>
      </div>
    </div>
  );
}
