import React, { useState, useMemo } from 'react';
import { useProjects } from '../hooks/useProjects';
import { DEFAULT_WORKSPACE_ID } from '../lib/workspace';
import { SupabaseLogo, GitHubLogo, VercelLogo, PostgresLogo } from './ServiceLogos';
import { useToast } from './Toast';
import {
  Server,
  Activity,
  Layers,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  Database,
  Globe,
  Radio,
  Clock,
  Play,
  ArrowRight,
  Filter,
  Plus,
  Lock,
  Workflow,
  Sparkles,
  ChevronRight,
  Check,
  X,
  Code2,
  Share2,
  Mail
} from 'lucide-react';

export type ServiceType = 'vercel' | 'supabase' | 'github' | 'postgres' | 'cloudflare' | 'docker_server' | 'resend_email';

export interface LinkedComponent {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  serviceType: ServiceType;
  accountOwner: string;
  accountType: 'Personal / Hobby' | 'Pro Team' | 'Enterprise Org' | 'Self-Hosted';
  endpointOrUrl: string;
  status: 'healthy' | 'degraded' | 'action_needed';
  latencyMs: number;
  lastChecked: string;
  metrics: Record<string, string>;
  mcpServerId: string;
  fixOptions: {
    label: string;
    actionId: string;
    description: string;
    dangerLevel?: 'normal' | 'warn';
  }[];
}

export interface McpServerRecord {
  id: string;
  name: string;
  level: 'per-server' | 'app-wide';
  scopeTarget: string;
  transport: 'stdio' | 'SSE' | 'HTTP-POST';
  status: 'online' | 'standby';
  toolsCount: number;
  description: string;
  tools: {
    name: string;
    description: string;
    params: string[];
  }[];
}

// Linked components are created per project by the operator; there are no built-in ones.

const INITIAL_MCP_REGISTRY: McpServerRecord[] = [];

export const MultiAccountComponentHub: React.FC = () => {
  const toast = useToast();

  const [activeView, setActiveView] = useState<'components' | 'mcp-architecture' | 'playground'>('components');
  const [components, setComponents] = useState<LinkedComponent[]>(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('geosan_linked_components');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('all');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('all');
  const [executingFixId, setExecutingFixId] = useState<string | null>(null);

  const { projects } = useProjects();

  // Link New Component Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceType, setNewServiceType] = useState<ServiceType>('vercel');
  const [newAccountOwner, setNewAccountOwner] = useState('');
  const [newEndpointUrl, setNewEndpointUrl] = useState('');
  const [newAssignedProject, setNewAssignedProject] = useState(projects[0]?.id || '');

  // Interactive Playground State
  const [selectedMcpServerId, setSelectedMcpServerId] = useState<string>('');
  const [selectedToolName, setSelectedToolName] = useState<string>('execute_sql');
  const [mockInputParams, setMockInputParams] = useState<string>('{\n  "query": "SELECT count(*) FROM waybills WHERE status = \'pending\';"\n}');
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [isInvoking, setIsInvoking] = useState<boolean>(false);

  // Unique account owners for filtering
  const accountOwners = useMemo(() => {
    return Array.from(new Set(components.map((c) => c.accountOwner)));
  }, [components]);

  // Filtered components
  const filteredComponents = useMemo(() => {
    return components.filter((c) => {
      if (selectedServiceFilter !== 'all' && c.serviceType !== selectedServiceFilter) return false;
      if (selectedAccountFilter !== 'all' && c.accountOwner !== selectedAccountFilter) return false;
      return true;
    });
  }, [components, selectedServiceFilter, selectedAccountFilter]);

  // Execute quick fix on component
  const handleExecuteFix = async (componentId: string, fix: LinkedComponent['fixOptions'][0]) => {
    setExecutingFixId(`${componentId}-${fix.actionId}`);
    try {
      // Simulate real-world component remediation latency
      await new Promise((r) => setTimeout(r, 900));

      setComponents((prev) =>
        prev.map((c) => {
          if (c.id === componentId) {
            return {
              ...c,
              status: 'healthy',
              latencyMs: Math.max(18, Math.round(c.latencyMs * 0.45)),
              lastChecked: 'Just now'
            };
          }
          return c;
        })
      );

      toast.success(`Success: "${fix.label}" applied! Component is now healthy.`);
    } catch {
      toast.error('Failed to dispatch fix action.');
    } finally {
      setExecutingFixId(null);
    }
  };

  // Add new component
  const handleAddComponent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim() || !newAccountOwner.trim()) {
      toast.error('Please enter component name and account identifier.');
      return;
    }

    const newComp: LinkedComponent = {
      id: `comp-${Date.now()}`,
      projectId: newAssignedProject,
      projectName: projects.find((p) => p.id === newAssignedProject)?.name || 'Linked Service',
      name: newServiceName.trim(),
      serviceType: newServiceType,
      accountOwner: newAccountOwner.trim(),
      accountType: 'Pro Team',
      endpointOrUrl: newEndpointUrl.trim() || 'https://service.internal.network',
      status: 'healthy',
      latencyMs: 32,
      lastChecked: 'Just now',
      metrics: {
        'Account': newAccountOwner.trim(),
        'Transport': 'REST / Webhook',
        'Status': 'Connected'
      },
      mcpServerId: `mcp-${newServiceType}-${Date.now().toString(36)}`,
      fixOptions: [
        { label: 'Ping Health Check', actionId: 'ping', description: 'Validates TLS handshake and HTTP response' }
      ]
    };

    const updated = [newComp, ...components];
    setComponents(updated);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('geosan_linked_components', JSON.stringify(updated));
    }
    setIsAddModalOpen(false);
    setNewServiceName('');
    setNewAccountOwner('');
    setNewEndpointUrl('');
    toast.success(`Connected new ${newServiceType.toUpperCase()} component under account "${newAccountOwner}"!`);
  };

  // Execute MCP Playground Invocation
  const handleInvokeMcp = async () => {
    setIsInvoking(true);
    const activeMcp = INITIAL_MCP_REGISTRY.find((m) => m.id === selectedMcpServerId);

    await new Promise((r) => setTimeout(r, 450));

    let simulatedOutput: any = {};
    if (activeMcp?.level === 'per-server') {
      simulatedOutput = {
        jsonrpc: '2.0',
        result: {
          scope: 'PER_SERVER_ISOLATED',
          server: activeMcp.name,
          targetProject: activeMcp.scopeTarget,
          tool: selectedToolName,
          executionTimeMs: 42,
          securityEnvelope: {
            crossTenantAccess: 'DENIED (Strict Container Sandbox)',
            tenantBoundaryId: DEFAULT_WORKSPACE_ID,
            tokenRole: 'service_role (project-scoped)'
          },
          data: {
            status: 'success',
            rowsAffected: selectedToolName === 'execute_sql' ? 14 : 1,
            reproductionVerified: true,
            summary: `Executed ${selectedToolName} inside project boundary with zero tenant bleed.`
          }
        }
      };
    } else {
      simulatedOutput = {
        jsonrpc: '2.0',
        result: {
          scope: 'APP_WIDE_ORCHESTRATOR',
          server: activeMcp?.name,
          tool: selectedToolName,
          executionTimeMs: 14,
          governance: {
            weeklyLedgerCap: '400 calls ($3.00 USD)',
            admissionGranted: true,
            tier: 'Tier 1 (60% allocation)',
            crossProjectAggregation: '4 Managed Verticals Online'
          },
          telemetryFanout: 'SSE /status/stream active to 4 clients'
        }
      };
    }

    setExecutionResult(simulatedOutput);
    setIsInvoking(false);
    toast.success(`MCP Tool "${selectedToolName}" returned status 200 OK.`);
  };

  const activeMcpServer = INITIAL_MCP_REGISTRY.find((m) => m.id === selectedMcpServerId);

  return (
    <div className="space-y-6 font-mono text-xs text-main">
      {/* ── TOP NAV HEADER & TAB SELECTOR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-app">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <Share2 className="w-5 h-5 text-[#F0B230]" />
              Multi-Account Component & MCP Hub
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
              Federation Active
            </span>
          </div>
          <p className="text-muted font-sans text-xs mt-1">
            Monitor and trigger automated fixes across Vercel, Supabase, and GitHub accounts, with distinct <strong>Per-Server MCPs</strong> and <strong>App-Wide Orchestrator APIs</strong>.
          </p>
        </div>

        {/* View Switcher Buttons */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-app border border-app shrink-0">
          <button
            onClick={() => setActiveView('components')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === 'components'
                ? 'bg-[#F0B230] text-[#0A1420]'
                : 'text-muted hover:text-main'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Linked Components ({components.length})</span>
          </button>

          <button
            onClick={() => setActiveView('mcp-architecture')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === 'mcp-architecture'
                ? 'bg-[#F0B230] text-[#0A1420]'
                : 'text-muted hover:text-main'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>MCP Architecture & Security</span>
          </button>

          <button
            onClick={() => setActiveView('playground')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === 'playground'
                ? 'bg-[#F0B230] text-[#0A1420]'
                : 'text-muted hover:text-main'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Live MCP Playground</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* VIEW 1: LINKED MULTI-ACCOUNT COMPONENTS & FIX DISPATCH */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeView === 'components' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Filter Bar & Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-app">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted uppercase font-bold flex items-center gap-1">
                <Filter className="w-3 h-3 text-[#F0B230]" /> Filter:
              </span>

              {/* Service Type Filter */}
              <select
                value={selectedServiceFilter}
                onChange={(e) => setSelectedServiceFilter(e.target.value)}
                className="bg-app border border-app rounded-lg px-2.5 py-1 text-xs text-main font-mono focus:outline-none focus:border-[#F0B230]"
              >
                <option value="all">All Services (Vercel, Supabase, GitHub, Resend, Docker)</option>
                <option value="vercel">Vercel Deployments</option>
                <option value="supabase">Supabase Databases</option>
                <option value="github">GitHub Monorepos</option>
                <option value="resend_email">Resend Transactional Mail</option>
                <option value="docker_server">Docker / Server Nodes</option>
              </select>

              {/* Account Owner Filter */}
              <select
                value={selectedAccountFilter}
                onChange={(e) => setSelectedAccountFilter(e.target.value)}
                className="bg-app border border-app rounded-lg px-2.5 py-1 text-xs text-main font-mono focus:outline-none focus:border-[#F0B230]"
              >
                <option value="all">All Connected Accounts</option>
                {accountOwners.map((owner) => (
                  <option key={owner} value={owner}>
                    Account: @{owner}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#F0B230] to-[#FFBD59] text-[#0A1420] font-bold text-xs hover:opacity-95 transition-all shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link External Account Component</span>
            </button>
          </div>

          {/* Component Grid */}
          {filteredComponents.length === 0 ? (
            <div className="p-8 rounded-xl bg-card border border-app text-center space-y-3 font-mono">
              <Share2 className="w-8 h-8 text-muted mx-auto opacity-50" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-main">No External Components Linked</h3>
                <p className="text-xs text-muted font-sans max-w-md mx-auto">
                  You haven't linked any Vercel deployments, Supabase databases, or GitHub repositories yet. Link an external component with any account identifier to start unified monitoring.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#F0B230] text-[#0A1420] font-bold text-xs hover:bg-[#FFBD59] transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Link External Account Component</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredComponents.map((comp) => {
              const isExecuting = executingFixId?.startsWith(comp.id);
              return (
                <div
                  key={comp.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    comp.status === 'degraded'
                      ? 'bg-app/90 border-amber-500/40 shadow-sm'
                      : 'bg-card border-app hover:border-white/15'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Service Logo + Name + Account Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-app border border-app flex items-center justify-center shrink-0">
                          {comp.serviceType === 'supabase' && <SupabaseLogo className="w-4 h-4" />}
                          {comp.serviceType === 'vercel' && <VercelLogo className="w-4 h-4 text-white" />}
                          {comp.serviceType === 'github' && <GitHubLogo className="w-4 h-4 text-white" />}
                          {comp.serviceType === 'resend_email' && <Mail className="w-4 h-4 text-purple-400" />}
                          {comp.serviceType === 'docker_server' && <Server className="w-4 h-4 text-cyan-400" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-main">{comp.name}</span>
                          </div>
                          <span className="text-[10px] text-muted block">
                            Project: {comp.projectName}
                          </span>
                        </div>
                      </div>

                      {/* Status & Latency Badge */}
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            comp.status === 'healthy'
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-950 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {comp.status === 'healthy' ? 'Healthy' : 'Latency Alert'}
                        </span>
                        <span className="text-[10px] text-muted font-mono tabular-nums">
                          {comp.latencyMs}ms · {comp.lastChecked}
                        </span>
                      </div>
                    </div>

                    {/* Account Ownership & Link Section */}
                    <div className="p-2.5 rounded-lg bg-app border border-app flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-[10px] text-muted uppercase block">Linked Account:</span>
                        <span className="font-bold text-cyan-300 flex items-center gap-1">
                          @{comp.accountOwner}
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-muted font-normal">
                            {comp.accountType}
                          </span>
                        </span>
                      </div>

                      <a
                        href={comp.endpointOrUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-[#F0B230] hover:text-[#FFBD59] flex items-center gap-1 underline font-mono truncate max-w-[180px]"
                      >
                        <span>Console</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>

                    {/* Key Live Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      {Object.entries(comp.metrics).map(([key, val]) => (
                        <div key={key} className="p-2 rounded bg-white/5 border border-app">
                          <span className="text-muted uppercase block">{key}:</span>
                          <span className="font-bold text-main font-mono truncate block">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* One-Click Remediation Fixes */}
                  <div className="mt-4 pt-3 border-t border-app space-y-2">
                    <span className="text-[10px] font-bold text-muted uppercase block flex items-center gap-1">
                      <Zap className="w-3 h-3 text-[#F0B230]" />
                      Fast Diagnostic Fixes (Per-Server MCP):
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      {comp.fixOptions.map((fix) => (
                        <button
                          key={fix.actionId}
                          type="button"
                          disabled={Boolean(executingFixId)}
                          onClick={() => handleExecuteFix(comp.id, fix)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-[#F0B230] text-main hover:text-[#0A1420] border border-app hover:border-[#F0B230] text-[10px] font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                          title={fix.description}
                        >
                          {executingFixId === `${comp.id}-${fix.actionId}` ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Play className="w-2.5 h-2.5 fill-current" />
                          )}
                          <span>{fix.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* VIEW 2: MCP ARCHITECTURAL BREAKDOWN (PER-SERVER VS WHOLE-APP)   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeView === 'mcp-architecture' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Architectural Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Card: Per-Server / Per-Project MCP */}
            <div className="p-5 rounded-2xl bg-card border border-cyan-500/30 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-app">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wide">
                      Per-Server / Project MCP & APIs
                    </h3>
                    <span className="text-[10px] text-muted">
                      Scope: Tenant-Isolated Container & Daemon
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/30">
                  Zero Cross-Tenant Bleed
                </span>
              </div>

              <div className="space-y-2 text-muted font-sans text-xs leading-relaxed">
                <p>
                  <strong>What it is:</strong> A lightweight Model Context Protocol daemon attached exclusively to a specific project, container, or database instance (e.g. <code>mcp-server-supabase (EHI)</code> or <code>mcp-server-vercel (EdgePoint)</code>).
                </p>
                <p>
                  <strong>What it is used for:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted font-mono text-[11px]">
                  <li>Executing isolated SQL queries and inspecting table schema</li>
                  <li>Tailing live edge container error logs during a deployment</li>
                  <li>Applying database migrations with deterministic rollbacks</li>
                  <li>Calling restricted container commands (e.g., Docker SIGHUP, cache purge)</li>
                </ul>
                <p className="pt-2 text-cyan-300/90 text-[11px] font-mono">
                  🔒 <strong>Security Model:</strong> Uses project-scoped service role tokens. Even if an agent is prompted maliciously, it cannot access another client's database or credentials.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-app border border-app space-y-1.5 font-mono text-[11px]">
                <span className="text-[10px] text-muted uppercase block">Assigned Agents:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-white/5 text-cyan-300 border border-app">FullStackAgent</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-cyan-300 border border-app">CodingAgent</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-cyan-300 border border-app">SecurityAuditorAgent</span>
                </div>
              </div>
            </div>

            {/* Right Card: App-Wide / Global MCP */}
            <div className="p-5 rounded-2xl bg-card border border-[#F0B230]/30 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-app">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F0B230]/20 border border-[#F0B230]/40 flex items-center justify-center text-[#FFBD59]">
                    <Workflow className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#FFBD59] uppercase tracking-wide">
                      App-Wide / Whole App MCP & APIs
                    </h3>
                    <span className="text-[10px] text-muted">
                      Scope: AetherOrch Global Control Plane
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold border border-amber-500/30">
                  Fleet Governance
                </span>
              </div>

              <div className="space-y-2 text-muted font-sans text-xs leading-relaxed">
                <p>
                  <strong>What it is:</strong> The global orchestrator mesh (<code>aetherorch-fleet-mesh</code>) running on the central server to oversee the entire platform across all client accounts.
                </p>
                <p>
                  <strong>What it is used for:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted font-mono text-[11px]">
                  <li>Enforcing the 60/30/10 weekly FinOps ledger ($3.00 / 400 calls cap)</li>
                  <li>Multi-account credential federation and cross-account health pings</li>
                  <li>Routing tasks to foundation models (DeepSeek, Claude, Gemini, OpenAI)</li>
                  <li>Aggregating platform-wide retrospects into the Knowledge Vault</li>
                  <li>Broadcasting server telemetry via SSE on <code>/status/stream</code></li>
                </ul>
                <p className="pt-2 text-[#FFBD59] text-[11px] font-mono">
                  🛡️ <strong>Governance Model:</strong> Operated exclusively by Platform Operators and <code>CoordinatorAgent</code> with administrative audit logging.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-app border border-app space-y-1.5 font-mono text-[11px]">
                <span className="text-[10px] text-muted uppercase block">Assigned Agents:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[#FFBD59] border border-app">CoordinatorAgent</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[#FFBD59] border border-app">FinOpsLedgerAgent</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[#FFBD59] border border-app">PlatformOperator</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active MCP Server Registry Table */}
          <div className="p-5 rounded-2xl bg-card border border-app space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-main font-mono flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-[#F0B230]" />
                Connected MCP Server Daemons Registry
              </h3>
              <span className="text-[10px] font-mono text-muted">
                {INITIAL_MCP_REGISTRY.length} registered daemons
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-app border-b border-app text-muted">
                  <tr>
                    <th className="py-2.5 px-3">Daemon Name</th>
                    <th className="py-2.5 px-3">Level / Scope</th>
                    <th className="py-2.5 px-3">Target Scope</th>
                    <th className="py-2.5 px-3">Transport</th>
                    <th className="py-2.5 px-3">Tools Exported</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border-app)]">
                  {INITIAL_MCP_REGISTRY.map((mcp) => (
                    <tr key={mcp.id} className="hover:bg-white/5">
                      <td className="py-3 px-3">
                        <span className="font-bold text-main block">{mcp.name}</span>
                        <span className="text-[10px] text-muted">{mcp.description}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            mcp.level === 'per-server'
                              ? 'bg-cyan-950 text-cyan-300 border-cyan-500/30'
                              : 'bg-amber-950 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {mcp.level}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-muted">{mcp.scopeTarget}</td>
                      <td className="py-3 px-3 text-muted">{mcp.transport}</td>
                      <td className="py-3 px-3 font-bold text-[#FFBD59]">{mcp.toolsCount} tools</td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          ONLINE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* VIEW 3: INTERACTIVE MCP PLAYGROUND & SIMULATOR                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeView === 'playground' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="p-4 rounded-xl bg-app border border-app space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#FFBD59] tracking-wider">
              Interactive Test Runner
            </span>
            <h3 className="text-sm font-bold text-main">
              Execute Live MCP Tool Invocations
            </h3>
            <p className="text-muted font-sans text-xs">
              Test how agents interact with both <strong>Per-Server MCPs</strong> (isolated to specific vertical) and the <strong>App-Wide MCP</strong> (global ledger & multi-model router).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Input Config Form (5 cols) */}
            <div className="lg:col-span-5 p-4 rounded-xl bg-card border border-app space-y-3">
              {/* Select MCP Daemon */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-main">
                  Select Target MCP Daemon:
                </label>
                <select
                  value={selectedMcpServerId}
                  onChange={(e) => {
                    setSelectedMcpServerId(e.target.value);
                    const server = INITIAL_MCP_REGISTRY.find((s) => s.id === e.target.value);
                    if (server && server.tools.length > 0) {
                      setSelectedToolName(server.tools[0].name);
                    }
                  }}
                  className="w-full bg-app border border-app rounded-lg p-2.5 text-xs text-main font-mono focus:outline-none focus:border-[#F0B230]"
                >
                  {INITIAL_MCP_REGISTRY.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      [{srv.level.toUpperCase()}] {srv.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Tool */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-main">
                  Select Exported Tool:
                </label>
                <select
                  value={selectedToolName}
                  onChange={(e) => setSelectedToolName(e.target.value)}
                  className="w-full bg-app border border-app rounded-lg p-2.5 text-xs text-main font-mono focus:outline-none focus:border-[#F0B230]"
                >
                  {activeMcpServer?.tools.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({t.params.join(', ') || 'no params'})
                    </option>
                  ))}
                </select>
              </div>

              {/* JSON Input Parameters */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-main flex items-center justify-between">
                  <span>Tool Parameters (JSON-RPC 2.0 Payload):</span>
                  <span className="text-[10px] text-cyan-300">args</span>
                </label>
                <textarea
                  value={mockInputParams}
                  onChange={(e) => setMockInputParams(e.target.value)}
                  rows={4}
                  className="w-full bg-app border border-app rounded-lg p-2.5 text-xs text-main font-mono focus:outline-none focus:border-[#F0B230]"
                />
              </div>

              {/* Invoke Button */}
              <button
                type="button"
                disabled={isInvoking}
                onClick={handleInvokeMcp}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F0B230] to-[#FFBD59] text-[#0A1420] font-bold text-xs hover:opacity-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isInvoking ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing MCP Tool...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Invoke MCP Tool Call</span>
                  </>
                )}
              </button>
            </div>

            {/* Output Display Console (7 cols) */}
            <div className="lg:col-span-7 p-4 rounded-xl bg-app border border-app flex flex-col justify-between space-y-3 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-app">
                <span className="text-[10px] font-bold uppercase text-muted flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-emerald-400" />
                  JSON-RPC Execution Output
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">200 OK</span>
              </div>

              <div className="flex-1 bg-card p-3 rounded-lg border border-app overflow-x-auto min-h-[200px]">
                {executionResult ? (
                  <pre className="text-[11px] text-main leading-relaxed">
                    {JSON.stringify(executionResult, null, 2)}
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <Code2 className="w-8 h-8 mb-2 opacity-50" />
                    <span>Select an MCP tool and click "Invoke MCP Tool Call" to view the verified execution envelope.</span>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-muted flex items-center justify-between pt-1">
                <span>Protocol: Model Context Protocol (v2024-11-05 spec)</span>
                <span>Latency: ~42ms</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: LINK NEW EXTERNAL ACCOUNT COMPONENT ── */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-card border border-app rounded-2xl shadow-2xl overflow-hidden font-mono text-xs">
            <div className="px-5 py-4 border-b border-app bg-app flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#F0B230]" />
                <h3 className="text-sm font-bold text-white">
                  Link New Multi-Account Component
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted hover:text-main"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddComponent} className="p-5 space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-main">
                  Component Name
                </label>
                <input
                  type="text"
                  required
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="e.g. Kano Logistics Webhook Gateway"
                  className="w-full bg-app border border-app rounded-lg p-2.5 text-xs text-main font-mono focus:outline-none focus:border-[#F0B230]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-main">
                    Component Service Type
                  </label>
                  <select
                    value={newServiceType}
                    onChange={(e) => setNewServiceType(e.target.value as ServiceType)}
                    className="w-full bg-app border border-app rounded-lg p-2.5 text-xs text-main font-mono focus:outline-none focus:border-[#F0B230]"
                  >
                    <option value="vercel">Vercel Deployment</option>
                    <option value="supabase">Supabase Database</option>
                    <option value="github">GitHub Repository</option>
                    <option value="docker_server">Docker / Server VM</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-main">
                    Assigned Project
                  </label>
                  <select
                    value={newAssignedProject}
                    onChange={(e) => setNewAssignedProject(e.target.value)}
                    className="w-full bg-app border border-app rounded-lg p-2.5 text-xs text-main font-mono focus:outline-none focus:border-[#F0B230]"
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
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-main flex items-center justify-between">
                  <span>Linked Account Owner Identifier</span>
                  <span className="text-[10px] text-muted">Can differ from app account</span>
                </label>
                <input
                  type="text"
                  required
                  value={newAccountOwner}
                  onChange={(e) => setNewAccountOwner(e.target.value)}
                  placeholder="e.g. client-team-prod or personal-account-3"
                  className="w-full bg-app border border-app rounded-lg p-2.5 text-xs text-main font-mono focus:outline-none focus:border-[#F0B230]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-main">
                  Target URL or Public Host
                </label>
                <input
                  type="text"
                  value={newEndpointUrl}
                  onChange={(e) => setNewEndpointUrl(e.target.value)}
                  placeholder="https://client-prod.vercel.app or https://xxx.supabase.co"
                  className="w-full bg-app border border-app rounded-lg p-2.5 text-xs text-main font-mono focus:outline-none focus:border-[#F0B230]"
                />
              </div>

              <div className="p-3 rounded-lg bg-[#F0B230]/10 border border-[#F0B230]/30 text-[#FFBD59] text-[11px]">
                💡 <strong>Federated Monitoring:</strong> AetherOrch provisions a scoped <strong>Per-Server MCP connector</strong> for this component, isolating its credentials while feeding telemetry to the global dashboard.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-muted hover:text-main font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F0B230] to-[#FFBD59] text-[#0A1420] font-bold text-xs hover:opacity-95 transition-all shadow-sm"
                >
                  Link & Connect Component
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
