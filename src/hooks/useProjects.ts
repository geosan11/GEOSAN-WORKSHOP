import { useState, useEffect, useCallback } from 'react';
import { Project } from '../lib/types';
import { useDataProvider } from '../lib/dataProvider';

export function useProjects() {
  const dataProvider = useDataProvider();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dataProvider.getProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load projects'));
    } finally {
      setLoading(false);
    }
  }, [dataProvider]);

  useEffect(() => {
    fetchProjects();
    const unsubscribe = dataProvider.subscribeChange(() => {
      fetchProjects();
    });
    return unsubscribe;
  }, [fetchProjects, dataProvider]);

  const createProject = useCallback(
    async (params: {
      name: string;
      vertical: string;
      monthly_budget_usd?: number;
      repo_url?: string | null;
      agent_instructions?: string;
    }) => {
      const created = await dataProvider.createProject(params);
      await fetchProjects();
      return created;
    },
    [dataProvider, fetchProjects]
  );

  return { projects, loading, error, refetch: fetchProjects, createProject };
}
