import { useState, useEffect, useCallback } from 'react';
import { AgentTask, TaskType } from '../lib/types';
import { useDataProvider } from '../lib/dataProvider';
import { useToast } from '../components/Toast';

export function useTasks(projectId?: string) {
  const dataProvider = useDataProvider();
  const toast = useToast();
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dataProvider.getTasks(projectId);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load tasks'));
    } finally {
      setLoading(false);
    }
  }, [dataProvider, projectId]);

  useEffect(() => {
    fetchTasks();
    const unsubscribe = dataProvider.subscribeChange(() => {
      fetchTasks();
    });
    return unsubscribe;
  }, [fetchTasks, dataProvider]);

  const createTask = async (params: {
    org_id: string;
    project_id: string;
    task_type: TaskType;
    prompt: string;
  }) => {
    try {
      const task = await dataProvider.createTask(params);
      toast.success('Task dispatched to coordinator');
      await fetchTasks();
      return task;
    } catch (err) {
      toast.error('Failed to create task');
      throw err;
    }
  };

  const approveTask = async (taskId: string) => {
    try {
      await dataProvider.approveTask(taskId);
      toast.success('Task approved — coordinator resuming');
      await fetchTasks();
    } catch (err) {
      toast.error('Failed to approve task');
      throw err;
    }
  };

  const rejectTask = async (taskId: string, reason: string) => {
    try {
      await dataProvider.rejectTask(taskId, reason);
      toast.error('Task rejected');
      await fetchTasks();
    } catch (err) {
      toast.error('Failed to reject task');
      throw err;
    }
  };

  const cancelTask = async (taskId: string) => {
    try {
      await dataProvider.cancelTask(taskId);
      toast.info('Task cancelled');
      await fetchTasks();
    } catch (err) {
      toast.error('Failed to cancel task');
      throw err;
    }
  };

  const retryTask = async (taskId: string) => {
    try {
      const task = await dataProvider.retryTask(taskId);
      toast.success('Task requeued for execution');
      await fetchTasks();
      return task;
    } catch (err) {
      toast.error('Failed to retry task');
      throw err;
    }
  };

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    createTask,
    approveTask,
    rejectTask,
    cancelTask,
    retryTask
  };
}
