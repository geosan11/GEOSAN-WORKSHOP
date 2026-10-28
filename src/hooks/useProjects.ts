import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project } from '../lib/types';
import { MOCK_PROJECTS } from '../lib/mockData';

const getProjects = async (): Promise<Project[]> => {
  if (typeof window === 'undefined') return [...MOCK_PROJECTS];
  const saved = localStorage.getItem('geosan_projects');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [...MOCK_PROJECTS];
    } catch {
      return [...MOCK_PROJECTS];
    }
  }
  // Demo parity with useTasks/useChat: seed verticals on first visit.
  localStorage.setItem('geosan_projects', JSON.stringify(MOCK_PROJECTS));
  return [...MOCK_PROJECTS];
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
    org_id: 'org-ehi-global',
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
