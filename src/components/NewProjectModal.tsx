import React, { useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useNavigation } from '../lib/navigation';
import { useToast } from '../components/Toast';
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
  ArrowRight
} from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (projectId: string) => void;
}

const VERTICAL_OPTIONS = [
  {
    id: 'fintech',
    label: 'Fintech & Cargo Settlement',
    tag: 'Strict Invariant Math',
    desc: 'Multi-hub reconciliation, currency precision, cryptographic signatures'
  },
  {
    id: 'agriculture',
    label: 'Agro-Industrial & Supply Chain',
    tag: 'Offline-First Hardware',
    desc: 'Weighbridge scale drivers, offline ticket issuance, tanker gate passes'
  },
  {
    id: 'aviation',
    label: 'Aviation Flight Deck & EFB',
    tag: 'FAA Regulatory Safety',
    desc: 'Pilot flight logs, weight & balance CG envelopes, pilot-in-command signoff'
  },
  {
    id: 'logistics',
    label: 'Edge IoT & High-Frequency Telemetry',
    tag: 'Sub-50ms Ingestion',
    desc: 'MQTT node telemetry, synthetic probes, time-partitioned hypertables'
  },
  {
    id: 'healthcare',
    label: 'Healthcare & Clinical Records',
    tag: 'HIPAA & Strict RLS',
    desc: 'Patient record partitioning, cryptographic audit logs, AES-256 storage'
  },
  {
    id: 'saas',
    label: 'Enterprise SaaS & Multi-Tenant',
    tag: 'B2B Full-Stack',
    desc: 'Multi-tenant organization boundary, role-based access, stripe billing'
  }
];

const BUDGET_PRESETS = [500, 1000, 2000, 5000];

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const toast = useToast();
  const { navigate } = useNavigation();
  const { createProject } = useProjects();

  const [name, setName] = useState('');
  const [vertical, setVertical] = useState('fintech');
  const [budgetUsd, setBudgetUsd] = useState(1000);
  const [repoUrl, setRepoUrl] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (proceedToDiscovery: boolean) => {
    if (!name.trim()) {
      toast.error('Please enter a project name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createProject({
        name: name.trim(),
        vertical,
        monthly_budget_usd: Number(budgetUsd) || 1000,
        repo_url: repoUrl.trim() || null,
        agent_instructions: instructions.trim() || undefined
      });

      toast.success(`Project "${created.name}" created successfully!`);
      onClose();

      if (onSuccess) {
        onSuccess(created.id);
      }

      if (proceedToDiscovery) {
        navigate({ kind: 'discovery', projectId: created.id });
      } else {
        navigate({ kind: 'portfolio' });
      }
    } catch (err: any) {
      toast.error(`Failed to create project: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#0d1117]/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F0B230]/10 border border-[#F0B230]/30 flex items-center justify-center text-[#F0B230]">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-bold text-[#e6edf3]">
                Initialize New Project
              </h2>
              <p className="text-xs text-[#8b98a8]">
                Register a new client codebase into AetherOrch autonomous orchestration.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8b98a8] hover:text-[#e6edf3] hover:bg-white/5 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs font-mono">
          {/* 1. Project Name */}
          <div className="space-y-1.5">
            <label className="text-[#e6edf3] font-semibold flex items-center justify-between">
              <span>Project Name *</span>
              <span className="text-[10px] text-[#8b98a8] font-normal">e.g. Apex Fleet Tracker, Zenith API</span>
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Cargo Settlement Engine"
              className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#e6edf3] placeholder:text-[#8b98a8]/50 focus:border-[#F0B230] focus:outline-none transition-colors"
            />
          </div>

          {/* 2. Industry Vertical */}
          <div className="space-y-2">
            <label className="text-[#e6edf3] font-semibold block">
              Industry Vertical & Core Invariant Profile
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VERTICAL_OPTIONS.map((opt) => {
                const isSelected = vertical === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setVertical(opt.id)}
                    className={`text-left p-3 rounded-xl border transition-all text-xs ${
                      isSelected
                        ? 'bg-[#1c2333] border-[#F0B230] text-[#e6edf3] shadow-sm'
                        : 'bg-[#0d1117] border-white/5 text-[#8b98a8] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold ${isSelected ? 'text-[#FFBD59]' : 'text-[#e6edf3]'}`}>
                        {opt.label}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-[#8b98a8]">
                        {opt.tag}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#8b98a8] font-sans line-clamp-2">
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Monthly LLM Budget */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[#e6edf3] font-semibold">
                Monthly LLM Budget Limit ($ USD)
              </label>
              <div className="flex items-center gap-1.5">
                {BUDGET_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBudgetUsd(preset)}
                    className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                      budgetUsd === preset
                        ? 'bg-[#F0B230]/20 border-[#F0B230] text-[#FFBD59]'
                        : 'bg-white/5 border-white/10 text-[#8b98a8] hover:text-[#e6edf3]'
                    }`}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8b98a8]" />
              <input
                type="number"
                min="50"
                max="50000"
                step="50"
                value={budgetUsd}
                onChange={(e) => setBudgetUsd(Number(e.target.value) || 0)}
                className="w-full bg-[#0d1117] border border-white/10 rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-[#e6edf3] focus:border-[#F0B230] focus:outline-none transition-colors"
              />
            </div>
            <p className="text-[10px] text-[#8b98a8] font-sans">
              Hard-stop limit automatically enforced on agent inferences. Soft warning at 80% capacity.
            </p>
          </div>

          {/* 4. GitHub Repository URL (Optional) */}
          <div className="space-y-1.5">
            <label className="text-[#e6edf3] font-semibold flex items-center justify-between">
              <span>GitHub Repository URL (Optional)</span>
              <span className="text-[10px] text-[#8b98a8] font-normal">origin/main tracking</span>
            </label>
            <div className="relative">
              <GitBranch className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8b98a8]" />
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/my-org/my-repo"
                className="w-full bg-[#0d1117] border border-white/10 rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-[#e6edf3] placeholder:text-[#8b98a8]/50 focus:border-[#F0B230] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* 5. Custom Architecture Instructions / Directives */}
          <div className="space-y-1.5">
            <label className="text-[#e6edf3] font-semibold block">
              Initial Build Instructions & Invariant Guidelines
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Must operate offline in remote warehouses. Requires immutable ledger entries and RSA-signed settlement certificates."
              className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#e6edf3] placeholder:text-[#8b98a8]/50 focus:border-[#F0B230] focus:outline-none transition-colors resize-none font-sans"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/5 bg-[#0d1117]/80 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#8b98a8] hover:text-[#e6edf3] transition-colors"
          >
            Cancel
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting || !name.trim()}
              onClick={() => handleSubmit(false)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#1c2333] hover:bg-[#252f44] border border-white/10 text-[#e6edf3] font-semibold transition-colors disabled:opacity-50"
            >
              Create Project Only
            </button>

            <button
              type="button"
              disabled={isSubmitting || !name.trim()}
              onClick={() => handleSubmit(true)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-[#F0B230] to-[#FFBD59] text-[#0A1420] font-bold hover:opacity-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Create & Launch SDLC Questions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
