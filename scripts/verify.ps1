# PowerShell deterministic harness runner for Windows environment
$ErrorActionPreference = 'Stop'

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][scriptblock]$Action
    )

    Write-Host "--> $Label"
    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw "Step failed ($Label) with exit code $LASTEXITCODE"
    }
}

Write-Host "=========================================="
Write-Host "GEOSAN-WORKSHOP Deterministic Harness (PowerShell)"
Write-Host "=========================================="

Invoke-Step 'Running strict TypeScript lint...' { npm run lint }
Invoke-Step 'Running dependency weight + package check...' { node scripts/check-deps.mjs }
Invoke-Step 'Running budget & telemetry replay...' { npx tsx scripts/replay-budget.ts }
Invoke-Step 'Running full system invariant test...' { npx tsx scripts/full-system-test.ts }
Invoke-Step 'Running deterministic Slop Critic & Design Contract lint...' { npx tsx scripts/design-lint.ts }

Write-Host "=========================================="
Write-Host "All deterministic tests PASSED successfully."
Write-Host "=========================================="
