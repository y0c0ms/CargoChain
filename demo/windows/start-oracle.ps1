# =============================================================================
# Terminal 4 - IoT oracle simulator
# =============================================================================
# Generates 1 reading/sec, batches every 8 readings, anchors the Merkle root
# on-chain, and writes per-batch JSON to prototype/app/public/oracle-batches/.
#
# Optional env override:
#   $env:TOKEN_ID = "2"   # default is 1 (the seeded consignment)
# =============================================================================

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location (Join-Path $repoRoot "prototype")

if (-not $env:TOKEN_ID) { $env:TOKEN_ID = "1" }
$envFile = Join-Path (Join-Path $repoRoot "prototype") "app\.env.local"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  TERMINAL 4 -- IoT oracle simulator" -ForegroundColor Cyan
Write-Host "  TOKEN_ID = $($env:TOKEN_ID)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Poll until deploy-seed has written a fresh .env.local (newer than this script's start time).
$startTime = Get-Date
Write-Host "Waiting for deploy-seed to publish addresses..." -ForegroundColor Yellow
$gotAddr = $false
for ($i = 0; $i -lt 60; $i++) {
    if (Test-Path $envFile) {
        $fileTime = (Get-Item $envFile).LastWriteTime
        if ($fileTime -gt $startTime) {
            $merkleLine = Get-Content $envFile | Where-Object { $_ -match '^NEXT_PUBLIC_MERKLE=' }
            if ($merkleLine) {
                $env:MERKLE_ADDR = ($merkleLine -split '=', 2)[1].Trim()
                $gotAddr = $true
                break
            }
        }
    }
    Start-Sleep -Seconds 1
}

if (-not $gotAddr) {
    Write-Host "WARNING: .env.local not updated within 60s. Reading whatever is there now." -ForegroundColor Yellow
    if (Test-Path $envFile) {
        $merkleLine = Get-Content $envFile | Where-Object { $_ -match '^NEXT_PUBLIC_MERKLE=' }
        if ($merkleLine) {
            $env:MERKLE_ADDR = ($merkleLine -split '=', 2)[1].Trim()
        }
    }
}

if (-not $env:MERKLE_ADDR) {
    Write-Host "ERROR: could not determine MerkleIoT address. Did deploy-seed succeed?" -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host "MERKLE_ADDR = $($env:MERKLE_ADDR)" -ForegroundColor Green
Write-Host "Starting oracle. New batch every ~8 seconds." -ForegroundColor Green
npm run oracle:sim
