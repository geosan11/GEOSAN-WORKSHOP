/**
 * Deterministic replay of budget admission + telemetry hourly TTL rules.
 * Shared by CI and local harness runners.
 */
import { admitBudget, getBudgetLedger, resetLedgerForTesting } from '../server/budgetLedger';
import { getSharedStatus, getUpstreamPullsCount } from '../server/telemetry-gateway';

resetLedgerForTesting();
const initial = getBudgetLedger();
console.log('Week key:', initial.weekKey, 'Cap:', initial.totalCapRequests, 'calls, $', initial.totalCapUsd);

let admittedCount = 0;
for (let i = 0; i < 45; i++) {
    const res = admitBudget({ tier: 3, costUsd: 0.0075 });
    if (res.admitted) admittedCount++;
}

console.log('Tier 3 admits admitted out of 45 attempts:', admittedCount);
if (admittedCount > 40) {
    console.error('FAIL: Tier quota was breached!');
    process.exit(1);
}

const testRefusal = admitBudget({ tier: 3, costUsd: 0.0075 });
if (testRefusal.admitted) {
    console.error('FAIL: Gateway failed to refuse admission after tier share exhausted!');
    process.exit(1);
}
console.log('Tier quota check PASSED: Gateway successfully refused admission after tier 3 quota exhausted.');

const initialPulls = getUpstreamPullsCount();
getSharedStatus(false);
getSharedStatus(true); // force=1 must NOT pull upstream inside the hour
const pullsAfter = getUpstreamPullsCount();
if (pullsAfter !== initialPulls) {
    console.error(
        'FAIL: upstream_pulls_this_process incremented inside the hour! Initial:',
        initialPulls,
        'After:',
        pullsAfter,
    );
    process.exit(1);
}
console.log('Hourly TTL check PASSED: Status refresh & ?force=1 did not increment upstream_pulls_this_process.');
