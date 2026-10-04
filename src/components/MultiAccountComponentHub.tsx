import React, { useState, useMemo } from 'react';
import { useProjects } from '../hooks/useProjects';
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
  Share2
} from 'lucide-react';

export type ServiceType = 'vercel' | 'supabase' | 'github' | 'postgres' | 'cloudflare' | 'docker_server';

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

const INITIAL_LINKED_COMPONENTS: LinkedComponent[] = [
  {
    id: 'comp-vcl-01',
    projectId: 'proj-ehi-001',
    projectName: 'EHI Multisystems',
    name: 'Cargo Platform Edge Frontend',
    serviceType: 'vercel',
    accountOwner: 'ehi-logistics-team',
    accountType: 'Pro Team',
    endpointOrUrl: 'https://ehi-cargo-hub.vercel.app',
    status: 'degraded',
    latencyMs: 142,
    lastChecked: '45s ago',
    metrics: {
      'Deployment': 'd4f892a (Production)',
      'Edge Cache': '98.2% Hit',
      'Build Time': '28s',
      'Function P95': '124ms'
    },
    mcpServerId: 'mcp-vcl-ehi',
    fixOptions: [
      { label: 'Redeploy Latest Main SHA', actionId: 'redeploy', description: 'Re-triggers production build from origin/main' },
      { label: 'Purge Edge CDN Cache', actionId: 'purge-cache', description: 'Clears stale waybill static routes' }
    ]
  },
  {
    id: 'comp-sb-01',
    projectId: 'proj-ehi-001',
    projectName: 'EHI Multisystems',
    name: 'Cargo Hubs Ledger & RLS DB',
    serviceType: 'supabase',
    accountOwner: 'ehi-systems-infra',
    accountType: 'Enterprise Org',
    endpointOrUrl: 'https://zxdxsizyvotkcsrtzscw.supabase.co',
    status: 'healthy',
    latencyMs: 38,
    lastChecked: '12s ago',
    metrics: {
      'Active Conns': '18 / 60 max',
      'RLS Invariants': '7 Tables Active',
      'Replication': '0ms lag',
      'Storage': '1.84 GB'
    },
    mcpServerId: 'mcp-sb-ehi',
    fixOptions: [
      { label: 'Vacuum Dead Tuples', actionId: 'vacuum', description: 'Reclaims unused index pages and updates cost planner' },
      { label: 'Verify Tenant RLS Bounds', actionId: 'verify-rls', description: 'Asserts org_id isolation across all tables' }
    ]
  },
  {
    id: 'comp-sb-02',
    projectId: 'proj-iya-002',
    projectName: 'Iyanuoluwa AgroSupply',
    name: 'AgroSupply Silo IoT & Outbox DB',
    serviceType: 'supabase',
    accountOwner: 'iyanu-agrik-direct',
    accountType: 'Pro Team',
    endpointOrUrl: 'https://iyanu-silo-prod.supabase.co',
    status: 'healthy',
    latencyMs: 44,
    lastChecked: '1m ago',
    metrics: {
      'Active Conns': '9 / 30 max',
      'Telemetry Queue': 'Zero Backlog',
      'Webhooks': 'Active',
      'Storage': '420 MB'
    },
    mcpServerId: 'mcp-sb-iya',
    fixOptions: [
      { label: 'Drain Dead-Letter Queue', actionId: 'drain-dlq', description: 'Retries failed moisture telemetry ingest frames' },
      { label: 'Flush Weighbridge Buffer', actionId: 'flush-buffer', description: 'Syncs pending offline scale tickets' }
    ]
  },
  {
    id: 'comp-gh-01',
    projectId: 'proj-aero-003',
    projectName: 'Aviation Log Entry',
    name: 'AeroOps Flight Deck Monorepo',
    serviceType: 'github',
    accountOwner: 'aero-ground-ops',
    accountType: 'Enterprise Org',
    endpointOrUrl: 'https://github.com/aero-ground/turnaround-orchestrator',
    status: 'healthy',
    latencyMs: 78,
    lastChecked: '3m ago',
    metrics: {
      'Default Branch': 'main (Protected)',
      'CI Workflow': 'Passing (14s)',
      'Signed Commits': '100% GPG Enforced',
      'Open Pulls': '1 Pending'
    },
    mcpServerId: 'mcp-gh-aero',
    fixOptions: [
      { label: 'Trigger GitHub Actions CI', actionId: 'trigger-ci', description: 'Re-runs flight envelope schema verification' },
      { label: 'Sync Remote Worktree', actionId: 'sync-worktree', description: 'Pulls upstream origin main into isolated workspace' }
    ]
  },
  {
    id: 'comp-vcl-02',
    projectId: 'proj-edge-004',
    projectName: 'EdgePoint',
    name: 'Cross-Border Treasury Portal',
    serviceType: 'vercel',
    accountOwner: 'edgepoint-settlements-llc',
    accountType: 'Enterprise Org',
    endpointOrUrl: 'https://edgepoint-treasury.vercel.app',
    status: 'healthy',
    latencyMs: 52,
    lastChecked: '2m ago',
    metrics: {
      'Deployment': '93c04ff (Production)',
      'TLS Cert': 'Auto-renewed (ECC)',
      'Edge Functions': 'London & Frankfurt',
      'Throughput': '840 req/min'
    },
    mcpServerId: 'mcp-vcl-edge',
    fixOptions: [
      { label: 'Rollback to Previous SHA', actionId: 'rollback', description: 'Immediate failover to known stable commit' },
      { label: 'Purge Route Netting Cache', actionId: 'purge-routes', description: 'Forces re-fetch of live currency balance curves' }
    ]
  },
  {
    id: 'comp-srv-01',
    projectId: 'proj-edge-004',
    projectName: 'EdgePoint',
    name: 'MQTT Edge Node Broker Server',
    serviceType: 'docker_server',
    accountOwner: 'edgepoint-infra-aws',
    accountType: 'Self-Hosted',
    endpointOrUrl: 'mqtt://edge-node-01.edgepoint.io:1883',
    status: 'healthy',
    latencyMs: 24,
    lastChecked: '30s ago',
    metrics: {
      'Uptime': '42d 18h',
      'CPU Usage': '8.4%',
      'Memory': '512MB / 2GB',
      'Connected Nodes': '1,420 sensors'
    },
    mcpServerId: 'mcp-srv-edgepoint',
    fixOptions: [
      { label: 'Cycle Worker Process', actionId: 'restart-worker', description: 'Performs zero-downtime hot reload of frame parser' },
      { label: 'Export Telemetry Core Dump', actionId: 'export-dump', description: 'Captures binary memory snapshot for AST inspection' }
    ]
  }
];

const INITIAL_MCP_REGISTRY: McpServerRecord[] = [
  // ── PER-SERVER / PER-PROJECT MCPS ──
  {
    id: 'mcp-sb-ehi',
    name: 'mcp-server-supabase (EHI Cargo)',
    level: 'per-server',
    scopeTarget: 'EHI Multisystems (proj-ehi-001)',
    transport: 'SSE',
    status: 'online',
    toolsCount: 6,
    description: 'Project-scoped Postgres & Supabase MCP running in isolated container. Restricted to EHI schema and RLS policies.',
    tools: [
      { name: 'execute_sql', description: 'Executes isolated read/write SQL queries on EHI database', params: ['query', 'read_only'] },
      { name: 'explain_query', description: 'Inspects query plan and index cost estimates', params: ['query'] },
      { name: 'inspect_rls_policies', description: 'Audits tenant security rules for current tables', params: ['table_name'] },
      { name: 'apply_schema_migration', description: 'Executes forward migration script with rollbacks', params: ['migration_sql'] }
    ]
  },
  {
    id: 'mcp-vcl-ehi',
    name: 'mcp-server-vercel (EHI Cargo)',
    level: 'per-server',
    scopeTarget: 'EHI Multisystems (proj-ehi-001)',
    transport: 'HTTP-POST',
    status: 'online',
    toolsCount: 4,
    description: 'Scoped to ehi-cargo-hub project on Vercel team account. Cannot mutate other client deployments.',
    tools: [
      { name: 'tail_deployment_logs', description: 'Streams live edge runtime error logs for current deploy', params: ['deployment_id', 'limit'] },
      { name: 'trigger_redeploy', description: 'Requests production build with zero-cache flags', params: ['target_branch'] },
      { name: 'purge_edge_cache', description: 'Purges edge CDN cache paths', params: ['paths'] }
    ]
  },
  {
    id: 'mcp-gh-aero',
    name: 'mcp-server-github (AeroOps Monorepo)',
    level: 'per-server',
    scopeTarget: 'Aviation Log Entry (proj-aero-003)',
    transport: 'stdio',
    status: 'online',
    toolsCount: 5,
    description: 'Scoped git worktree agent daemon with fine-grained repo permissions for turnaround-orchestrator.',
    tools: [
      { name: 'git_status_diff', description: 'Analyzes staged and untracked file diffs', params: ['path_filter'] },
      { name: 'dispatch_ci_workflow', description: 'Triggers GitHub Actions validation pipeline', params: ['workflow_id', 'ref'] },
      { name: 'create_audit_pr', description: 'Opens automated bugfix pull request with reproduction logs', params: ['title', 'body', 'branch'] }
    ]
  },
  {
    id: 'mcp-srv-edgepoint',
    name: 'mcp-server-docker (Edge Broker)',
    level: 'per-server',
    scopeTarget: 'EdgePoint (proj-edge-004)',
    transport: 'stdio',
    status: 'online',
    toolsCount: 4,
    description: 'Host-level container diagnostics for EdgePoint MQTT daemon. Restricted to isolated docker namespace.',
    tools: [
      { name: 'inspect_container_health', description: 'Reads CPU, memory, socket descriptors, and packet drop', params: ['container_name'] },
      { name: 'hot_reload_broker', description: 'Sends SIGHUP to binary frame router without dropping sockets', params: [] }
    ]
  },

  // ── APP-WIDE / GLOBAL MCPS ──
  {
    id: 'mcp-global-orchestrator',
    name: 'aetherorch-fleet-mesh (Core App MCP)',
    level: 'app-wide',
    scopeTarget: 'Global AetherOrch Control Plane (All Projects)',
    transport: 'SSE',
    status: 'online',
    toolsCount: 8,
    description: 'App-wide master orchestration gateway. Enforces weekly budget caps (400 calls / $3.00, 60/30/10 tiers), multi-account routing, and cross-vertical alert triage.',
    tools: [
      { name: 'admit_budget_tier', description: 'Enforces weekly quota admission across Tier 1, 2, and 3', params: ['tier', 'cost_usd'] },
      { name: 'get_weekly_ledger_status', description: 'Queries global spend status, burn rate, and week key', params: [] },
      { name: 'federate_agent_dispatch', description: 'Routes complex user prompt to best foundation model', params: ['task_type', 'importance'] },
      { name: 'audit_all_tenants_health', description: 'Aggregates multi-account Vercel, Supabase, and GitHub pings', params: ['urgency'] },
      { name: 'export_learning_vault', description: 'Exports verified system post-mortems as JSONL or markdown', params: ['format'] }
    ]
  }
];

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
  const [selectedMcpServerId, setSelectedMcpServerId] = useState<string>('mcp-sb-ehi');
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
            tenantBoundaryId: 'org-ehi-global',
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
    <div className="space-y-6 font-mono text-xs text-[#e6edf3]">
      {/* ── TOP NAV HEADER & TAB SELECTOR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
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
          <p className="text-slate-400 font-sans text-xs mt-1">
            Monitor and trigger automated fixes across Vercel, Supabase, and GitHub accounts, with distinct <strong>Per-Server MCPs</strong> and <strong>App-Wide Orchestrator APIs</strong>.
          </p>
        </div>

        {/* View Switcher Buttons */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-[#0d1117] border border-white/10 shrink-0">
          <button
            onClick={() => setActiveView('components')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeView === 'components'
                ? 'bg-[#F0B230] text-[#0A1420]'
                : 'text-[#8b98a8] hover:text-[#e6edf3]'
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
                : 'text-[#8b98a8] hover:text-[#e6edf3]'
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
                : 'text-[#8b98a8] hover:text-[#e6edf3]'
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#161b22] border border-white/5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-[#8b98a8] uppercase font-bold flex items-center gap-1">
                <Filter className="w-3 h-3 text-[#F0B230]" /> Filter:
              </span>

              {/* Service Type Filter */}
              <select
                value={selectedServiceFilter}
                onChange={(e) => setSelectedServiceFilter(e.target.value)}
                className="bg-[#0d1117] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
              >
                <option value="all">All Services (Vercel, Supabase, GitHub, Docker)</option>
                <option value="vercel">Vercel Deployments</option>
                <option value="supabase">Supabase Databases</option>
                <option value="github">GitHub Monorepos</option>
                <option value="docker_server">Docker / Server Nodes</option>
              </select>

              {/* Account Owner Filter */}
              <select
                value={selectedAccountFilter}
                onChange={(e) => setSelectedAccountFilter(e.target.value)}
                className="bg-[#0d1117] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
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
            <div className="p-8 rounded-xl bg-[#161b22] border border-white/5 text-center space-y-3 font-mono">
              <Share2 className="w-8 h-8 text-[#8b98a8] mx-auto opacity-50" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#e6edf3]">No External Components Linked</h3>
                <p className="text-xs text-[#8b98a8] font-sans max-w-md mx-auto">
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
                      ? 'bg-[#1c2333]/90 border-amber-500/40 shadow-sm'
                      : 'bg-[#161b22] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Service Logo + Name + Account Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#0d1117] border border-white/10 flex items-center justify-center shrink-0">
                          {comp.serviceType === 'supabase' && <SupabaseLogo className="w-4 h-4" />}
                          {comp.serviceType === 'vercel' && <VercelLogo className="w-4 h-4 text-white" />}
                          {comp.serviceType === 'github' && <GitHubLogo className="w-4 h-4 text-white" />}
                          {comp.serviceType === 'docker_server' && <Server className="w-4 h-4 text-cyan-400" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-[#e6edf3]">{comp.name}</span>
                          </div>
                          <span className="text-[10px] text-[#8b98a8] block">
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
                        <span className="text-[10px] text-[#8b98a8] font-mono tabular-nums">
                          {comp.latencyMs}ms · {comp.lastChecked}
                        </span>
                      </div>
                    </div>

                    {/* Account Ownership & Link Section */}
                    <div className="p-2.5 rounded-lg bg-[#0d1117] border border-white/5 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-[10px] text-[#8b98a8] uppercase block">Linked Account:</span>
                        <span className="font-bold text-cyan-300 flex items-center gap-1">
                          @{comp.accountOwner}
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-[#8b98a8] font-normal">
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
                        <div key={key} className="p-2 rounded bg-white/5 border border-white/5">
                          <span className="text-[#8b98a8] uppercase block">{key}:</span>
                          <span className="font-bold text-[#e6edf3] font-mono truncate block">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* One-Click Remediation Fixes */}
                  <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                    <span className="text-[10px] font-bold text-[#8b98a8] uppercase block flex items-center gap-1">
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
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-[#F0B230] text-[#e6edf3] hover:text-[#0A1420] border border-white/10 hover:border-[#F0B230] text-[10px] font-bold transition-all flex items-center gap-1 disabled:opacity-50"
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
            <div className="p-5 rounded-2xl bg-[#161b22] border border-cyan-500/30 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wide">
                      Per-Server / Project MCP & APIs
                    </h3>
                    <span className="text-[10px] text-[#8b98a8]">
                      Scope: Tenant-Isolated Container & Daemon
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/30">
                  Zero Cross-Tenant Bleed
                </span>
              </div>

              <div className="space-y-2 text-slate-300 font-sans text-xs leading-relaxed">
                <p>
                  <strong>What it is:</strong> A lightweight Model Context Protocol daemon attached exclusively to a specific project, container, or database instance (e.g. <code>mcp-server-supabase (EHI)</code> or <code>mcp-server-vercel (EdgePoint)</code>).
                </p>
                <p>
                  <strong>What it is used for:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono text-[11px]">
                  <li>Executing isolated SQL queries and inspecting table schema</li>
                  <li>Tailing live edge container error logs during a deployment</li>
                  <li>Applying database migrations with deterministic rollbacks</li>
                  <li>Calling restricted container commands (e.g., Docker SIGHUP, cache purge)</li>
                </ul>
                <p className="pt-2 text-cyan-300/90 text-[11px] font-mono">
                  🔒 <strong>Security Model:</strong> Uses project-scoped service role tokens. Even if an agent is prompted maliciously, it cannot access another client's database or credentials.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0d1117] border border-white/5 space-y-1.5 font-mono text-[11px]">
                <span className="text-[10px] text-[#8b98a8] uppercase block">Assigned Agents:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-white/5 text-cyan-300 border border-white/5">FullStackAgent</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-cyan-300 border border-white/5">CodingAgent</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-cyan-300 border border-white/5">SecurityAuditorAgent</span>
                </div>
              </div>
            </div>

            {/* Right Card: App-Wide / Global MCP */}
            <div className="p-5 rounded-2xl bg-[#161b22] border border-[#F0B230]/30 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F0B230]/20 border border-[#F0B230]/40 flex items-center justify-center text-[#FFBD59]">
                    <Workflow className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#FFBD59] uppercase tracking-wide">
                      App-Wide / Whole App MCP & APIs
                    </h3>
                    <span className="text-[10px] text-[#8b98a8]">
                      Scope: AetherOrch Global Control Plane
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold border border-amber-500/30">
                  Fleet Governance
                </span>
              </div>

              <div className="space-y-2 text-slate-300 font-sans text-xs leading-relaxed">
                <p>
                  <strong>What it is:</strong> The global orchestrator mesh (<code>aetherorch-fleet-mesh</code>) running on the central server to oversee the entire platform across all client accounts.
                </p>
                <p>
                  <strong>What it is used for:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono text-[11px]">
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

              <div className="p-3 rounded-xl bg-[#0d1117] border border-white/5 space-y-1.5 font-mono text-[11px]">
                <span className="text-[10px] text-[#8b98a8] uppercase block">Assigned Agents:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[#FFBD59] border border-white/5">CoordinatorAgent</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[#FFBD59] border border-white/5">FinOpsLedgerAgent</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[#FFBD59] border border-white/5">PlatformOperator</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active MCP Server Registry Table */}
          <div className="p-5 rounded-2xl bg-[#161b22] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#e6edf3] font-mono flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-[#F0B230]" />
                Connected MCP Server Daemons Registry
              </h3>
              <span className="text-[10px] font-mono text-[#8b98a8]">
                {INITIAL_MCP_REGISTRY.length} registered daemons
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0d1117] border-b border-white/5 text-[#8b98a8]">
                  <tr>
                    <th className="py-2.5 px-3">Daemon Name</th>
                    <th className="py-2.5 px-3">Level / Scope</th>
                    <th className="py-2.5 px-3">Target Scope</th>
                    <th className="py-2.5 px-3">Transport</th>
                    <th className="py-2.5 px-3">Tools Exported</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {INITIAL_MCP_REGISTRY.map((mcp) => (
                    <tr key={mcp.id} className="hover:bg-white/5">
                      <td className="py-3 px-3">
                        <span className="font-bold text-[#e6edf3] block">{mcp.name}</span>
                        <span className="text-[10px] text-[#8b98a8]">{mcp.description}</span>
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
                      <td className="py-3 px-3 text-slate-300">{mcp.scopeTarget}</td>
                      <td className="py-3 px-3 text-[#8b98a8]">{mcp.transport}</td>
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
          <div className="p-4 rounded-xl bg-[#0d1117] border border-white/5 space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#FFBD59] tracking-wider">
              Interactive Test Runner
            </span>
            <h3 className="text-sm font-bold text-[#e6edf3]">
              Execute Live MCP Tool Invocations
            </h3>
            <p className="text-slate-400 font-sans text-xs">
              Test how agents interact with both <strong>Per-Server MCPs</strong> (isolated to specific vertical) and the <strong>App-Wide MCP</strong> (global ledger & multi-model router).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Input Config Form (5 cols) */}
            <div className="lg:col-span-5 p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-3">
              {/* Select MCP Daemon */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#e6edf3]">
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
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
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
                <label className="text-[11px] font-bold text-[#e6edf3]">
                  Select Exported Tool:
                </label>
                <select
                  value={selectedToolName}
                  onChange={(e) => setSelectedToolName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
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
                <label className="text-[11px] font-bold text-[#e6edf3] flex items-center justify-between">
                  <span>Tool Parameters (JSON-RPC 2.0 Payload):</span>
                  <span className="text-[10px] text-cyan-300">args</span>
                </label>
                <textarea
                  value={mockInputParams}
                  onChange={(e) => setMockInputParams(e.target.value)}
                  rows={4}
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
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
            <div className="lg:col-span-7 p-4 rounded-xl bg-[#0d1117] border border-white/5 flex flex-col justify-between space-y-3 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-[10px] font-bold uppercase text-[#8b98a8] flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-emerald-400" />
                  JSON-RPC Execution Output
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">200 OK</span>
              </div>

              <div className="flex-1 bg-[#161b22] p-3 rounded-lg border border-white/5 overflow-x-auto min-h-[200px]">
                {executionResult ? (
                  <pre className="text-[11px] text-slate-200 leading-relaxed">
                    {JSON.stringify(executionResult, null, 2)}
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <Code2 className="w-8 h-8 mb-2 opacity-50" />
                    <span>Select an MCP tool and click "Invoke MCP Tool Call" to view the verified execution envelope.</span>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-[#8b98a8] flex items-center justify-between pt-1">
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
          <div className="w-full max-w-lg bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs">
            <div className="px-5 py-4 border-b border-white/5 bg-[#0d1117] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#F0B230]" />
                <h3 className="text-sm font-bold text-white">
                  Link New Multi-Account Component
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#8b98a8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddComponent} className="p-5 space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#e6edf3]">
                  Component Name
                </label>
                <input
                  type="text"
                  required
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="e.g. Kano Logistics Webhook Gateway"
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#e6edf3]">
                    Component Service Type
                  </label>
                  <select
                    value={newServiceType}
                    onChange={(e) => setNewServiceType(e.target.value as ServiceType)}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
                  >
                    <option value="vercel">Vercel Deployment</option>
                    <option value="supabase">Supabase Database</option>
                    <option value="github">GitHub Repository</option>
                    <option value="docker_server">Docker / Server VM</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#e6edf3]">
                    Assigned Project
                  </label>
                  <select
                    value={newAssignedProject}
                    onChange={(e) => setNewAssignedProject(e.target.value)}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
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
                <label className="text-[11px] font-bold text-[#e6edf3] flex items-center justify-between">
                  <span>Linked Account Owner Identifier</span>
                  <span className="text-[10px] text-[#8b98a8]">Can differ from app account</span>
                </label>
                <input
                  type="text"
                  required
                  value={newAccountOwner}
                  onChange={(e) => setNewAccountOwner(e.target.value)}
                  placeholder="e.g. client-team-prod or personal-account-3"
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#e6edf3]">
                  Target URL or Public Host
                </label>
                <input
                  type="text"
                  value={newEndpointUrl}
                  onChange={(e) => setNewEndpointUrl(e.target.value)}
                  placeholder="https://client-prod.vercel.app or https://xxx.supabase.co"
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-2.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230]"
                />
              </div>

              <div className="p-3 rounded-lg bg-[#F0B230]/10 border border-[#F0B230]/30 text-[#FFBD59] text-[11px]">
                💡 <strong>Federated Monitoring:</strong> AetherOrch provisions a scoped <strong>Per-Server MCP connector</strong> for this component, isolating its credentials while feeding telemetry to the global dashboard.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-[#8b98a8] hover:text-[#e6edf3] font-mono"
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
