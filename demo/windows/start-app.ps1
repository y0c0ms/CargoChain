# =============================================================================
# Terminal 3 - Next.js front-end
# =============================================================================
# Serves the 5 dashboards on http://localhost:3000.
# Should run AFTER deploy + seed have finished.
# =============================================================================

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$appDir = Join-Path (Join-Path $repoRoot "prototype") "app"
Set-Location $appDir

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  TERMINAL 3 -- Next.js front-end" -ForegroundColor Cyan
Write-Host "  http://localhost:3000" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Poll until deploy-seed has written a fresh .env.local — NEXT_PUBLIC_* env
# vars are baked into the browser bundle at dev-server start, so we must NOT
# start before the new addresses are on disk.
$envFile = Join-Path $appDir ".env.local"
$startTime = Get-Date
Write-Host "Waiting for deploy-seed to publish addresses..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    if (Test-Path $envFile) {
        $fileTime = (Get-Item $envFile).LastWriteTime
        if ($fileTime -gt $startTime) { $ready = $true; break }
    }
    Start-Sleep -Seconds 1
}
if (-not $ready) {
    Write-Host "WARNING: .env.local not refreshed in 60s. Starting anyway with whatever's on disk." -ForegroundColor Yellow
}

Write-Host "Starting dev server..." -ForegroundColor Green
npm run dev
