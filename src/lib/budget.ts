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

export function getIsoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function createDefaultLedger(): WeeklyLedgerState {
  return {
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
}

export const DEFAULT_WEEKLY_LEDGER: WeeklyLedgerState = createDefaultLedger();

/** Mutable demo ledger used when /budget/* is unavailable (Vite SPA fallback). */
let demoLedger: WeeklyLedgerState = createDefaultLedger();

function cloneLedger(state: WeeklyLedgerState): WeeklyLedgerState {
  return JSON.parse(JSON.stringify(state)) as WeeklyLedgerState;
}

async function readJsonBody(res: Response): Promise<unknown | null> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch latest budget ledger from backend
 */
export async function fetchBudgetStatus(): Promise<WeeklyLedgerState> {
  try {
    const res = await fetch('/budget/status');
    if (res.ok) {
      const data = await readJsonBody(res);
      if (data && typeof data === 'object') {
        demoLedger = cloneLedger(data as WeeklyLedgerState);
        return cloneLedger(demoLedger);
      }
    }
  } catch {
    // Demo fallback below
  }
  return cloneLedger(demoLedger);
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
    // 200 admitted and 429 refused both return AdmitResult JSON — parse both.
    // Treating 429 as "no JSON" used to fall through and admit on the demo ledger.
    if (res.status === 200 || res.status === 429) {
      const data = await readJsonBody(res);
      if (data && typeof data === 'object' && 'admitted' in (data as object)) {
        const result = data as AdmitResult;
        if (result.admitted) {
          demoLedger.usedRequests = result.totalRequestsUsed;
          demoLedger.usedUsd = result.totalUsdUsed;
          const tierState = demoLedger.tiers[result.tier];
          if (tierState) {
            tierState.usedRequests = result.tierRequestsUsed;
            tierState.usedUsd = result.tierUsdUsed;
          }
        }
        return result;
      }
    }
  } catch {
    // Demo fallback below
  }

  const ledger = demoLedger;
  const tierKey = tier;
  const tierState = ledger.tiers[tierKey];
  const cost = costUsd > 0 ? costUsd : 0.0075;

  if (tierState.usedRequests >= tierState.maxRequests) {
    return {
      admitted: false,
      reason: `Tier ${tierKey} request quota exhausted`,
      tier: tierKey,
      weekKey: ledger.weekKey,
      tierRequestsUsed: tierState.usedRequests,
      tierRequestsCap: tierState.maxRequests,
      tierUsdUsed: tierState.usedUsd,
      tierUsdCap: tierState.maxUsd,
      totalRequestsUsed: ledger.usedRequests,
      totalRequestsCap: ledger.totalCapRequests,
      totalUsdUsed: ledger.usedUsd,
      totalUsdCap: ledger.totalCapUsd,
    };
  }

  if (tierState.usedUsd + cost > tierState.maxUsd || ledger.usedUsd + cost > ledger.totalCapUsd) {
    return {
      admitted: false,
      reason: `Tier ${tierKey} or global USD budget exhausted`,
      tier: tierKey,
      weekKey: ledger.weekKey,
      tierRequestsUsed: tierState.usedRequests,
      tierRequestsCap: tierState.maxRequests,
      tierUsdUsed: tierState.usedUsd,
      tierUsdCap: tierState.maxUsd,
      totalRequestsUsed: ledger.usedRequests,
      totalRequestsCap: ledger.totalCapRequests,
      totalUsdUsed: ledger.usedUsd,
      totalUsdCap: ledger.totalCapUsd,
    };
  }

  tierState.usedRequests += 1;
  tierState.usedUsd = Number((tierState.usedUsd + cost).toFixed(4));
  ledger.usedRequests += 1;
  ledger.usedUsd = Number((ledger.usedUsd + cost).toFixed(4));

  return {
    admitted: true,
    tier: tierKey,
    weekKey: ledger.weekKey,
    tierRequestsUsed: tierState.usedRequests,
    tierRequestsCap: tierState.maxRequests,
    tierUsdUsed: tierState.usedUsd,
    tierUsdCap: tierState.maxUsd,
    totalRequestsUsed: ledger.usedRequests,
    totalRequestsCap: ledger.totalCapRequests,
    totalUsdUsed: ledger.usedUsd,
    totalUsdCap: ledger.totalCapUsd,
  };
}
