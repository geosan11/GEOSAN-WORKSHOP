import React from 'react';
import { Zap, Play, Pause, Flame, RotateCcw, Sparkles, AlertOctagon } from 'lucide-react';

interface FoundryDockProps {
  onDispatchSubtask: () => void;
  isStreaming: boolean;
  onToggleStream: () => void;
  onSimulateCircuitTrip: () => void;
  onResetBoard: () => void;
  isTripped: boolean;
}

export const FoundryDock: React.FC<FoundryDockProps> = ({
  onDispatchSubtask,
  isStreaming,
  onToggleStream,
  onSimulateCircuitTrip,
  onResetBoard,
  isTripped
}) => {
  return (
    <div className="w-full max-w-3xl mx-auto p-2 sm:p-2.5 rounded-2xl bg-[#060c18]/95 backdrop-blur-md border border-cyan-500/30 shadow-2xl flex flex-wrap items-center justify-between gap-2.5">
      {/* Dock Brand Indicator */}
      <div className="flex items-center gap-2 pl-2 text-xs font-mono text-slate-300 hidden sm:flex">
        <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
        <span>Silicon Foundry Controls:</span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
        {/* 1. Dispatch Subtask */}
        <button
          type="button"
          onClick={onDispatchSubtask}
          disabled={isTripped}
          className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#d97706] text-slate-950 font-mono font-bold text-xs hover:bg-[#f59e0b] transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-40"
          title="Fire kinetic gold packet across bus"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>⚡ Dispatch Subtask</span>
        </button>

        {/* 2. Stream Assembly Line */}
        <button
          type="button"
          onClick={onToggleStream}
          disabled={isTripped}
          className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl border text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-40 ${
            isStreaming
              ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
              : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
          }`}
          title="Toggle automated pipeline streaming loop (1.5s interval)"
        >
          {isStreaming ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>⏸ Pause Stream</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>🔁 Stream Assembly</span>
            </>
          )}
        </button>

        {/* 3. Simulate Circuit Trip */}
        <button
          type="button"
          onClick={onSimulateCircuitTrip}
          className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 font-mono font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
          title="Force Die 02 into crashed state and blow PCB fuse"
        >
          <Flame className="w-3.5 h-3.5 text-red-400" />
          <span>⚠️ Circuit Trip</span>
        </button>

        {/* 4. Reset Board */}
        <button
          type="button"
          onClick={onResetBoard}
          className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100 font-mono font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
          title="Restore dies, clear fault, and resume clocking"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>🔄 Reset</span>
        </button>
      </div>
    </div>
  );
};
