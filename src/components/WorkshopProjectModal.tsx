import React, { useState, useEffect } from 'react';
import { useProjects, CreateProjectParams } from '../hooks/useProjects';
import { useToast } from './Toast';
import {
  X,
  Sparkles,
  Link2,
  FolderPlus,
  Layers,
  Calendar,
  Cpu,
  Bot,
  ArrowRight,
  Check,
  Code2,
  Globe,
  Github,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export type WorkshopModalMode = 'create' | 'attach';

export interface WorkshopProjectModalProps {
  isOpen: boolean;
  initialMode?: WorkshopModalMode;
  onClose: () => void;
  onSuccess: (projectId: string) => void;
}

const ARCHETYPES = [
  { id: 'Frontend Prototype', label: 'Frontend Prototype', desc: 'UI/UX mockups, rapid screens, client showcase' },
  { id: 'Full-Stack App', label: 'Full-Stack App', desc: 'React, API routes, DB mutations, auth' },
  { id: 'Automation Script', label: 'Automation Script', desc: 'Batch worker, data scraping, cron job' },
  { id: 'Data Pipeline', label: 'Data Pipeline', desc: 'ETL ingestion, telemetry aggregates, exports' },
  { id: 'Custom', label: 'Custom', desc: 'Specialized enterprise or hardware vertical' },
];

const TECH_STACK_OPTIONS = [
  'React',
  'Next.js',
  'Supabase',
  'Vercel',
  'TypeScript',
  'Tailwind CSS',
  'Node.js',
  'PostgreSQL',
  'Other'
];

const PROVIDER_OPTIONS = [
  { id: 'Claude', label: 'Claude (Sonnet 4)', badge: 'Adversarial Critic' },
  { id: 'DeepSeek', label: 'DeepSeek (R1/V3)', badge: 'Math & Logic' },
  { id: 'Google AI Pro', label: 'Google AI Pro', badge: 'Context Master' },
  { id: 'Grok Bots', label: 'Grok Bots', badge: 'Fast Fuzzing' },
  { id: 'GitHub', label: 'GitHub Copilot / API', badge: 'PR & CI Sync' }
];

const ADVISOR_OPTIONS = [
  { provider: 'Anthropic', agentName: 'CoordinatorAgent', label: 'Anthropic · CoordinatorAgent (Default)' },
  { provider: 'Anthropic', agentName: 'ReviewAgent', label: 'Anthropic · ReviewAgent (Security & Invariants)' },
  { provider: 'Google', agentName: 'ArchitectAgent', label: 'Google · ArchitectAgent (Context & Specs)' },
  { provider: 'DeepSeek', agentName: 'FinOpsAgent', label: 'DeepSeek · FinOpsAgent (Calculus & Ledger)' },
  { provider: 'None', agentName: 'None', label: 'None (Self-directed)' },
];

const ARCHETYPE_DEFAULTS: Record<string, {
  advisor: string;
  providers: string[];
  tech: string[];
}> = {
  'Frontend Prototype': {
    advisor: 'Anthropic · CoordinatorAgent (Default)',
    providers: ['Claude', 'Google AI Pro'],
    tech: ['React', 'TypeScript', 'Tailwind CSS']
  },
  'Full-Stack App': {
    advisor: 'Anthropic · ReviewAgent (Security & Invariants)',
    providers: ['Claude', 'DeepSeek', 'GitHub'],
    tech: ['React', 'TypeScript', 'Supabase', 'PostgreSQL']
  },
  'Automation Script': {
    advisor: 'DeepSeek · FinOpsAgent (Calculus & Ledger)',
    providers: ['DeepSeek', 'Grok Bots'],
    tech: ['Node.js', 'TypeScript', 'Other']
  },
  'Data Pipeline': {
    advisor: 'Google · ArchitectAgent (Context & Specs)',
    providers: ['Google AI Pro', 'DeepSeek'],
    tech: ['Node.js', 'PostgreSQL', 'TypeScript']
  },
  'Custom': {
    advisor: 'Anthropic · CoordinatorAgent (Default)',
    providers: ['Claude', 'DeepSeek', 'GitHub'],
    tech: ['React', 'TypeScript', 'Vercel']
  },
};

export function parseGitHubRepo(input: string): { owner: string; repo: string; full: string; url: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const clean = trimmed.replace(/^git@github\.com:/, 'https://github.com/').replace(/\.git$/, '');
  const urlMatch = clean.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)\/?$/);
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2],
      full: `${urlMatch[1]}/${urlMatch[2]}`,
      url: `https://github.com/${urlMatch[1]}/${urlMatch[2]}`
    };
  }
  const simpleMatch = clean.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)\/?$/);
  if (simpleMatch) {
    return {
      owner: simpleMatch[1],
      repo: simpleMatch[2],
      full: `${simpleMatch[1]}/${simpleMatch[2]}`,
      url: `https://github.com/${simpleMatch[1]}/${simpleMatch[2]}`
    };
  }
  return null;
}

export const WorkshopProjectModal: React.FC<WorkshopProjectModalProps> = ({
  isOpen,
  initialMode = 'create',
  onClose,
  onSuccess
}) => {
  const toast = useToast();
  const { createProject } = useProjects();

  const [mode, setMode] = useState<WorkshopModalMode>(initialMode);
  const [archetype, setArchetype] = useState<string>('Full-Stack App');
  const [name, setName] = useState<string>('');
  const [goal, setGoal] = useState<string>('');
  const [selectedTech, setSelectedTech] = useState<string[]>(['React', 'TypeScript', 'Supabase']);
  const [mainFeatures, setMainFeatures] = useState<string>('');
  const [deadline, setDeadline] = useState<string>('');
  const [enabledProviders, setEnabledProviders] = useState<string[]>(['Claude', 'DeepSeek', 'GitHub']);

  // Attach Existing fields
  const [sourceType, setSourceType] = useState<'github' | 'external'>('github');
  const [sourceRef, setSourceRef] = useState<string>('');
  const [repoVerifiedState, setRepoVerifiedState] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [verifiedRepoLabel, setVerifiedRepoLabel] = useState<string>('');

  // Advisor
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>('Anthropic · CoordinatorAgent (Default)');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setName('');
      setGoal('');
      setMainFeatures('');
      setDeadline('');
      setSourceRef('');
      setRepoVerifiedState('idle');
      setVerifiedRepoLabel('');
      if (initialMode === 'attach') {
        setArchetype('Custom');
      } else {
        setArchetype('Full-Stack App');
      }
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleVerifyRepo = () => {
    if (!sourceRef.trim()) {
      setRepoVerifiedState('invalid');
      toast.error('Please enter a GitHub repository URL or owner/repo first.');
      return;
    }
    const parsed = parseGitHubRepo(sourceRef);
    if (parsed) {
      setRepoVerifiedState('valid');
      setVerifiedRepoLabel(parsed.full);
      toast.success(`Verified GitHub format: ${parsed.full}`);
      if (!name) {
        setName(parsed.repo);
      }
    } else {
      setRepoVerifiedState('invalid');
      toast.error('Invalid format. Use owner/repo or https://github.com/owner/repo');
    }
  };

  const selectArchetype = (archId: string) => {
    setArchetype(archId);
    const defaults = ARCHETYPE_DEFAULTS[archId];
    if (defaults) {
      setSelectedAdvisor(defaults.advisor);
      setEnabledProviders(defaults.providers);
      setSelectedTech(defaults.tech);
    }
  };

  const toggleTech = (t: string) => {
    setSelectedTech((prev) =>
      prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]
    );
  };

  const toggleProvider = (p: string) => {
    setEnabledProviders((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a project name.');
      return;
    }

    if (mode === 'attach' && sourceType === 'github' && !sourceRef.trim()) {
      toast.error('GitHub source reference / repository URL is required.');
      return;
    }
    if (mode === 'attach' && !sourceRef.trim()) {
      toast.error('Please provide a repository URL or source reference.');
      return;
    }

    const advisorMatch = ADVISOR_OPTIONS.find((a) => a.label === selectedAdvisor) || ADVISOR_OPTIONS[0];

    try {
      setIsSubmitting(true);

      // Parse and normalize GitHub source reference
      let normalizedRef = sourceRef.trim();
      let normalizedUrl: string | null = null;
      if (mode === 'attach' && sourceType === 'github') {
        const parsed = parseGitHubRepo(sourceRef);
        if (parsed) {
          normalizedRef = parsed.full;
          normalizedUrl = parsed.url;
        } else {
          normalizedUrl = sourceRef.startsWith('http') ? sourceRef.trim() : `https://github.com/${sourceRef.trim()}`;
        }
      } else if (mode === 'attach' && sourceRef.startsWith('http')) {
        normalizedUrl = sourceRef.trim();
      }

      const params: CreateProjectParams = {
        name: name.trim(),
        vertical: archetype.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        archetype,
        goal: goal.trim(),
        tech_stack: selectedTech,
        main_features: mainFeatures.trim(),
        deadline: deadline.trim() || undefined,
        enabled_providers: enabledProviders,
        advisor_provider: advisorMatch.provider !== 'None' ? advisorMatch.provider : undefined,
        advisor_agent_name: advisorMatch.agentName !== 'None' ? advisorMatch.agentName : undefined,
        source_type: mode === 'attach' ? sourceType : 'template',
        source_ref: mode === 'attach' ? normalizedRef : '',
        repo_url: normalizedUrl,
        monthly_budget_usd: 1000
      };

      const created = await createProject(params);

      // Write initial project_logs entry for new project lifecycle audit
      const logMessage = mode === 'attach'
        ? (sourceType === 'github'
            ? `Project attached from GitHub: ${normalizedRef}`
            : `Project attached: ${created.name}`)
        : `Project created: ${created.name}`;

      const initialLog = {
        id: `log-init-${Date.now()}`,
        project_id: created.id,
        timestamp: new Date().toLocaleTimeString(),
        agent: 'Supervisor',
        provider: advisorMatch.provider !== 'None' ? advisorMatch.provider : 'local',
        actionType: 'status',
        level: 'info' as const,
        message: logMessage,
        payload: {
          event: mode === 'attach' ? 'PROJECT_ATTACHED' : 'PROJECT_CREATED',
          archetype,
          tech_stack: selectedTech,
          enabled_providers: enabledProviders,
          source_type: mode === 'attach' ? sourceType : 'template',
          source_ref: mode === 'attach' ? normalizedRef : '',
          github_url: normalizedUrl,
          advisor: advisorMatch.label,
          created_at: new Date().toISOString()
        }
      };

      try {
        const storedLogs = JSON.parse(localStorage.getItem(`geosan_project_logs_${created.id}`) || '[]');
        localStorage.setItem(`geosan_project_logs_${created.id}`, JSON.stringify([initialLog, ...storedLogs]));
        window.dispatchEvent(new CustomEvent('geosan_project_log_new', { detail: initialLog }));
      } catch {}

      toast.success(
        mode === 'attach'
          ? `Attached "${created.name}" successfully!`
          : `Initialized "${created.name}" workspace!`
      );
      onSuccess(created.id);
    } catch {
      toast.error('Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[color:var(--bg-card)] border border-[color:var(--border-app)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-mono text-xs text-main"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[color:var(--border-app)] bg-[color:var(--bg-app)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              {mode === 'attach' ? <Link2 className="w-3.5 h-3.5" /> : <FolderPlus className="w-3.5 h-3.5" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-main font-mono">
                {mode === 'attach' ? 'Attach Existing Repository' : 'Create New Project'}
              </h2>
              <span className="text-[10px] text-muted">
                {mode === 'attach'
                  ? 'Connect an existing GitHub repo or external URL to the command center'
                  : 'Configure project archetype, technology stack, and autonomous advisor'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Toggle Switch */}
            <div className="p-0.5 rounded-lg bg-black/30 border border-white/5 flex items-center text-[10px]">
              <button
                type="button"
                onClick={() => setMode('create')}
                className={`px-2 py-1 rounded-md font-bold transition-all ${
                  mode === 'create' ? 'bg-primary text-[#0A1420]' : 'text-muted hover:text-main'
                }`}
              >
                New
              </button>
              <button
                type="button"
                onClick={() => setMode('attach')}
                className={`px-2 py-1 rounded-md font-bold transition-all ${
                  mode === 'attach' ? 'bg-primary text-[#0A1420]' : 'text-muted hover:text-main'
                }`}
              >
                Attach
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-white/5 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Step 0: Archetype Chips */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-meta flex items-center justify-between">
              <span>Step 0 · Project Archetype</span>
              <span className="text-primary font-normal">{archetype}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ARCHETYPES.map((arch) => {
                const isSelected = archetype === arch.id;
                return (
                  <button
                    key={arch.id}
                    type="button"
                    onClick={() => selectArchetype(arch.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1 ${
                      isSelected
                        ? 'bg-primary-container/30 border-primary shadow-xs ring-1 ring-primary'
                        : 'bg-[color:var(--bg-app)] border-[color:var(--border-app)] hover:border-white/15'
                    }`}
                  >
                    <span className="font-bold text-xs text-main block truncate">{arch.label}</span>
                    <span className="text-[9px] text-muted line-clamp-1 font-sans">{arch.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Attach Specific Source Fields */}
          {mode === 'attach' && (
            <div className="p-3.5 rounded-xl bg-app border border-primary/30 space-y-3">
              <span className="text-[10px] uppercase tracking-wider font-bold text-primary block flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                Repository / Source Attachment
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-meta block">Source Type</label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value as 'github' | 'external')}
                    className="w-full bg-[color:var(--bg-card)] border border-[color:var(--border-app)] rounded-lg p-2 text-xs font-mono text-main focus:outline-none focus:border-primary"
                  >
                    <option value="github">GitHub Repository</option>
                    <option value="external">External / Custom URL</option>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] text-meta flex items-center justify-between">
                    <span>Source Reference / Repo URL</span>
                    <span className="text-muted">owner/repo or https://...</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sourceRef}
                      onChange={(e) => {
                        setSourceRef(e.target.value);
                        setRepoVerifiedState('idle');
                        if (!name) {
                          const parts = e.target.value.split('/');
                          const candidate = parts[parts.length - 1]?.replace('.git', '');
                          if (candidate) setName(candidate);
                        }
                      }}
                      placeholder={sourceType === 'github' ? 'geosan11/GEOSAN-WORKSHOP or https://github.com/...' : 'https://api.external.com/v1'}
                      className="flex-1 bg-[color:var(--bg-card)] border border-[color:var(--border-app)] rounded-lg p-2 text-xs font-mono text-main focus:outline-none focus:border-primary"
                    />
                    {sourceType === 'github' && (
                      <button
                        type="button"
                        onClick={handleVerifyRepo}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 shrink-0 border ${
                          repoVerifiedState === 'valid'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                            : 'bg-white/5 text-muted hover:text-main border-[color:var(--border-app)] hover:border-primary/40'
                        }`}
                        title="Validate repository format without requiring API token"
                      >
                        {repoVerifiedState === 'valid' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Github className="w-3.5 h-3.5" />
                        )}
                        <span>{repoVerifiedState === 'valid' ? 'Verified' : 'Verify repo'}</span>
                      </button>
                    )}
                  </div>
                  {sourceType === 'github' && repoVerifiedState === 'valid' && (
                    <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 pt-0.5">
                      <Check className="w-3 h-3" />
                      <span>Format confirmed: {verifiedRepoLabel}</span>
                    </div>
                  )}
                  {sourceType === 'github' && repoVerifiedState === 'invalid' && (
                    <div className="text-[10px] text-rose-400 font-mono flex items-center gap-1 pt-0.5">
                      <AlertCircle className="w-3 h-3" />
                      <span>Format invalid: Use owner/repo or https://github.com/owner/repo</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Core Info: Name & Goal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-meta flex items-center justify-between">
                <span>Project Name</span>
                <span className="text-rose-400 font-normal">*required</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bilateral Netting Engine"
                className="w-full bg-[color:var(--bg-app)] border border-[color:var(--border-app)] rounded-lg p-2 text-xs font-mono text-main focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-meta flex items-center justify-between">
                <span>Target Deadline (Optional)</span>
                <Calendar className="w-3 h-3 text-muted" />
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-[color:var(--bg-app)] border border-[color:var(--border-app)] rounded-lg p-2 text-xs font-mono text-main focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* One-Sentence Goal */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-bold text-meta block">
              One-Sentence Goal
            </label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Reconcile micro-kobo settlement transactions with zero floating point drift"
              className="w-full bg-[color:var(--bg-app)] border border-[color:var(--border-app)] rounded-lg p-2 text-xs font-mono text-main focus:outline-none focus:border-primary"
            />
          </div>

          {/* Tech Stack Chips */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-meta block">
              Tech Stack Selection
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TECH_STACK_OPTIONS.map((tech) => {
                const isSelected = selectedTech.includes(tech);
                return (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => toggleTech(tech)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-primary-container text-primary border-primary font-bold'
                        : 'bg-[color:var(--bg-app)] text-muted border-[color:var(--border-app)] hover:text-main'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    <span>{tech}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Features Description */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-bold text-meta block">
              Main Features / Invariants
            </label>
            <textarea
              rows={2}
              value={mainFeatures}
              onChange={(e) => setMainFeatures(e.target.value)}
              placeholder="e.g. Double-entry ledger, Bilateral netting, Automated Schemathesis contract suite"
              className="w-full bg-[color:var(--bg-app)] border border-[color:var(--border-app)] rounded-lg p-2 text-xs font-mono text-main focus:outline-none focus:border-primary leading-relaxed"
            />
          </div>

          {/* Enabled Providers (Pills) */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-meta block flex items-center justify-between">
              <span>Enabled AI & Cloud Providers</span>
              <span className="text-muted">{enabledProviders.length} active</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PROVIDER_OPTIONS.map((prov) => {
                const isEnabled = enabledProviders.includes(prov.id);
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => toggleProvider(prov.id)}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isEnabled
                        ? 'bg-primary-container/20 border-primary text-main'
                        : 'bg-[color:var(--bg-app)] border-[color:var(--border-app)] text-muted'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-xs block truncate">{prov.label}</span>
                      <span className="text-[9px] text-muted block">{prov.badge}</span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isEnabled ? 'bg-primary border-primary text-[#0A1420]' : 'border-white/20'
                      }`}
                    >
                      {isEnabled && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Advisor Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-bold text-meta flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-primary" />
              <span>Assigned Strategic Advisor (Optional)</span>
            </label>
            <select
              value={selectedAdvisor}
              onChange={(e) => setSelectedAdvisor(e.target.value)}
              className="w-full bg-[color:var(--bg-app)] border border-[color:var(--border-app)] rounded-lg p-2 text-xs font-mono text-main focus:outline-none focus:border-primary"
            >
              {ADVISOR_OPTIONS.map((adv) => (
                <option key={adv.label} value={adv.label}>
                  {adv.label}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-[color:var(--border-app)] bg-[color:var(--bg-app)] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost text-xs py-1.5 px-3"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting || !name.trim()}
            onClick={handleSubmit}
            className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Initializing…' : mode === 'attach' ? 'Attach & Start Monitoring' : 'Create Project & Start Planning'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
