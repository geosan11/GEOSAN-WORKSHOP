import React from 'react';
import { AgentNode } from '../../types/foundry';
import { Zap, AlertTriangle, Cpu, Terminal, Flame, Eye, Sparkles } from 'lucide-react';

interface SiliconDieProps {
  node: AgentNode;
  isFocused?: boolean;
  onInspect: (node: AgentNode) => void;
  fabricationStep?: number;
}

export const SiliconDie: React.FC<SiliconDieProps> = ({
  node,
  isFocused,
  onInspect,
  fabricationStep = 42
}) => {
  const isCrashed = node.isCrashed || node.status === 'CRASHED' || node.status === 'FAULT';

  // Render Vector Avatar based on avatarType
  const renderAvatar = () => {
    switch (node.avatarType) {
      case 'NEXUS_GYRO':
        // NEXUS-01 Gyroscope: Concentric spinning rings
        return (
          <div className="relative w-14 h-14 flex items-center justify-center">
            {/* Outer Ring */}
            <div
              className="absolute inset-0 rounded-full border border-cyan-400/40 border-dashed"
              style={{ animation: 'spin-cw 12s linear infinite' }}
            />
            {/* Middle Counter-Rotating Ring */}
            <div
              className="absolute inset-2 rounded-full border border-[#d97706]/70 border-t-transparent"
              style={{ animation: 'spin-ccw 6s linear infinite' }}
            />
            {/* Inner Ring with Target Crosshairs */}
            <div
              className="absolute inset-3.5 rounded-full border border-cyan-300/80"
              style={{ animation: 'spin-cw 3s linear infinite' }}
            />
            {/* Center Pulsing Quantum Dot */}
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] animate-ping" />
          </div>
        );

      case 'CYBER_FORGE':
        // CYBER-FORGE: Robotic Visor with frequency equalizer bars
        return (
          <div className="relative w-14 h-14 bg-slate-950/80 rounded-lg border border-slate-800 flex flex-col items-center justify-center p-1.5 overflow-hidden">
            {/* Horizontal Glowing Cyber Visor */}
            <div
              className={`w-full h-1.5 rounded-sm mb-2 shadow-sm ${
                isCrashed
                  ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                  : 'bg-[#d97706] shadow-[0_0_8px_#d97706]'
              }`}
            />
            {/* Equalizer Frequency Bars */}
            <div className="flex items-end justify-center gap-1 w-full h-5">
              <div
                className={`w-1 rounded-t transition-all ${
                  isCrashed ? 'bg-red-500/80 h-1' : 'bg-cyan-400 h-4 animate-pulse'
                }`}
              />
              <div
                className={`w-1 rounded-t transition-all ${
                  isCrashed ? 'bg-red-500/80 h-2' : 'bg-[#d97706] h-5'
                }`}
                style={{ animation: isCrashed ? 'none' : 'pulse 1s infinite alternate' }}
              />
              <div
                className={`w-1 rounded-t transition-all ${
                  isCrashed ? 'bg-red-500/80 h-1' : 'bg-cyan-300 h-3 animate-pulse'
                }`}
              />
              <div
                className={`w-1 rounded-t transition-all ${
                  isCrashed ? 'bg-red-500/80 h-3' : 'bg-emerald-400 h-4'
                }`}
              />
              <div
                className={`w-1 rounded-t transition-all ${
                  isCrashed ? 'bg-red-500/80 h-1' : 'bg-[#d97706] h-2 animate-pulse'
                }`}
              />
            </div>
          </div>
        );

      case 'SENTINEL_EYE':
        // SENTINEL-EYE: Radar Scanner with rotating sweep line
        return (
          <div className="relative w-14 h-14 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
            {/* Grid Crosshairs */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-[1px] bg-slate-800" />
              <div className="h-full w-[1px] bg-slate-800 absolute" />
            </div>
            {/* Radar Circle Graticules */}
            <div className="absolute w-10 h-10 rounded-full border border-cyan-500/30" />
            <div className="absolute w-5 h-5 rounded-full border border-cyan-500/40" />
            {/* Rotating Radar Sweep Line */}
            <div
              className="absolute inset-0 origin-center"
              style={{ animation: 'radar-sweep 2.4s linear infinite' }}
            >
              <div className="w-1/2 h-full bg-gradient-to-l from-cyan-400/40 via-cyan-500/10 to-transparent transform -origin-right" />
            </div>
            {/* Center Blip */}
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981] z-10" />
          </div>
        );
    }
  };

  return (
    <div
      onClick={() => onInspect(node)}
      className={`relative group cursor-pointer transition-all duration-300 select-none ${
        isCrashed ? 'crashed' : ''
      }`}
    >
      {/* ── TOP CONTACT PINOUTS (Gold PCB contacts) ── */}
      <div className="flex justify-between px-4 -mb-[3px] relative z-10">
        {[...Array(6)].map((_, i) => (
          <div
            key={`top-pin-${i}`}
            className="w-1.5 h-2 bg-[#d97706] rounded-t-sm shadow-[0_0_2px_#d97706]"
          />
        ))}
      </div>

      {/* ── SILICON DIE CERAMIC PACKAGE ── */}
      <div
        className={`w-full p-4 rounded-xl border relative overflow-hidden transition-all shadow-xl backdrop-blur-sm ${
          isCrashed
            ? 'bg-red-950/60 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)]'
            : isFocused
            ? 'bg-[#081022] border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
            : 'bg-[#060c1a] border-slate-800/90 hover:border-[#d97706]/60 hover:shadow-[0_0_15px_rgba(217,119,6,0.2)]'
        }`}
      >
        {/* Subtle Silicon Wafer Etch Background */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, #d97706 0, #d97706 1px, transparent 0, transparent 8px)`
          }}
        />

        {/* Die Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[#d97706] font-bold">
              {node.dieNumber}
            </span>
            <span className="text-xs font-mono font-bold text-slate-100 tracking-tight">
              {node.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className="text-cyan-400 font-bold">{node.voltage}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
        </div>

        {/* Die Body: Avatar & Dynamic Status */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="shrink-0">{renderAvatar()}</div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="text-[10px] font-mono uppercase text-slate-400 truncate">
              {node.role}
            </div>

            {/* Status text */}
            <div className="text-xs font-mono font-bold truncate">
              {isCrashed ? (
                <span className="text-red-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 animate-bounce" />
                  CIRCUIT TRIP: FAULT
                </span>
              ) : node.avatarType === 'CYBER_FORGE' ? (
                <span className="text-[#d97706] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#d97706]" />
                  FABRICATING: #{fabricationStep}
                </span>
              ) : node.avatarType === 'NEXUS_GYRO' ? (
                <span className="text-cyan-300">Reading docs/PRD.md</span>
              ) : (
                <span className="text-emerald-400">Verifying Contracts</span>
              )}
            </div>

            {/* Queue and sub-cores gauge */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
              <span>Queue: {node.queueCount} pkts</span>
              <span className="text-slate-400 group-hover:text-cyan-300 transition-colors">
                Inspect ↗
              </span>
            </div>
          </div>
        </div>

        {/* Fault Banner if Crashed */}
        {isCrashed && (
          <div className="mt-2.5 p-1.5 rounded bg-red-950 border border-red-500/50 text-[10px] font-mono text-red-300 font-bold text-center tracking-tight animate-pulse">
            ⚠️ TRIP: ALU SYNTAX FAULT (CLICK TO INSPECT)
          </div>
        )}
      </div>

      {/* ── BOTTOM CONTACT PINOUTS (Gold PCB contacts) ── */}
      <div className="flex justify-between px-4 -mt-[3px] relative z-10">
        {[...Array(6)].map((_, i) => (
          <div
            key={`bot-pin-${i}`}
            className="w-1.5 h-2 bg-[#d97706] rounded-b-sm shadow-[0_0_2px_#d97706]"
          />
        ))}
      </div>
    </div>
  );
};
