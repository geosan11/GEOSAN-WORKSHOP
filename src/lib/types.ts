export type ProjectStatus =
  | 'planning'
  | 'building'
  | 'testing'
  | 'production'
  | 'monitoring'
  | 'archived';

export type TaskType =
  | 'BUILD_FEATURE'
  | 'FIX_BUG'
  | 'QA_EXPLORE'
  | 'QA_REPLAY'
  | 'QA_TARGETED'
  | 'QA_DIFF'
  | 'QA_SECURITY'
  | 'DEPLOY'
  | 'REPORT'
  | 'PLAN';

export type TaskStatus =
  | 'proposed'
  | 'queued'
  | 'blocked'
  | 'running'
  | 'awaiting_approval'
  | 'done'
  | 'failed'
  | 'cancelled';

export interface Project {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  vertical: string;
  repo_url: string | null;
  vercel_deployment_url: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  agent_instructions?: string;
  monthly_budget_usd?: number;
  health_status?: 'healthy' | 'degraded' | 'down';
  uptime_pct?: number;
  last_activity_at?: string;
  git_branch?: string;
}

export interface AgentTask {
  id: string;
  org_id: string;
  project_id: string;
  parent_task_id: string | null;
  task_type: TaskType;
  prompt: string;
  status: TaskStatus;
  assigned_agent: string | null;
  plan: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  branch_name: string | null;
  pr_url: string | null;
  cost_usd?: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  proposed_by_message_id?: string | null;
}

export interface Conversation {
  id: string;
  org_id: string;
  project_id: string;
  title: string | null;
  adk_session_id: string;
  last_message_at: string | null;
  message_count: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  proposed_task_id?: string | null;
  tool_calls?: Record<string, unknown>[] | null;
  tool_results?: Record<string, unknown>[] | null;
  model_used?: string | null;
  tokens_input?: number | null;
  tokens_output?: number | null;
  cost_usd?: number | null;
  created_at: string;
}

export interface CostEvent {
  id: string;
  org_id: string;
  project_id: string | null;
  task_id: string | null;
  provider: 'google' | 'anthropic' | 'xai' | 'openai' | 'deepseek' | 'kimi' | 'local';
  model: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  attributed_to: string | null;
  created_at: string;
  endpoint?: string;
}

export interface QARun {
  id: string;
  org_id: string;
  project_id: string;
  task_id: string | null;
  run_type: 'explore' | 'replay' | 'targeted' | 'diff' | 'security';
  target_url: string;
  target_platform: 'web' | 'mobile' | 'api' | 'desktop';
  role_tested: string | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  engine_used: string | null;
  findings_count: number;
  replay_script_path: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface QAFinding {
  id: string;
  run_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string | null;
  component: string | null;
  screenshot_url: string | null;
  reproduction_steps: string[] | unknown[] | null;
  status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
  created_at: string;
}

export interface ProjectBudget {
  project_id: string;
  monthly_limit_usd: number;
  alert_threshold_pct: number;
  hard_stop: boolean;
}

export interface PromptVersion {
  id: string;
  role: string;
  version: number;
  system_instruction: string;
  created_at: string;
  changelog: string;
  is_active: boolean;
}
