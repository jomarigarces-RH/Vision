"use client";

import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  Mail, 
  Lock, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ShieldQuestion, 
  ArrowLeft 
} from 'lucide-react';

interface AuthViewProps {
  onLogin: (user: { name: string; email: string }) => void;
}

type AuthStep = 'email' | 'setup' | 'login' | 'forgot';

export default function AuthView({ onLogin }: AuthViewProps) {
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [securityQ, setSecurityQ] = useState('');
  const [securityA, setSecurityA] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Backend Hooks
  const checkEmail = useQuery(api.auth.checkEmail, { email });
  const register = useMutation(api.auth.registerUser);
  const login = useMutation(api.auth.loginUser);
  const reset = useMutation(api.auth.resetWithSecurity);

  const handleNext = async () => {
    if (!email.includes('@')) {
      setError("Please enter a valid email address.");
      return;
    }
    setError('');
    
    // Check email status
    if (checkEmail?.exists) {
      if (checkEmail.isFirstLogin) {
        setStep('setup');
      } else {
        setStep('login');
      }
    } else if (checkEmail !== undefined) {
      setError("This email is not authorized to access the Vision Dashboard.");
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!securityQ || !securityA) {
      setError("Please complete all security setup fields.");
      return;
    }
    
    setLoading(true);
    try {
      await register({ email, password, securityQuestion: securityQ, securityAnswer: securityA });
      onLogin({ name: checkEmail?.name || 'User', email });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login({ email, password });
      onLogin(res.user);
    } catch (err: any) {
      setError("Incorrect password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await reset({ email, securityAnswer: securityA, newPassword: password });
      setStep('login');
      setError('');
    } catch (err: any) {
      setError("Incorrect security answer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl shadow-brand-blue/10 mb-4">
            <svg width="40" height="40" viewBox="0 0 120 148" fill="none">
              <path d="M12 8 L12 100 L30 100 L30 68 L58 68 L78 100 L98 100 L74 64 C88 58 96 46 96 32 C96 14 82 8 62 8 Z M30 24 L58 24 C72 24 78 28 78 38 C78 48 72 54 58 54 L30 54 Z" fill="#4F7DF3" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Vision Dashboard</h1>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Authorized Access Only</p>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-[32px] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
          
          {/* Progress Decorator */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-50">
             <div 
               className="h-full bg-brand-blue transition-all duration-500" 
               style={{ width: step === 'email' ? '25%' : step === 'setup' ? '75%' : '100%' }}
             />
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-rose-600 font-medium leading-tight">{error}</p>
            </div>
          )}

          {/* STEP: EMAIL */}
          {step === 'email' && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">Welcome Back</h2>
                <p className="text-sm text-slate-500 mt-1">Enter your work email to continue.</p>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="text-slate-300 group-focus-within:text-brand-blue transition-colors" size={20} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@residenthome.com"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-blue focus:outline-none transition-all text-slate-700 font-medium"
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  />
                </div>

                <button
                  onClick={handleNext}
                  className="w-full bg-brand-blue text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-blue/20 hover:bg-blue-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                >
                  Continue
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* STEP: FIRST TIME SETUP */}
          {step === 'setup' && (
            <form onSubmit={handleSetup} className="animate-in slide-in-from-right-4 duration-300">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">Account Setup</h2>
                <p className="text-sm text-slate-500 mt-1">Hello, <span className="text-brand-blue font-bold">{checkEmail?.name}</span>! Set up your secure password and security question.</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-blue focus:outline-none transition-all"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="h-px bg-slate-100 my-2" />

                <div className="relative">
                  <ShieldQuestion className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <select
                    value={securityQ}
                    onChange={(e) => setSecurityQ(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-blue focus:outline-none transition-all appearance-none text-slate-700 font-medium"
                  >
                    <option value="">Choose a Security Question</option>
                    <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                    <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                    <option value="In what city were you born?">In what city were you born?</option>
                    <option value="What was your first car?">What was your first car?</option>
                  </select>
                </div>

                <input
                  type="text"
                  value={securityA}
                  onChange={(e) => setSecurityA(e.target.value)}
                  placeholder="Your Answer"
                  className="w-full px-6 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-blue focus:outline-none transition-all"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Finish Setup & Enter"}
                </button>
              </div>
            </form>
          )}

          {/* STEP: LOGIN */}
          {step === 'login' && (
            <form onSubmit={handleLogin} className="animate-in slide-in-from-right-4 duration-300">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Enter Password</h2>
                  <p className="text-sm text-slate-500 mt-1">{email}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setStep('email')} 
                  className="p-2 text-slate-400 hover:text-brand-blue transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-blue focus:outline-none transition-all"
                    autoFocus
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-blue text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-blue/20 hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('forgot')}
                  className="w-full text-xs text-slate-400 font-bold hover:text-brand-blue transition-colors uppercase tracking-widest"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          )}

          {/* STEP: FORGOT PASSWORD */}
          {step === 'forgot' && (
            <form onSubmit={handleReset} className="animate-in slide-in-from-right-4 duration-300">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">Account Recovery</h2>
                <p className="text-sm text-slate-500 mt-1">{checkEmail?.securityQuestion}</p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  value={securityA}
                  onChange={(e) => setSecurityA(e.target.value)}
                  placeholder="Answer"
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-blue focus:outline-none transition-all"
                  autoFocus
                />

                <div className="h-px bg-slate-100 my-2 text-center relative">
                   <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[10px] text-slate-300 uppercase font-bold tracking-widest">Then Set New Password</span>
                </div>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New Password"
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-blue focus:outline-none transition-all"
                />

                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setStep('login')}
                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] bg-brand-blue text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-blue/20 hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
            Protected by Vision Security System &bull; &copy; 2026
          </p>
        </div>

      </div>
    </div>
  );
}
