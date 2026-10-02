import React, { useState, useRef, useEffect } from 'react';
import {
  Cpu,
  Zap,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  Terminal,
  Activity,
  Layers,
  ArrowRight,
  ShieldCheck,
  Flame
} from 'lucide-react';

interface SwarmNode {
  id: string;
  name: string;
  role: string;
  status: 'ready' | 'processing' | 'crashed' | 'completed';
  x: number;
  y: number;
  color: string;
  tasksQueued: number;
}

export const AgentSwarmWorkbench: React.FC = () => {
  const [nodes, setNodes] = useState<SwarmNode[]>([
    { id: 'agent-coord', name: 'Coordinator', role: 'DAG Router', status: 'ready', x: 70, y: 70, color: '#F0B230', tasksQueued: 0 },
    { id: 'agent-coder', name: 'CodingAgent', role: 'Worktree Synthesizer', status: 'ready', x: 250, y: 70, color: '#38bdf8', tasksQueued: 0 },
    { id: 'agent-review', name: 'ReviewAgent', role: 'Sonnet Invariant Critic', status: 'ready', x: 430, y: 70, color: '#a855f7', tasksQueued: 0 },
    { id: 'agent-deploy', name: 'DeployAgent', role: 'Vercel Preview Engine', status: 'ready', x: 610, y: 70, color: '#10b981', tasksQueued: 0 }
  ]);

  const [activeStep, setActiveStep] = useState<number>(-1);
  const [packetPos, setPacketPos] = useState<{ x: number; y: number; opacity: number; scale: number }>({
    x: 70,
    y: 70,
    opacity: 0,
    scale: 1
  });
  const [logMessages, setLogMessages] = useState<string[]>([
    'Swarm initialized. GPU compositor thread active (0.0% CPU thread strain).'
  ]);

  const isSimulatingRef = useRef(false);

  const addLog = (msg: string) => {
    setLogMessages((prev) => [
      `[${new Date().toLocaleTimeString('en-GB', { hour12: false })}] ${msg}`,
      ...prev.slice(0, 5)
    ]);
  };

  const dispatchPacket = () => {
    if (isSimulatingRef.current) return;
    isSimulatingRef.current = true;
    setActiveStep(0);
    addLog('Task dispatched from Coordinator: "Synthesize debt reconciliation export"');

    // Step 1: Coordinator -> Coder
    setPacketPos({ x: 70, y: 70, opacity: 1, scale: 1 });

    setTimeout(() => {
      // Transit to Coder
      setPacketPos({ x: 250, y: 70, opacity: 1, scale: 1 });
      setNodes((prev) =>
        prev.map((n) => (n.id === 'agent-coder' ? { ...n, status: 'processing', tasksQueued: n.tasksQueued + 1 } : n))
      );
      setActiveStep(1);
      addLog('CodingAgent absorbed task into git worktree (branch: agent/task-382).');
    }, 600);

    setTimeout(() => {
      // Step 2: Coder -> Reviewer
      setPacketPos({ x: 430, y: 70, opacity: 1, scale: 1 });
      setNodes((prev) =>
        prev.map((n) =>
          n.id === 'agent-coder'
            ? { ...n, status: 'completed' }
            : n.id === 'agent-review'
            ? { ...n, status: 'processing', tasksQueued: n.tasksQueued + 1 }
            : n
        )
      );
      setActiveStep(2);
      addLog('ReviewAgent validating invariant contracts with Schemathesis & Claude Sonnet.');
    }, 1400);

    setTimeout(() => {
      // Step 3: Reviewer -> Deployer
      setPacketPos({ x: 610, y: 70, opacity: 1, scale: 1 });
      setNodes((prev) =>
        prev.map((n) =>
          n.id === 'agent-review'
            ? { ...n, status: 'completed' }
            : n.id === 'agent-deploy'
            ? { ...n, status: 'processing', tasksQueued: n.tasksQueued + 1 }
            : n
        )
      );
      setActiveStep(3);
      addLog('All invariants verified! DeployAgent deploying to preview edge.');
    }, 2200);

    setTimeout(() => {
      // Drop packet into Deployer queue (scale down & fade)
      setPacketPos({ x: 610, y: 88, opacity: 0, scale: 0.1 });
      setNodes((prev) =>
        prev.map((n) => (n.id === 'agent-deploy' ? { ...n, status: 'completed' } : n))
      );
      setActiveStep(4);
      addLog('Preview successfully deployed: https://ehi-multi-stage.vercel.app');
      isSimulatingRef.current = false;
    }, 2900);
  };

  const toggleCrash = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === nodeId) {
          const nextStatus = n.status === 'crashed' ? 'ready' : 'crashed';
          if (nextStatus === 'crashed') {
            addLog(`CRASH TRIGGERED on ${n.name}: Syntax break detected in migration schema!`);
          } else {
            addLog(`HEALED: ${n.name} recovered from syntax break.`);
          }
          return { ...n, status: nextStatus };
        }
        return n;
      })
    );
  };

  const resetAll = () => {
    isSimulatingRef.current = false;
    setActiveStep(-1);
    setPacketPos({ x: 70, y: 70, opacity: 0, scale: 1 });
    setNodes((prev) =>
      prev.map((n) => ({ ...n, status: 'ready', tasksQueued: 0 }))
    );
    addLog('Swarm state reset to baseline.');
  };

  return (
    <div className="p-5 rounded-xl bg-[#161b22] border border-white/5 space-y-4 shadow-xl">
      {/* Header & Telemetry Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#F0B230]/10 border border-[#F0B230]/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#F0B230]" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#e6edf3] font-mono flex items-center gap-2">
              Hardware-Accelerated Agent Swarm
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                GPU COMPOSITOR (0% CPU)
              </span>
            </h3>
            <p className="text-[11px] text-[#8b98a8]">
              Zero-reflow SVG packet transit with compositor-thread transforms and instant glitch states.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={dispatchPacket}
            className="px-3 py-1.5 rounded-lg bg-[#F0B230] text-[#0A1420] text-xs font-mono font-bold hover:bg-[#FFBD59] transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Send Task Packet</span>
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-[#8b98a8] hover:text-[#e6edf3] border border-white/5 transition-colors"
            title="Reset swarm state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── INTERACTIVE WORKSPACE CANVAS ── */}
      <div className="relative w-full h-[180px] bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden select-none flex items-center justify-center">
        {/* SVG Wiring Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 700 140" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="wireGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F0B230" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Background Connecting Bus */}
          <path
            d="M 70 70 L 610 70"
            fill="none"
            stroke="url(#wireGlow)"
            strokeWidth="3"
            strokeDasharray="6 4"
            className="opacity-40"
          />

          {/* Active Flight Path Indicator */}
          {activeStep >= 0 && (
            <path
              d="M 70 70 L 610 70"
              fill="none"
              stroke="#F0B230"
              strokeWidth="2"
              className="opacity-70 animate-pulse"
            />
          )}
        </svg>

        {/* Moving GPU-Accelerated Data Packet */}
        <div
          className="absolute w-3.5 h-3.5 rounded-full pointer-events-none z-20 shadow-[0_0_12px_#38bdf8]"
          style={{
            backgroundColor: '#38bdf8',
            willChange: 'transform, opacity',
            transform: `translate3d(${packetPos.x - 7}px, ${packetPos.y - 7}px, 0) scale(${packetPos.scale})`,
            opacity: packetPos.opacity,
            transition: 'transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.25s ease-out'
          }}
        />

        {/* Agent Node Stations */}
        <div className="relative w-full max-w-[680px] flex items-center justify-between px-6 z-10">
          {nodes.map((node) => {
            const isCrashed = node.status === 'crashed';
            const isProcessing = node.status === 'processing';

            return (
              <div
                key={node.id}
                id={node.id}
                onClick={() => toggleCrash(node.id)}
                className={`w-[125px] sm:w-[140px] p-2.5 rounded-xl border transition-colors cursor-pointer text-center relative select-none ${
                  isCrashed
                    ? 'crashed'
                    : isProcessing
                    ? 'bg-[#1c2333] border-[#F0B230] shadow-[0_0_15px_rgba(240,178,48,0.2)]'
                    : 'bg-[#161b22] border-white/10 hover:border-white/20'
                }`}
                title="Click to toggle Syntax Crash glitch"
              >
                {/* Status Dot */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: isCrashed ? '#ef4444' : isProcessing ? '#F0B230' : node.color }}
                  />
                  <span className="text-[9px] font-mono text-[#8b98a8]">
                    {node.tasksQueued} queued
                  </span>
                </div>

                <div className="text-xs font-mono font-bold text-[#e6edf3] truncate">
                  {node.name}
                </div>

                <div className="text-[10px] font-mono text-[#8b98a8] truncate">
                  {isCrashed ? (
                    <span className="text-red-400 font-bold uppercase">CRASH: SYNTAX ERR</span>
                  ) : isProcessing ? (
                    <span className="text-[#FFBD59] font-medium">PROCESSING</span>
                  ) : (
                    node.role
                  )}
                </div>

                {/* Crash Action Prompt */}
                <div className="mt-1 text-[8px] font-mono text-[#8b98a8] border-t border-white/5 pt-1">
                  {isCrashed ? 'Tap to Heal' : 'Tap to Break'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Swarm Console & Crash Recovery Terminal */}
      <div className="bg-[#0d1117] p-3 rounded-lg border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-[#8b98a8] min-w-0">
          <Terminal className="w-3.5 h-3.5 text-[#F0B230] shrink-0" />
          <span className="text-[#e6edf3] truncate">{logMessages[0]}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-[#8b98a8]">Thread: Compositor</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
};
