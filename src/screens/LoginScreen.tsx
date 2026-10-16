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
    <div className="min-h-screen bg-app flex items-center justify-center p-3">
      <div className="w-full max-w-[22rem] section-card section-card-accent p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[var(--radius-control)] bg-primary text-[color:var(--color-on-primary)] flex items-center justify-center shrink-0">
            <AetherOrchLogo className="w-5 h-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <h1 className="font-display font-extrabold text-[0.95rem] tracking-[-0.03em] text-main uppercase leading-tight truncate">
              Geosan Workshop
            </h1>
            <p className="text-[0.625rem] text-muted font-mono truncate">
              Command Center · Operator gate
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="stamp stamp-success inline-flex items-center gap-1">
            <SupabaseLogo className="w-2.5 h-2.5" /> Supabase
          </span>
          <span className="stamp inline-flex items-center gap-1">
            <GitHubLogo className="w-2.5 h-2.5" /> GitHub
          </span>
          <span className="stamp inline-flex items-center gap-1">
            <PostgresLogo className="w-2.5 h-2.5 text-sky-400" /> Postgres
          </span>
        </div>

        {errorMsg && (
          <div className="px-2.5 py-2 rounded-[var(--radius-control)] bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[0.6875rem] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2.5">
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
                className="field !pl-8 !py-2"
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
                className="field !pl-8 !py-2"
              />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn btn-primary w-full disabled:opacity-50">
            {submitting ? 'Authenticating…' : 'Sign in'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="pt-2.5 border-t border-app space-y-1.5">
          <span className="text-meta block text-center">Quick access</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickOperatorLogin('geoflashsanni@gmail.com')}
              disabled={submitting}
              className="p-2 rounded-[var(--radius-control)] bg-app border border-app hover:border-emerald-500/40 text-left transition-colors disabled:opacity-50"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-main text-[0.625rem]">Lead Admin</span>
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
              </div>
              <span className="text-[0.5625rem] text-muted block truncate font-mono">
                geoflashsanni@…
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickOperatorLogin('operator@ehi-multisystems.com')}
              disabled={submitting}
              className="p-2 rounded-[var(--radius-control)] bg-app border border-app hover:border-[color:var(--color-primary)]/40 text-left transition-colors disabled:opacity-50"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-main text-[0.625rem]">EHI Operator</span>
                <Sparkles className="w-3 h-3 text-primary shrink-0" />
              </div>
              <span className="text-[0.5625rem] text-muted block truncate font-mono">
                operator@ehi…
              </span>
            </button>
          </div>
        </div>

        <p className="text-center text-[0.5625rem] font-mono text-muted">
          Multi-tenant · GoTrue
        </p>
      </div>
    </div>
  );
};
