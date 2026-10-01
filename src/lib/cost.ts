import { CostEvent } from './types';

/**
 * Calculates total spend for a project this month.
 */
export function projectMonthlySpend(
  events: CostEvent[],
  projectId?: string
): number {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  return events
    .filter((e) => {
      const isProjectMatch = !projectId || e.project_id === projectId;
      const isThisMonth = new Date(e.created_at) >= start;
      return isProjectMatch && isThisMonth;
    })
    .reduce((sum, e) => sum + Number(e.cost_usd || 0), 0);
}

/**
 * Aggregates spend by AI foundation provider.
 */
export function spendByProvider(
  events: CostEvent[],
  projectId?: string,
  sinceIso?: string
): Record<string, number> {
  const filtered = events.filter((e) => {
    const isProjectMatch = !projectId || e.project_id === projectId;
    const isSince = !sinceIso || new Date(e.created_at) >= new Date(sinceIso);
    return isProjectMatch && isSince;
  });

  const byProvider: Record<string, number> = {
    google: 0,
    anthropic: 0,
    xai: 0,
    openai: 0
  };

  for (const e of filtered) {
    const p = e.provider || 'local';
    byProvider[p] = (byProvider[p] || 0) + Number(e.cost_usd || 0);
  }

  return byProvider;
}

/**
 * Aggregates spend by feature attribution tag ("FEATURE:xyz", "BUG:abc", "QA:qwe").
 */
export function spendByAttribution(
  events: CostEvent[],
  projectId?: string,
  sinceIso?: string
): Record<string, number> {
  const filtered = events.filter((e) => {
    const isProjectMatch = !projectId || e.project_id === projectId;
    const isSince = !sinceIso || new Date(e.created_at) >= new Date(sinceIso);
    return isProjectMatch && isSince && Boolean(e.attributed_to);
  });

  const byTag: Record<string, number> = {};
  for (const e of filtered) {
    if (!e.attributed_to) continue;
    byTag[e.attributed_to] = (byTag[e.attributed_to] || 0) + Number(e.cost_usd || 0);
  }

  return byTag;
}

export interface DailySpendPoint {
  date: string;
  cost: number;
  tokens: number;
}

/**
 * Calculates daily spend trend for line charting.
 */
export function dailySpendTrend(
  events: CostEvent[],
  projectId?: string,
  days: number = 30
): DailySpendPoint[] {
  const now = new Date();
  const since = new Date();
  since.setDate(now.getDate() - days);
  since.setHours(0, 0, 0, 0);

  // Initialize all days in the range so the chart has a continuous timeline
  const map: Record<string, { cost: number; tokens: number }> = {};
  for (let i = 0; i <= days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(5, 10); // "MM-DD"
    map[key] = { cost: 0, tokens: 0 };
  }

  const filtered = events.filter((e) => {
    const isProjectMatch = !projectId || e.project_id === projectId;
    const isSince = new Date(e.created_at) >= since;
    return isProjectMatch && isSince;
  });

  for (const e of filtered) {
    const key = e.created_at.slice(5, 10);
    if (!map[key]) {
      map[key] = { cost: 0, tokens: 0 };
    }
    map[key].cost += Number(e.cost_usd || 0);
    map[key].tokens += Number((e.tokens_input || 0) + (e.tokens_output || 0));
  }

  return Object.entries(map).map(([date, val]) => ({
    date,
    cost: Number(val.cost.toFixed(4)),
    tokens: val.tokens
  }));
}
