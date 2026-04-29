# Demo scripts (PowerShell)

One-click launchers for the full CargoChain demo stack on Windows.

## TL;DR

```powershell
# From the repo root, in a PowerShell window:
.\demo\start-all.ps1
```

Wait ~25 seconds, then open <http://localhost:3000>.

When you're done:

```powershell
.\demo\stop-all.ps1
```

## What each script does

| Script              | Terminal | Purpose                                                           |
|---------------------|----------|-------------------------------------------------------------------|
| `start-node.ps1`    | T1       | Hardhat local blockchain on `127.0.0.1:8545`                      |
| `deploy-seed.ps1`   | T2       | Waits for the node, deploys 4 contracts, runs `seed.ts`           |
| `start-app.ps1`     | T3       | Next.js dev server on `localhost:3000` (12 s delay so contracts are deployed first) |
| `start-oracle.ps1`  | T4       | IoT oracle simulator pointing at consignment #1 (18 s delay)      |
| `start-all.ps1`     | (master) | Opens 4 PowerShell windows and runs each of the above             |
| `stop-all.ps1`      | —        | Kills the processes on ports 8545, 3000, plus any oracle processes |

## Running individually

If you want manual control over which terminals are open:

```powershell
# In window 1:
.\demo\start-node.ps1

# In window 2 (after the node is up):
.\demo\deploy-seed.ps1

# In window 3:
.\demo\start-app.ps1

# In window 4 (optional, only if you want live IoT batches):
.\demo\start-oracle.ps1
```

## Pointing the oracle at a different consignment

By default the oracle anchors batches for consignment `#1` (the one created by
`seed.ts`). To target a different one (e.g. `#2` if you've created another via
the Shipper dashboard):

```powershell
$env:TOKEN_ID = "2"
.\demo\start-oracle.ps1
```

## PowerShell execution policy

If PowerShell refuses to run the scripts with an error like
*"running scripts is disabled on this system"*, do **one** of these:

**Option A — bypass for this session only (recommended):**
```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\demo\start-all.ps1
```

**Option B — bypass per-invocation:**
```powershell
powershell -ExecutionPolicy Bypass -File .\demo\start-all.ps1
```

**Option C — change permanently for your user (less safe, but persistent):**
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

The orchestrator (`start-all.ps1`) already passes `-ExecutionPolicy Bypass`
when it launches the four child windows, so you only need to deal with the
policy once at the top level.

## Troubleshooting

| Symptom | Fix |
|---|---|
| T2 says "Hardhat node didn't come up" | T1 isn't running, or `npx hardhat node` errored. Check T1's window. |
| T3 starts but shows blank pages | Wait — the dev server takes 5-10 s to compile on first load. |
| `/simulation` says "No batches anchored" | T4 isn't running, or it's pointing at a different `TOKEN_ID`. |
| Port 3000 / 8545 already in use | Run `.\demo\stop-all.ps1` first, then `.\demo\start-all.ps1`. |
| Want clean state | Run `stop-all.ps1`, then re-run `start-all.ps1` — Hardhat node always starts fresh. |

## Where the addresses come from

The contract addresses are deterministic because the Hardhat node always uses
deployer account `#0` with nonce `0`, so each deploy produces the same 4
addresses. That's why `start-oracle.ps1` can hard-code `MERKLE_ADDR` and
`prototype/app/.env.local` doesn't need rewriting between runs.

If you ever change the deployment order in `scripts/deploy.ts`, update both
`prototype/app/.env.local` and the `MERKLE_ADDR` in `start-oracle.ps1`.
