/**
 * Client Budget Ledger Module
 * Shared weekly ledger: default 400 calls, $3.00 USD, 60/30/10 distribution across tiers.
 * Communicates with POST /budget/admit and GET /budget/status.
 */

export interface TierAllocation {
  tier: 1 | 2 | 3;
  name: string;
  pct: number;
  maxRequests: number;
  maxUsd: number;
  usedRequests: number;
  usedUsd: number;
}

export interface WeeklyLedgerState {
  weekKey: string;
  totalCapRequests: number;
  totalCapUsd: number;
  usedRequests: number;
  usedUsd: number;
  tiers: Record<1 | 2 | 3, TierAllocation>;
}

export interface AdmitResult {
  admitted: boolean;
  reason?: string;
  tier: 1 | 2 | 3;
  weekKey: string;
  tierRequestsUsed: number;
  tierRequestsCap: number;
  tierUsdUsed: number;
  tierUsdCap: number;
  totalRequestsUsed: number;
  totalRequestsCap: number;
  totalUsdUsed: number;
  totalUsdCap: number;
}

// Compute current ISO week key: e.g. "2026-W40"
export function getIsoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export const DEFAULT_WEEKLY_LEDGER: WeeklyLedgerState = {
  weekKey: getIsoWeekKey(),
  totalCapRequests: 400,
  totalCapUsd: 3.0,
  usedRequests: 24,
  usedUsd: 0.18,
  tiers: {
    1: {
      tier: 1,
      name: 'Tier 1: Full-Stack / SaaS (60%)',
      pct: 60,
      maxRequests: 240,
      maxUsd: 1.8,
      usedRequests: 16,
      usedUsd: 0.12,
    },
    2: {
      tier: 2,
      name: 'Tier 2: Data / Ingestion (30%)',
      pct: 30,
      maxRequests: 120,
      maxUsd: 0.9,
      usedRequests: 6,
      usedUsd: 0.05,
    },
    3: {
      tier: 3,
      name: 'Tier 3: Utility / Automation (10%)',
      pct: 10,
      maxRequests: 40,
      maxUsd: 0.3,
      usedRequests: 2,
      usedUsd: 0.01,
    },
  },
};

/**
 * Fetch latest budget ledger from backend
 */
export async function fetchBudgetStatus(): Promise<WeeklyLedgerState> {
  try {
    const res = await fetch('/budget/status');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return fallback in demo mode
  }
  return DEFAULT_WEEKLY_LEDGER;
}

/**
 * Request admission to execute a task under a specific tier
 */
export async function requestBudgetAdmit(
  tier: 1 | 2 | 3 = 1,
  costUsd: number = 0.0075
): Promise<AdmitResult> {
  try {
    const res = await fetch('/budget/admit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, costUsd }),
    });
    return await res.json();
  } catch {
    // In-memory demo fallback
    return {
      admitted: true,
      tier,
      weekKey: getIsoWeekKey(),
      tierRequestsUsed: 17,
      tierRequestsCap: 240,
      tierUsdUsed: 0.13,
      tierUsdCap: 1.8,
      totalRequestsUsed: 25,
      totalRequestsCap: 400,
      totalUsdUsed: 0.19,
      totalUsdCap: 3.0,
    };
  }
}
