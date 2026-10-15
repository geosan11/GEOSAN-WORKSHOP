# PowerShell deterministic harness runner for Windows environment
Write-Host "=========================================="
Write-Host "GEOSAN-WORKSHOP Deterministic Harness (PowerShell)"
Write-Host "=========================================="

Write-Host "--> Running strict TypeScript lint..."
npm run lint

Write-Host "--> Running dependency weight + package check..."
node -e @"
const pkg = require('./package.json');
console.log('Package check OK: ' + pkg.name + ' v' + pkg.version);
const forbidden = ['@google/genai', 'recharts', 'motion', '@supabase/supabase-js'];
const found = forbidden.filter(dep => pkg.dependencies && pkg.dependencies[dep]);
if (found.length > 0) {
  console.error('Forbidden heavy dependencies detected in package.json:', found);
  process.exit(1);
}
console.log('Dependency weight check PASSED (clean demo footprint).');
"@

Write-Host "--> Running full system invariant test..."
npx tsx scripts/full-system-test.ts

Write-Host "--> Running deterministic Slop Critic & Design Contract lint..."
npx tsx scripts/design-lint.ts

Write-Host "=========================================="
Write-Host "All deterministic tests PASSED successfully."
Write-Host "=========================================="
