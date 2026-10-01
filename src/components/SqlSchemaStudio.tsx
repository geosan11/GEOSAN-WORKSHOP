import React, { useState } from 'react';
import { COMPLETE_REVISED_SUPABASE_MIGRATION_SQL } from '../services/schemaSql';
import {
  Database,
  Copy,
  Check,
  Download,
  ShieldCheck,
  Zap,
  Layers,
  Table,
  Key,
  Lock,
  GitBranch,
  Terminal,
  Activity,
  Bell,
  Code2,
  FileCheck
} from 'lucide-react';

export const SqlSchemaStudio: React.FC = () => {
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'sql' | 'migrations' | 'tables' | 'rls' | 'vault'>('sql');

  const handleCopySql = () => {
    navigator.clipboard.writeText(COMPLETE_REVISED_SUPABASE_MIGRATION_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([COMPLETE_REVISED_SUPABASE_MIGRATION_SQL], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '20260929_aetherorch_complete_9_migrations.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const migrationsList = [
    {
      num: '001',
      title: 'Organizations & Tenancy Foundation',
      keyTable: 'organizations, org_members',
      highlight: 'Custom Access Token Hook embeds org_id & org_role into JWT for O(1) RLS.'
    },
    {
      num: '002',
      title: 'Project Registry with Vault Secrets',
      keyTable: 'project_registry + vault.secrets',
      highlight: 'Encrypted storage via vault.create_secret() and get_project_secrets() RPC.'
    },
    {
      num: '003',
      title: 'Agent Tasks with DAG Dependencies',
      keyTable: 'agent_tasks, task_dependencies',
      highlight: 'Directed Acyclic Graph edges enforce Plan → Code → Test → Review → Deploy.'
    },
    {
      num: '004',
      title: 'Agent Traces & Observability',
      keyTable: 'agent_traces, agent_results',
      highlight: 'Full execution replay logging for MCP tools, ADK calls, A2A delegations, and errors.'
    },
    {
      num: '005',
      title: 'Prompt Versioning System',
      keyTable: 'prompt_versions',
      highlight: 'Unique active prompt per agent role. Historical runs remain 100% reproducible.'
    },
    {
      num: '006',
      title: 'Cost Events & Hard-Stop Budgets',
      keyTable: 'cost_events, project_budgets',
      highlight: 'project_month_spend() RPC guardrail triggers automatic pause and alerts.'
    },
    {
      num: '007',
      title: 'Autonomous QA Vertical',
      keyTable: 'qa_runs, qa_findings',
      highlight: 'Multi-platform engine routing: web (agent-qa), API (mk-qa-master), mobile (Maestro).'
    },
    {
      num: '008',
      title: 'App Health Monitoring',
      keyTable: 'app_health_checks',
      highlight: 'Synthetic pings via pg_net & pg_cron with consecutive failure tripwires.'
    },
    {
      num: '009',
      title: 'Notifications & Supabase Realtime',
      keyTable: 'notifications + publications',
      highlight: 'Realtime publications on 7 live-monitored tables with user/org scoping.'
    }
  ];

  const tablesData = [
    {
      name: 'organizations',
      purpose: 'Multi-tenant organization boundary for clients, partners, and internal units',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', desc: 'Unique org identifier' },
        { name: 'name', type: 'TEXT', key: '', desc: 'Legal business unit name' },
        { name: 'slug', type: 'TEXT', key: 'UNIQUE', desc: 'Tenant slug (e.g. geosan, ehi-multisystems)' },
        { name: 'plan', type: 'TEXT', key: 'CHECK', desc: 'internal, client, partner' }
      ]
    },
    {
      name: 'org_members',
      purpose: 'Org membership junction binding auth.users to tenants with granular roles',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', desc: 'Membership ID' },
        { name: 'org_id', type: 'UUID', key: 'FK', desc: 'References organizations.id (CASCADE)' },
        { name: 'user_id', type: 'UUID', key: 'FK', desc: 'References auth.users.id (CASCADE)' },
        { name: 'role', type: 'TEXT', key: 'CHECK', desc: 'owner, admin, member, viewer' }
      ]
    },
    {
      name: 'project_registry',
      purpose: 'Single source of truth for managed client verticals with Vault secret pointers',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', desc: 'Unique project identifier' },
        { name: 'org_id', type: 'UUID', key: 'FK', desc: 'Tenant boundary foreign key' },
        { name: 'name / slug', type: 'TEXT', key: '', desc: 'Project label and URL-safe slug' },
        { name: 'vertical', type: 'TEXT', key: '', desc: 'logistics, agriculture, aviation, fintech, qa' },
        { name: 'supabase_vault_secret_id', type: 'UUID', key: 'VAULT', desc: 'Pointer into vault.secrets (not raw key)' },
        { name: 'vercel_vault_secret_id', type: 'UUID', key: 'VAULT', desc: 'Pointer into vault.secrets for deployment' },
        { name: 'status', type: 'TEXT', key: 'CHECK', desc: 'planning, building, testing, production, monitoring, archived' }
      ]
    },
    {
      name: 'agent_tasks',
      purpose: 'Every instruction sent to an agent with isolated workspace worktree and PR links',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', desc: 'Unique task identifier' },
        { name: 'org_id / project_id', type: 'UUID', key: 'FK', desc: 'Tenant & project isolation' },
        { name: 'parent_task_id', type: 'UUID', key: 'FK', desc: 'Parent task in subagent hierarchy' },
        { name: 'task_type', type: 'TEXT', key: 'CHECK', desc: 'BUILD_FEATURE, FIX_BUG, QA_EXPLORE, DEPLOY, PLAN' },
        { name: 'status', type: 'TEXT', key: 'CHECK', desc: 'queued, blocked, running, awaiting_approval, done, failed' },
        { name: 'branch_name / pr_url', type: 'TEXT', key: '', desc: 'Git branch & automated GitHub Pull Request URL' }
      ]
    },
    {
      name: 'task_dependencies',
      purpose: 'Directed Acyclic Graph (DAG) edges gating automated agent execution pipelines',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', desc: 'Edge identifier' },
        { name: 'task_id', type: 'UUID', key: 'FK', desc: 'Dependent task' },
        { name: 'depends_on_task_id', type: 'UUID', key: 'FK', desc: 'Prerequisite task' },
        { name: 'condition', type: 'TEXT', key: 'CHECK', desc: 'completed, succeeded, pr_merged' }
      ]
    },
    {
      name: 'agent_traces',
      purpose: 'Granular step-by-step observability: tool calls, ADK sockets, A2A delegations & errors',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', desc: 'Trace identifier' },
        { name: 'task_id', type: 'UUID', key: 'FK', desc: 'References agent_tasks.id' },
        { name: 'trace_type', type: 'TEXT', key: 'CHECK', desc: 'adk_call, a2a_delegation, mcp_tool_call, model_call, error' },
        { name: 'tool_name / server_name', type: 'TEXT', key: '', desc: 'MCP server & tool identity' },
        { name: 'duration_ms', type: 'INT', key: '', desc: 'Execution latency in milliseconds' },
        { name: 'error_message / stack', type: 'TEXT', key: '', desc: 'Defect traceback for instant replay' }
      ]
    },
    {
      name: 'prompt_versions',
      purpose: 'System prompt registry ensuring historical task results remain 100% reproducible',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', desc: 'Prompt version ID' },
        { name: 'agent_name', type: 'TEXT', key: '', desc: 'coding, qa, review, deploy' },
        { name: 'version', type: 'INT', key: '', desc: 'Monotonically increasing version counter' },
        { name: 'content', type: 'TEXT', key: '', desc: 'System prompt markdown and constraints' },
        { name: 'active', type: 'BOOLEAN', key: 'UNIQUE', desc: 'Filtered unique index: only 1 active version' }
      ]
    },
    {
      name: 'project_budgets',
      purpose: 'Financial guardrails with hard-stop tripwires and spend alerts',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', desc: 'Budget ID' },
        { name: 'project_id', type: 'UUID', key: 'FK', desc: 'Unique 1-to-1 project relation' },
        { name: 'monthly_limit_usd', type: 'NUMERIC(12,2)', key: '', desc: 'Hard spend ceiling' },
        { name: 'alert_threshold_pct', type: 'INT', key: '', desc: 'e.g. 80% threshold for early notification' },
        { name: 'hard_stop', type: 'BOOLEAN', key: '', desc: 'If true, automatically pauses agent tasks on breach' }
      ]
    },
    {
      name: 'app_health_checks',
      purpose: 'Continuous synthetic health monitoring of deployed client applications',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', desc: 'Check identifier' },
        { name: 'project_id', type: 'UUID', key: 'FK', desc: 'Monitored client project' },
        { name: 'url', type: 'TEXT', key: '', desc: 'Target endpoint (/api/health, /healthz)' },
        { name: 'consecutive_failures', type: 'INT', key: '', desc: 'Count towards critical alert threshold' },
        { name: 'enabled', type: 'BOOLEAN', key: '', desc: 'Active ping schedule toggle' }
      ]
    },
    {
      name: 'notifications',
      purpose: 'Realtime alert push feed for operator approvals, failures, and budget triggers',
      columns: [
        { name: 'id', type: 'UUID', key: 'PK', desc: 'Notification ID' },
        { name: 'org_id', type: 'UUID', key: 'FK', desc: 'Tenant broadcast or user-specific alert' },
        { name: 'severity', type: 'TEXT', key: 'CHECK', desc: 'info, warning, critical' },
        { name: 'category', type: 'TEXT', key: '', desc: 'approval_needed, qa_finding, budget_alert, health_down, deploy_done' },
        { name: 'read', type: 'BOOLEAN', key: '', desc: 'Operator acknowledgment flag' }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-1">
            <span>Revised Architecture</span>
            <span aria-hidden="true">·</span>
            <span>Complete 9-Migration Suite</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400">PostgreSQL + Supabase Vault + Custom JWT Hook</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Supabase Multi-Tenant Architecture Studio
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mt-1">
            Production-grade 9-migration suite: O(1) JWT claim hooks, encrypted Supabase Vault references, task dependency DAGs, trace observability, prompt versioning, and hard-stop budget guardrails.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopySql}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Copy 9-Migration SQL</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadSql}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 fill-current" />
            Download .sql File
          </button>
        </div>
      </div>

      {/* Architecture Highlights Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold">
            <Lock className="w-4 h-4" />
            Supabase Vault Security
          </div>
          <p className="text-slate-400 font-sans">
            Secrets encrypted via <code className="text-white">vault.secrets</code>; accessed only via secure RPC.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-purple-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            O(1) JWT Auth Hook
          </div>
          <p className="text-slate-400 font-sans">
            <code className="text-white">custom_access_token_hook</code> materializes org_id directly into JWT claims.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <GitBranch className="w-4 h-4" />
            Task DAG Gating
          </div>
          <p className="text-slate-400 font-sans">
            <code className="text-white">task_dependencies</code> guarantees Plan → Code → Test → Review pipeline.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <Zap className="w-4 h-4" />
            7 Realtime Publications
          </div>
          <p className="text-slate-400 font-sans">
            Live WebSockets for tasks, results, QA runs, findings, costs, notifications, and health.
          </p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('sql')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'sql' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Full SQL Script (Migrations 001–009)
        </button>

        <button
          onClick={() => setActiveTab('migrations')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'migrations' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          Migration Roadmap (9 Modules)
        </button>

        <button
          onClick={() => setActiveTab('tables')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'tables' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Table className="w-3.5 h-3.5 text-purple-400" />
          Relational Tables ({tablesData.length})
        </button>

        <button
          onClick={() => setActiveTab('vault')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'vault' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          Vault & JWT Hook Setup
        </button>

        <button
          onClick={() => setActiveTab('rls')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'rls' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          Tenancy & RLS Matrix
        </button>
      </div>

      {/* Tab 1: SQL Script View */}
      {activeTab === 'sql' && (
        <div className="relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
          <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>supabase/migrations/20260929_complete_architecture_suite.sql</span>
            <span>PostgreSQL 15+ / Supabase Native</span>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto max-h-[640px]">
            {COMPLETE_REVISED_SUPABASE_MIGRATION_SQL}
          </pre>
        </div>
      )}

      {/* Tab 2: Migration Roadmap */}
      {activeTab === 'migrations' && (
        <div className="space-y-3">
          {migrationsList.map((m) => (
            <div
              key={m.num}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
                    MIGRATION {m.num}
                  </span>
                  <span className="text-white text-sm font-semibold font-sans">{m.title}</span>
                </div>
                <p className="text-slate-400 font-sans text-xs">{m.highlight}</p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-slate-500 block text-[11px]">Primary Tables / Features:</span>
                <code className="text-slate-300 text-xs">{m.keyTable}</code>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Tables Dictionary */}
      {activeTab === 'tables' && (
        <div className="space-y-4">
          {tablesData.map((tbl) => (
            <div
              key={tbl.name}
              className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono font-bold text-white text-sm">{tbl.name}</span>
                </div>
                <span className="text-xs text-slate-400 font-sans">{tbl.purpose}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="py-1.5 px-3">Column</th>
                      <th className="py-1.5 px-3">Type</th>
                      <th className="py-1.5 px-3">Constraint / Key</th>
                      <th className="py-1.5 px-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {tbl.columns.map((col, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20">
                        <td className="py-1.5 px-3 text-slate-200 font-semibold">{col.name}</td>
                        <td className="py-1.5 px-3 text-cyan-400">{col.type}</td>
                        <td className="py-1.5 px-3">
                          {col.key === 'PK' ? (
                            <span className="text-amber-400 font-bold">PRIMARY KEY</span>
                          ) : col.key === 'FK' ? (
                            <span className="text-purple-400 font-bold">FOREIGN KEY</span>
                          ) : col.key === 'VAULT' ? (
                            <span className="text-emerald-400 font-bold">VAULT SECRET</span>
                          ) : col.key ? (
                            <span className="text-slate-400">{col.key}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-slate-400 font-sans">{col.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Vault & JWT Hook Setup */}
      {activeTab === 'vault' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-5">
          <div>
            <h3 className="text-base font-bold text-white">Supabase Vault & Custom Access Token Hook Setup</h3>
            <p className="text-xs text-slate-400 mt-1">
              Zero raw credentials in the project registry: encrypted at rest in <code className="text-cyan-300">vault.secrets</code> and decrypted only by the backend orchestrator via RPC.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Vault Instruction */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <Lock className="w-4 h-4" />
                Step 1: Storing Secrets in Vault
              </span>
              <p className="text-slate-300 font-sans text-xs">
                Call <code className="text-cyan-300">vault.create_secret()</code> to encrypt your keys, then save the returned UUID into <code className="text-cyan-300">project_registry</code>:
              </p>
              <pre className="p-2.5 rounded bg-slate-900 text-slate-300 text-[11px] overflow-x-auto">
{`-- 1. Store EHI's key in Vault
select vault.create_secret(
  'sb_anon_••••••••••••ehi92',
  'ehi_supabase_anon_key',
  'EHI Multisystems Supabase anon key'
) as secret_id;

-- 2. Link secret_id to project
update public.project_registry
   set supabase_vault_secret_id = '<secret_id>'
 where slug = 'ehi-multisystems';

-- 3. Decrypt at runtime via service_role RPC (Artifact 1)
select public.get_project_secrets('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');`}
              </pre>
            </div>

            {/* Custom Token Hook */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                <Key className="w-4 h-4" />
                Step 2: Activating Custom Access Token Hook
              </span>
              <p className="text-slate-300 font-sans text-xs">
                In Supabase Dashboard → <strong>Authentication → Hooks → Custom Access Token</strong>:
              </p>
              <ul className="space-y-1 text-slate-400 font-sans text-xs">
                <li>• Select hook function: <code className="text-cyan-300 font-mono">public.custom_access_token_hook</code></li>
                <li>• Materializes <code className="text-cyan-300 font-mono">org_id</code> & <code className="text-cyan-300 font-mono">org_role</code> into every JWT.</li>
                <li>• Makes all RLS evaluation <code className="text-emerald-400 font-mono">O(1)</code> without needing joins!</li>
              </ul>
              <pre className="p-2.5 rounded bg-slate-900 text-slate-300 text-[11px] overflow-x-auto">
{`-- Generated JWT Claim:
{
  "sub": "user_uuid_here",
  "org_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "org_role": "owner"
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Tenancy & RLS Matrix */}
      {activeTab === 'rls' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-base font-bold text-white">Row Level Security (RLS) Multi-Tenant Matrix</h3>
          <p className="text-xs text-slate-400">
            Enforced by PostgreSQL kernel: Every query filters automatically through <code className="text-cyan-300">public.current_org_id()</code>.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-4">Target Table</th>
                  <th className="py-3 px-4">Org Owner / Admin</th>
                  <th className="py-3 px-4">Org Member / Agent</th>
                  <th className="py-3 px-4">Foreign Org / Public</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">organizations</td>
                  <td className="py-3 px-4 text-emerald-400">SELECT (own org)</td>
                  <td className="py-3 px-4 text-slate-300">SELECT (own org)</td>
                  <td className="py-3 px-4 text-rose-400">DENY (403)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">project_registry</td>
                  <td className="py-3 px-4 text-emerald-400">ALL (SELECT, INSERT, UPDATE)</td>
                  <td className="py-3 px-4 text-slate-300">SELECT (own org)</td>
                  <td className="py-3 px-4 text-rose-400">DENY (403)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">agent_tasks & DAG deps</td>
                  <td className="py-3 px-4 text-emerald-400">ALL</td>
                  <td className="py-3 px-4 text-slate-300">SELECT, UPDATE (own org)</td>
                  <td className="py-3 px-4 text-rose-400">DENY (403)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">agent_traces & results</td>
                  <td className="py-3 px-4 text-emerald-400">SELECT (Audit & Replay)</td>
                  <td className="py-3 px-4 text-slate-300">SELECT, INSERT (own org)</td>
                  <td className="py-3 px-4 text-rose-400">DENY (403)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">cost_events & budgets</td>
                  <td className="py-3 px-4 text-emerald-400">ALL (Adjust limits)</td>
                  <td className="py-3 px-4 text-slate-300">SELECT (own org costs)</td>
                  <td className="py-3 px-4 text-rose-400">DENY (403)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">app_health_checks</td>
                  <td className="py-3 px-4 text-emerald-400">ALL (Create pings)</td>
                  <td className="py-3 px-4 text-slate-300">SELECT (View uptime)</td>
                  <td className="py-3 px-4 text-rose-400">DENY (403)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">notifications</td>
                  <td className="py-3 px-4 text-emerald-400">ALL</td>
                  <td className="py-3 px-4 text-slate-300">SELECT & Mark Read</td>
                  <td className="py-3 px-4 text-rose-400">DENY (403)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
