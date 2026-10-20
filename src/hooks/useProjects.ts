import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project } from '../lib/types';
import { CLIENT_PROJECTS } from '../data/clientProjects';
import { DEFAULT_WORKSPACE_ID } from '../lib/workspace';

const STORAGE_KEY = 'geosan_projects';

/** Seeded design kits for stored records saved before `design_kit` existed. */
function withSeedDesignKit(project: Project): Project {
  if (project.design_kit) return project;
  const seed = CLIENT_PROJECTS.find((p) => p.id === project.id);
  return seed?.design_kit ? { ...project, design_kit: seed.design_kit } : project;
}

const getProjects = async (): Promise<Project[]> => {
  if (typeof window === 'undefined') return [...CLIENT_PROJECTS];
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved != null) {
    // The stored list is the source of truth, including an empty one.
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? (parsed as Project[]).map(withSeedDesignKit) : [];
    } catch {
      return [];
    }
  }
  // First visit only: write the client project records.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(CLIENT_PROJECTS));
  return [...CLIENT_PROJECTS];
};
const createProject = async (params: {
  name: string;
  vertical: string;
  monthly_budget_usd?: number;
  repo_url?: string | null;
  vercel_deployment_url?: string | null;
  agent_instructions?: string;
  design_kit?: string;
}): Promise<Project> => {
  const projects = await getProjects();
  const newProject: Project = {
    id: `proj-${Date.now()}`,
    org_id: DEFAULT_WORKSPACE_ID,
    name: params.name,
    slug: params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    vertical: params.vertical,
    ...(params.design_kit ? { design_kit: params.design_kit } : {}),
    status: 'production',
    repo_url: params.repo_url || null,
    vercel_deployment_url: params.vercel_deployment_url || null,
    agent_instructions: params.agent_instructions,
    monthly_budget_usd: params.monthly_budget_usd || 1500,
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

  return {
    projects,
    loading,
    error: error instanceof Error ? error : null,
    refetch,
    createProject: mutation.mutateAsync
  };
}
