import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { isDemoMode } from '../lib/supabase';
import {
  AetherOrchLogo,
  SupabaseLogo,
  GitHubLogo,
  PostgresLogo
} from '../components/ServiceLogos';
import { Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('geoflashsanni@gmail.com');
  const [password, setPassword] = useState('password123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await signIn(email.trim(), password || 'operator-session');
      if (res.error) {
        setErrorMsg(res.error.message || 'Invalid credentials');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickOperatorLogin = async (targetEmail: string) => {
    setEmail(targetEmail);
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await signIn(targetEmail, 'operator-session');
      if (res.error) {
        setErrorMsg(res.error.message || 'Failed to authenticate operator');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#161b22] border border-white/10 rounded-[16px] p-7 sm:p-8 shadow-2xl space-y-6">
        {/* Brand Header with Official Emblem */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-gradient-to-b from-[#1c2333] to-[#0d1117] border border-white/10 shadow-lg">
            <AetherOrchLogo className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#e6edf3]">
              GEOSAN-WORKSHOP Command Center
            </h1>
            <p className="text-xs text-[#8b98a8] mt-1">
              Multi-Agent Orchestrator & Governance Engine
            </p>
          </div>

          {/* Connected Services Badges with Official Logos */}
          <div className="flex items-center justify-center gap-2 pt-1 font-mono text-[10px]">
            <div className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 shadow-sm">
              <SupabaseLogo className="w-3.5 h-3.5" />
              <span>Supabase Cloud</span>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 flex items-center gap-1.5 shadow-sm">
              <GitHubLogo className="w-3.5 h-3.5 text-white" />
              <span>GitHub REST</span>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-blue-950/40 border border-blue-500/40 text-blue-300 flex items-center gap-1.5 shadow-sm">
              <PostgresLogo className="w-3.5 h-3.5 text-blue-400" />
              <span>PostgreSQL</span>
            </div>
          </div>
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
              Staff Operator Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8b98a8] absolute left-3 top-3" />
              <input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="geoflashsanni@gmail.com"
                required
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="staff-password" className="block text-[#8b98a8] font-mono text-[11px] uppercase">
                Access Key / Password
              </label>
              <span className="text-[10px] text-[#8b98a8] font-mono">Staff session protected</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8b98a8] absolute left-3 top-3" />
              <input
                id="staff-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-[#F0B230] text-[#0A1420] font-bold text-xs hover:bg-[#FFBD59] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-1 cursor-pointer"
          >
            {submitting ? 'Authenticating…' : 'Sign In as Operator'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Staff Operator Access Buttons */}
        <div className="pt-3 border-t border-white/5 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b98a8] block text-center">
            Authorized Quick Access
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickOperatorLogin('geoflashsanni@gmail.com')}
              disabled={submitting}
              className="p-2.5 rounded-lg bg-[#0d1117] hover:bg-[#1a202c] border border-white/10 hover:border-emerald-500/40 text-left transition-colors text-xs group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#e6edf3] text-[11px] group-hover:text-emerald-300">
                  Lead Admin
                </span>
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="text-[10px] text-[#8b98a8] block truncate">
                geoflashsanni@gmail.com
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickOperatorLogin('operator@ehi-multisystems.com')}
              disabled={submitting}
              className="p-2.5 rounded-lg bg-[#0d1117] hover:bg-[#1a202c] border border-white/10 hover:border-[#F0B230]/40 text-left transition-colors text-xs group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#e6edf3] text-[11px] group-hover:text-[#FFBD59]">
                  EHI Operator
                </span>
                <Sparkles className="w-3 h-3 text-[#F0B230]" />
              </div>
              <span className="text-[10px] text-[#8b98a8] block truncate">
                operator@ehi-multisystems.com
              </span>
            </button>
          </div>
        </div>

        <div className="pt-2 text-center text-[10px] font-mono text-[#8b98a8]">
          <span>Protected by Multi-Tenant Governance · Supabase GoTrue Auth</span>
        </div>
      </div>
    </div>
  );
};
