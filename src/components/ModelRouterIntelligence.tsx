import React, { useState } from 'react';
import { TaskType } from '../lib/types';
import {
  TaskImportance,
  IMPORTANCE_LEVELS,
  PLATFORM_MODELS,
  ModelProfile,
  getRecommendedModel,
  getModelSuitability
} from '../lib/modelRouter';
import {
  Sparkles,
  ShieldAlert,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ModelRouterIntelligenceProps {
  taskType: TaskType;
  selectedModelId: string;
  importance: TaskImportance;
  onImportanceChange: (level: TaskImportance) => void;
  onModelSelect: (modelId: string) => void;
  autoRoute: boolean;
  onToggleAutoRoute: (enabled: boolean) => void;
}

export const ModelRouterIntelligence: React.FC<ModelRouterIntelligenceProps> = ({
  taskType,
  selectedModelId,
  importance,
  onImportanceChange,
  onModelSelect,
  autoRoute,
  onToggleAutoRoute
}) => {
  const [showMatrixModal, setShowMatrixModal] = useState(false);

  const recommendation = getRecommendedModel(taskType, importance);
  const suitability = getModelSuitability(selectedModelId, taskType, importance);

  // If autoRoute is active, make sure selected model is synced with recommendation
  const currentModel = PLATFORM_MODELS.find((m) => m.id === selectedModelId) || recommendation.model;

  const handleImportanceClick = (lvl: TaskImportance) => {
    onImportanceChange(lvl);
    if (autoRoute) {
      const newRec = getRecommendedModel(taskType, lvl);
      onModelSelect(newRec.modelId);
    }
  };

  const handleModelClick = (modelId: string) => {
    onModelSelect(modelId);
    if (autoRoute && modelId !== recommendation.modelId) {
      // Switched to manual
      onToggleAutoRoute(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER & AUTO-ROUTE TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#e6edf3] uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#F0B230]" />
              Model Intelligence & Task-Criticality Router
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F0B230]/20 text-[#FFBD59] border border-[#F0B230]/40">
              Heuristic Engine
            </span>
          </div>
          <p className="text-[11px] text-[#8b98a8] mt-0.5">
            Routes execution to optimal AI models based on task nature, reasoning requirements, and budget limits
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Matrix Guide Button */}
          <button
            type="button"
            onClick={() => setShowMatrixModal(!showMatrixModal)}
            className="px-2.5 py-1 rounded-lg bg-[#0d1117] hover:bg-[#1c2333] border border-white/10 text-[#8b98a8] hover:text-[#e6edf3] text-[11px] font-mono transition-colors flex items-center gap-1.5"
          >
            <HelpCircle className="w-3 h-3 text-[#F0B230]" />
            Routing Decision Guide
          </button>

          {/* Auto-Route Switch */}
          <button
            type="button"
            onClick={() => {
              const next = !autoRoute;
              onToggleAutoRoute(next);
              if (next) {
                onModelSelect(recommendation.modelId);
              }
            }}
            className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold transition-all border flex items-center gap-1.5 shadow-sm ${
              autoRoute
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                : 'bg-[#0d1117] text-[#8b98a8] border-white/10 hover:text-white'
            }`}
          >
            <Sparkles className={`w-3 h-3 ${autoRoute ? 'text-emerald-400' : 'text-[#8b98a8]'}`} />
            Auto-Route: {autoRoute ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* STEP A: TASK CRITICALITY & IMPORTANCE LEVEL */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-mono uppercase tracking-wider text-[#FFBD59] font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3 text-[#F0B230]" />
            1. Select Task Importance & Risk Criticality
          </label>
          <span className="text-[10px] text-[#8b98a8]">
            Determines reasoning depth threshold
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {IMPORTANCE_LEVELS.map((imp) => {
            const isSelected = importance === imp.level;
            return (
              <button
                key={imp.level}
                type="button"
                onClick={() => handleImportanceClick(imp.level)}
                className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? `${imp.bg} ${imp.border} shadow-sm ring-1 ring-white/10`
                    : 'bg-[#0d1117] border-white/5 text-[#8b98a8] hover:border-white/20 hover:text-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-mono font-bold text-xs ${isSelected ? imp.color : 'text-[#e6edf3]'}`}>
                      {imp.label}
                    </span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    )}
                  </div>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/40 text-slate-300 uppercase block w-fit mb-1.5">
                    {imp.badge}
                  </span>
                  <p className="text-[10px] text-[#8b98a8] line-clamp-2 leading-snug">
                    {imp.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP B: ACTIVE ROUTING RATIONALE & RECOMMENDATION CARD */}
      <div className="p-3.5 rounded-xl bg-[#0d1117] border border-white/5 space-y-2 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              RECOMMENDED MODEL:
            </span>
            <span className="font-bold text-[#e6edf3]">{recommendation.model.name}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
              {recommendation.ruleCategory}
            </span>
          </div>

          <span className="text-[10px] text-[#8b98a8]">
            Cost: <span className="text-emerald-400 font-bold">{recommendation.estimatedCostFactor}</span>
          </span>
        </div>

        <p className="text-[11px] text-[#8b98a8] font-sans leading-relaxed">
          {recommendation.rationale}
        </p>

        {/* Current Selection Suitability Indicator */}
        <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-[#8b98a8]">Active Model:</span>
            <span className="text-[#FFBD59] font-bold">{currentModel.name}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${suitability.badgeClass}`}>
              {suitability.badge}
            </span>
          </div>

          {!autoRoute && selectedModelId !== recommendation.modelId && (
            <button
              type="button"
              onClick={() => {
                onModelSelect(recommendation.modelId);
                onToggleAutoRoute(true);
              }}
              className="text-[10px] text-[#F0B230] hover:text-[#FFBD59] underline flex items-center gap-1 self-start sm:self-auto"
            >
              Switch to Recommended ({recommendation.model.name}) <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {suitability.status !== 'optimal' && (
          <div className="p-2 rounded bg-amber-950/20 border border-amber-500/30 text-amber-300 text-[10px] flex items-center gap-2 font-sans">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>{suitability.message}</span>
          </div>
        )}
      </div>

      {/* STEP C: MODEL SELECTION GRID */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-mono uppercase tracking-wider text-[#FFBD59] font-bold flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-[#F0B230]" />
            2. Available Foundation Models & Profiles
          </label>
          <span className="text-[10px] text-[#8b98a8]">
            Click any model to select or override
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {PLATFORM_MODELS.map((m) => {
            const isSelected = selectedModelId === m.id;
            const isRecommended = recommendation.modelId === m.id;
            const isAlternative = recommendation.alternativeModelId === m.id;
            const LogoComp = m.logo;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleModelClick(m.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between relative group ${
                  isSelected
                    ? 'bg-[#F0B230]/15 border-[#F0B230] text-[#FFBD59] shadow-sm ring-1 ring-[#F0B230]/40'
                    : isRecommended
                    ? 'bg-[#0d1117] border-emerald-500/40 text-[#8b98a8] hover:border-emerald-500 hover:text-white'
                    : 'bg-[#0d1117] border-white/5 text-[#8b98a8] hover:border-white/20 hover:text-white'
                }`}
              >
                {/* Top Badge for Recommended / Alternative */}
                {isRecommended && (
                  <div className="absolute -top-2 right-3 px-1.5 py-0.2 rounded bg-emerald-500 text-black text-[9px] font-mono font-bold uppercase shadow-sm flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Best Match
                  </div>
                )}
                {isAlternative && !isRecommended && (
                  <div className="absolute -top-2 right-3 px-1.5 py-0.2 rounded bg-cyan-900 border border-cyan-500/40 text-cyan-200 text-[9px] font-mono font-bold uppercase">
                    Alternative
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LogoComp className="w-4 h-4 shrink-0" />
                      <span className="font-mono font-bold text-xs text-[#e6edf3]">{m.name}</span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-[#8b98a8]">
                      {m.provider}
                    </span>
                  </div>

                  <span className="text-[10px] text-[#8b98a8] block">{m.specialty}</span>
                  <span className="text-[9px] text-slate-400 block line-clamp-1 italic">
                    {m.bestFor}
                  </span>
                </div>

                <div className="pt-2 mt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-emerald-400 font-bold">${m.costInPerM.toFixed(2)} / 1M</span>
                  <span className="text-[#8b98a8]">{m.contextWindow} ctx</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* DECISION MATRIX MODAL / GUIDE */}
      {showMatrixModal && (
        <div className="p-4 rounded-xl bg-[#0d1117] border border-[#F0B230]/30 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-[#FFBD59] uppercase flex items-center gap-2">
              <Info className="w-4 h-4 text-[#F0B230]" />
              AetherOrch Model Selection & Criticality Matrix Guide
            </h4>
            <button
              type="button"
              onClick={() => setShowMatrixModal(false)}
              className="text-[#8b98a8] hover:text-white"
            >
              ✕ Close
            </button>
          </div>

          <p className="text-[11px] text-[#8b98a8] font-sans leading-relaxed">
            Every AI foundation model has distinct architectural advantages. Use this table as a reference
            when deciding between formal reasoning depth, context size, and budget efficiency:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-[#161b22] text-[#8b98a8] border-b border-white/5">
                <tr>
                  <th className="py-2 px-3">Model</th>
                  <th className="py-2 px-3">Primary Domain</th>
                  <th className="py-2 px-3">Ideal Importance</th>
                  <th className="py-2 px-3">Input Rate</th>
                  <th className="py-2 px-3">When to Use</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-2 px-3 font-bold text-[#e6edf3]">DeepSeek R1</td>
                  <td className="py-2 px-3 text-cyan-300">Formal Reasoning & Math</td>
                  <td className="py-2 px-3 text-red-400 font-bold">Critical (P0)</td>
                  <td className="py-2 px-3 text-emerald-400">$0.55/1M</td>
                  <td className="py-2 px-3 text-[#8b98a8]">Ledger settlement math, security vulnerability crawl, zero-defect invariant checks.</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#e6edf3]">DeepSeek V3</td>
                  <td className="py-2 px-3 text-cyan-300">Ultra-Low Cost Coding</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold">Standard (P2)</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold">$0.14/1M</td>
                  <td className="py-2 px-3 text-[#8b98a8]">Standard feature coding, unit tests, fast bug fixes. 95% cheaper than frontier models.</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#e6edf3]">Claude 3.7 Sonnet</td>
                  <td className="py-2 px-3 text-cyan-300">Hybrid Thinking Architecture</td>
                  <td className="py-2 px-3 text-amber-400 font-bold">High (P1)</td>
                  <td className="py-2 px-3 text-amber-400">$3.00/1M</td>
                  <td className="py-2 px-3 text-[#8b98a8]">Complex architectural refactors across multiple files, adversarial review signoff.</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#e6edf3]">Moonshot Kimi K1.5</td>
                  <td className="py-2 px-3 text-cyan-300">256k Long Context</td>
                  <td className="py-2 px-3 text-purple-400 font-bold">High Context (P3)</td>
                  <td className="py-2 px-3 text-emerald-400">$0.60/1M</td>
                  <td className="py-2 px-3 text-[#8b98a8]">Massive codebases, multi-repo cross indexing, full compliance corpus validation.</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#e6edf3]">Gemini 3.5 Flash</td>
                  <td className="py-2 px-3 text-cyan-300">1M Context & Fast Tool Calls</td>
                  <td className="py-2 px-3 text-slate-300 font-bold">QA & Exploration</td>
                  <td className="py-2 px-3 text-emerald-400">$0.15/1M</td>
                  <td className="py-2 px-3 text-[#8b98a8]">Autonomous DOM exploration, mobile viewport crawl, high-throughput subagent tasks.</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#e6edf3]">xAI Grok 4</td>
                  <td className="py-2 px-3 text-cyan-300">Real-Time Telemetry</td>
                  <td className="py-2 px-3 text-cyan-400 font-bold">Real-Time Edge (P4)</td>
                  <td className="py-2 px-3 text-amber-400">$2.00/1M</td>
                  <td className="py-2 px-3 text-[#8b98a8]">Live telemetry anomaly search, real-time edge node logs, diagnostic triage.</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#e6edf3]">OpenAI o3-mini</td>
                  <td className="py-2 px-3 text-cyan-300">Deterministic Invariant Proofs</td>
                  <td className="py-2 px-3 text-amber-400 font-bold">High (P1)</td>
                  <td className="py-2 px-3 text-cyan-400">$1.10/1M</td>
                  <td className="py-2 px-3 text-[#8b98a8]">Deterministic SQL constraint validation, contract invariants, strict logical deduction.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
