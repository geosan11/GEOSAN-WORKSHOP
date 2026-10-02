import React, { useEffect } from 'react';
import { AgentNode } from '../../types/foundry';
import {
  X,
  Cpu,
  Terminal,
  Activity,
  Zap,
  BookOpen,
  FileCode2,
  CheckCircle2,
  Flame,
  RotateCcw,
  Sparkles,
  Thermometer,
  Layers
} from 'lucide-react';

interface InnerWorldModalProps {
  node: AgentNode | null;
  onClose: () => void;
  onHealNode?: (nodeId: string) => void;
}

export const InnerWorldModal: React.FC<InnerWorldModalProps> = ({
  node,
  onClose,
  onHealNode
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!node) return null;

  const isCrashed = node.isCrashed || node.status === 'CRASHED' || node.status === 'FAULT';
  const tokenUsed = node.tokenMetrics.inputTokens + node.tokenMetrics.outputTokens;
  const tokenLimit = node.tokenMetrics.limit;
  const tokenPct = Math.min(100, Math.round((tokenUsed / tokenLimit) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[#050b18] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100 relative">
        {/* Subtle Top Glowing Line */}
        <div className="h-1 w-full bg-gradient-to-r from-[#d97706] via-cyan-400 to-[#10b981]" />

        {/* ── MODAL HEADER ── */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#071022] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#d97706] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                  {node.dieNumber}
                </span>
                <h3 className="text-sm sm:text-base font-mono font-bold text-slate-100">
                  {node.name} — Inner World Telemetry
                </h3>
                <span
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                    isCrashed
                      ? 'bg-red-950 text-red-300 border border-red-500/40 animate-pulse'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {isCrashed ? 'CIRCUIT TRIPPED' : 'OPERATIONAL'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Process inspection, Sub-Core AST parser, and Context Registers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCrashed && onHealNode && (
              <button
                type="button"
                onClick={() => onHealNode(node.id)}
                className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Heal Circuit</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Close (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── MODAL BODY (TWO COLUMNS) ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ── LEFT COLUMN: SUB-CORE EXECUTION MATRIX (7 cols) ── */}
          <div className="lg:col-span-7 space-y-4">
            {/* Active I/O Stream & AST Token Depth */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <FileCode2 className="w-3.5 h-3.5 text-[#d97706]" />
                  Active File I/O Stream:
                </span>
                <span className="text-cyan-300 font-bold">{node.innerWorld.activeFile}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>AST Token Depth: {node.innerWorld.astTokenDepth} levels</span>
                <span className="text-emerald-400 font-medium">Syntax Check: Strict TS</span>
              </div>
            </div>

            {/* Sub-Core Execution Matrix */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <h4 className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Sub-Core Execution Matrix
                </h4>
                <span className="text-[10px] text-slate-500">4 Micro-Cores</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {node.innerWorld.subCoreStatuses.map((core) => (
                  <div
                    key={core.coreId}
                    className="p-3 rounded-lg bg-[#070e1c] border border-slate-800 text-xs font-mono space-y-1.5 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{core.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          core.state === 'TRIPPED'
                            ? 'bg-red-950 text-red-300 border border-red-500/40'
                            : 'bg-slate-900 text-cyan-300'
                        }`}
                      >
                        {core.state}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Load: {core.loadPct}%</span>
                      <span className="flex items-center gap-1">
                        <Thermometer className="w-3 h-3 text-[#d97706]" />
                        {core.temperatureC}°C
                      </span>
                    </div>

                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          core.loadPct > 80 ? 'bg-red-400' : 'bg-cyan-400'
                        }`}
                        style={{ width: `${core.loadPct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Terminal Log Stream */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <h4 className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#d97706]" />
                  Live Monospace Microcode Stream
                </h4>
                <span className="text-[10px] text-slate-500">60 FPS Terminal</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1 max-h-48 overflow-y-auto leading-relaxed">
                {node.innerWorld.liveLogStream.map((log, index) => (
                  <div
                    key={index}
                    className={`truncate ${
                      log.includes('FAULT') || log.includes('TRIP')
                        ? 'text-red-400 font-bold'
                        : log.includes('COMPLETED') || log.includes('VERIFIED')
                        ? 'text-emerald-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: CONTEXT REGISTER HUD (5 cols) ── */}
          <div className="lg:col-span-5 space-y-4">
            {/* Token Meter HUD */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  Context Window Register:
                </span>
                <span className="font-bold text-cyan-300 tabular-nums">
                  {tokenUsed.toLocaleString()} / {tokenLimit.toLocaleString()}
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    tokenPct > 80 ? 'bg-red-400' : tokenPct > 60 ? 'bg-amber-400' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${tokenPct}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1 text-slate-400 border-t border-slate-900">
                <div>
                  <span className="text-slate-500 block">Input Tokens:</span>
                  <span className="text-slate-200 font-bold">{node.tokenMetrics.inputTokens.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Output Tokens:</span>
                  <span className="text-slate-200 font-bold">{node.tokenMetrics.outputTokens.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Persistent Memory ADR Register */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <h4 className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#d97706]" />
                  Active ADR Log (docs/MEMORY.md)
                </h4>
                <span className="text-[10px] text-slate-500">{node.innerWorld.memoryAdrs.length} records</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {node.innerWorld.memoryAdrs.map((adr) => (
                  <div
                    key={adr.id}
                    className="p-2.5 rounded-lg bg-[#070e1c] border border-slate-800 text-xs font-mono space-y-1 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#d97706] text-[11px]">{adr.id}: {adr.title}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        {adr.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug">
                      {adr.decision}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 bg-[#071022] border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Target Spec: docs/PRD.md & docs/CONTRACT.md</span>
          <span className="text-cyan-400">Direct Process Inspection Active</span>
        </div>
      </div>
    </div>
  );
};
