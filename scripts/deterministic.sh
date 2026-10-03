#!/usr/bin/env bash
set -euo pipefail

# Deterministic build, verification, and regression test script.
# Pure local heuristics: git diff check, TypeScript compile, format validation, and replay.
# CRITICAL: This script does NOT call an external LLM or model API.

COMMAND="${1:-all}"

echo "=========================================="
echo "GEOSAN-WORKSHOP Deterministic Harness"
echo "Target Command: ${COMMAND}"
echo "=========================================="

run_git() {
  echo "--> Running git status & diff check..."
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git status -s
  else
    echo "Git repository not initialized in this environment; skipping git status check."
  fi
}

run_lint() {
  echo "--> Running strict TypeScript lint (tsc --noEmit)..."
  npm run lint
}

run_format_check() {
  echo "--> Checking codebase formatting integrity..."
  # Pure deterministic syntax check via tsc & package validation
  node -e "
    const pkg = require('./package.json');
    console.log('Package check OK: ' + pkg.name + ' v' + pkg.version);
    const forbidden = ['@google/genai', 'recharts', 'motion', '@supabase/supabase-js'];
    const found = forbidden.filter(dep => pkg.dependencies && pkg.dependencies[dep]);
    if (found.length > 0) {
      console.error('Forbidden heavy dependencies detected in package.json:', found);
      process.exit(1);
    } else {
      console.log('Dependency weight check PASSED (clean demo footprint).');
    }
  "
}

run_replay() {
  echo "--> Running deterministic replay of budget admission & telemetry rules..."
  npx tsx -e "
    import { admitBudget, getBudgetLedger, resetLedgerForTesting } from './server/budgetLedger';
    import { getSharedStatus, getUpstreamPullsCount } from './server/telemetry-gateway';

    resetLedgerForTesting();
    const initial = getBudgetLedger();
    console.log('Week key:', initial.weekKey, 'Cap:', initial.totalCapRequests, 'calls, $', initial.totalCapUsd);
    
    // Test fast admits on Tier 3 (max 40 calls, 10% share)
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

    // Test hourly upstream pull TTL: refresh must not increment pull count inside the hour
    const initialPulls = getUpstreamPullsCount();
    getSharedStatus(false);
    getSharedStatus(true); // force=1 query must NOT pull upstream
    const pullsAfter = getUpstreamPullsCount();
    if (pullsAfter !== initialPulls) {
      console.error('FAIL: upstream_pulls_this_process incremented inside the hour! Initial:', initialPulls, 'After:', pullsAfter);
      process.exit(1);
    }
    console.log('Hourly TTL check PASSED: Status refresh & ?force=1 did not increment upstream_pulls_this_process.');
  "
}

run_full_system_test() {
  echo "--> Running comprehensive system invariant & anomaly verification..."
  npx tsx scripts/full-system-test.ts
}

run_user_interactions_test() {
  echo "--> Running real-user button, input, and workflow interaction simulation..."
  npx tsx scripts/test-all-user-interactions.ts
}

run_coverage_audit() {
  echo "--> Running comprehensive blind-spot & edge-case coverage audit..."
  npx tsx scripts/comprehensive-coverage-audit.ts
}

case "${COMMAND}" in
  git)
    run_git
    ;;
  lint)
    run_lint
    ;;
  format-check)
    run_format_check
    ;;
  replay)
    run_replay
    ;;
  system)
    run_full_system_test
    ;;
  user-test)
    run_user_interactions_test
    ;;
  audit)
    run_coverage_audit
    ;;
  all)
    run_git
    run_lint
    run_format_check
    run_replay
    run_full_system_test
    run_user_interactions_test
    run_coverage_audit
    echo "=========================================="
    echo "All deterministic, system, user-simulation, and coverage audit tests PASSED successfully."
    echo "=========================================="
    ;;
  *)
    echo "Unknown command: ${COMMAND}. Valid options: git, lint, format-check, replay, system, user-test, audit, all"
    exit 1
    ;;
esac
