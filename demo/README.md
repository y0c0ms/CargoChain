# Demo scripts (Git Bash / Linux / macOS)

One-click launchers for the full CargoChain demo stack.

## TL;DR

```bash
./demo/start-all.sh
```

Wait ~25 seconds, then open <http://localhost:3000>.

When you're done:

```bash
./demo/stop-all.sh
```

## What `start-all.sh` does

Auto-detects the platform:

- **Windows + Git Bash** — opens **one Windows Terminal window with 4 tabs**
  (T1 node, T2 deploy/seed, T3 app, T4 oracle), one Git Bash shell per tab.
  Requires Windows Terminal (`wt.exe`) — preinstalled on Windows 11; on Windows 10
  install it from the Microsoft Store ("Windows Terminal").
- **Linux / macOS** — backgrounds all four processes and logs each to `../logs/`.

## What each script does

| Script              | Tab / job | Purpose                                                                 |
|---------------------|-----------|-------------------------------------------------------------------------|
| `start-node.sh`     | T1        | Hardhat local blockchain on `127.0.0.1:8545`                            |
| `deploy-seed.sh`    | T2        | Waits for the node, deploys 2 contracts (PackageFactory + MerkleIoT), runs `seed.ts` |
| `start-app.sh`      | T3        | Next.js dev server on `localhost:3000` (12 s delay so contracts land first) |
| `start-oracle.sh`   | T4        | IoT oracle simulator targeting package `#1` (18 s delay)                |
| `start-all.sh`      | (master)  | Cross-platform orchestrator — Windows Terminal tabs or background       |
| `stop-all.sh`       | —         | Kills processes on ports 8545 + 3000 plus the oracle simulator          |

## Running individually

If you want manual control:

```bash
# Window/tab 1:
./demo/start-node.sh

# Window/tab 2 (after the node is up):
./demo/deploy-seed.sh

# Window/tab 3:
./demo/start-app.sh

# Window/tab 4 (optional — only if you want live IoT batches):
./demo/start-oracle.sh
```

## Pointing the oracle at a different package

By default the oracle anchors batches for package `#1` (the one `seed.ts` creates).
To target a different one (e.g. `#2` after you've created another via the Shipper
dashboard):

```bash
TOKEN_ID=2 ./demo/start-oracle.sh
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| T2 says "Hardhat node didn't come up" | T1 isn't running, or `npx hardhat node` errored. Check T1's tab. |
| T3 starts but shows blank pages | Wait — the dev server takes 5–10 s to compile on first load. |
| `/simulation` says "No batches anchored" | T4 isn't running, or it's pointing at a different `TOKEN_ID`. |
| Port 3000 / 8545 already in use | Run `./demo/stop-all.sh` first, then `./demo/start-all.sh`. |
| Want clean state | `stop-all.sh`, then `start-all.sh` — Hardhat node always starts fresh. |
| `wt.exe: command not found` (Windows) | Install Windows Terminal from the Microsoft Store, or run the four `*.sh` files in separate Git Bash windows manually. |

## Where the addresses come from

The contract addresses are deterministic because the Hardhat node always uses
deployer account `#0` with nonce `0`, so each deploy produces the same addresses:

| Contract        | Address                                       |
|-----------------|-----------------------------------------------|
| PackageFactory  | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| MerkleIoT       | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |

That's why `start-oracle.sh` can hard-code `MERKLE_ADDR` and
`prototype/app/.env.local` is auto-written by `deploy.ts`.

If you ever change the deployment order in `prototype/scripts/deploy.ts`, update
the `MERKLE_ADDR` default in `start-oracle.sh`.
