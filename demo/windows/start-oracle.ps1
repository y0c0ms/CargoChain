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

# Deterministic Hardhat address for MerkleIoT (deployer #0, deploy nonce 3)
$env:MERKLE_ADDR = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
if (-not $env:TOKEN_ID) { $env:TOKEN_ID = "1" }

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  TERMINAL 4 -- IoT oracle simulator" -ForegroundColor Cyan
Write-Host "  TOKEN_ID    = $($env:TOKEN_ID)" -ForegroundColor Cyan
Write-Host "  MERKLE_ADDR = $($env:MERKLE_ADDR)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Waiting 18s for deploy + seed before anchoring batches..." -ForegroundColor Yellow
Start-Sleep -Seconds 18

Write-Host "Starting oracle. New batch every ~8 seconds." -ForegroundColor Green
npm run oracle:sim
