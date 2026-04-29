# =============================================================================
# Stop everything - kills demo processes AND closes the 4 terminal windows
# =============================================================================
# Two-pass cleanup:
#   1. Kill the actual servers by the ports they hold (8545, 3000)
#   2. Kill the oracle simulator (no port - matched by command line)
#   3. Close the PowerShell host windows themselves (matched by window title)
# =============================================================================

$ErrorActionPreference = "SilentlyContinue"

$ports = @{
    8545 = "Hardhat node"
    3000 = "Next.js dev server"
}

$windowTitlePrefixes = @("T1 -", "T2 -", "T3 -", "T4 -")

Write-Host ""
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "  Stopping CargoChain demo" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host ""

$killed = 0

# ---- 1. Kill server processes by port -----------------------------------
foreach ($port in $ports.Keys) {
    $name = $ports[$port]
    $pids = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique

    if (-not $pids) {
        Write-Host "  port $port ($name): nothing listening" -ForegroundColor DarkGray
        continue
    }

    foreach ($procId in $pids) {
        try {
            $proc = Get-Process -Id $procId -ErrorAction Stop
            Stop-Process -Id $procId -Force
            Write-Host "  port $port ($name): killed PID $procId ($($proc.ProcessName))" -ForegroundColor Green
            $killed++
        } catch {
            Write-Host "  port $port ($name): could not kill PID $procId" -ForegroundColor Red
        }
    }
}

# ---- 2. Kill the oracle simulator (no listening port) -------------------
$oracleProcs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match "oracle-simulator" }
foreach ($p in $oracleProcs) {
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "  oracle simulator: killed PID $($p.ProcessId)" -ForegroundColor Green
    $killed++
}

# ---- 3. Close the PowerShell host windows by title ----------------------
# Without this, -NoExit keeps the windows open after the inner process dies.
$myPid = $PID
$hostProcs = Get-Process -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Id -ne $myPid -and
        ($_.ProcessName -eq "powershell" -or $_.ProcessName -eq "pwsh") -and
        $_.MainWindowTitle
    }

foreach ($p in $hostProcs) {
    foreach ($prefix in $windowTitlePrefixes) {
        if ($p.MainWindowTitle.StartsWith($prefix)) {
            try {
                Stop-Process -Id $p.Id -Force -ErrorAction Stop
                Write-Host "  closed window: $($p.MainWindowTitle)" -ForegroundColor Green
                $killed++
            } catch {
                Write-Host "  could not close: $($p.MainWindowTitle)" -ForegroundColor Red
            }
            break
        }
    }
}

Write-Host ""
if ($killed -eq 0) {
    Write-Host "Nothing was running." -ForegroundColor DarkGray
} else {
    Write-Host "Stopped $killed item(s)." -ForegroundColor Green
}
Write-Host ""
