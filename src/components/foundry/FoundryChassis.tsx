import React, { useState, useEffect, useRef } from 'react';
import { AgentNode, TelemetryState, TaskPacket } from '../../types/foundry';
import { SiliconDie } from './SiliconDie';
import { InnerWorldModal } from './InnerWorldModal';
import { FoundryDock } from './FoundryDock';
import {
  Activity,
  Cpu,
  Zap,
  Terminal,
  AlertTriangle,
  Layers,
  Sparkles,
  ShieldAlert,
  Flame,
  CheckCircle2
} from 'lucide-react';

const INITIAL_NODES: AgentNode[] = [
  {
    id: 'die-01',
    dieNumber: 'DIE 01',
    name: 'Orchestrator',
    role: 'Control Unit / Spec Router',
    voltage: '0.8V',
    status: 'IDLE',
    queueCount: 1,
    isCrashed: false,
    avatarType: 'NEXUS_GYRO',
    subCores: [
      { coreId: 'c1-1', name: 'DAG-Router', loadPct: 24, temperatureC: 38, state: 'ONLINE' },
      { coreId: 'c1-2', name: 'Spec-Tokenizer', loadPct: 35, temperatureC: 41, state: 'ACTIVE' },
      { coreId: 'c1-3', name: 'Contract-Gate', loadPct: 12, temperatureC: 36, state: 'ONLINE' },
      { coreId: 'c1-4', name: 'Telemetry-Bus', loadPct: 18, temperatureC: 37, state: 'ONLINE' }
    ],
    tokenMetrics: {
      inputTokens: 1420,
      outputTokens: 890,
      limit: 8192
    },
    innerWorld: {
      activeFile: 'docs/PRD.md & docs/TASKS.md',
      astTokenDepth: 8,
      subCoreStatuses: [
        { coreId: 'c1-1', name: 'DAG-Router', loadPct: 24, temperatureC: 38, state: 'ONLINE' },
        { coreId: 'c1-2', name: 'Spec-Tokenizer', loadPct: 35, temperatureC: 41, state: 'ACTIVE' },
        { coreId: 'c1-3', name: 'Contract-Gate', loadPct: 12, temperatureC: 36, state: 'ONLINE' },
        { coreId: 'c1-4', name: 'Telemetry-Bus', loadPct: 18, temperatureC: 37, state: 'ONLINE' }
      ],
      liveLogStream: [
        '[15:58:12] Spec manifest loaded from docs/PRD.md',
        '[15:58:13] Invariants evaluated against 4-tier task matrix',
        '[15:58:14] Dispatching task packet to Die 02 (Antigravity ALU)',
        '[15:58:15] Bus handshake acknowledged: 4.82 GHz sync'
      ],
      memoryAdrs: [
        { id: 'ADR-001', title: 'Progressive Disclosure (Addendum C)', decision: 'CSS Grid height transitions', status: 'APPROVED' },
        { id: 'ADR-003', title: 'Multi-Model Federation', decision: 'Claude Sonnet critic for invariant gate', status: 'APPROVED' }
      ]
    }
  },
  {
    id: 'die-02',
    dieNumber: 'DIE 02',
    name: 'Antigravity Dev',
    role: 'ALU Exec / Code Synthesizer',
    voltage: '1.2V',
    status: 'FABRICATING',
    queueCount: 3,
    isCrashed: false,
    avatarType: 'CYBER_FORGE',
    subCores: [
      { coreId: 'c2-1', name: 'Worktree-Synthesizer', loadPct: 78, temperatureC: 56, state: 'ACTIVE' },
      { coreId: 'c2-2', name: 'AST-Transformer', loadPct: 65, temperatureC: 52, state: 'ACTIVE' },
      { coreId: 'c2-3', name: 'Type-Checker', loadPct: 42, temperatureC: 48, state: 'ONLINE' },
      { coreId: 'c2-4', name: 'Commit-Packer', loadPct: 20, temperatureC: 40, state: 'ONLINE' }
    ],
    tokenMetrics: {
      inputTokens: 3840,
      outputTokens: 2190,
      limit: 8192
    },
    innerWorld: {
      activeFile: 'src/components/MetricCard.tsx',
      astTokenDepth: 14,
      subCoreStatuses: [
        { coreId: 'c2-1', name: 'Worktree-Synthesizer', loadPct: 78, temperatureC: 56, state: 'ACTIVE' },
        { coreId: 'c2-2', name: 'AST-Transformer', loadPct: 65, temperatureC: 52, state: 'ACTIVE' },
        { coreId: 'c2-3', name: 'Type-Checker', loadPct: 42, temperatureC: 48, state: 'ONLINE' },
        { coreId: 'c2-4', name: 'Commit-Packer', loadPct: 20, temperatureC: 40, state: 'ONLINE' }
      ],
      liveLogStream: [
        '[15:58:10] Initialized isolated worktree branch: agent/task-foundry',
        '[15:58:12] Synthesizing TypeScript component AST tree',
        '[15:58:14] Generating zero-reflow CSS compositor transforms',
        '[15:58:15] Emitting compiled artifact to Grok Linter buffer'
      ],
      memoryAdrs: [
        { id: 'ADR-004', title: 'Hardware-Accelerated Compositor Swarm', decision: 'SVG transforms with 0% CPU strain', status: 'APPROVED' },
        { id: 'ADR-002', title: 'Density Engine Multi-Mode', decision: 'Compact / Normal / Expanded sync', status: 'APPROVED' }
      ]
    }
  },
  {
    id: 'die-03',
    dieNumber: 'DIE 03',
    name: 'Grok Linter',
    role: 'Static QA / Invariant Radar',
    voltage: '0.9V',
    status: 'SCANNING',
    queueCount: 2,
    isCrashed: false,
    avatarType: 'SENTINEL_EYE',
    subCores: [
      { coreId: 'c3-1', name: 'Schemathesis-Fuzzer', loadPct: 45, temperatureC: 44, state: 'ACTIVE' },
      { coreId: 'c3-2', name: 'Contract-Verifier', loadPct: 52, temperatureC: 46, state: 'ACTIVE' },
      { coreId: 'c3-3', name: 'OWASP-Auditor', loadPct: 30, temperatureC: 41, state: 'ONLINE' },
      { coreId: 'c3-4', name: 'Vercel-Promoter', loadPct: 15, temperatureC: 38, state: 'ONLINE' }
    ],
    tokenMetrics: {
      inputTokens: 1890,
      outputTokens: 720,
      limit: 8192
    },
    innerWorld: {
      activeFile: 'docs/CONTRACT.md & openapi.json',
      astTokenDepth: 6,
      subCoreStatuses: [
        { coreId: 'c3-1', name: 'Schemathesis-Fuzzer', loadPct: 45, temperatureC: 44, state: 'ACTIVE' },
        { coreId: 'c3-2', name: 'Contract-Verifier', loadPct: 52, temperatureC: 46, state: 'ACTIVE' },
        { coreId: 'c3-3', name: 'OWASP-Auditor', loadPct: 30, temperatureC: 41, state: 'ONLINE' },
        { coreId: 'c3-4', name: 'Vercel-Promoter', loadPct: 15, temperatureC: 38, state: 'ONLINE' }
      ],
      liveLogStream: [
        '[15:58:08] Ingesting telemetry payload from EdgePoint node',
        '[15:58:11] Validating Zod schema constraints: fixture_id != null',
        '[15:58:13] Checking HTTP 200 invariant response time < 50ms',
        '[15:58:15] Contract verification: PASSED (0 regressions)'
      ],
      memoryAdrs: [
        { id: 'ADR-003', title: 'Multi-Model Federation', decision: 'Claude Sonnet critic invariant auditor', status: 'APPROVED' }
      ]
    }
  }
];

export const FoundryChassis: React.FC = () => {
  const [nodes, setNodes] = useState<AgentNode[]>(INITIAL_NODES);
  const [inspectingNode, setInspectingNode] = useState<AgentNode | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTripped, setIsTripped] = useState(false);
  const [clockCycle, setClockCycle] = useState(4829104);
  const [fabricationStep, setFabricationStep] = useState(42);

  // Moving packet animation state (Percentage coordinates across the Motherboard)
  const [packet, setPacket] = useState<{
    visible: boolean;
    x: number;
    y: number;
    scale: number;
    opacity: number;
  }>({
    visible: false,
    x: 18,
    y: 50,
    scale: 1,
    opacity: 0
  });

  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // 1. Live Clock Cycle simulation counter (updates every 150ms)
  useEffect(() => {
    const timer = setInterval(() => {
      setClockCycle((prev) => prev + Math.floor(Math.random() * 8 + 4));
    }, 150);
    return () => clearInterval(timer);
  }, []);

  // 2. Stream Assembly Line loop (dispatches every 1.5s)
  useEffect(() => {
    if (isStreaming && !isTripped) {
      streamIntervalRef.current = setInterval(() => {
        dispatchPacketTransit();
      }, 1500);
    } else {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    }
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, [isStreaming, isTripped]);

  // Clean pending packet timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // Kinetic Gold Packet Trajectory: Die 01 -> Die 02 -> Die 03
  const dispatchPacketTransit = () => {
    if (isTripped) return;
    timeoutsRef.current.forEach(clearTimeout);

    // Increment fabrication counter
    setFabricationStep((prev) => prev + 1);

    // Spawn at Die 01 output pin (approx 22%, 50%)
    setPacket({ visible: true, x: 22, y: 50, scale: 1, opacity: 1 });

    // Step 1: Transit along bus to Die 02 input (50%, 50%)
    const t1 = setTimeout(() => {
      setPacket({ visible: true, x: 50, y: 50, scale: 1, opacity: 1 });
      setNodes((prev) =>
        prev.map((n) =>
          n.id === 'die-02' ? { ...n, status: 'FABRICATING', queueCount: n.queueCount + 1 } : n
        )
      );
    }, 450);

    // Step 2: Transit from Die 02 to Die 03 input (78%, 50%)
    const t2 = setTimeout(() => {
      setPacket({ visible: true, x: 78, y: 50, scale: 1, opacity: 1 });
      setNodes((prev) =>
        prev.map((n) =>
          n.id === 'die-03' ? { ...n, status: 'SCANNING', queueCount: n.queueCount + 1 } : n
        )
      );
    }, 900);

    // Step 3: Absorb / drop into Die 03 queue (scale: 0.2, fade down)
    const t3 = setTimeout(() => {
      setPacket((p) => ({ ...p, y: 58, scale: 0.2, opacity: 0 }));
    }, 1300);

    const t4 = setTimeout(() => {
      setPacket((p) => ({ ...p, visible: false }));
    }, 1500);

    timeoutsRef.current = [t1, t2, t3, t4];
  };

  // Simulate Circuit Trip (Die 02 crashes, blown fuse visualizer)
  const handleSimulateCircuitTrip = () => {
    setIsTripped(true);
    setIsStreaming(false);
    timeoutsRef.current.forEach(clearTimeout);
    setPacket((p) => ({ ...p, visible: false }));

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === 'die-02') {
          return {
            ...n,
            isCrashed: true,
            status: 'CRASHED',
            innerWorld: {
              ...n.innerWorld,
              liveLogStream: [
                '[15:58:19] 💥 CRITICAL: ALU SYNTAX FAULT DETECTED',
                '[15:58:19] ⚠️ Invariant violated: Expected string, received null',
                '[15:58:19] 🔌 Fuse #F2 blown on PCB bus trace (current halted)',
                ...n.innerWorld.liveLogStream
              ]
            }
          };
        }
        return n;
      })
    );
  };

  // Reset Board to nominal
  const handleResetBoard = () => {
    setIsTripped(false);
    setNodes(INITIAL_NODES);
    if (inspectingNode) {
      setInspectingNode((prev) => (prev ? { ...prev, isCrashed: false, status: 'FABRICATING' } : null));
    }
  };

  // Heal specific die
  const handleHealNode = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, isCrashed: false, status: 'FABRICATING' } : n))
    );
    if (inspectingNode && inspectingNode.id === nodeId) {
      setInspectingNode((prev) => (prev ? { ...prev, isCrashed: false, status: 'FABRICATING' } : null));
    }
    setIsTripped(false);
  };

  return (
    <div className="w-full max-w-[980px] mx-auto p-4 sm:p-6 space-y-4 text-slate-100 select-none">
      {/* ── TOP HUD BAR (TELEMETRY & BUS CLOCKING) ── */}
      <div className="p-3.5 rounded-2xl bg-[#060c18] border border-cyan-500/30 shadow-xl flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        {/* Brand & Heartbeat Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm tracking-tight">
                GEOSAN SILICON FOUNDRY
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-[#d97706] font-bold">
                REV 4.2
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isTripped ? 'bg-red-500 animate-ping' : 'bg-emerald-400 animate-pulse'
                  }`}
                />
                <span className={isTripped ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {isTripped ? 'CIRCUIT TRIP: FAULT' : 'HEARTBEAT: NOMINAL'}
                </span>
              </span>
              <span>·</span>
              <span>Bus: 4.82 GHz</span>
            </div>
          </div>
        </div>

        {/* Real-time Clock Cycle Counter & Bus Voltage */}
        <div className="flex items-center gap-4 text-[11px]">
          <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-500 mr-1.5">CLOCK CYCLE:</span>
            <span className="text-cyan-300 font-bold tabular-nums">
              #{clockCycle.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 hidden sm:block">
            <span className="text-slate-500 mr-1.5">BUS VOLTAGE:</span>
            <span className="text-[#d97706] font-bold">1.18 V</span>
          </div>
        </div>
      </div>

      {/* ── MOTHERBOARD STAGE (CHASSIS FRAME) ── */}
      <div className="relative rounded-3xl bg-[#040914] border-2 border-slate-800 p-6 sm:p-8 shadow-2xl overflow-hidden min-h-[460px] flex flex-col justify-between">
        {/* Technical Blueprint Grid (1px blueprint pattern) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(6, 182, 212, 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(6, 182, 212, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Technical Corner Registration Crosshairs (+) */}
        <div className="absolute top-3 left-3 text-cyan-500/40 font-mono text-sm pointer-events-none">
          +
        </div>
        <div className="absolute top-3 right-3 text-cyan-500/40 font-mono text-sm pointer-events-none">
          +
        </div>
        <div className="absolute bottom-3 left-3 text-cyan-500/40 font-mono text-sm pointer-events-none">
          +
        </div>
        <div className="absolute bottom-3 right-3 text-cyan-500/40 font-mono text-sm pointer-events-none">
          +
        </div>

        {/* Chassis PCB Model Number Label */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 text-[9px] font-mono tracking-widest text-slate-600 uppercase pointer-events-none">
          PCB LAYER-04 // FOUNDRY MOTHERBOARD CHASSIS
        </div>

        {/* ── INTEGRATED SVG BUS HIGHWAY (ORTHOGONAL COPPER TRACES) ── */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          viewBox="0 0 1000 460"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="pcbCopper" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.8" />
            </linearGradient>
            <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </filter>
          </defs>

          {/* Copper Ground Bus Tracks */}
          <path
            d="M 180 230 L 320 230 L 360 210 L 460 210 L 500 230 L 640 230 L 680 250 L 780 250 L 820 230"
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Ambient Copper Trace Line (Die 01 -> Die 02) */}
          <path
            d="M 220 230 L 340 230 L 370 215 L 480 215"
            fill="none"
            stroke="#d97706"
            strokeWidth="3"
            strokeDasharray="6 3"
            className="trace-active"
          />

          {/* Bus Line between Die 02 and Die 03 (Blown Fuse if Tripped) */}
          <path
            d="M 520 215 L 630 215 L 660 235 L 780 235"
            fill="none"
            stroke={isTripped ? '#ef4444' : '#06b6d4'}
            strokeWidth={isTripped ? '4' : '3'}
            strokeDasharray={isTripped ? '4 3' : '6 3'}
            className={isTripped ? 'trace-blown' : 'trace-active'}
          />

          {/* Orthogonal Power Rails (Upper & Lower) */}
          <path
            d="M 100 80 L 900 80"
            fill="none"
            stroke="#d97706"
            strokeWidth="1.5"
            strokeDasharray="10 5"
            opacity="0.4"
          />
          <path
            d="M 100 380 L 900 380"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="1.5"
            strokeDasharray="10 5"
            opacity="0.4"
          />

          {/* Blown Fuse Marker on PCB */}
          {isTripped && (
            <g transform="translate(570, 205)">
              <circle cx="0" cy="0" r="10" fill="#450a0a" stroke="#ef4444" strokeWidth="2" />
              <text x="-4" y="4" fill="#ef4444" fontSize="11" fontFamily="monospace" fontWeight="bold">
                ✕
              </text>
            </g>
          )}
        </svg>

        {/* ── MOVING KINETIC DATA PACKET (GPU COMPOSITOR TRANSFORM) ── */}
        {packet.visible && (
          <div
            className="absolute w-4 h-4 rounded-full pointer-events-none z-30 shadow-[0_0_16px_#f59e0b]"
            style={{
              backgroundColor: '#f59e0b',
              left: `${packet.x}%`,
              top: `${packet.y}%`,
              willChange: 'transform, opacity',
              transform: `translate3d(-50%, -50%, 0) scale(${packet.scale})`,
              opacity: packet.opacity,
              transition: 'left 0.45s cubic-bezier(0.16, 1, 0.3, 1), top 0.45s ease-out, transform 0.25s ease-out, opacity 0.2s ease-out'
            }}
          />
        )}

        {/* ── SILICON DIES (THE THREE AGENT CHIPS) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 my-auto">
          {nodes.map((node) => (
            <SiliconDie
              key={node.id}
              node={node}
              isFocused={inspectingNode?.id === node.id}
              onInspect={setInspectingNode}
              fabricationStep={fabricationStep}
            />
          ))}
        </div>

        {/* Bottom Chassis Technical Stamp */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-4 border-t border-slate-800/80 relative z-10">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Zero-CPU GPU Transform Engine
          </span>
          <span className="text-slate-400">Click any Die to open Inner World</span>
        </div>
      </div>

      {/* ── FOUNDRY DOCK (INTERACTIVE CONTROLS) ── */}
      <FoundryDock
        onDispatchSubtask={dispatchPacketTransit}
        isStreaming={isStreaming}
        onToggleStream={() => setIsStreaming((prev) => !prev)}
        onSimulateCircuitTrip={handleSimulateCircuitTrip}
        onResetBoard={handleResetBoard}
        isTripped={isTripped}
      />

      {/* ── INNER WORLD MODAL (DEEP PROCESS INSPECTION) ── */}
      <InnerWorldModal
        node={inspectingNode}
        onClose={() => setInspectingNode(null)}
        onHealNode={handleHealNode}
      />
    </div>
  );
};
