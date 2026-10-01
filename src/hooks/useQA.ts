import { useState, useEffect, useCallback } from 'react';
import { QARun, QAFinding } from '../lib/types';
import { useDataProvider } from '../lib/dataProvider';
import { useToast } from '../components/Toast';

export function useQA(projectId?: string) {
  const dataProvider = useDataProvider();
  const toast = useToast();
  const [qaRuns, setQaRuns] = useState<QARun[]>([]);
  const [qaFindings, setQaFindings] = useState<QAFinding[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchQA = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [runs, findings] = await Promise.all([
        dataProvider.getQARuns(projectId),
        dataProvider.getQAFindings()
      ]);
      setQaRuns(runs);
      setQaFindings(findings);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load QA data'));
    } finally {
      setLoading(false);
    }
  }, [dataProvider, projectId]);

  useEffect(() => {
    fetchQA();
    const unsubscribe = dataProvider.subscribeChange(() => {
      fetchQA();
    });
    return unsubscribe;
  }, [fetchQA, dataProvider]);

  const resolveFinding = async (findingId: string) => {
    try {
      await dataProvider.resolveFinding(findingId);
      toast.success('Finding marked as resolved');
      await fetchQA();
    } catch (err) {
      toast.error('Failed to resolve finding');
      throw err;
    }
  };

  return {
    qaRuns,
    qaFindings,
    loading,
    error,
    refetch: fetchQA,
    resolveFinding
  };
}
