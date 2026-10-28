import { Project } from './types';

/**
 * Supervisor Handoff Contract
 *
 * Implementation-agnostic brief delivered to orchestrator agents
 * (Grok Bots, Antigravity Supervisor, Claude Coordinator, or webhook dispatchers).
 */
export interface SupervisorBrief {
  id: string;
  name: string;
  goal: string;
  archetype: string;
  stack: string[];
  deadline: string | null;
  enabled_providers: string[];
  source_type: 'template' | 'github' | 'external' | string;
  source_ref: string | null;
  advisor_provider: string | null;
  advisor_agent_name: string | null;
  progress: number;
  next_step: string | null;
  created_at: string;
  status: string;
}

export type SupervisorActionType =
  | 'plan'
  | 'assign'
  | 'code'
  | 'review'
  | 'deploy'
  | 'error'
  | 'advice'
  | 'status'
  | 'prompt';

export interface SupervisorPlanPayload {
  summary: string;
  phases: Array<{
    name: string;
    description: string;
    role: string;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
  markdown?: string;
  estimated_cost_usd?: number;
}

export interface SupervisorLogEvent {
  project_id: string;
  agent_name: string;
  provider: string;
  action_type: SupervisorActionType;
  message: string;
  payload: Record<string, unknown>;
}

/**
 * Builds the canonical SupervisorBrief object from a Project entity.
 */
export function buildSupervisorBrief(project: Project): SupervisorBrief {
  return {
    id: project.id,
    name: project.name,
    goal: project.goal || project.agent_instructions || 'Build and verify project deliverables according to workshop specification.',
    archetype: project.archetype || 'Full-Stack App',
    stack: project.tech_stack || ['React', 'TypeScript', 'Tailwind CSS'],
    deadline: project.deadline || null,
    enabled_providers: project.enabled_providers && project.enabled_providers.length > 0
      ? project.enabled_providers
      : ['Claude', 'DeepSeek', 'GitHub'],
    source_type: project.source_type || 'template',
    source_ref: project.source_ref || project.repo_url || null,
    advisor_provider: project.advisor_provider || 'Anthropic',
    advisor_agent_name: project.advisor_agent_name || 'CoordinatorAgent',
    progress: typeof project.progress === 'number' ? project.progress : 15,
    next_step: project.next_step || 'Awaiting initial plan synthesis from Supervisor',
    created_at: project.created_at || new Date().toISOString(),
    status: project.status || 'planning'
  };
}
