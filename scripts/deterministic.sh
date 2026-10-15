#!/usr/bin/env bash
set -e
set -u
(set -o pipefail 2>/dev/null) && set -o pipefail || true

# Deterministic build, verification, and regression test script.
# Pure local heuristics: git diff check, TypeScript compile, package validation, and replay.
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
  node scripts/check-deps.mjs
  node scripts/check-secrets.mjs
}

run_replay() {
  echo "--> Running deterministic replay of budget admission & telemetry rules..."
  npx tsx scripts/replay-budget.ts
}

run_full_system_test() {
  echo "--> Running comprehensive system invariant & anomaly verification..."
  npx tsx scripts/full-system-test.ts
}

run_design_lint() {
  echo "--> Running deterministic Slop Critic & Design Contract lint..."
  npx tsx scripts/design-lint.ts
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
  design-lint)
    run_design_lint
    ;;
  all)
    run_git
    run_lint
    run_format_check
    run_replay
    run_full_system_test
    run_design_lint
    echo "=========================================="
    echo "All deterministic, system, and design-lint checks PASSED successfully."
    echo "=========================================="
    ;;
  *)
    echo "Unknown command: ${COMMAND}. Valid options: git, lint, format-check, replay, system, design-lint, all"
    exit 1
    ;;
esac
