import React, { useEffect, useState, useRef } from 'react';
import {
  Cpu,
  Layers,
  Zap,
  Activity,
  AlertOctagon,
  FileCode2,
  CheckCircle2,
  Hammer,
  ShieldCheck,
  Terminal,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export type AgentNodeStatus = 'idle' | 'processing' | 'building' | 'crashed';

export interface CanvasAgentNode {
  id: string;
  name: string;
  sublabel: string;
  status: AgentNodeStatus;
  x: number; // percentage or px
  y: number;
  queueCount: number;
  badge?: string;
}

interface AgentCanvasProps {
  onNodeClick?: (nodeId: string) => void;
  isCrashedExternal?: boolean;
  onCrashTriggered?: (nodeId: string) => void;
  onDispatchTriggered?: () => void;
  compilingFile?: string;
}

export const AgentCanvas: React.FC<AgentCanvasProps> = ({
  onNodeClick,
  isCrashedExternal,
  onCrashTriggered,
  compilingFile = '@/components/MetricCard.tsx'
}) => {
  const [nodes, setNodes] = useState<CanvasAgentNode[]>([
    { id: 'orchestrator', name: 'Orchestrator', sublabel: 'CoordinatorAgent', status: 'idle', x: 10, y: 35, queueCount: 2 },
    { id: 'scraper', name: 'Scraper / Collector', sublabel: 'TelemetryIngest', status: 'idle', x: 30, y: 15, queueCount: 5 },
    { id: 'validator', name: 'Data Validator', sublabel: 'ZodContractGuard', status: 'idle', x: 50, y: 55, queueCount: 1 },
    { id: 'db-writer', name: 'DB Writer', sublabel: 'SupabasePostgres', status: 'idle', x: 72, y: 20, queueCount: 4 },
    { id: 'ui-compiler', name: 'UI Compiler', sublabel: 'NextViteEngine', status: 'building', x: 90, y: 50, queueCount: 3 }
  ]);

  // Animated packet state
  const [packet, setPacket] = useState<{
    active: boolean;
    x: number;
    y: number;
    scale: number;
    opacity: number;
    targetNodeId: string;
  }>({
    active: false,
    x: 10,
    y: 35,
    scale: 1,
    opacity: 0,
    targetNodeId: 'scraper'
  });

  const [activePathIndex, setActivePathIndex] = useState<number>(-1);
  const [isPaused, setIsPaused] = useState(false);
  const animTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Clear pending timeouts
  const clearAllTimeouts = () => {
    animTimeoutsRef.current.forEach(clearTimeout);
    animTimeoutsRef.current = [];
  };

  // Sync external crash trigger
  useEffect(() => {
    if (isCrashedExternal) {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === 'validator'
            ? { ...n, status: 'crashed', badge: 'SYNTAX CRASH' }
            : n
        )
      );
      setIsPaused(true);
    } else {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === 'validator' && n.status === 'crashed'
            ? { ...n, status: 'idle', badge: undefined }
            : n
        )
      );
      setIsPaused(false);
    }
  }, [isCrashedExternal]);

  // Dispatch packet from Orchestrator -> Scraper -> Validator -> DB Writer -> UI Compiler
  const runPacketSequence = () => {
    if (isPaused) return;
    clearAllTimeouts();

    // 1. Spawn at Orchestrator (10%, 35%)
    setPacket({ active: true, x: 10, y: 35, scale: 1, opacity: 1, targetNodeId: 'orchestrator' });
    setActivePathIndex(0);

    // 2. Fly to Scraper (30%, 15%)
    const t1 = setTimeout(() => {
      setPacket({ active: true, x: 30, y: 15, scale: 1, opacity: 1, targetNodeId: 'scraper' });
      setNodes((prev) =>
        prev.map((n) => (n.id === 'scraper' ? { ...n, status: 'processing', queueCount: n.queueCount + 1 } : n))
      );
      setActivePathIndex(1);
    }, 500);

    // 3. Drop into Scraper queue, then fly to Validator (50%, 55%)
    const t2 = setTimeout(() => {
      setPacket({ active: true, x: 50, y: 55, scale: 1, opacity: 1, targetNodeId: 'validator' });
      setNodes((prev) =>
        prev.map((n) =>
          n.id === 'scraper'
            ? { ...n, status: 'idle' }
            : n.id === 'validator'
            ? { ...n, status: 'processing', queueCount: n.queueCount + 1 }
            : n
        )
      );
      setActivePathIndex(2);
    }, 1200);

    // 4. Fly to DB Writer (72%, 20%)
    const t3 = setTimeout(() => {
      setPacket({ active: true, x: 72, y: 20, scale: 1, opacity: 1, targetNodeId: 'db-writer' });
      setNodes((prev) =>
        prev.map((n) =>
          n.id === 'validator'
            ? { ...n, status: 'idle' }
            : n.id === 'db-writer'
            ? { ...n, status: 'processing', queueCount: n.queueCount + 1 }
            : n
        )
      );
      setActivePathIndex(3);
    }, 1900);

    // 5. Fly to UI Compiler (90%, 50%) and drop down
    const t4 = setTimeout(() => {
      setPacket({ active: true, x: 90, y: 50, scale: 1, opacity: 1, targetNodeId: 'ui-compiler' });
      setNodes((prev) =>
        prev.map((n) =>
          n.id === 'db-writer'
            ? { ...n, status: 'idle' }
            : n.id === 'ui-compiler'
            ? { ...n, status: 'building', queueCount: n.queueCount + 1 }
            : n
        )
      );
      setActivePathIndex(4);
    }, 2600);

    // 6. Absorb / Drop into UI Compiler queue: scale down to 0.2 and drop down
    const t5 = setTimeout(() => {
      setPacket((p) => ({ ...p, y: 62, scale: 0.2, opacity: 0 }));
      setNodes((prev) =>
        prev.map((n) => (n.id === 'ui-compiler' ? { ...n, status: 'idle' } : n))
      );
      setActivePathIndex(-1);
    }, 3200);

    animTimeoutsRef.current = [t1, t2, t3, t4, t5];
  };

  const handleNodeClick = (node: CanvasAgentNode) => {
    if (onNodeClick) onNodeClick(node.id);
    if (node.status === 'crashed') {
      // Toggle off crash
      setNodes((prev) =>
        prev.map((n) => (n.id === node.id ? { ...n, status: 'idle', badge: undefined } : n))
      );
      setIsPaused(false);
    } else {
      // Toggle crash on
      setNodes((prev) =>
        prev.map((n) => (n.id === node.id ? { ...n, status: 'crashed', badge: 'SYNTAX CRASH' } : n))
      );
      setIsPaused(true);
      if (onCrashTriggered) onCrashTriggered(node.id);
    }
  };

  return (
    <div className="h-full flex flex-col justify-between p-4 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden select-none">
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F0B230]/15 border border-[#F0B230]/40 flex items-center justify-center text-[#F0B230]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono font-bold tracking-wider text-slate-100 uppercase">
                Agent Swarm & Construction Zone
              </h3>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                GPU COMPOSITOR (0% CPU)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Hardware-accelerated SVG DAG pipeline with microsecond crash states
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runPacketSequence}
            disabled={isPaused}
            className="px-3 py-1.5 rounded-lg bg-[#F0B230] text-slate-950 text-xs font-mono font-bold hover:bg-[#FFBD59] transition-all flex items-center gap-1.5 disabled:opacity-40 shadow-sm active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Transmit Task Packet</span>
          </button>
        </div>
      </div>

      {/* ── INTERACTIVE CANVAS VIEWPORT (SVG + GPU NODES) ── */}
      <div className="relative flex-1 min-h-[340px] my-3 rounded-xl bg-slate-900/60 border border-slate-800/80 overflow-hidden flex items-center justify-center">
        {/* Subtle Background Grid Pattern */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* SVG Wiring Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="streamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F0B230" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
            </linearGradient>
            <filter id="packetGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
            </filter>
          </defs>

          {/* Node Connection Lines */}
          {/* 1. Orchestrator (10, 35) -> Scraper (30, 15) */}
          <path
            d="M 12 37 Q 20 22, 30 17"
            fill="none"
            stroke={activePathIndex === 0 ? '#F0B230' : 'rgba(100, 116, 139, 0.35)'}
            strokeWidth={activePathIndex === 0 ? '1.2' : '0.8'}
            strokeDasharray={activePathIndex === 0 ? 'none' : '2 2'}
          />

          {/* 2. Scraper (30, 15) -> Validator (50, 55) */}
          <path
            d="M 30 17 Q 40 32, 50 55"
            fill="none"
            stroke={activePathIndex === 1 ? '#38bdf8' : 'rgba(100, 116, 139, 0.35)'}
            strokeWidth={activePathIndex === 1 ? '1.2' : '0.8'}
            strokeDasharray={activePathIndex === 1 ? 'none' : '2 2'}
          />

          {/* 3. Validator (50, 55) -> DB Writer (72, 20) */}
          <path
            d="M 50 55 Q 60 30, 72 22"
            fill="none"
            stroke={activePathIndex === 2 ? '#a855f7' : 'rgba(100, 116, 139, 0.35)'}
            strokeWidth={activePathIndex === 2 ? '1.2' : '0.8'}
            strokeDasharray={activePathIndex === 2 ? 'none' : '2 2'}
          />

          {/* 4. DB Writer (72, 20) -> UI Compiler (90, 50) */}
          <path
            d="M 72 22 Q 80 40, 88 50"
            fill="none"
            stroke={activePathIndex === 3 ? '#10b981' : 'rgba(100, 116, 139, 0.35)'}
            strokeWidth={activePathIndex === 3 ? '1.2' : '0.8'}
            strokeDasharray={activePathIndex === 3 ? 'none' : '2 2'}
          />
        </svg>

        {/* Moving GPU-Accelerated Task Packet */}
        {packet.active && (
          <div
            className="absolute w-3 h-3 rounded-full pointer-events-none z-30 shadow-[0_0_14px_#38bdf8]"
            style={{
              backgroundColor: '#38bdf8',
              left: `${packet.x}%`,
              top: `${packet.y}%`,
              willChange: 'transform, opacity',
              transform: `translate3d(-50%, -50%, 0) scale(${packet.scale})`,
              opacity: packet.opacity,
              transition: 'left 0.65s cubic-bezier(0.16, 1, 0.3, 1), top 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s ease-out, opacity 0.25s ease-out'
            }}
          />
        )}

        {/* Agent Node Cards */}
        {nodes.map((node) => {
          const isCrashed = node.status === 'crashed';
          const isProcessing = node.status === 'processing';
          const isBuilding = node.status === 'building';

          return (
            <div
              key={node.id}
              onClick={() => handleNodeClick(node)}
              className={`absolute p-2.5 rounded-xl border transition-all cursor-pointer z-20 w-[140px] text-center select-none shadow-lg ${
                isCrashed
                  ? 'crashed'
                  : isBuilding
                  ? 'bg-slate-900 border-[#F0B230] shadow-[0_0_20px_rgba(240,178,48,0.25)]'
                  : isProcessing
                  ? 'bg-slate-900 border-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: 'translate(-50%, -50%)',
                willChange: isCrashed ? 'transform' : 'auto'
              }}
              title="Click to toggle Syntax Crash glitch"
            >
              {/* Header & Status Indicator */}
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-1">
                <span className="flex items-center gap-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isCrashed
                        ? 'bg-red-500'
                        : isProcessing
                        ? 'bg-cyan-400 animate-pulse'
                        : isBuilding
                        ? 'bg-[#F0B230] animate-pulse'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <span>
                    {isCrashed ? 'CRASH' : isBuilding ? 'BUILD' : isProcessing ? 'EXEC' : 'IDLE'}
                  </span>
                </span>
                <span className="text-slate-500 font-bold">{node.queueCount}q</span>
              </div>

              {/* Node Title */}
              <div className="text-xs font-mono font-bold text-slate-200 truncate">
                {node.name}
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate">
                {node.sublabel}
              </div>

              {/* Crash Badge */}
              {isCrashed && (
                <div className="mt-1 px-1 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-[9px] font-mono font-bold text-red-300 uppercase tracking-tighter animate-pulse">
                  {node.badge || 'SYNTAX CRASH'}
                </div>
              )}

              {/* Status footer hint */}
              <div className="mt-1 text-[8px] font-mono text-slate-500 border-t border-slate-800/80 pt-1">
                {isCrashed ? 'Tap to Heal' : 'Tap to Break'}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── CONSTRUCTION ZONE INDICATOR ── */}
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs font-mono z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded bg-[#F0B230]/10 border border-[#F0B230]/30 flex items-center justify-center text-[#F0B230] shrink-0">
            <Hammer className="w-3.5 h-3.5 animate-bounce" />
          </div>
          <div className="truncate">
            <span className="text-slate-400 text-[10px] uppercase block tracking-wider font-bold">
              Construction Zone:
            </span>
            <span className="text-[#FFBD59] font-bold truncate block">
              compiling: {compilingFile}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono text-slate-400">Vite HMR</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>
      </div>
    </div>
  );
};
