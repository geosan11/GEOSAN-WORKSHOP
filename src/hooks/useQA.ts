import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QARun, QAFinding } from '../lib/types';
import { useToast } from '../components/Toast';
import { MOCK_QA_RUNS, MOCK_QA_FINDINGS } from '../lib/mockData';

const getQARuns = async (projectId?: string): Promise<QARun[]> => {
  if (typeof window === 'undefined') return [...MOCK_QA_RUNS];
  const saved = localStorage.getItem('geosan_qa_runs');
  let runs = saved ? JSON.parse(saved) : [...MOCK_QA_RUNS];
  return projectId ? runs.filter((r: QARun) => r.project_id === projectId) : runs;
};

const getQAFindings = async (projectId?: string): Promise<QAFinding[]> => {
  if (typeof window === 'undefined') return [...MOCK_QA_FINDINGS];
  const saved = localStorage.getItem('geosan_qa_findings');
  const findings: QAFinding[] = saved ? JSON.parse(saved) : [...MOCK_QA_FINDINGS];
  
  if (projectId) {
    const runs = await getQARuns(projectId);
    const runIds = new Set(runs.map((r: QARun) => r.id));
    return findings.filter((f: QAFinding) => f.project_id === projectId || runIds.has(f.run_id));
  }
  return findings;
};

const saveQAFindings = (findings: QAFinding[]) => {
  localStorage.setItem('geosan_qa_findings', JSON.stringify(findings));
};

export function useQA(projectId?: string) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: qaRuns = [], isLoading: loadingRuns, error: errorRuns } = useQuery({
    queryKey: ['qaRuns', projectId],
    queryFn: () => getQARuns(projectId)
  });

  const { data: qaFindings = [], isLoading: loadingFindings, error: errorFindings, refetch: refetchFindings } = useQuery({
    queryKey: ['qaFindings', projectId],
    queryFn: () => getQAFindings(projectId)
  });

  const resolveFindingMutation = useMutation({
    mutationFn: async (findingId: string) => {
      const allFindings = await getQAFindings();
      const idx = allFindings.findIndex((f: QAFinding) => f.id === findingId);
      if (idx >= 0) {
        allFindings[idx] = { ...allFindings[idx], status: 'resolved' };
        saveQAFindings(allFindings);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qaFindings'] });
      toast.success('Finding marked as resolved');
    },
    onError: () => toast.error('Failed to resolve finding')
  });

  return {
    qaRuns,
    qaFindings,
    loading: loadingRuns || loadingFindings,
    error: errorRuns || errorFindings ? new Error('Failed to load QA data') : null,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['qaRuns'] });
      queryClient.invalidateQueries({ queryKey: ['qaFindings'] });
    },
    resolveFinding: resolveFindingMutation.mutateAsync
  };
}
