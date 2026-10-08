import { useQuery } from '@tanstack/react-query';
import { CostEvent } from '../lib/types';
import { MOCK_COST_EVENTS } from '../lib/mockData';

const getCosts = async (projectId?: string): Promise<CostEvent[]> => {
  if (typeof window === 'undefined') return [...MOCK_COST_EVENTS];
  
  const saved = localStorage.getItem('geosan_costs');
  let costs: CostEvent[] = [];
  
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      costs = Array.isArray(parsed) ? parsed : [];
    } catch {
      costs = [];
    }
  } else {
    costs = [...MOCK_COST_EVENTS];
  }

  return projectId ? costs.filter((c) => c.project_id === projectId) : costs;
};

export function useCosts(projectId?: string) {
  const { data: costEvents = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ['costs', projectId],
    queryFn: () => getCosts(projectId)
  });

  return { 
    costEvents, 
    loading, 
    error: error instanceof Error ? error : null, 
    refetch 
  };
}
