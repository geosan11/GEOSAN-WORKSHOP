/**
 * Shared Weekly Budget Ledger
 * Defaults: 400 calls, $3.00 USD, 60/30/10 allocation across tiers.
 * POST /budget/admit admits a request if the tier has remaining budget/calls.
 * If quota is exhausted, admission is refused.
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

// Compute current ISO week key: e.g. "2026-W40"
export function getIsoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

const DEFAULT_TOTAL_REQUESTS = 400;
const DEFAULT_TOTAL_USD = 3.0; // $3.00

// 60 / 30 / 10 tier allocation
function createDefaultLedger(weekKey: string = getIsoWeekKey()): WeeklyLedgerState {
  return {
    weekKey,
    totalCapRequests: DEFAULT_TOTAL_REQUESTS,
    totalCapUsd: DEFAULT_TOTAL_USD,
    usedRequests: 0,
    usedUsd: 0,
    tiers: {
      1: {
        tier: 1,
        name: 'Tier 1: Full-Stack / SaaS',
        pct: 60,
        maxRequests: Math.round(DEFAULT_TOTAL_REQUESTS * 0.6), // 240
        maxUsd: Number((DEFAULT_TOTAL_USD * 0.6).toFixed(2)), // $1.80
        usedRequests: 0,
        usedUsd: 0,
      },
      2: {
        tier: 2,
        name: 'Tier 2: Data / Ingestion',
        pct: 30,
        maxRequests: Math.round(DEFAULT_TOTAL_REQUESTS * 0.3), // 120
        maxUsd: Number((DEFAULT_TOTAL_USD * 0.3).toFixed(2)), // $0.90
        usedRequests: 0,
        usedUsd: 0,
      },
      3: {
        tier: 3,
        name: 'Tier 3: Utility / Automation',
        pct: 10,
        maxRequests: Math.round(DEFAULT_TOTAL_REQUESTS * 0.1), // 40
        maxUsd: Number((DEFAULT_TOTAL_USD * 0.1).toFixed(2)), // $0.30
        usedRequests: 0,
        usedUsd: 0,
      },
    },
  };
}

let activeLedger: WeeklyLedgerState = createDefaultLedger();

// Pre-seed a small realistic base usage for demo mode
activeLedger.usedRequests = 24;
activeLedger.usedUsd = 0.18;
activeLedger.tiers[1].usedRequests = 16;
activeLedger.tiers[1].usedUsd = 0.12;
activeLedger.tiers[2].usedRequests = 6;
activeLedger.tiers[2].usedUsd = 0.05;
activeLedger.tiers[3].usedRequests = 2;
activeLedger.tiers[3].usedUsd = 0.01;

export function getBudgetLedger(): WeeklyLedgerState {
  const currentWeek = getIsoWeekKey();
  if (activeLedger.weekKey !== currentWeek) {
    activeLedger = createDefaultLedger(currentWeek);
  }
  return { ...activeLedger };
}

export interface AdmitRequest {
  tier: 1 | 2 | 3;
  costUsd?: number;
  caller?: string;
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

export function admitBudget(req: AdmitRequest): AdmitResult {
  const ledger = getBudgetLedger();
  const tierKey = (req.tier === 1 || req.tier === 2 || req.tier === 3 ? req.tier : 1) as 1 | 2 | 3;
  const tier = ledger.tiers[tierKey];
  const cost = req.costUsd && req.costUsd > 0 ? req.costUsd : 0.0075; // average cost per request

  // Check 1: Tier requests exhausted
  if (tier.usedRequests >= tier.maxRequests) {
    return {
      admitted: false,
      reason: `Tier ${tierKey} request quota exhausted (${tier.usedRequests}/${tier.maxRequests})`,
      tier: tierKey,
      weekKey: ledger.weekKey,
      tierRequestsUsed: tier.usedRequests,
      tierRequestsCap: tier.maxRequests,
      tierUsdUsed: tier.usedUsd,
      tierUsdCap: tier.maxUsd,
      totalRequestsUsed: ledger.usedRequests,
      totalRequestsCap: ledger.totalCapRequests,
      totalUsdUsed: ledger.usedUsd,
      totalUsdCap: ledger.totalCapUsd,
    };
  }

  // Check 2: Tier USD exhausted
  if (tier.usedUsd + cost > tier.maxUsd) {
    return {
      admitted: false,
      reason: `Tier ${tierKey} USD budget cap exceeded ($${tier.usedUsd.toFixed(2)}/$${tier.maxUsd.toFixed(2)})`,
      tier: tierKey,
      weekKey: ledger.weekKey,
      tierRequestsUsed: tier.usedRequests,
      tierRequestsCap: tier.maxRequests,
      tierUsdUsed: tier.usedUsd,
      tierUsdCap: tier.maxUsd,
      totalRequestsUsed: ledger.usedRequests,
      totalRequestsCap: ledger.totalCapRequests,
      totalUsdUsed: ledger.usedUsd,
      totalUsdCap: ledger.totalCapUsd,
    };
  }

  // Check 3: Global cap
  if (ledger.usedRequests >= ledger.totalCapRequests || ledger.usedUsd + cost > ledger.totalCapUsd) {
    return {
      admitted: false,
      reason: `Global weekly budget exhausted (${ledger.usedRequests}/${ledger.totalCapRequests}, $${ledger.usedUsd.toFixed(2)}/$${ledger.totalCapUsd.toFixed(2)})`,
      tier: tierKey,
      weekKey: ledger.weekKey,
      tierRequestsUsed: tier.usedRequests,
      tierRequestsCap: tier.maxRequests,
      tierUsdUsed: tier.usedUsd,
      tierUsdCap: tier.maxUsd,
      totalRequestsUsed: ledger.usedRequests,
      totalRequestsCap: ledger.totalCapRequests,
      totalUsdUsed: ledger.usedUsd,
      totalUsdCap: ledger.totalCapUsd,
    };
  }

  // Admit: increment tier and global ledger
  tier.usedRequests += 1;
  tier.usedUsd = Number((tier.usedUsd + cost).toFixed(4));
  ledger.usedRequests += 1;
  ledger.usedUsd = Number((ledger.usedUsd + cost).toFixed(4));

  return {
    admitted: true,
    tier: tierKey,
    weekKey: ledger.weekKey,
    tierRequestsUsed: tier.usedRequests,
    tierRequestsCap: tier.maxRequests,
    tierUsdUsed: tier.usedUsd,
    tierUsdCap: tier.maxUsd,
    totalRequestsUsed: ledger.usedRequests,
    totalRequestsCap: ledger.totalCapRequests,
    totalUsdUsed: ledger.usedUsd,
    totalUsdCap: ledger.totalCapUsd,
  };
}

export function resetLedgerForTesting(): void {
  activeLedger = createDefaultLedger();
}
