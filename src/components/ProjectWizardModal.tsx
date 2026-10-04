import React, { useState, useEffect } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useNavigation } from '../lib/navigation';
import { useToast } from './Toast';
import {
  FolderGit2,
  X,
  Compass,
  DollarSign,
  Layers,
  Sparkles,
  GitBranch,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Cpu,
  Clock,
  Check,
  Terminal,
  AlertTriangle,
  Lock,
  Workflow,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export interface ProjectWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (projectId: string) => void;
  initialTemplateId?: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  vertical: string;
  badge: string;
  badgeColor: string;
  description: string;
  stack: string[];
  defaultBudget: number;
  recommendedAgent: string;
  recommendedModel: string;
  defaultInstructions: string;
  scaffoldFiles: string[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'fintech-ledger',
    name: 'Fintech & Enterprise Ledger',
    vertical: 'Fintech & Enterprise Ledger',
    badge: 'Strict Invariant Math',
    badgeColor: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40',
    description: 'Double-entry ledger with BigInt micro-kobo currency representation, bilateral netting engine, and zero floating-point drift assertions.',
    stack: ['React 19', 'TypeScript Strict', 'Vitest', 'PostgreSQL RLS'],
    defaultBudget: 1200,
    recommendedAgent: 'FullStackAgent',
    recommendedModel: 'deepseek-r1',
    defaultInstructions: 'Strict financial invariant testing required. Never push to main branch without ReviewAgent signoff and 100% test pass on settlement reconciliations.',
    scaffoldFiles: [
      'src/settlement/bilateralNetting.ts',
      'src/api/routes/settle.ts',
      'test/settlementNetting.spec.ts',
      'ARCHITECTURE.md'
    ]
  },
  {
    id: 'agri-iot',
    name: 'Agri-Processing & Scalehouse IoT',
    vertical: 'Agri-processing & Supply Chain',
    badge: 'Offline-First Hardware',
    badgeColor: 'bg-amber-950/60 text-amber-400 border-amber-500/40',
    description: 'Offline-first outbox synchronization for refinery scale-house tablets with Bluetooth weighbridge scale driver integration and gate pass verification.',
    stack: ['React PWA', 'Web Serial API', 'IndexedDB Outbox', 'MQTT Daemon'],
    defaultBudget: 800,
    recommendedAgent: 'HardwareEdgeAgent',
    recommendedModel: 'deepseek-v3',
    defaultInstructions: 'Offline-first sync for refinery scale-house tablets. Validate Bluetooth weight-bridge driver parity on mobile builds and 4-hour blackout survival.',
    scaffoldFiles: [
      'src/scalehouse/bluetoothDriver.ts',
      'src/storage/outboxQueue.ts',
      'src/sync/satelliteRelay.ts',
      'ARCHITECTURE.md'
    ]
  },
  {
    id: 'aviation-efb',
    name: 'Aviation Flight Deck & EFB',
    vertical: 'Flight Deck & FAA Compliance',
    badge: 'FAA Part 121 Safety',
    badgeColor: 'bg-cyan-950/60 text-cyan-400 border-cyan-500/40',
    description: 'Electronic Flight Bag turnaround manager with RSA-4096 cryptographic captain signoff, weight & balance CG envelopes, and runway ramp telemetry.',
    stack: ['React 19', 'WebCrypto RSA', 'Schemathesis', 'PDF Generator'],
    defaultBudget: 1500,
    recommendedAgent: 'SecurityAuditorAgent',
    recommendedModel: 'claude-3-7-sonnet',
    defaultInstructions: 'Strict FAA part 121 compliance audit. All pilot signature flows must be signed with RSA hardware certs and validated against staging authority.',
    scaffoldFiles: [
      'src/flightlog/signatureEnvelope.ts',
      'src/compliance/faaAuditor.ts',
      'test/weightBalance.spec.ts',
      'ARCHITECTURE.md'
    ]
  },
  {
    id: 'edgepoint-mesh',
    name: 'EdgePoint IoT Telemetry & Nodes',
    vertical: 'IoT Telemetry & Edge Nodes',
    badge: 'Sub-45ms Ingestion',
    badgeColor: 'bg-purple-950/60 text-purple-400 border-purple-500/40',
    description: 'High-throughput MQTT binary frame ingestion engine with zero-copy buffer slicing and synthetic ping monitors running via pg_net.',
    stack: ['Vite 6', 'Zero-Copy Buffers', 'TimescaleDB', 'pg_net Probes'],
    defaultBudget: 600,
    recommendedAgent: 'FullStackAgent',
    recommendedModel: 'gemini-3.5-flash',
    defaultInstructions: 'MQTT message latency under 45ms. Synthetic health pings running every 60s via pg_net. Enforce automated regression benchmark on every PR.',
    scaffoldFiles: [
      'src/telemetry/frameParser.ts',
      'src/daemon/mqttIngest.ts',
      'benchmark/throughput.bench.ts',
      'ARCHITECTURE.md'
    ]
  },
  {
    id: 'enterprise-saas',
    name: 'Multi-Tenant Enterprise Platform',
    vertical: 'Enterprise SaaS & Multi-Tenant',
    badge: 'Multi-Tenant RBAC',
    badgeColor: 'bg-blue-950/60 text-blue-400 border-blue-500/40',
    description: 'Production B2B SaaS architecture with organization-level tenant boundaries, role-based access control (RBAC), and automated Schemathesis contract suite.',
    stack: ['React 19', 'Tailwind v4', 'PostgreSQL RLS', 'Stripe Billing'],
    defaultBudget: 1000,
    recommendedAgent: 'CodingAgent',
    recommendedModel: 'deepseek-v3',
    defaultInstructions: 'Multi-tenant organization boundary with strict tenant RLS. All API endpoints must pass Schemathesis contract suite without 500 error codes.',
    scaffoldFiles: [
      'src/auth/tenantBoundary.ts',
      'src/billing/stripeWebhook.ts',
      'test/tenantIsolation.spec.ts',
      'ARCHITECTURE.md'
    ]
  }
];

export const ProjectWizardModal: React.FC<ProjectWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTemplateId = 'fintech-ledger'
}) => {
  const toast = useToast();
  const { navigate } = useNavigation();
  const { createProject } = useProjects();

  // Multi-step state: 1 = Template, 2 = Repository, 3 = Governance, 4 = Review, 5 = Complete
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form Configuration State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId);
  const selectedTemplate =
    PROJECT_TEMPLATES.find((t) => t.id === selectedTemplateId) || PROJECT_TEMPLATES[0];

  const [projectName, setProjectName] = useState<string>(selectedTemplate.name);
  const [repoSlug, setRepoSlug] = useState<string>('settlement-core');
  const [repoUrl, setRepoUrl] = useState<string>(`https://github.com/ehi-enterprise/${selectedTemplate.id}`);
  const [defaultBranch, setDefaultBranch] = useState<string>('main');
  const [monthlyBudget, setMonthlyBudget] = useState<number>(selectedTemplate.defaultBudget);
  const [alertThresholdPct, setAlertThresholdPct] = useState<number>(80);
  const [hardStopEnforced, setHardStopEnforced] = useState<boolean>(true);
  const [assignedAgent, setAssignedAgent] = useState<string>(selectedTemplate.recommendedAgent);
  const [assignedModel, setAssignedModel] = useState<string>(selectedTemplate.recommendedModel);
  const [instructions, setInstructions] = useState<string>(selectedTemplate.defaultInstructions);

  // Scaffolding Options
  const [scaffoldReadme, setScaffoldReadme] = useState<boolean>(true);
  const [scaffoldTests, setScaffoldTests] = useState<boolean>(true);
  const [scaffoldCI, setScaffoldCI] = useState<boolean>(true);
  const [scaffoldLinter, setScaffoldLinter] = useState<boolean>(true);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  // Update defaults when template changes
  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplateId(template.id);
    setProjectName(template.name);
    const slug = template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setRepoSlug(slug);
    setRepoUrl(`https://github.com/ehi-enterprise/${slug}`);
    setMonthlyBudget(template.defaultBudget);
    setAssignedAgent(template.recommendedAgent);
    setAssignedModel(template.recommendedModel);
    setInstructions(template.defaultInstructions);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error('Please enter a project name.');
      setCurrentStep(2);
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await createProject({
        name: projectName.trim(),
        vertical: selectedTemplate.vertical,
        monthly_budget_usd: Number(monthlyBudget) || 1000,
        repo_url: repoUrl.trim() || null,
        agent_instructions: instructions.trim() || undefined
      });

      setCreatedProjectId(created.id);
      setCurrentStep(5); // Complete screen
      toast.success(`Repository "${created.name}" initialized in 2.4s!`);
      if (onSuccess) onSuccess(created.id);
    } catch {
      toast.error('Failed to initialize project repository.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-wizard-title"
    >
      <div
        className="w-full max-w-3xl bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-mono text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── WIZARD TOP HEADER ── */}
        <div className="px-5 py-4 border-b border-white/5 bg-[#0d1117] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F0B230]/20 border border-[#F0B230]/40 flex items-center justify-center text-[#FFBD59]">
              <Workflow className="w-4 h-4" />
            </div>
            <div>
              <h2 id="project-wizard-title" className="text-sm font-bold text-[#e6edf3]">
                Project Repository Wizard
              </h2>
              <span className="text-[10px] text-[#8b98a8]">
                Guided repository scaffolding & agent alignment · 2.5s bootstrap
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8b98a8] hover:text-[#e6edf3] hover:bg-white/5 transition-colors"
            aria-label="Close wizard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── STEP INDICATOR PROGRESS BAR ── */}
        {currentStep < 5 && (
          <div className="px-5 py-3 border-b border-white/5 bg-[#161b22]/70 flex items-center justify-between text-[11px]">
            {[
              { num: 1, label: 'Template' },
              { num: 2, label: 'Repository' },
              { num: 3, label: 'Governance' },
              { num: 4, label: 'Review' }
            ].map((step, idx) => {
              const isPassed = currentStep > step.num;
              const isCurrent = currentStep === step.num;

              return (
                <div key={step.num} className="flex items-center gap-2 flex-1 last:flex-none">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(step.num)}
                    className={`flex items-center gap-1.5 font-bold transition-colors ${
                      isCurrent
                        ? 'text-[#FFBD59]'
                        : isPassed
                        ? 'text-emerald-400'
                        : 'text-[#8b98a8]/60'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${
                        isCurrent
                          ? 'border-[#F0B230] bg-[#F0B230]/20 text-[#FFBD59]'
                          : isPassed
                          ? 'border-emerald-500 bg-emerald-950 text-emerald-300'
                          : 'border-white/10 bg-white/5 text-[#8b98a8]'
                      }`}
                    >
                      {isPassed ? <Check className="w-3 h-3 stroke-[3]" /> : step.num}
                    </span>
                    <span>{step.label}</span>
                  </button>

                  {idx < 3 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 rounded-full hidden sm:block ${
                        isPassed ? 'bg-emerald-500/60' : 'bg-white/5'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── STEP CONTENT AREA ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STEP 1: SELECT ARCHITECTURAL TEMPLATE */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#FFBD59] tracking-wider">
                  Step 1 of 4: Architectural Blueprint
                </span>
                <h3 className="text-sm font-bold text-[#e6edf3]">
                  Select a Pre-Configured Domain Template
                </h3>
                <p className="text-[#8b98a8] font-sans text-xs">
                  Templates pre-populate deterministic SDLC verification rules, invariant tests, and model routing parameters.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-1">
                {PROJECT_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplateId === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => handleSelectTemplate(tmpl)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2.5 ${
                        isSelected
                          ? 'bg-[#1c2333] border-[#F0B230] shadow-md ring-1 ring-[#F0B230]'
                          : 'bg-[#0d1117] border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#e6edf3]">{tmpl.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${tmpl.badgeColor}`}>
                            {tmpl.badge}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[10px] text-[#8b98a8]">
                          <span className="text-emerald-400">${tmpl.defaultBudget}/mo</span>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-[#F0B230] bg-[#F0B230] text-[#0A1420]'
                                : 'border-white/20'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                      </div>

                      <p className="text-slate-300 font-sans text-xs leading-relaxed">
                        {tmpl.description}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-[#8b98a8]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {tmpl.stack.map((st) => (
                            <span key={st} className="px-1.5 py-0.2 rounded bg-white/5 text-[#8b98a8]">
                              {st}
                            </span>
                          ))}
                        </div>

                        <span className="text-cyan-300 font-mono">
                          Agent: {tmpl.recommendedAgent}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STEP 2: REPOSITORY & GIT CONFIGURATION */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#FFBD59] tracking-wider">
                  Step 2 of 4: Git & Codebase Setup
                </span>
                <h3 className="text-sm font-bold text-[#e6edf3]">
                  Configure Repository & Initial Scaffolding
                </h3>
                <p className="text-[#8b98a8] font-sans text-xs">
                  Connect an existing GitHub repo or generate an autonomous workspace repository.
                </p>
              </div>

              <div className="space-y-3 bg-[#0d1117] p-4 rounded-xl border border-white/5">
                {/* Project Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#e6edf3] flex items-center justify-between">
                    <span>Project Name</span>
                    <span className="text-[10px] text-[#8b98a8]">Display & vertical title</span>
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => {
                      setProjectName(e.target.value);
                      const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                      setRepoSlug(slug);
                      setRepoUrl(`https://github.com/ehi-enterprise/${slug}`);
                    }}
                    placeholder="e.g. Kano Hub Bilateral Netting Engine"
                    className="w-full bg-[#161b22] border border-white/10 rounded-lg p-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
                  />
                </div>

                {/* Git Repository URL */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#e6edf3] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FolderGit2 className="w-3.5 h-3.5 text-[#F0B230]" />
                      GitHub Repository URL
                    </span>
                    <span className="text-[10px] text-cyan-300">Origin remote</span>
                  </label>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/org/repo"
                    className="w-full bg-[#161b22] border border-white/10 rounded-lg p-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
                  />
                </div>

                {/* Default Branch */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#e6edf3] flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                      Default Branch
                    </label>
                    <select
                      value={defaultBranch}
                      onChange={(e) => setDefaultBranch(e.target.value)}
                      className="w-full bg-[#161b22] border border-white/10 rounded-lg p-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
                    >
                      <option value="main">main (production release)</option>
                      <option value="master">master</option>
                      <option value="develop">develop (staging branch)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#e6edf3]">
                      Vertical Sector
                    </label>
                    <input
                      type="text"
                      disabled
                      value={selectedTemplate.vertical}
                      className="w-full bg-[#161b22]/50 border border-white/5 rounded-lg p-2.5 text-xs text-[#8b98a8] font-mono cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Initial Scaffolding Checklist */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase text-[#8b98a8] block">
                  Scaffolding Modules Included:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: 'ARCHITECTURE.md Specification', state: scaffoldReadme, toggle: () => setScaffoldReadme(!scaffoldReadme) },
                    { label: 'Deterministic Vitest Invariant Suite', state: scaffoldTests, toggle: () => setScaffoldTests(!scaffoldTests) },
                    { label: 'GitHub Actions Continuous Integration', state: scaffoldCI, toggle: () => setScaffoldCI(!scaffoldCI) },
                    { label: 'TypeScript Strict & AST Linter', state: scaffoldLinter, toggle: () => setScaffoldLinter(!scaffoldLinter) }
                  ].map((mod) => (
                    <button
                      key={mod.label}
                      type="button"
                      onClick={mod.toggle}
                      className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                        mod.state
                          ? 'bg-[#1c2333] border-emerald-500/40 text-[#e6edf3]'
                          : 'bg-[#0d1117] border-white/5 text-[#8b98a8]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          mod.state
                            ? 'bg-emerald-500 border-emerald-400 text-[#0A1420]'
                            : 'border-white/20'
                        }`}
                      >
                        {mod.state && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-[11px] font-sans">{mod.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STEP 3: GOVERNANCE, BUDGET & INVARIANTS */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#FFBD59] tracking-wider">
                  Step 3 of 4: Governance & AI Guardrails
                </span>
                <h3 className="text-sm font-bold text-[#e6edf3]">
                  Budget Limits, Primary Agent & Compliance Rules
                </h3>
                <p className="text-[#8b98a8] font-sans text-xs">
                  Set FinOps monthly limits, alert thresholds, and agent instructions.
                </p>
              </div>

              {/* Budget Presets & Hard Stop */}
              <div className="p-4 rounded-xl bg-[#0d1117] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#e6edf3] flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    Monthly Spend Cap (USD)
                  </label>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    ${monthlyBudget}.00 / month
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {[400, 800, 1200, 1500, 2500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMonthlyBudget(preset)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
                        monthlyBudget === preset
                          ? 'bg-[#F0B230] text-[#0A1420] border-[#F0B230]'
                          : 'bg-[#161b22] border-white/10 text-[#8b98a8] hover:text-[#e6edf3]'
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>

                {/* Hard Stop Switch */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-[#F0B230]" />
                    <div>
                      <span className="text-[11px] font-bold text-[#e6edf3] block">
                        Strict Hard Stop Enforcement
                      </span>
                      <span className="text-[10px] text-[#8b98a8]">
                        Refuses token admissions once 100% of cap is consumed
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setHardStopEnforced(!hardStopEnforced)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                      hardStopEnforced
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                        : 'bg-white/5 text-[#8b98a8] border-white/10'
                    }`}
                  >
                    {hardStopEnforced ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
              </div>

              {/* Agent & Model Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#e6edf3] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#F0B230]" />
                    Primary Assigned Agent
                  </label>
                  <select
                    value={assignedAgent}
                    onChange={(e) => setAssignedAgent(e.target.value)}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
                  >
                    <option value="FullStackAgent">FullStackAgent (Code & Unit Tests)</option>
                    <option value="CodingAgent">CodingAgent (AST & Refactor)</option>
                    <option value="SecurityAuditorAgent">SecurityAuditorAgent (OWASP & RLS)</option>
                    <option value="HardwareEdgeAgent">HardwareEdgeAgent (IoT & Offline)</option>
                    <option value="CoordinatorAgent">CoordinatorAgent (Planning)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#e6edf3] flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    Default Foundation Model
                  </label>
                  <select
                    value={assignedModel}
                    onChange={(e) => setAssignedModel(e.target.value)}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
                  >
                    <option value="deepseek-r1">DeepSeek R1 (Math & Invariants)</option>
                    <option value="deepseek-v3">DeepSeek V3 (Fast Balanced)</option>
                    <option value="claude-3-7-sonnet">Claude 3.7 Sonnet (Architecture)</option>
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash (1M High-Context)</option>
                    <option value="o3-mini">OpenAI o3-mini (Reasoning)</option>
                  </select>
                </div>
              </div>

              {/* Agent Instructions */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#e6edf3] flex items-center justify-between">
                  <span>Agent Invariant Instructions</span>
                  <span className="text-[10px] text-[#8b98a8]">Permanent system directives</span>
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230] leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STEP 4: REVIEW & VERIFY LAUNCH */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#FFBD59] tracking-wider">
                  Step 4 of 4: Verification & Scaffolding
                </span>
                <h3 className="text-sm font-bold text-[#e6edf3]">
                  Ready to Initialize Repository Workspace
                </h3>
                <p className="text-[#8b98a8] font-sans text-xs">
                  Review configuration before generating repository files and initial execution task.
                </p>
              </div>

              {/* Summary Breakdown Grid */}
              <div className="p-4 rounded-xl bg-[#0d1117] border border-white/10 space-y-3 font-mono text-xs">
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-white/5">
                  <div>
                    <span className="text-[10px] text-[#8b98a8] uppercase block">Project Name:</span>
                    <span className="text-[#e6edf3] font-bold">{projectName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8b98a8] uppercase block">Selected Template:</span>
                    <span className="text-[#FFBD59] font-bold">{selectedTemplate.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8b98a8] uppercase block">Repository URL:</span>
                    <span className="text-cyan-300 truncate block">{repoUrl}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8b98a8] uppercase block">Monthly Budget:</span>
                    <span className="text-emerald-400 font-bold">${monthlyBudget} USD / mo</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8b98a8] uppercase block">Assigned Agent:</span>
                    <span className="text-[#e6edf3]">{assignedAgent}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8b98a8] uppercase block">Inference Model:</span>
                    <span className="text-[#e6edf3]">{assignedModel}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-[#8b98a8] uppercase block mb-1">
                    Initial Scaffolding Tree:
                  </span>
                  <div className="space-y-1 text-[11px] text-slate-300">
                    {selectedTemplate.scaffoldFiles.map((f) => (
                      <div key={f} className="flex items-center gap-2">
                        <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F0B230]/10 border border-[#F0B230]/30 text-[#FFBD59] text-[11px] flex items-center gap-2.5">
                <Clock className="w-4 h-4 shrink-0 text-[#F0B230]" />
                <span className="font-sans">
                  Estimated bootstrap time: <strong>~2.4 seconds</strong>. The project will register immediately in local state and dispatch an initial scaffold task.
                </span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STEP 5: SUCCESS & LAUNCHPAD */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 5 && (
            <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 mx-auto flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>

              <div>
                <h3 className="text-base font-bold text-[#e6edf3]">
                  Project Initialized Successfully!
                </h3>
                <p className="text-xs text-[#8b98a8] mt-1 font-sans">
                  Repository <strong>{projectName}</strong> is active and monitored by {assignedAgent}.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 max-w-lg mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (createdProjectId) {
                      navigate({ kind: 'project', projectId: createdProjectId, tab: 'session' });
                    }
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-[#1c2333] hover:bg-[#F0B230] text-[#e6edf3] hover:text-[#0A1420] border border-white/10 hover:border-[#F0B230] font-bold text-xs transition-all flex flex-col items-center gap-1.5"
                >
                  <Terminal className="w-4 h-4 text-[#F0B230] group-hover:text-[#0A1420]" />
                  <span>Open Session</span>
                  <span className="text-[10px] text-[#8b98a8] font-normal">Devin workspace</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (createdProjectId) {
                      navigate({ kind: 'project', projectId: createdProjectId, tab: 'discovery' });
                    }
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-[#1c2333] hover:bg-cyan-500 text-[#e6edf3] hover:text-[#0A1420] border border-white/10 hover:border-cyan-500 font-bold text-xs transition-all flex flex-col items-center gap-1.5"
                >
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>SDLC Discovery</span>
                  <span className="text-[10px] text-[#8b98a8] font-normal">6-phase questionnaire</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (createdProjectId) {
                      navigate({ kind: 'project', projectId: createdProjectId, tab: 'codebase' });
                    }
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-[#1c2333] hover:bg-purple-500 text-[#e6edf3] hover:text-[#0A1420] border border-white/10 hover:border-purple-500 font-bold text-xs transition-all flex flex-col items-center gap-1.5"
                >
                  <FolderGit2 className="w-4 h-4 text-purple-400" />
                  <span>Git Codebase</span>
                  <span className="text-[10px] text-[#8b98a8] font-normal">AST analysis</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── WIZARD FOOTER NAVIGATION BUTTONS ── */}
        {currentStep < 5 && (
          <div className="px-5 py-3.5 border-t border-white/5 bg-[#0d1117] flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#8b98a8] hover:text-[#e6edf3] transition-colors flex items-center gap-1.5 text-xs font-mono"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-[#8b98a8] hover:text-[#e6edf3] transition-colors text-xs font-mono"
              >
                Cancel
              </button>
            )}

            <div className="flex items-center gap-2">
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                  className="px-4 py-2 rounded-xl bg-[#F0B230] text-[#0A1420] font-bold text-xs hover:bg-[#FFBD59] transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCreateProject}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F0B230] to-[#FFBD59] text-[#0A1420] font-bold text-xs hover:opacity-95 transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Scaffolding Repository...</span>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Initialize Project</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
