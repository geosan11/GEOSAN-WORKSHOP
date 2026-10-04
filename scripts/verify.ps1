# PowerShell deterministic harness runner for Windows environment
Write-Host "=========================================="
Write-Host "GEOSAN-WORKSHOP Deterministic Harness (PowerShell)"
Write-Host "=========================================="

Write-Host "--> Running strict TypeScript lint..."
npm run lint

Write-Host "--> Running full system invariant test..."
npx tsx scripts/full-system-test.ts

Write-Host "--> Running user interactions simulation test..."
npx tsx scripts/test-all-user-interactions.ts

Write-Host "--> Running comprehensive coverage audit..."
npx tsx scripts/comprehensive-coverage-audit.ts

Write-Host "=========================================="
Write-Host "All deterministic tests PASSED successfully."
Write-Host "=========================================="
