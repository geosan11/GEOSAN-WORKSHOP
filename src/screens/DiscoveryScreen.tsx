import React, { useState, useEffect } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useNavigation } from '../lib/navigation';
import { useToast } from '../components/Toast';
import {
  SDLC_PHASES,
  SDLCPhase,
  ProjectDiscoveryState,
  loadProjectDiscovery,
  saveProjectDiscovery,
  calculateReadinessScore,
  generateArchitectureBlueprint
} from '../lib/sdlcDiscovery';
import {
  Compass,
  Database,
  Shield,
  WifiOff,
  Gauge,
  CheckCircle,
  Sparkles,
  Save,
  FileText,
  Copy,
  ArrowRight,
  HelpCircle,
  AlertTriangle,
  Send,
  Layers,
  Check,
  RotateCcw
} from 'lucide-react';

interface DiscoveryScreenProps {
  initialProjectId?: string;
}

export const DiscoveryScreen: React.FC<DiscoveryScreenProps> = ({ initialProjectId }) => {
  const toast = useToast();
  const { navigate } = useNavigation();
  const { projects, loading } = useProjects();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || projects[0]?.id || 'proj-ehi-001'
  );
  const [activePhaseIndex, setActivePhaseIndex] = useState<number>(0);
  const [discoveryState, setDiscoveryState] = useState<ProjectDiscoveryState | null>(null);
  const [showSpecModal, setShowSpecModal] = useState<boolean>(false);
  const [specContent, setSpecContent] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Sync project selection when projects load
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Load discovery state for selected project
  useEffect(() => {
    if (selectedProjectId) {
      const loaded = loadProjectDiscovery(selectedProjectId);
      setDiscoveryState(loaded);
    }
  }, [selectedProjectId]);

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const activePhase = SDLC_PHASES[activePhaseIndex] || SDLC_PHASES[0];

  const handleAnswerChange = (questionId: string, value: string) => {
    if (!discoveryState) return;
    const newAnswers = { ...discoveryState.answers, [questionId]: value };
    const newScore = calculateReadinessScore(newAnswers);
    setDiscoveryState({
      ...discoveryState,
      answers: newAnswers,
      readinessScore: newScore
    });
  };

  const handleSave = () => {
    if (!discoveryState) return;
    saveProjectDiscovery(discoveryState);
    toast.success('Architecture discovery answers saved successfully');
  };

  const handleGenerateSpec = () => {
    if (!discoveryState || !activeProject) return;
    const doc = generateArchitectureBlueprint(activeProject.name, activeProject.vertical, discoveryState);
    setSpecContent(doc);
    setShowSpecModal(true);
  };

  const handleCopySpec = () => {
    navigator.clipboard.writeText(specContent);
    setCopied(true);
    toast.success('Architecture specification copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDispatchToAgent = () => {
    handleSave();
    navigate({ kind: 'console' });
    toast.info('SDLC Blueprint verified. Dispatch planned tasks to CoordinatorAgent.');
  };

  const readinessScore = discoveryState?.readinessScore || 0;

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: 'BUILD READY (90%+)', color: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-500/40' };
    if (score >= 70) return { label: 'SCOPED (70%+)', color: 'text-cyan-400', bg: 'bg-cyan-950/60 border-cyan-500/40' };
    if (score >= 40) return { label: 'IN PROGRESS', color: 'text-amber-400', bg: 'bg-amber-950/60 border-amber-500/40' };
    return { label: 'UNSCOPED (CRITICAL GAPS)', color: 'text-red-400', bg: 'bg-red-950/60 border-red-500/40' };
  };

  const scoreBadge = getScoreBadge(readinessScore);

  const getPhaseIcon = (iconName: string) => {
    switch (iconName) {
      case 'Compass':
        return <Compass className="w-4 h-4" />;
      case 'Database':
        return <Database className="w-4 h-4" />;
      case 'Shield':
        return <Shield className="w-4 h-4" />;
      case 'WifiOff':
        return <WifiOff className="w-4 h-4" />;
      case 'Gauge':
        return <Gauge className="w-4 h-4" />;
      case 'CheckCircle':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Compass className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER & PROJECT SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8b98a8] mb-1">
            <Compass className="w-3.5 h-3.5 text-[#F0B230]" />
            <span>Pre-Build Discovery Engine</span>
            <span>·</span>
            <span className="text-[#FFBD59]">SDLC Architecture Scoping</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#e6edf3]">
            Project Discovery & Architecture Questions
          </h1>
          <p className="text-xs text-[#8b98a8] max-w-2xl mt-0.5">
            Answer the 6 critical architectural lifecycle phases before building to cut requirement churn, prevent database rewrites, and reduce development time by &gt;50%.
          </p>
        </div>

        {/* Project Selector Dropdown */}
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-[#8b98a8] block">Select Project Scoping:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-[#161b22] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#e6edf3] font-mono focus:border-[#F0B230] focus:outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.vertical.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="px-3.5 py-1.5 rounded-lg bg-[#F0B230] text-[#0A1420] text-xs font-bold hover:bg-[#FFBD59] transition-colors flex items-center gap-1.5 self-end shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            Save Answers
          </button>
        </div>
      </div>

      {/* READINESS & TIME SAVINGS BANNER */}
      <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-[#161b22] to-[#0d1117] border border-white/5 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FFBD59] font-mono">
              SDLC Architecture Readiness:
            </span>
            <span className={`px-2.5 py-0.5 rounded-full border text-xs font-mono font-bold ${scoreBadge.bg} ${scoreBadge.color}`}>
              {readinessScore}% — {scoreBadge.label}
            </span>
          </div>

          <p className="text-xs text-[#8b98a8] leading-relaxed">
            By answering these questions upfront, you eliminate <strong className="text-slate-200">55% of refactoring cycles</strong> caused by unexpected data mutations, undefined multi-tenant security boundaries, and unhandled offline states.
          </p>

          <div className="w-full max-w-md h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                readinessScore >= 80 ? 'bg-emerald-400' : readinessScore >= 50 ? 'bg-[#F0B230]' : 'bg-red-400'
              }`}
              style={{ width: `${readinessScore}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 font-mono text-xs">
          <button
            type="button"
            onClick={handleGenerateSpec}
            className="px-3.5 py-2 rounded-xl bg-[#0d1117] hover:bg-[#1c2333] border border-white/10 hover:border-cyan-500/40 text-cyan-400 hover:text-cyan-300 font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            Generate Architecture Spec
          </button>

          <button
            type="button"
            onClick={handleDispatchToAgent}
            className="px-3.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            Dispatch Spec to Agent Swarm
          </button>
        </div>
      </div>

      {/* 6-PHASE TABS STEPPER */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {SDLC_PHASES.map((phase, idx) => {
          const isCurrent = activePhaseIndex === idx;
          // Count answered questions in this phase
          const answeredCount = phase.questions.filter(
            (q) => (discoveryState?.answers[q.id]?.trim().length || 0) > 15
          ).length;
          const isPhaseComplete = answeredCount === phase.questions.length;

          return (
            <button
              key={phase.id}
              type="button"
              onClick={() => setActivePhaseIndex(idx)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'bg-[#F0B230]/15 border-[#F0B230] text-[#FFBD59] shadow-sm ring-1 ring-[#F0B230]/40'
                  : isPhaseComplete
                  ? 'bg-[#0d1117] border-emerald-500/30 text-emerald-400 hover:border-emerald-500'
                  : 'bg-[#0d1117] border-white/5 text-[#8b98a8] hover:border-white/20 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] font-bold">
                  {phase.shortTitle}
                </span>
                {isPhaseComplete ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/5 text-[#8b98a8]">
                    {answeredCount}/{phase.questions.length}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-sans line-clamp-1 text-[#8b98a8]">
                {phase.tagline}
              </span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE PHASE BANNER */}
      <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[#FFBD59] font-bold text-sm">
              {activePhase.title}
            </span>
          </div>
          <p className="text-[11px] text-[#8b98a8] font-sans">
            {activePhase.description}
          </p>
        </div>

        <span className="px-3 py-1 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold whitespace-nowrap self-start sm:self-auto">
          ⚡ {activePhase.timeSavingsBenefit}
        </span>
      </div>

      {/* QUESTIONS CONTAINER */}
      <div className="space-y-4">
        {activePhase.questions.map((q, qIdx) => {
          const currentAnswer = discoveryState?.answers[q.id] || '';
          const isAnswered = currentAnswer.trim().length > 15;

          return (
            <div
              key={q.id}
              className={`p-5 rounded-2xl bg-[#161b22] border transition-all space-y-3 shadow-md ${
                isAnswered ? 'border-white/10' : 'border-amber-500/30 ring-1 ring-amber-500/20'
              }`}
            >
              {/* Question Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#0d1117] border border-white/10 text-[#FFBD59] font-bold text-xs flex items-center justify-center font-mono">
                    {qIdx + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#e6edf3]">
                      {q.title}
                    </h3>
                    <span className="text-[10px] text-[#8b98a8] font-mono">
                      Category: {q.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      q.criticality === 'blocker'
                        ? 'bg-red-950/60 text-red-300 border border-red-500/40'
                        : q.criticality === 'high'
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {q.criticality === 'blocker' ? 'P0 BLOCKER' : q.criticality}
                  </span>

                  {isAnswered ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 font-bold">
                      <Check className="w-3 h-3" /> ANSWERED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/40 font-bold">
                      ACTION REQUIRED
                    </span>
                  )}
                </div>
              </div>

              {/* Exact Prompt */}
              <p className="text-xs font-semibold text-[#e6edf3] font-sans">
                {q.question}
              </p>

              {/* Why It Matters Callout */}
              <div className="p-3 rounded-xl bg-[#0d1117] border border-white/5 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-[#F0B230] font-mono text-[10px] uppercase font-bold">
                  <Sparkles className="w-3 h-3" /> Why answering this reduces development time:
                </div>
                <p className="text-[11px] text-[#8b98a8] font-sans leading-relaxed">
                  {q.whyItMatters}
                </p>
              </div>

              {/* Hint */}
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                <span className="text-[#8b98a8]">Implementation Hint:</span>
                <span className="italic">{q.hint}</span>
              </div>

              {/* Answer Input */}
              <div className="space-y-1.5 pt-1">
                <textarea
                  rows={3}
                  value={currentAnswer}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder={`Document exact architecture decisions for ${q.title}...`}
                  className="w-full bg-[#0d1117] border border-white/10 rounded-xl p-3 text-xs text-[#e6edf3] font-mono leading-relaxed focus:border-[#F0B230] focus:outline-none transition-colors placeholder:text-slate-600"
                />
                <div className="flex items-center justify-between text-[10px] font-mono text-[#8b98a8]">
                  <span>Minimum 15 characters to satisfy requirement</span>
                  <span>{currentAnswer.length} characters</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* PHASE NAVIGATION BUTTONS */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <button
          type="button"
          disabled={activePhaseIndex === 0}
          onClick={() => setActivePhaseIndex((prev) => Math.max(0, prev - 1))}
          className="px-4 py-2 rounded-lg bg-[#161b22] border border-white/5 text-xs font-mono font-bold text-[#8b98a8] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous Phase
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded-lg bg-[#F0B230] text-[#0A1420] text-xs font-bold hover:bg-[#FFBD59] transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Save className="w-3.5 h-3.5" /> Save Discovery Progress
        </button>

        <button
          type="button"
          disabled={activePhaseIndex === SDLC_PHASES.length - 1}
          onClick={() => setActivePhaseIndex((prev) => Math.min(SDLC_PHASES.length - 1, prev + 1))}
          className="px-4 py-2 rounded-lg bg-[#161b22] border border-white/5 text-xs font-mono font-bold text-[#8b98a8] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next Phase →
        </button>
      </div>

      {/* ARCHITECTURE SPEC PREVIEW MODAL */}
      {showSpecModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[85vh] bg-[#161b22] border border-[#F0B230]/40 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between bg-[#0d1117]">
              <div>
                <h3 className="font-bold text-base text-[#e6edf3] font-display flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#F0B230]" />
                  Architecture Specification & Agent Blueprint
                </h3>
                <span className="text-[11px] font-mono text-[#8b98a8]">
                  Generated from SDLC Discovery Answers for {activeProject?.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySpec}
                  className="px-3 py-1.5 rounded-lg bg-[#161b22] hover:bg-[#1c2333] border border-white/10 text-xs font-mono text-[#e6edf3] flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-[#F0B230]" />
                  {copied ? 'Copied!' : 'Copy Markdown'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSpecModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-[#8b98a8] hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Spec Markdown Content Preview */}
            <div className="p-6 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-[#F0B230]/30">
              {specContent}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-[#0d1117] flex items-center justify-between">
              <span className="text-xs text-[#8b98a8]">
                Ready to be imported into subagent instructions
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSpecModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#161b22] text-xs font-mono text-[#8b98a8] hover:text-white"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSpecModal(false);
                    handleDispatchToAgent();
                  }}
                  className="px-4 py-2 rounded-lg bg-[#F0B230] text-[#0A1420] text-xs font-bold hover:bg-[#FFBD59] flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Dispatch to Agent Console
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
