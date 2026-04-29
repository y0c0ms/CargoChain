# =============================================================================
# Terminal 2 - deploy contracts + seed demo state
# =============================================================================
# Deploys the 4 contracts and seeds 5 identities (IATA, TAP, Pfizer, DHL,
# MSF Luanda) plus consignment #1. Run this AFTER the Hardhat node is up.
# =============================================================================

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location (Join-Path $repoRoot "prototype")

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  TERMINAL 2 -- Deploy + seed" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Wait for Hardhat node to be reachable (max ~20s)
Write-Host "Waiting for Hardhat node..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:8545" -Method POST `
            -Body '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' `
            -ContentType "application/json" -TimeoutSec 1 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { Start-Sleep -Seconds 1 }
}
if (-not $ready) {
    Write-Host "ERROR: Hardhat node did not come up. Did you run start-node.ps1?" -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}
Write-Host "Node reachable." -ForegroundColor Green

Write-Host ""
Write-Host "-- Deploying contracts --" -ForegroundColor Cyan
npm run deploy:local
if ($LASTEXITCODE -ne 0) {
    Write-Host "Deploy failed." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host ""
Write-Host "-- Seeding demo state --" -ForegroundColor Cyan
npx hardhat run scripts/seed.ts --network localhost
if ($LASTEXITCODE -ne 0) {
    Write-Host "Seed failed." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Stack ready" -ForegroundColor Green
Write-Host "  Open http://localhost:3000 once Terminal 3 is running" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "This window's job is done. You can close it (or leave it for logs)." -ForegroundColor DarkGray
Write-Host "Press Enter to close..." -ForegroundColor DarkGray
Read-Host
