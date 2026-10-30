import { Project } from './types';
import { ProjectLogItem } from '../hooks/useProjectRealtime';

export const DEMO_SCENARIO_PROJECTS: Project[] = [
  {
    id: 'proj-taskpulse-demo',
    org_id: 'org-geosan-workshop',
    name: 'TaskPulse (Realtime Issue Tracker)',
    slug: 'taskpulse',
    vertical: 'full-stack-app',
    archetype: 'Full-Stack App',
    status: 'building',
    health: 'healthy',
    health_status: 'healthy',
    goal: 'Collaborative issue tracker with Supabase Realtime, tenant isolation, and automated QA agents.',
    tech_stack: ['React', 'TypeScript', 'Supabase', 'PostgreSQL', 'Tailwind CSS'],
    enabled_providers: ['Claude', 'DeepSeek', 'GitHub'],
    advisor_provider: 'Anthropic',
    advisor_agent_name: 'ReviewAgent',
    progress: 48,
    next_step: 'Complete RLS policy invariant suite on issue comments',
    source_type: 'template',
    source_ref: 'templates/fullstack-taskpulse',
    repo_url: 'https://github.com/geosan11/taskpulse',
    github_repo_url: 'https://github.com/geosan11/taskpulse',
    vercel_deployment_url: 'https://taskpulse-demo.vercel.app',
    monthly_budget_usd: 1200,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 12).toISOString()
  },
  {
    id: 'proj-edgetelemetry-demo',
    org_id: 'org-geosan-workshop',
    name: 'EdgeTelemetry Pipeline',
    slug: 'edgetelemetry-pipeline',
    vertical: 'data-pipeline',
    archetype: 'Data Pipeline',
    status: 'testing',
    health: 'healthy',
    health_status: 'healthy',
    goal: 'Telemetry ingest with aggregation and hourly TTL sliding window across 50 edge points.',
    tech_stack: ['Node.js', 'PostgreSQL', 'TypeScript'],
    enabled_providers: ['Google AI Pro', 'DeepSeek'],
    advisor_provider: 'Google',
    advisor_agent_name: 'ArchitectAgent',
    progress: 72,
    next_step: 'Benchmark parquet compression ratio across node clusters',
    source_type: 'template',
    source_ref: 'templates/data-pipeline',
    repo_url: null,
    vercel_deployment_url: null,
    monthly_budget_usd: 800,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 35).toISOString()
  },
  {
    id: 'proj-omniscraper-demo',
    org_id: 'org-geosan-workshop',
    name: 'OmniScraper Worker',
    slug: 'omniscraper-worker',
    vertical: 'automation-script',
    archetype: 'Automation Script',
    status: 'production',
    health: 'healthy',
    health_status: 'healthy',
    goal: 'Distributed crawler with headless browser cluster and anti-captcha rotation.',
    tech_stack: ['Node.js', 'TypeScript', 'Other'],
    enabled_providers: ['DeepSeek', 'Grok Bots'],
    advisor_provider: 'DeepSeek',
    advisor_agent_name: 'FinOpsAgent',
    progress: 100,
    next_step: 'Edge probe continuous uptime monitoring',
    source_type: 'github',
    source_ref: 'geosan11/omniscraper',
    repo_url: 'https://github.com/geosan11/omniscraper',
    github_repo_url: 'https://github.com/geosan11/omniscraper',
    vercel_deployment_url: null,
    monthly_budget_usd: 500,
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60).toISOString()
  }
];

export const DEMO_TASKPULSE_LOGS: ProjectLogItem[] = [
  {
    id: 'log-tp-1',
    project_id: 'proj-taskpulse-demo',
    timestamp: '14:10:05',
    agent: 'Supervisor',
    provider: 'Claude',
    actionType: 'plan',
    level: 'info',
    message: 'Synthesized 4-phase execution plan for TaskPulse Realtime Issue Tracker',
    payload: {
      summary: 'Build responsive issue tracker with Supabase Realtime pub/sub and owner RLS policies.',
      phases: [
        { name: 'Schema & Realtime Publications', role: 'ArchitectAgent', status: 'completed' },
        { name: 'Kanban & Timeline Components', role: 'CodingAgent', status: 'completed' },
        { name: 'RLS Security & Tenant Isolation Audit', role: 'ReviewAgent', status: 'in_progress' },
        { name: 'Vercel Preview Deployment', role: 'DevOpsAgent', status: 'pending' }
      ],
      estimated_tokens: 3800,
      estimated_cost_usd: 0.045
    }
  },
  {
    id: 'log-tp-2',
    project_id: 'proj-taskpulse-demo',
    timestamp: '14:14:22',
    agent: 'CodingAgent',
    provider: 'DeepSeek',
    actionType: 'code',
    level: 'info',
    message: 'Synthesized PostgreSQL RLS policies for tenant workspaces',
    payload: {
      model: 'deepseek-r1',
      diff: `+ CREATE POLICY "tenant_workspace_isolation" ON tasks
+   FOR ALL TO authenticated
+   USING (org_id = (auth.jwt() ->> 'org_id'))
+   WITH CHECK (org_id = (auth.jwt() ->> 'org_id'));`,
      tokens_used: 1240,
      cost_usd: 0.0011
    }
  },
  {
    id: 'log-tp-3',
    project_id: 'proj-taskpulse-demo',
    timestamp: '14:18:40',
    agent: 'ReviewAgent',
    provider: 'Anthropic',
    actionType: 'review',
    level: 'info',
    message: 'Verified tenant RLS isolation and Schemathesis contract suite',
    payload: {
      model: 'claude-3-7-sonnet',
      verdict: 'APPROVED_FOR_STAGING',
      invariants_checked: [
        'RLS_TENANT_ISOLATION',
        'NO_CROSS_PROJECT_LEAKS',
        'REALTIME_PUBLICATION_FILTERED'
      ],
      regressions_found: 0
    }
  },
  {
    id: 'log-tp-4',
    project_id: 'proj-taskpulse-demo',
    timestamp: '14:21:15',
    agent: 'ReviewAgent',
    provider: 'Anthropic',
    actionType: 'advice',
    level: 'info',
    message: 'Strategic recommendation: Keep Realtime publications scoped to project_id channel filters to prevent broadcast storms on mobile clients.',
    payload: {
      advisor_role: 'Read-Only Strategic Advisor',
      provider: 'Anthropic',
      verdict: 'INFORMATIONAL_ADVICE_ONLY',
      issued_at: new Date(Date.now() - 1000 * 60 * 15).toISOString()
    }
  }
];

/**
 * Seeds the comprehensive demo scenario into localStorage.
 */
export function seedDemoScenario(): { count: number; primary: string } {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { count: DEMO_SCENARIO_PROJECTS.length, primary: DEMO_SCENARIO_PROJECTS[0].id };
  }

  // 1. Seed Projects
  localStorage.setItem('geosan_projects', JSON.stringify(DEMO_SCENARIO_PROJECTS));

  // 2. Seed Logs for TaskPulse
  localStorage.setItem(
    'geosan_project_logs_proj-taskpulse-demo',
    JSON.stringify(DEMO_TASKPULSE_LOGS)
  );

  // 3. Dispatch storage event to notify all listeners
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: 'geosan_projects',
      newValue: JSON.stringify(DEMO_SCENARIO_PROJECTS)
    })
  );

  return { count: DEMO_SCENARIO_PROJECTS.length, primary: 'proj-taskpulse-demo' };
}
