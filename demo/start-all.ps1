# =============================================================================
# Master orchestrator - opens 4 PowerShell windows and runs the full demo stack
# =============================================================================
# Usage:
#   .\demo\start-all.ps1
#
# If PowerShell complains about execution policy, run this once per session:
#   Set-ExecutionPolicy -Scope Process Bypass
# Or just bypass per-invocation:
#   powershell -ExecutionPolicy Bypass -File .\demo\start-all.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot

function Launch($title, $script) {
    $cmd = "`$Host.UI.RawUI.WindowTitle = '$title'; & '$script'"
    $argList = @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-Command", $cmd
    )
    Start-Process powershell -ArgumentList $argList
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  CargoChain demo - launching 4 terminals" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Launch "T1 - Hardhat node"  (Join-Path $here "start-node.ps1")
Start-Sleep -Milliseconds 500

Launch "T2 - Deploy + seed" (Join-Path $here "deploy-seed.ps1")
Start-Sleep -Milliseconds 500

Launch "T3 - Next.js app"   (Join-Path $here "start-app.ps1")
Start-Sleep -Milliseconds 500

Launch "T4 - IoT oracle"    (Join-Path $here "start-oracle.ps1")

Write-Host "All 4 terminals launched." -ForegroundColor Green
Write-Host ""
Write-Host "Timeline:" -ForegroundColor White
Write-Host "  ~ 0 s   T1 starts the node"            -ForegroundColor DarkGray
Write-Host "  ~ 5 s   T2 deploys + seeds"            -ForegroundColor DarkGray
Write-Host "  ~12 s   T3 starts the dev server"      -ForegroundColor DarkGray
Write-Host "  ~18 s   T4 starts anchoring IoT data"  -ForegroundColor DarkGray
Write-Host "  ~25 s   open http://localhost:3000"    -ForegroundColor White
Write-Host ""
Write-Host "When done, run .\demo\stop-all.ps1 to kill everything." -ForegroundColor DarkGray
