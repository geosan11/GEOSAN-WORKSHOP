import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project } from '../lib/types';
import { MOCK_PROJECTS } from '../lib/mockData';

const getProjects = async (): Promise<Project[]> => {
  if (typeof window === 'undefined') return [...MOCK_PROJECTS];
  const saved = localStorage.getItem('geosan_projects');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return []; // Start empty by default
};

const createProject = async (params: {
  name: string;
  vertical: string;
  monthly_budget_usd?: number;
  repo_url?: string | null;
  vercel_deployment_url?: string | null;
  agent_instructions?: string;
}): Promise<Project> => {
  const projects = await getProjects();
  const newProject: Project = {
    id: `proj-${Date.now()}`,
    org_id: 'org-ehi-global',
    name: params.name,
    slug: params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    vertical: params.vertical,
    status: 'production',
    repo_url: params.repo_url || null,
    vercel_deployment_url: params.vercel_deployment_url || null,
    agent_instructions: params.agent_instructions,
    monthly_budget_usd: params.monthly_budget_usd || 1500,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const updated = [newProject, ...projects];
  localStorage.setItem('geosan_projects', JSON.stringify(updated));
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

  return {
    projects,
    loading,
    error: error instanceof Error ? error : null,
    refetch,
    createProject: mutation.mutateAsync
  };
}
