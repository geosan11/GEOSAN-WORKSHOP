export type ProjectVertical = 'logistics' | 'agriculture' | 'aviation' | 'fintech';

export type ProjectStatus = 'planning' | 'building' | 'testing' | 'production' | 'monitoring';

export type DeploymentStatus =
  | 'live'
  | 'deploying'
  | 'pending'
  | 'degraded'
  | 'deployed'
  | 'failed'
  | 'queued'
  | 'stale';

export interface RepoSyncStatus {
  state: 'synced' | 'drifted' | 'syncing' | 'error';
  remote_commit_hash: string;
  remote_branch: string;
  commits_ahead: number;
  commits_behind: number;
  last_synced_at: string;
  drift_summary?: string;
}

export interface ProjectRegistry {
  id: string;
  name: string;
  vertical: ProjectVertical;
  supabase_project_url: string;
  supabase_anon_key_masked: string;
  vercel_deployment_url: string;
  github_repo_url: string;
  status: ProjectStatus;
  last_commit_hash: string;
  deployment_status: DeploymentStatus;
  repo_sync?: RepoSyncStatus;
  monthly_budget_usd: number;
  current_spend_usd: number;
  health: 'healthy' | 'warning' | 'degraded';
  created_at: string;
  updated_at: string;
  description: string;
}

export type TaskType =
  | 'BUILD_FEATURE'
  | 'FIX_BUG'
  | 'QA_EXPLORE'
  | 'QA_REPLAY'
  | 'QA_TARGETED'
  | 'QA_DIFF'
  | 'QA_SECURITY'
  | 'DEPLOY'
  | 'REPORT';

export type TaskStatus =
  | 'queued'
  | 'running'
  | 'awaiting_approval'
  | 'done'
  | 'failed'
  | 'cancelled';

export interface SubagentProgress {
  id: string;
  role: 'frontend' | 'backend' | 'tester' | 'security' | 'reviewer';
  assigned_model: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  current_action: string;
  tokens_used: number;
}

export interface AgentTask {
  id: string;
  project_id: string;
  task_type: TaskType;
  prompt: string;
  status: TaskStatus;
  assigned_agent: string;
  model_used: string;
  plan: {
    overview: string;
    steps: string[];
    affected_files: string[];
    estimated_tokens: number;
    subagents?: string[];
  } | null;
  result: {
    summary: string;
    diff_summary?: string;
    artifacts?: string[];
    qa_verdict?: 'pass' | 'fail' | 'warn';
  } | null;
  subagents?: SubagentProgress[];
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export type StepType = 'planning' | 'coding' | 'testing' | 'verification';

export interface AgentResult {
  id: string;
  task_id: string;
  step_number: number;
  step_type: StepType;
  content: string;
  model_used: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  created_at: string;
  diff?: string;
}

export type LLMProvider = 'google' | 'anthropic' | 'xai' | 'openai';

export interface CostEvent {
  id: string;
  project_id: string;
  task_id: string | null;
  provider: LLMProvider;
  model: string;
  endpoint: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  attributed_to: 'feature' | 'bug' | 'qa' | 'report' | 'infra';
  feature_name?: string;
  created_at: string;
}

export type QARunType = 'explore' | 'replay' | 'targeted' | 'diff' | 'security';
export type TargetPlatform = 'web' | 'mobile' | 'desktop';

export interface QARun {
  id: string;
  project_id: string;
  task_id: string;
  run_type: QARunType;
  target_url: string;
  target_platform: TargetPlatform;
  role_tested: string;
  status: 'running' | 'completed' | 'failed';
  findings_count: number;
  replay_script_path: string;
  dom_nodes_inspected: number;
  tokens_consumed: number;
  execution_speed: string; // e.g. "1x" for explore, "30x headless" for replay
  created_at: string;
  completed_at: string | null;
}

export interface QAFinding {
  id: string;
  run_id: string;
  project_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  screenshot_url?: string;
  dom_selector?: string;
  reproduction_steps: string[];
  component: string;
  status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
  created_at: string;
}

export type InstructionType = 'coding_standard' | 'qa_policy' | 'deployment_rule' | 'cost_limit';

export interface AgentInstruction {
  id: string;
  project_id: string;
  instruction_type: InstructionType;
  content: string;
  active: boolean;
  created_at: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  language?: string;
  content?: string;
  children?: FileNode[];
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  condition: 'completed' | 'succeeded' | 'pr_merged';
  created_at: string;
}

export interface AgentTrace {
  id: string;
  task_id: string;
  step_number: number;
  trace_type: 'adk_call' | 'a2a_delegation' | 'mcp_tool_call' | 'model_call' | 'error';
  tool_name?: string;
  server_name?: string;
  duration_ms?: number;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface PromptVersion {
  id: string;
  agent_name: string;
  version: number;
  content: string;
  notes?: string;
  active: boolean;
  created_at: string;
}

export interface ProjectBudget {
  id: string;
  project_id: string;
  monthly_limit_usd: number;
  alert_threshold_pct: number;
  hard_stop: boolean;
  period_start: string;
  current_spend_usd?: number;
}

export interface AppHealthCheck {
  id: string;
  project_id: string;
  url: string;
  expected_status: number;
  check_interval_seconds: number;
  last_check_at: string | null;
  last_status: number | null;
  last_latency_ms: number | null;
  consecutive_failures: number;
  enabled: boolean;
}

export interface NotificationAlert {
  id: string;
  org_id: string;
  project_id?: string;
  task_id?: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body: string;
  category: 'approval_needed' | 'qa_finding' | 'budget_alert' | 'health_down' | 'deploy_done';
  read: boolean;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'internal' | 'client' | 'partner';
  created_at: string;
}

export interface ModelPricing {
  provider: LLMProvider;
  model: string;
  input_per_million: number;
  output_per_million: number;
  context_window: string;
  best_for: string;
}
