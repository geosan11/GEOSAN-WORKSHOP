import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project } from '../lib/types';
import { DEFAULT_WORKSPACE_ID } from '../lib/workspace';
import { checkProjectBudget, validBudget, type BudgetCheck } from '../lib/projectBudgetGuard';

const STORAGE_KEY = 'geosan_projects';

/**
 * Projects from the saved value. There are no built-in projects: nothing
 * saved yet, or a broken value (not JSON, or not a list), gives an empty list
 * (the broken value is left in place). Entries that are not objects with a
 * string id are skipped.
 */
export function projectsFromStorage(saved: string | null): { projects: Project[] } {
  if (saved != null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return { projects: (parsed as Project[]).filter((p) => !!p && typeof p === 'object' && typeof p.id === 'string') };
      }
    } catch {
      /* broken value: no projects */
    }
  }
  return { projects: [] };
}

/**
 * The saved project with `projectId` (same source as the project list), or
 * null. `saved` defaults to the browser's stored list.
 */
export function findStoredProject(
  projectId: string,
  saved: string | null = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY)
): Project | null {
  return projectsFromStorage(saved).projects.find((p) => p.id === projectId) ?? null;
}

/**
 * Budget check against the SAVED project (the one source of truth the task
 * guard, chat, ask-mode admission and plan approval all read).
 */
export function checkStoredProjectBudget(projectId: string, saved?: string | null): BudgetCheck {
  const project = saved === undefined ? findStoredProject(projectId) : findStoredProject(projectId, saved);
  return checkProjectBudget(project, { projectId });
}

export interface ProjectStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Persists a new monthly budget for `projectId` to the saved project list
 * (the store the budget guard reads) and verifies it by reading it back.
 * In the browser the project record's `monthly_budget_usd` is the only budget
 * value (it stands for both project_budgets.monthly_limit_usd and
 * project_registry.monthly_budget_usd), so the two cannot drift here.
 * Throws (nothing is changed) if the value is not an amount > 0, the project
 * is not found, the saved list is unreadable, or the write does not stick.
 */
export function saveProjectBudget(
  projectId: string,
  value: unknown,
  store: ProjectStore = localStorage
): Project {
  const amount = validBudget(value);
  if (amount === null) {
    throw new Error(`Budget not saved: ${JSON.stringify(value)} is not an amount greater than $0.`);
  }
  const saved = store.getItem(STORAGE_KEY);
  let list: Project[];
  if (saved == null) {
    list = [];
  } else {
    let parsed: unknown;
    try {
      parsed = JSON.parse(saved);
    } catch {
      parsed = null;
    }
    if (!Array.isArray(parsed)) throw new Error('Budget not saved: the saved project list is unreadable.');
    list = parsed as Project[];
  }
  const idx = list.findIndex((p) => p && p.id === projectId);
  if (idx < 0) throw new Error(`Budget not saved: project ${projectId} was not found.`);
  const updated: Project = { ...list[idx], monthly_budget_usd: amount, updated_at: new Date().toISOString() };
  const next = [...list];
  next[idx] = updated;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    throw new Error(`Budget not saved: ${err instanceof Error ? err.message : 'storage write failed'}.`);
  }
  const check = checkStoredProjectBudget(projectId, store.getItem(STORAGE_KEY));
  if (!check.ok || check.budgetUsd !== amount) {
    throw new Error('Budget not saved: the new value could not be read back.');
  }
  return updated;
}

const getProjects = async (): Promise<Project[]> => {
  if (typeof window === 'undefined') return [];
  return projectsFromStorage(localStorage.getItem(STORAGE_KEY)).projects;
};
export interface CreateProjectParams {
  name: string;
  vertical?: string;
  archetype?: string;
  source_type?: string;
  source_ref?: string;
  advisor_provider?: string;
  advisor_agent_name?: string;
  goal?: string;
  tech_stack?: string[];
  main_features?: string;
  deadline?: string;
  enabled_providers?: string[];
  monthly_budget_usd?: number;
  repo_url?: string | null;
  vercel_deployment_url?: string | null;
  agent_instructions?: string;
}

const createProject = async (params: CreateProjectParams): Promise<Project> => {
  const projects = await getProjects();
  const slug = params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const newProject: Project = {
    id: `proj-${Date.now()}`,
    org_id: DEFAULT_WORKSPACE_ID,
    name: params.name,
    slug: slug || 'project',
    vertical: params.vertical || params.archetype || 'custom',
    archetype: params.archetype || 'Custom',
    source_type: params.source_type || 'template',
    source_ref: params.source_ref || '',
    advisor_provider: params.advisor_provider || 'Anthropic',
    advisor_agent_name: params.advisor_agent_name || 'CoordinatorAgent',
    goal: params.goal || '',
    tech_stack: params.tech_stack || [],
    main_features: params.main_features || '',
    deadline: params.deadline || '',
    enabled_providers: params.enabled_providers || ['Claude', 'DeepSeek'],
    status: 'building',
    health: 'healthy',
    health_status: 'healthy',
    repo_url: params.repo_url || params.source_ref || null,
    github_repo_url: params.repo_url || params.source_ref || '',
    vercel_deployment_url: params.vercel_deployment_url || null,
    agent_instructions: params.agent_instructions || params.main_features || '',
    monthly_budget_usd: params.monthly_budget_usd || 1000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const updated = [newProject, ...projects];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newProject;
};

export function useProjects() {
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects
  });

  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  const budgetMutation = useMutation({
    mutationFn: async ({ projectId, value }: { projectId: string; value: unknown }) => saveProjectBudget(projectId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  return {
    projects,
    loading,
    error: error instanceof Error ? error : null,
    refetch,
    createProject: mutation.mutateAsync,
    /** Resolves only after the budget is saved and read back; rejects otherwise. */
    updateProjectBudget: budgetMutation.mutateAsync
  };
}
