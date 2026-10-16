import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import {
  AetherOrchLogo,
  SupabaseLogo,
  GitHubLogo,
  PostgresLogo
} from '../components/ServiceLogos';
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen bg-app flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-lg space-y-8">
        <div className="space-y-4 text-center sm:text-left">
          <div className="inline-flex items-center gap-2">
            <span className="w-8 h-8 rounded-[var(--radius-control)] bg-ink text-[color:var(--color-on-ink)] flex items-center justify-center">
              <AetherOrchLogo className="w-4 h-4" />
            </span>
            <span className="font-display font-extrabold text-sm tracking-[-0.03em] uppercase text-main">
              Geosan
            </span>
          </div>
          <h1 className="font-display font-extrabold text-[2rem] sm:text-[2.5rem] leading-[1.05] tracking-[-0.04em] text-main max-w-md">
            Make a living building what you ship.
          </h1>
          <p className="text-sm text-muted max-w-md leading-relaxed">
            Operator gate for the multi-agent command center — approve plans, run verticals, watch spend.
          </p>
        </div>

        <div className="section-card p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="stamp stamp-success inline-flex items-center gap-1">
              <SupabaseLogo className="w-2.5 h-2.5" /> Supabase
            </span>
            <span className="stamp inline-flex items-center gap-1">
              <GitHubLogo className="w-2.5 h-2.5" /> GitHub
            </span>
            <span className="stamp inline-flex items-center gap-1">
              <PostgresLogo className="w-2.5 h-2.5 text-sky-700" /> Postgres
            </span>
          </div>

          {errorMsg && (
            <div className="px-2.5 py-2 rounded-[var(--radius-control)] bg-rose-500/10 border border-rose-500/30 text-rose-700 text-[0.6875rem] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="staff-email" className="text-meta block">
                Staff email
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  id="staff-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="geoflashsanni@gmail.com"
                  required
                  className="field !pl-8"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="staff-password" className="text-meta block">
                  Access key
                </label>
                <span className="text-[0.5625rem] text-muted font-mono">Protected</span>
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  id="staff-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="field !pl-8"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button type="submit" disabled={submitting} className="btn btn-primary btn-pill flex-1 disabled:opacity-50">
                {submitting ? 'Authenticating…' : 'Sign in'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          <div className="pt-3 border-t border-app space-y-2">
            <span className="text-meta block">Quick access</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickOperatorLogin('geoflashsanni@gmail.com')}
                disabled={submitting}
                className="btn btn-ink btn-pill w-full !normal-case !tracking-normal !text-[0.6875rem] justify-between disabled:opacity-50"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  Lead Admin
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickOperatorLogin('operator@ehi-multisystems.com')}
                disabled={submitting}
                className="btn btn-ghost btn-pill w-full !normal-case !tracking-normal !text-[0.6875rem] justify-between disabled:opacity-50"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Sparkles className="w-3 h-3 text-primary shrink-0" />
                  EHI Operator
                </span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center sm:text-left text-[0.625rem] font-mono text-muted">
          Multi-tenant governance · Supabase GoTrue
        </p>
      </div>
    </div>
  );
};
