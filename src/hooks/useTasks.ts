import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AgentTask, TaskType } from '../lib/types';
import { useToast } from '../components/Toast';
import { MOCK_TASKS } from '../lib/mockData';
import { DEMO_SESSION_TASKS } from '../data/sessionFixtures';
import { isDemoMode } from '../lib/supabase';
import { findStoredProject } from './useProjects';
import { assertProjectBudget, isProjectBudgetBlocked } from '../lib/projectBudgetGuard';

/**
 * Fail closed: throws ProjectBudgetBlockedError if the project has no budget.
 * Runs before a task is created, or moved to running / queued.
 */
export function guardAiWork(projectId: string, saved?: string | null): void {
  const project = saved === undefined ? findStoredProject(projectId) : findStoredProject(projectId, saved);
  assertProjectBudget(project, { projectId });
}

/** Statuses that start or queue AI work. */
const AI_WORK_STATUSES: ReadonlyArray<AgentTask['status']> = ['running', 'queued'];
export function statusStartsAiWork(status: AgentTask['status']): boolean {
  return AI_WORK_STATUSES.includes(status);
}

// Demo session tasks sit on the client projects, so they are seeded in demo mode only.
const SEED_TASKS: AgentTask[] =
  MOCK_TASKS.length > 0 ? [...MOCK_TASKS] : isDemoMode ? [...DEMO_SESSION_TASKS] : [];
const SEED_FLAG = 'geosan_tasks_seeded_v1';

function readStoredTasks(): AgentTask[] | null {
  const saved = localStorage.getItem('geosan_tasks');
  if (saved == null) return null;
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as AgentTask[]) : null;
  } catch {
    return null;
  }
}

const getTasks = async (projectId?: string): Promise<AgentTask[]> => {
  if (typeof window === 'undefined') return [...SEED_TASKS];

  const stored = readStoredTasks();
  const alreadySeeded = localStorage.getItem(SEED_FLAG) === '1';
  // Seed once: missing key, or legacy empty [] from before Section B.
  // After the flag is set, an intentional empty list stays empty.
  let tasks: AgentTask[];
  if (stored == null || (stored.length === 0 && !alreadySeeded)) {
    tasks = [...SEED_TASKS];
    localStorage.setItem('geosan_tasks', JSON.stringify(tasks));
    localStorage.setItem(SEED_FLAG, '1');
  } else {
    tasks = stored ?? [];
    if (!alreadySeeded) localStorage.setItem(SEED_FLAG, '1');
  }

  return projectId ? tasks.filter((t) => t.project_id === projectId) : tasks;
};

const saveTasks = (tasks: AgentTask[]) => {
  localStorage.setItem('geosan_tasks', JSON.stringify(tasks));
};

export function useTasks(projectId?: string) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: tasks = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => getTasks(projectId)
  });

  const createTask = useMutation({
    mutationFn: async (params: {
      org_id: string;
      project_id: string;
      task_type: TaskType;
      prompt: string;
      status?: AgentTask['status'];
      plan?: AgentTask['plan'];
      assigned_agent?: string | null;
      goal?: string;
      constraints?: string[];
      done_when?: string[];
    }) => {
      guardAiWork(params.project_id);
      const allTasks = await getTasks();
      const newTask: AgentTask = {
        id: `task-${Date.now()}`,
        org_id: params.org_id,
        project_id: params.project_id,
        task_type: params.task_type,
        parent_task_id: null,
        prompt: params.prompt,
        status: params.status ?? 'queued',
        assigned_agent: params.assigned_agent ?? null,
        plan: params.plan ?? null,
        result: null,
        branch_name: null,
        pr_url: null,
        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        goal: params.goal,
        constraints: params.constraints,
        done_when: params.done_when,
      };

      saveTasks([newTask, ...allTasks]);

      // We removed the frontend simulated orchestrator delays. 
      // A real orchestrator backend will handle status transitions.
      return newTask;
    },
    onSuccess: (_task, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      const awaiting = variables.status === 'awaiting_approval';
      toast.success(awaiting ? 'Plan proposed — awaiting operator approval' : 'Task dispatched to coordinator');
    },
    onError: (err) => toast.error(isProjectBudgetBlocked(err) ? err.message : 'Failed to create task')
  });
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string, status: AgentTask['status'] }) => {
      const allTasks = await getTasks();
      const idx = allTasks.findIndex(t => t.id === taskId);
      if (idx >= 0 && statusStartsAiWork(status)) guardAiWork(allTasks[idx].project_id);
      if (idx >= 0) {
        allTasks[idx] = { ...allTasks[idx], status };
        saveTasks(allTasks);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    onError: (err) => { if (isProjectBudgetBlocked(err)) toast.error(err.message); }
  });

  return {
    tasks,
    loading,
    error: error instanceof Error ? error : null,
    refetch,
    createTask: createTask.mutateAsync,
    approveTask: async (id: string) => {
      await updateTaskStatus.mutateAsync({ taskId: id, status: 'running' });
      toast.success('Plan approved. Worktree opens. Deploy still asks.');
    },
    rejectTask: async (id: string) => {
      await updateTaskStatus.mutateAsync({ taskId: id, status: 'failed' });
      toast.info('Plan rejected. No branch was opened.');
    },
    cancelTask: async (id: string) => { await updateTaskStatus.mutateAsync({ taskId: id, status: 'cancelled' }); toast.info('Task cancelled'); },
    retryTask: async (id: string) => { await updateTaskStatus.mutateAsync({ taskId: id, status: 'queued' }); toast.success('Task requeued'); },
    confirmProposedTask: async (id: string) => { await updateTaskStatus.mutateAsync({ taskId: id, status: 'queued' }); },
    dismissProposedTask: async (id: string) => { await updateTaskStatus.mutateAsync({ taskId: id, status: 'cancelled' }); }
  };
}
