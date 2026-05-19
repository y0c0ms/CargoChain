# =============================================================================
# Terminal 3 - Next.js front-end
# =============================================================================
# Serves the 5 dashboards on http://localhost:3000.
# Should run AFTER deploy + seed have finished.
# =============================================================================

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location (Join-Path (Join-Path $repoRoot "prototype") "app")

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  TERMINAL 3 -- Next.js front-end" -ForegroundColor Cyan
Write-Host "  http://localhost:3000" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Wait briefly so contracts are deployed before the page tries to talk to them
Write-Host "Waiting 12s for deploy + seed to land..." -ForegroundColor Yellow
Start-Sleep -Seconds 12

Write-Host "Starting dev server..." -ForegroundColor Green
npm run dev
