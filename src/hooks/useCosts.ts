import { useState, useEffect, useCallback } from 'react';
import { CostEvent } from '../lib/types';
import { useDataProvider } from '../lib/dataProvider';

export function useCosts(projectId?: string) {
  const dataProvider = useDataProvider();
  const [costEvents, setCostEvents] = useState<CostEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dataProvider.getCostEvents(projectId);
      setCostEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load cost events'));
    } finally {
      setLoading(false);
    }
  }, [dataProvider, projectId]);

  useEffect(() => {
    fetchCosts();
    const unsubscribe = dataProvider.subscribeChange(() => {
      fetchCosts();
    });
    return unsubscribe;
  }, [fetchCosts, dataProvider]);

  return { costEvents, loading, error, refetch: fetchCosts };
}
