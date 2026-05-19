# =============================================================================
# Terminal 1 - Hardhat local blockchain node
# =============================================================================
# Starts a deterministic EVM node on http://127.0.0.1:8545 with 20 funded
# test accounts. Leave this window running for the duration of the demo.
# =============================================================================

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location (Join-Path $repoRoot "prototype")

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  TERMINAL 1 -- Hardhat node" -ForegroundColor Cyan
Write-Host "  http://127.0.0.1:8545  |  chainId 31337" -ForegroundColor Cyan
Write-Host "  Leave this window open for the whole demo." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

npx hardhat node
