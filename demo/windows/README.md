# Windows PowerShell demo scripts

The `*.sh` scripts in the parent `demo/` folder don't open separate terminal
windows on Windows — they just run in series in the current shell.

These PowerShell equivalents do the right thing: `start-all.ps1` launches each
component in its own new PowerShell window so you can see the logs from each
process side by side.

## Run

From the **repo root** (`CargoChain/`), in a regular PowerShell:

```powershell
.\demo\windows\start-all.ps1
```

Opens 4 windows in order:
1. **T1 — Hardhat node** (local blockchain on port 8545)
2. **T2 — Deploy + seed** (deploys contracts, seeds demo data, then exits)
3. **T3 — Next.js app** (dev server on http://localhost:3000)
4. **T4 — IoT oracle** (anchors Merkle batches every few seconds)

After ~25 s, open http://localhost:3000.

## Stop

```powershell
.\demo\windows\stop-all.ps1
```

Kills the demo processes by port and closes their terminal windows.

## Execution policy

If PowerShell refuses to run unsigned scripts:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
```

(Resets when you close the shell — no system-wide change.)
