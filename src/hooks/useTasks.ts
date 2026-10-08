import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AgentTask, TaskType } from '../lib/types';
import { useToast } from '../components/Toast';
import { MOCK_TASKS } from '../lib/mockData';

const getTasks = async (projectId?: string): Promise<AgentTask[]> => {
  if (typeof window === 'undefined') return [...MOCK_TASKS];
  
  const saved = localStorage.getItem('geosan_tasks');
  let tasks: AgentTask[] = [];
  
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      tasks = Array.isArray(parsed) ? parsed : [];
    } catch {
      tasks = [];
    }
  } else {
    tasks = [...MOCK_TASKS];
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
    }) => {
      const allTasks = await getTasks();
      const newTask: AgentTask = {
        id: `task-${Date.now()}`,
        org_id: params.org_id,
        project_id: params.project_id,
        task_type: params.task_type,
        parent_task_id: null,
        prompt: params.prompt,
        status: 'queued',
        assigned_agent: null,
        plan: null,
        result: null,
        branch_name: null,
        pr_url: null,
        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null
      };
      
      saveTasks([newTask, ...allTasks]);
      
      // We removed the frontend simulated orchestrator delays. 
      // A real orchestrator backend will handle status transitions.
      return newTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task dispatched to coordinator');
    },
    onError: () => toast.error('Failed to create task')
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string, status: AgentTask['status'] }) => {
      const allTasks = await getTasks();
      const idx = allTasks.findIndex(t => t.id === taskId);
      if (idx >= 0) {
        allTasks[idx] = { ...allTasks[idx], status };
        saveTasks(allTasks);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });

  return {
    tasks,
    loading,
    error: error instanceof Error ? error : null,
    refetch,
    createTask: createTask.mutateAsync,
    approveTask: async (id: string) => { await updateTaskStatus.mutateAsync({ taskId: id, status: 'running' }); toast.success('Task approved'); },
    rejectTask: async (id: string) => { await updateTaskStatus.mutateAsync({ taskId: id, status: 'failed' }); toast.error('Task rejected'); },
    cancelTask: async (id: string) => { await updateTaskStatus.mutateAsync({ taskId: id, status: 'cancelled' }); toast.info('Task cancelled'); },
    retryTask: async (id: string) => { await updateTaskStatus.mutateAsync({ taskId: id, status: 'queued' }); toast.success('Task requeued'); },
    confirmProposedTask: async (id: string) => { await updateTaskStatus.mutateAsync({ taskId: id, status: 'queued' }); },
    dismissProposedTask: async (id: string) => { await updateTaskStatus.mutateAsync({ taskId: id, status: 'cancelled' }); }
  };
}
