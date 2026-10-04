import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import { useProjects } from '../hooks/useProjects';
import {
  LearningRecord,
  IssueCategory,
  loadLearningVault,
  saveLearningVault,
  addLearningRecord,
  exportAsJSONL,
  exportAsSystemPrompt
} from '../lib/llmLearningStore';
import { PLATFORM_MODELS, TaskImportance, IMPORTANCE_LEVELS } from '../lib/modelRouter';
import {
  Brain,
  Download,
  Copy,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Zap,
  Cpu,
  Clock,
  Send,
  Database,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export const KnowledgeVaultScreen: React.FC = () => {
  const toast = useToast();

  const [records, setRecords] = useState<LearningRecord[]>([]);
  const { projects } = useProjects();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [copiedFormat, setCopiedFormat] = useState<'jsonl' | 'markdown' | null>(null);

  // AI Pulling Test State
  const [testModelId, setTestModelId] = useState<string>('deepseek-r1');
  const [testImportance, setTestImportance] = useState<TaskImportance>('critical');
  const [testPrompt, setTestPrompt] = useState<string>('Verify multi-tenant RLS isolation invariants for project database');
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [pullResult, setPullResult] = useState<any | null>(null);

  // New Record Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProject, setNewProject] = useState(projects[0]?.id || '');
  const [newCategory, setNewCategory] = useState<IssueCategory>('FINANCIAL_INVARIANT');
  const [newSymptom, setNewSymptom] = useState('');
  const [newRootCause, setNewRootCause] = useState('');
  const [newFix, setNewFix] = useState('');
  const [newInvariant, setNewInvariant] = useState('');

  useEffect(() => {
    setRecords(loadLearningVault());
  }, []);

  // Filtered records
  const filteredRecords = records.filter((r) => {
    const matchCat = selectedCategory === 'ALL' || r.category === selectedCategory;
    const matchProj = selectedProjectId === 'ALL' || r.projectId === selectedProjectId;
    return matchCat && matchProj;
  });

  // Handle AI API Pull Test
  const handleTestAIPull = async () => {
    setIsPulling(true);
    setPullResult(null);
    try {
      const selectedModel = PLATFORM_MODELS.find((m) => m.id === testModelId);
      const res = await fetch('/api/ai/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: testModelId,
          provider: selectedModel?.provider || 'DeepSeek',
          prompt: testPrompt,
          importance: testImportance
        })
      });

      const data = await res.json();
      setPullResult(data);
      if (res.ok && data.admitted) {
        toast.success(`AI Pull Successful: ${data.latencyMs}ms (${data.modelId})`);
      } else {
        toast.error(`AI Pull Refused: ${data.reason || 'Quota exceeded'}`);
      }
    } catch (err: any) {
      toast.error(`Pull gateway error: ${err.message || 'Connection failed'}`);
    } finally {
      setIsPulling(false);
    }
  };

  // Copy JSONL for Fine-Tuning
  const handleCopyJSONL = () => {
    const jsonl = exportAsJSONL(records);
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(jsonl);
      }
    } catch {}
    setCopiedFormat('jsonl');
    toast.success('Copied JSONL dataset for LLM fine-tuning');
    setTimeout(() => setCopiedFormat(null), 2500);
  };

  // Copy System Prompt for Context Injection
  const handleCopyMarkdown = () => {
    const md = exportAsSystemPrompt(records);
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(md);
      }
    } catch {}
    setCopiedFormat('markdown');
    toast.success('Copied Markdown prompt for LLM context injection');
    setTimeout(() => setCopiedFormat(null), 2500);
  };

  // Add Record
  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSymptom.trim() || !newFix.trim()) return;

    const projNames: Record<string, string> = {
      'proj-ehi-001': 'EHI Multisystems',
      'proj-iyanu-002': 'Iyanuoluwa Vegetable Oil',
      'proj-aviation-003': 'Aviation Log Entry',
      'proj-edgepoint-004': 'EdgePoint'
    };

    const created = addLearningRecord({
      projectId: newProject,
      projectName: projNames[newProject] || 'General Platform',
      category: newCategory,
      title: newTitle.trim(),
      symptomAndIssue: newSymptom.trim(),
      rootCause: newRootCause.trim(),
      verifiedFix: newFix.trim(),
      invariantRule: newInvariant.trim(),
      modelUsed: testModelId,
      tokensUsed: 3500,
      costUsd: 0.003,
      status: 'verified_fix',
      tags: ['operator-added', newCategory.toLowerCase()]
    });

    setRecords((prev) => [created, ...prev]);
    setShowAddModal(false);
    toast.success('Retrospective learning record added to vault');

    // Reset fields
    setNewTitle('');
    setNewSymptom('');
    setNewRootCause('');
    setNewFix('');
    setNewInvariant('');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8b98a8] mb-1">
            <Brain className="w-3.5 h-3.5 text-[#F0B230]" />
            <span>Retrospective Memory & Post-Mortem Vault</span>
            <span>·</span>
            <span className="text-[#FFBD59]">Where Processes, Issues & Fixes Are Stored</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#e6edf3]">
            LLM Knowledge Vault & Issue-Fix Learning Engine
          </h1>
          <p className="text-xs text-[#8b98a8] max-w-2xl mt-0.5">
            Every architectural bug, floating-point drift, RLS leak, and operational fix is formally indexed here.
            Export this knowledge as JSONL or Markdown system instructions so your LLM never repeats the same mistakes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={handleCopyJSONL}
            className="px-3 py-1.5 rounded-lg bg-[#0d1117] hover:bg-[#1c2333] border border-white/10 hover:border-cyan-500/40 text-cyan-400 font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <FileCode className="w-3.5 h-3.5" />
            {copiedFormat === 'jsonl' ? 'Copied JSONL!' : 'Export JSONL Dataset'}
          </button>

          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="px-3 py-1.5 rounded-lg bg-[#0d1117] hover:bg-[#1c2333] border border-white/10 hover:border-purple-500/40 text-purple-300 font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Copy className="w-3.5 h-3.5" />
            {copiedFormat === 'markdown' ? 'Copied Markdown!' : 'Copy LLM System Prompt'}
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-[#F0B230] text-[#0A1420] font-bold hover:bg-[#FFBD59] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Log New Lesson
          </button>
        </div>
      </div>

      {/* ── SECTION 1: INTERACTIVE AI API PULLING TEST GATEWAY ── */}
      <div className="p-5 rounded-2xl bg-[#161b22] border border-white/5 space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#F0B230]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#e6edf3] font-mono">
              Live AI API Gateway Pulling & Latency Test Harness
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#8b98a8]">
              Endpoint: POST /api/ai/pull
            </span>
          </div>

          <span className="text-[10px] font-mono text-[#8b98a8]">
            Tests live upstream API pulling, latency measurement, and budget ledger admission
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: Model Selection */}
          <div className="space-y-1.5 font-mono text-xs">
            <label className="text-[#8b98a8] text-[11px] block">Select Foundation Model to Test:</label>
            <select
              value={testModelId}
              onChange={(e) => setTestModelId(e.target.value)}
              className="w-full bg-[#0d1117] border border-white/10 rounded-xl p-2.5 text-xs text-[#e6edf3] focus:border-[#F0B230] focus:outline-none"
            >
              {PLATFORM_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider}) · ${m.costInPerM}/1M
                </option>
              ))}
            </select>
          </div>

          {/* Column 2: Criticality Tier */}
          <div className="space-y-1.5 font-mono text-xs">
            <label className="text-[#8b98a8] text-[11px] block">Importance Criticality Level:</label>
            <select
              value={testImportance}
              onChange={(e) => setTestImportance(e.target.value as TaskImportance)}
              className="w-full bg-[#0d1117] border border-white/10 rounded-xl p-2.5 text-xs text-[#e6edf3] focus:border-[#F0B230] focus:outline-none"
            >
              {IMPORTANCE_LEVELS.map((imp) => (
                <option key={imp.level} value={imp.level}>
                  {imp.label} ({imp.badge})
                </option>
              ))}
            </select>
          </div>

          {/* Column 3: Dispatch Test Button */}
          <div className="flex items-end">
            <button
              type="button"
              disabled={isPulling}
              onClick={handleTestAIPull}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F0B230] to-[#FFBD59] text-[#0A1420] font-bold text-xs hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 font-mono"
            >
              <Send className="w-3.5 h-3.5" />
              {isPulling ? 'Executing AI Pull…' : 'Execute AI API Pull Test'}
            </button>
          </div>
        </div>

        {/* Test Prompt Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-mono text-[#8b98a8] block">Inference Test Instruction:</label>
          <input
            type="text"
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#e6edf3] font-mono focus:border-[#F0B230] focus:outline-none"
          />
        </div>

        {/* Live Pull Response Display */}
        {pullResult && (
          <div className="p-4 rounded-xl bg-[#0d1117] border border-emerald-500/30 space-y-2 font-mono text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-bold">AI API Pull Verified:</span>
                <span className="text-[#e6edf3] font-bold">{pullResult.modelId}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                  Tier {pullResult.tier} (Admitted)
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[#8b98a8]">
                  Latency: <span className="text-emerald-400 font-bold">{pullResult.latencyMs}ms</span>
                </span>
                <span className="text-[#8b98a8]">
                  Cost: <span className="text-emerald-400 font-bold">${pullResult.costUsd?.toFixed(4)}</span>
                </span>
                <span className="text-[#8b98a8]">
                  Tokens: <span className="text-[#e6edf3]">{pullResult.tokensInput + pullResult.tokensOutput}</span>
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 font-sans italic">
              {pullResult.responseSample}
            </p>
          </div>
        )}
      </div>

      {/* ── SECTION 2: KNOWLEDGE VAULT DIRECTORY & FILTERS ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#F0B230]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#e6edf3] font-mono">
              Indexed Engineering Post-Mortems & Invariant Rules ({filteredRecords.length})
            </h2>
          </div>

          {/* Category & Project Filters */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#161b22] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-[#e6edf3] focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="FINANCIAL_INVARIANT">Financial Invariants</option>
              <option value="SECURITY_RLS">Security & RLS</option>
              <option value="RUNTIME_BUNDLER">Runtime & Bundler</option>
              <option value="PERFORMANCE_LATENCY">Performance & TTL</option>
              <option value="OFFLINE_SYNC">Offline Hardware Sync</option>
              <option value="AI_GATEWAY_ROUTING">AI Gateway Routing</option>
            </select>

            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-[#161b22] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-[#e6edf3] focus:outline-none"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Record Cards */}
        <div className="space-y-4">
          {filteredRecords.map((r, idx) => (
            <div
              key={r.id}
              className="p-5 rounded-2xl bg-[#161b22] border border-white/5 space-y-3.5 shadow-md hover:border-white/15 transition-all"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#0d1117] border border-white/10 text-[#FFBD59] font-bold text-xs flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-[#e6edf3]">
                      {r.title}
                    </h3>
                    <span className="text-[10px] text-[#8b98a8] font-mono">
                      {r.projectName} · <span className="text-cyan-400 font-semibold">{r.category}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> VERIFIED FIX
                  </span>
                  <span className="text-[#8b98a8] px-2 py-0.5 rounded bg-white/5">
                    Diagnosed with: <code className="text-[#FFBD59]">{r.modelUsed}</code>
                  </span>
                </div>
              </div>

              {/* 3-Section Diagnostic Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Section A: Issue & Root Cause */}
                <div className="p-3.5 rounded-xl bg-[#0d1117] border border-white/5 space-y-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-red-400 font-bold block mb-0.5">
                      ⚠️ Anomalous Symptom & Failure:
                    </span>
                    <p className="text-[#8b98a8] font-sans leading-relaxed">
                      {r.symptomAndIssue}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block mb-0.5">
                      🔍 Architectural Root Cause:
                    </span>
                    <p className="text-[#8b98a8] font-sans leading-relaxed">
                      {r.rootCause}
                    </p>
                  </div>
                </div>

                {/* Section B: Verified Fix & Invariant */}
                <div className="p-3.5 rounded-xl bg-[#0d1117] border border-white/5 space-y-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block mb-0.5">
                      ✓ Applied Verified Fix:
                    </span>
                    <p className="text-slate-300 font-sans leading-relaxed">
                      {r.verifiedFix}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[10px] font-mono uppercase text-[#F0B230] font-bold block mb-0.5">
                      ⭐ Golden Invariant Rule for LLMs:
                    </span>
                    <p className="text-[#FFBD59] font-sans font-medium leading-relaxed">
                      "{r.invariantRule}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MODAL: LOG NEW LESSON / POST-MORTEM ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#161b22] border border-[#F0B230]/40 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0d1117]">
              <h3 className="font-bold text-sm text-[#e6edf3] font-display flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#F0B230]" />
                Log Retrospective Engineering Fix & Invariant
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#8b98a8] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="p-5 space-y-3 font-mono text-xs overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#8b98a8] text-[11px]">Target Project:</label>
                  <select
                    value={newProject}
                    onChange={(e) => setNewProject(e.target.value)}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2 text-xs text-[#e6edf3]"
                  >
                    {projects.length === 0 ? (
                      <option value="">(No Projects Registered)</option>
                    ) : (
                      projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[#8b98a8] text-[11px]">Issue Category:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as IssueCategory)}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2 text-xs text-[#e6edf3]"
                  >
                    <option value="FINANCIAL_INVARIANT">Financial Invariant</option>
                    <option value="SECURITY_RLS">Security & RLS</option>
                    <option value="RUNTIME_BUNDLER">Runtime & Bundler</option>
                    <option value="OFFLINE_SYNC">Offline Sync</option>
                    <option value="AI_GATEWAY_ROUTING">AI Gateway Routing</option>
                    <option value="PERFORMANCE_LATENCY">Performance & Latency</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#8b98a8] text-[11px]">Title / Descriptive Summary:</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Floating-point drift during multi-currency settlement"
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2 text-xs text-[#e6edf3]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#8b98a8] text-[11px]">Anomalous Symptom / What Broke:</label>
                <textarea
                  rows={2}
                  required
                  value={newSymptom}
                  onChange={(e) => setNewSymptom(e.target.value)}
                  placeholder="Exact error message, test assertion failure, or unexpected output..."
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2 text-xs text-[#e6edf3]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#8b98a8] text-[11px]">Root Cause Analysis:</label>
                <textarea
                  rows={2}
                  value={newRootCause}
                  onChange={(e) => setNewRootCause(e.target.value)}
                  placeholder="Underlying software architecture reason why it failed..."
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2 text-xs text-[#e6edf3]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#8b98a8] text-[11px]">Verified Fix Applied:</label>
                <textarea
                  rows={2}
                  required
                  value={newFix}
                  onChange={(e) => setNewFix(e.target.value)}
                  placeholder="Exact code changes or algorithmic fix applied..."
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2 text-xs text-[#e6edf3]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#8b98a8] text-[11px]">Golden Invariant Rule for LLM:</label>
                <textarea
                  rows={2}
                  value={newInvariant}
                  onChange={(e) => setNewInvariant(e.target.value)}
                  placeholder="The non-negotiable rule that prevents this from ever recurring..."
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2 text-xs text-[#e6edf3]"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#161b22] text-xs text-[#8b98a8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#F0B230] text-[#0A1420] font-bold text-xs hover:bg-[#FFBD59]"
                >
                  Save to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
