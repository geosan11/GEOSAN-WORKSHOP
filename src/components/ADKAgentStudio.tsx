import React, { useState } from 'react';
import {
  ADK_AGENTS,
  PYTHON_TASK_DISPATCHER_CODE,
  PYTHON_COST_INSTRUMENTOR_CODE,
  PYTHON_TRACE_WRITER_CODE,
  TOOLSETS_PY_CODE,
  MCP_SERVER_SCAFFOLDING,
  COST_QUERIES_TS_CODE,
  TAURI_COMMANDS_RS_CODE,
  ADKAgentDoc
} from '../services/adkArchitecture';
import { ProjectRegistry } from '../types';
import {
  Cpu,
  Terminal,
  Layers,
  Copy,
  Check,
  Code2,
  Workflow,
  Lock,
  Unlock,
  ShieldCheck,
  Server,
  Play,
  Share2,
  ExternalLink,
  ChevronRight,
  Eye,
  Key,
  DollarSign,
  Activity,
  FolderTree,
  Smartphone,
  Box
} from 'lucide-react';

interface ADKAgentStudioProps {
  projects: ProjectRegistry[];
}

export const ADKAgentStudio: React.FC<ADKAgentStudioProps> = ({ projects }) => {
  const [activeTab, setActiveTab] = useState<'agents' | 'dispatcher' | 'instrumentation' | 'secrets' | 'mcp' | 'monorepo'>('agents');
  const [selectedAgent, setSelectedAgent] = useState<ADKAgentDoc>(ADK_AGENTS[0]);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || 'proj-ehi-001');
  const [simulatedSecrets, setSimulatedSecrets] = useState<{
    supabase_key: string;
    vercel_token: string;
    github_token: string;
  } | null>(null);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSimulateGetSecrets = (projectId: string) => {
    setIsDecrypting(true);
    setTimeout(() => {
      const proj = projects.find((p) => p.id === projectId) || projects[0];
      const prefix = proj?.vertical || 'client';
      setSimulatedSecrets({
        supabase_key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${prefix}_service_role_key_vault_secret`,
        vercel_token: `vcp_${prefix}_prod_deploy_token_decrypted`,
        github_token: `ghp_${prefix}_repo_write_token_decrypted`
      });
      setIsDecrypting(false);
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono mb-1">
              <Cpu className="w-4 h-4" />
              <span>Google ADK (Agent Development Kit) & Task Dispatcher Runtime</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Multi-Agent Orchestration & Secrets Architecture
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              5 specialized ADK agents coordinated via <code className="text-cyan-300">AgentTool</code> wrappers and A2A remote endpoints, powered by a continuous Python task dispatcher loop and zero-trust Vault secret decryption via <code className="text-cyan-300">get_project_secrets()</code>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              ADK 5-Agent Mesh Live
            </span>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900/60 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'agents'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          ADK Agent Definitions ({ADK_AGENTS.length})
        </button>

        <button
          onClick={() => setActiveTab('dispatcher')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'dispatcher'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Workflow className="w-3.5 h-3.5 text-amber-400" />
          Task Dispatcher Loop (Python)
        </button>

        <button
          onClick={() => setActiveTab('instrumentation')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'instrumentation'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          Cost & Trace Instrumentation
        </button>

        <button
          onClick={() => setActiveTab('secrets')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'secrets'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Key className="w-3.5 h-3.5 text-emerald-400" />
          Vault Secrets RPC (Artifact 1)
        </button>

        <button
          onClick={() => setActiveTab('mcp')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'mcp'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Server className="w-3.5 h-3.5 text-purple-400" />
          MCP Server Scaffolding
        </button>

        <button
          onClick={() => setActiveTab('monorepo')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'monorepo'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Box className="w-3.5 h-3.5 text-amber-400" />
          Tauri & Expo Monorepo (Artifact 5)
        </button>
      </div>

      {/* TAB 1: 5 ADK AGENTS EXPLORER */}
      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Agent Selector Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs uppercase font-mono text-slate-400 tracking-wider">
              Specialized Agents (ADK Layer)
            </h2>
            <div className="space-y-2">
              {ADK_AGENTS.map((agent) => {
                const isSelected = selectedAgent.name === agent.name;
                return (
                  <button
                    key={agent.name}
                    onClick={() => setSelectedAgent(agent)}
                    className={`w-full p-4 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-cyan-950/30 border-cyan-500/50 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{agent.name}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        agent.protocol === 'a2a_remote'
                          ? 'bg-purple-950/60 text-purple-300 border-purple-500/30'
                          : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30'
                      }`}>
                        {agent.protocol === 'a2a_remote' ? 'A2A Remote' : 'ADK Local'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">{agent.role}</div>
                    <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-slate-500">
                      <span className="text-cyan-400">{agent.model}</span>
                      <span>·</span>
                      <span>{agent.mcpTools.length} tools</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ADK Integration Note */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Why AgentTool vs sub_agents=[]?
              </div>
              <p className="text-[11px] leading-relaxed">
                Wrapping specialist agents inside <code className="text-cyan-300">AgentTool(agent=CodingAgent)</code> keeps the <code className="text-white">CoordinatorAgent</code> in control. When using <code className="text-slate-300">sub_agents=[...]</code>, ADK completely transfers execution control. With <code className="text-cyan-300">AgentTool</code>, the coordinator can call the coder, wait for results, and immediately pass the PR to <code className="text-purple-300">ReviewAgent</code> in a managed pipeline.
              </p>
            </div>
          </div>

          {/* Agent Code & Details Inspector (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{selectedAgent.name}</span>
                    <span className="text-xs font-mono font-normal text-slate-400">({selectedAgent.framework})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedAgent.description}</p>
                </div>

                <button
                  onClick={() => handleCopy(selectedAgent.code)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 self-start shrink-0"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? 'Copied' : 'Copy Code'}
                </button>
              </div>

              {/* Agent Metadata Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">LLM BACKBONE</span>
                  <span className="text-cyan-300 font-semibold">{selectedAgent.model}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">DISPATCH PROTOCOL</span>
                  <span className="text-purple-300 font-semibold uppercase">{selectedAgent.protocol}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">MCP TOOLSETS</span>
                  <span className="text-emerald-300 font-semibold">{selectedAgent.mcpTools.join(', ')}</span>
                </div>
              </div>

              {/* A2A Agent Card if applicable */}
              {selectedAgent.agentCard && (
                <div className="p-3.5 rounded-lg bg-purple-950/20 border border-purple-800/40 text-xs font-mono space-y-1.5">
                  <div className="flex items-center justify-between text-purple-300 font-bold">
                    <span>A2A Endpoint: {selectedAgent.agentCard.endpoint}</span>
                    <span className="text-[10px] text-purple-400">mode="task"</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Capabilities: {selectedAgent.agentCard.capabilities.join(' · ')}
                  </div>
                </div>
              )}

              {/* Python Code Block */}
              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-[500px]">
                  <code>{selectedAgent.code}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TASK DISPATCHER LOOP (PYTHON) */}
      {activeTab === 'dispatcher' && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-amber-400" />
                  Continuous Orchestrator Polling & DAG Dispatcher Loop
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Polls <code className="text-cyan-300">agent_tasks</code> for queued records, evaluates DAG prerequisite dependencies, checks budget hard-stop guardrails, calls <code className="text-cyan-300">get_project_secrets()</code>, and triggers the ADK Coordinator.
                </p>
              </div>

              <button
                onClick={() => handleCopy(PYTHON_TASK_DISPATCHER_CODE)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 shrink-0"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Copied' : 'Copy Python Dispatcher'}
              </button>
            </div>

            {/* Workflow Pipeline Diagram */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-cyan-400 font-bold">1. Poll Queue</span>
                <p className="text-[11px] text-slate-400 mt-1">SELECT * WHERE status='queued' ORDER BY created_at</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-amber-400 font-bold">2. Budget Check</span>
                <p className="text-[11px] text-slate-400 mt-1">project_month_spend() vs monthly_limit_usd</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-purple-400 font-bold">3. DAG Check</span>
                <p className="text-[11px] text-slate-400 mt-1">Verify task_dependencies conditions are satisfied</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-emerald-400 font-bold">4. Fetch Secrets</span>
                <p className="text-[11px] text-slate-400 mt-1">Call get_project_secrets RPC via service_role key</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-rose-400 font-bold">5. ADK Coordinator</span>
                <p className="text-[11px] text-slate-400 mt-1">Runner.run_async() with AgentTool routing</p>
              </div>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-[550px]">
              <code>{PYTHON_TASK_DISPATCHER_CODE}</code>
            </pre>
          </div>
        </div>
      )}

      {/* TAB: COST & TRACE INSTRUMENTATION (PYTHON) */}
      {activeTab === 'instrumentation' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                ADK Cost & Trace Telemetry Pipeline
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Every event in the ADK agent loop streams into <code className="text-cyan-300">CostInstrumentor</code> and <code className="text-purple-300">TraceWriter</code>. Spend is attributed at the microsecond/per-call level directly into <code className="text-emerald-400">cost_events</code> and <code className="text-cyan-300">agent_traces</code>.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Cost Instrumentor */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono font-bold text-xs text-white">orchestrator/cost_instrumentor.py</span>
                  </div>
                  <button
                    onClick={() => handleCopy(PYTHON_COST_INSTRUMENTOR_CODE)}
                    className="px-2.5 py-1 text-[11px] font-mono rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Calculates USD token costs using the multi-provider pricing table and tags each call with task attribution (feature, bug, qa, deploy).
                </p>
                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-[420px]">
                  <code>{PYTHON_COST_INSTRUMENTOR_CODE}</code>
                </pre>
              </div>

              {/* Trace Writer */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span className="font-mono font-bold text-xs text-white">orchestrator/trace_writer.py</span>
                  </div>
                  <button
                    onClick={() => handleCopy(PYTHON_TRACE_WRITER_CODE)}
                    className="px-2.5 py-1 text-[11px] font-mono rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Extracts MCP tool calls, A2A delegations, server names, execution latency (ms), and errors, persisting directly to <code className="text-cyan-300">agent_traces</code>.
                </p>
                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-[420px]">
                  <code>{PYTHON_TRACE_WRITER_CODE}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VAULT SECRETS RPC (ARTIFACT 1) */}
      {activeTab === 'secrets' && (
        <div className="space-y-5">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  `get_project_secrets(p_project_id uuid)` — Zero-Trust Vault Decryption
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  A <code className="text-cyan-300">SECURITY DEFINER</code> function granted strictly to <code className="text-emerald-400">service_role</code>. The orchestrator never stores persistent keys, fetching decrypted tokens only at task runtime.
                </p>
              </div>
            </div>

            {/* Interactive Secret Decryption Simulator */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  Test Decryption RPC for Project:
                </span>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setSimulatedSecrets(null);
                    }}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs text-white font-mono"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id})
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleSimulateGetSecrets(selectedProjectId)}
                    disabled={isDecrypting}
                    className="px-3 py-1 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    {isDecrypting ? 'Decrypting...' : 'Call RPC'}
                  </button>
                </div>
              </div>

              {simulatedSecrets ? (
                <div className="p-3 rounded-lg bg-slate-900 border border-emerald-500/30 font-mono text-xs text-slate-300 space-y-2">
                  <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Returned JSONB Payload (from vault.decrypted_secrets):
                  </div>
                  <pre className="text-cyan-300 bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] overflow-x-auto">
                    {JSON.stringify(simulatedSecrets, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 font-mono italic">
                  Select a project and click "Call RPC" to simulate runtime Vault decryption via service_role.
                </div>
              )}
            </div>

            {/* SQL Definition */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase text-slate-400 block">
                PostgreSQL Security Definer Implementation (Supabase Migration 002)
              </span>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
{`-- ============================================================
-- get_project_secrets(project_id)
-- Decrypts all Vault secrets linked to a project and returns them
-- as a jsonb object. Only service_role can execute.
-- ============================================================
create or replace function public.get_project_secrets(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_supabase_secret_id uuid;
  v_vercel_secret_id   uuid;
  v_github_secret_id   uuid;
  v_result             jsonb := '{}'::jsonb;
  v_value              text;
begin
  select supabase_vault_secret_id, vercel_vault_secret_id, github_vault_secret_id
    into v_supabase_secret_id, v_vercel_secret_id, v_github_secret_id
    from public.project_registry
   where id = p_project_id;

  if not found then
    raise exception 'Project % not found', p_project_id;
  end if;

  if v_supabase_secret_id is not null then
    select decrypted_secret into v_value from vault.decrypted_secrets where id = v_supabase_secret_id;
    if v_value is not null then
      v_result := jsonb_set(v_result, '{supabase_key}', to_jsonb(v_value));
    end if;
  end if;

  if v_vercel_secret_id is not null then
    select decrypted_secret into v_value from vault.decrypted_secrets where id = v_vercel_secret_id;
    if v_value is not null then
      v_result := jsonb_set(v_result, '{vercel_token}', to_jsonb(v_value));
    end if;
  end if;

  if v_github_secret_id is not null then
    select decrypted_secret into v_value from vault.decrypted_secrets where id = v_github_secret_id;
    if v_value is not null then
      v_result := jsonb_set(v_result, '{github_token}', to_jsonb(v_value));
    end if;
  end if;

  return v_result;
end;
$$;

revoke execute on function public.get_project_secrets(uuid) from public;
revoke execute on function public.get_project_secrets(uuid) from anon;
revoke execute on function public.get_project_secrets(uuid) from authenticated;
grant execute on function public.get_project_secrets(uuid) to service_role;`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MCP SERVER SCAFFOLDING */}
      {activeTab === 'mcp' && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-400" />
              Custom Model Context Protocol (MCP) Server Scaffolding
            </h3>
            <p className="text-xs text-slate-400">
              Scaffolding for your custom Supabase and Vercel MCP servers connecting Google ADK agents directly to infrastructure with tool calling over STDIO or SSE.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MCP_SERVER_SCAFFOLDING.map((srv) => (
                <div key={srv.name} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-cyan-300">{srv.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      {srv.language}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono text-slate-400 uppercase">Registered MCP Tools:</span>
                    {srv.tools.map((t) => (
                      <div key={t.name} className="p-2 rounded bg-slate-900/80 border border-slate-800/80 text-xs">
                        <code className="text-emerald-400 font-mono font-bold">{t.name}</code>
                        <p className="text-[11px] text-slate-400 mt-0.5">{t.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <pre className="p-3 rounded-lg bg-slate-900 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
                      <code>{srv.code}</code>
                    </pre>
                  </div>
                </div>
              ))}
            </div>

            {/* ADK Toolsets Registration */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5" />
                  orchestrator/toolsets.py — Synchronous ADK Registration
                </span>
                <button
                  onClick={() => handleCopy(TOOLSETS_PY_CODE)}
                  className="px-2.5 py-1 text-[11px] font-mono rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Critical deployment rule: Production ADK agents must import MCP toolsets defined synchronously at module load time so tool schemas are available during initialization.
              </p>
              <pre className="p-3 rounded-lg bg-slate-900 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-48">
                <code>{TOOLSETS_PY_CODE}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MONOREPO & TAURI / EXPO (ARTIFACT 5) */}
      {activeTab === 'monorepo' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Box className="w-4 h-4 text-amber-400" />
                Cross-Platform Command Center Monorepo (Tauri v2 + React 19 + Expo)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Unified pnpm workspace structure: shared types, singleton Supabase client, Rust backend commands for Docker code-server, and mobile swipe-to-approve feed.
              </p>
            </div>

            {/* Monorepo Directory Layout */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto space-y-1">
              <div className="text-amber-400 font-bold mb-2 flex items-center gap-1.5">
                <FolderTree className="w-4 h-4" />
                pnpm-workspace.yaml Directory Structure:
              </div>
              <div className="text-slate-500">command-center/</div>
              <div className="pl-4">├── <span className="text-cyan-300">packages/shared/</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500"># Shared TypeScript types, Supabase client, cost queries</span></div>
              <div className="pl-8">├── src/types.ts &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500"># Project, AgentTask, CostEvent, QARun</span></div>
              <div className="pl-8">├── src/supabase.ts &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500"># Singleton client factory</span></div>
              <div className="pl-8">├── src/realtime.ts &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500"># Live PostgreSQL change subscriptions</span></div>
              <div className="pl-8">└── src/cost.ts &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500"># Monthly spend, provider & daily trend helpers</span></div>
              <div className="pl-4">├── <span className="text-emerald-300">packages/desktop/</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500"># Tauri v2 + React 19 Operator Control App</span></div>
              <div className="pl-8">├── src/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500"># Portfolio, AgentConsole, CostCenter, DiffViewer</span></div>
              <div className="pl-8">└── src-tauri/src/commands/ide.rs <span className="text-slate-500"># Rust command launching Docker code-server on port 8080</span></div>
              <div className="pl-4">├── <span className="text-purple-300">packages/mobile/</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500"># Expo React Native App (iOS & Android)</span></div>
              <div className="pl-8">├── app/(tabs)/tasks.tsx &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500"># Realtime swipeable task approval feed</span></div>
              <div className="pl-8">└── hooks/usePushNotifications.ts<span className="text-slate-500"># Push tokens for critical tripwire alerts</span></div>
              <div className="pl-4">├── <span className="text-amber-300">orchestrator/</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500"># Python ADK Multi-Agent Daemon</span></div>
              <div className="pl-8">├── dispatcher.py &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500"># Polling + Realtime dispatcher with budget guard</span></div>
              <div className="pl-8">├── cost_instrumentor.py &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500"># Token attribution engine (2026-09 pricing)</span></div>
              <div className="pl-8">├── trace_writer.py &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500"># SHA-256 telemetry hasher and recorder</span></div>
              <div className="pl-8">└── agents/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500"># 5 ADK agents (Coordinator, Coder, QA, Review, Deploy)</span></div>
              <div className="pl-4">└── <span className="text-rose-300">mcp-servers/</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500"># Custom TypeScript MCP Servers (ehi-supabase & ehi-vercel)</span></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Rust Docker code-server Launcher */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <span className="font-mono font-bold text-xs text-white">src-tauri/src/commands/ide.rs</span>
                  </div>
                  <button
                    onClick={() => handleCopy(TAURI_COMMANDS_RS_CODE)}
                    className="px-2.5 py-1 text-[11px] font-mono rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tauri command spawning an isolated Docker container running <code className="text-cyan-300">codercom/code-server</code> mounted directly to the project's workspace path.
                </p>
                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-[380px]">
                  <code>{TAURI_COMMANDS_RS_CODE}</code>
                </pre>
              </div>

              {/* Shared Cost Aggregation Queries */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono font-bold text-xs text-white">packages/shared/src/cost.ts</span>
                  </div>
                  <button
                    onClick={() => handleCopy(COST_QUERIES_TS_CODE)}
                    className="px-2.5 py-1 text-[11px] font-mono rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Client-side aggregation functions providing monthly spend, provider breakdown, per-feature attribution, and daily trend charting.
                </p>
                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-[380px]">
                  <code>{COST_QUERIES_TS_CODE}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
