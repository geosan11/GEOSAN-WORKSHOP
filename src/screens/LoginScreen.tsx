import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { isDemoMode } from '../lib/supabase';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('operator@ehi-multisystems.com');
  const [password, setPassword] = useState('password123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await signIn(email.trim(), password.trim());
      if (res.error) {
        setErrorMsg(res.error.message || 'Invalid credentials');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#161b22] border border-white/10 rounded-[16px] p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#F0B230]/10 border border-[#F0B230]/30 text-[#F0B230] mb-1">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#e6edf3]">
            AetherOrch Command Center
          </h1>
          <p className="text-xs text-[#8b98a8]">
            Multi-Agent Software Orchestration Platform
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label htmlFor="staff-email" className="block text-[#8b98a8] font-mono text-[11px] uppercase">
              Staff Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8b98a8] absolute left-3 top-3" />
              <input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@ehi-multisystems.com"
                required
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="staff-password" className="block text-[#8b98a8] font-mono text-[11px] uppercase">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8b98a8] absolute left-3 top-3" />
              <input
                id="staff-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-[#F0B230] text-[#0A1420] font-bold text-xs hover:bg-[#FFBD59] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-2"
          >
            {submitting ? 'Authenticating…' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-white/5 text-center text-[11px] text-[#8b98a8]">
          {isDemoMode ? (
            <span className="text-[#FFBD59] font-mono">
              Running in Demo Mode · Enter any password to explore
            </span>
          ) : (
            <span>Internal enterprise tool. Staff access provisioned by admin.</span>
          )}
        </div>
      </div>
    </div>
  );
};
