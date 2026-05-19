# SETUP

How to run CargoChain locally on Windows, macOS, or Linux. Should take 5 – 10
minutes from a fresh clone to a fully running stack.

> **Fastest path:** see [`demo/README.md`](../demo/README.md) —
> a one-line `./demo/start-all.sh` opens 4 Git Bash tabs in one Windows Terminal
> window (or backgrounds the 4 processes on Linux/macOS) and starts the entire
> stack with timed delays. Skip to section 9 if you only want to run the tests.

---

## 1. Prerequisites

| Tool       | Version    | Why                            |
|------------|------------|--------------------------------|
| Node.js    | ≥ 20       | Hardhat and Next.js need it    |
| Git        | any recent | clone the repo                 |
| Browser    | Chromium-based or Firefox | run the front-end |
| MetaMask   | optional   | sign as a real wallet (otherwise the dev signer fallback kicks in) |

Check Node version:

```bash
node --version    # should print v20.x or higher
```

---

## 2. Clone & install dependencies

```bash
git clone https://github.com/y0c0ms/CargoChain.git
cd CargoChain

# Hardhat workspace (contracts + scripts + tests)
cd prototype
npm install

# Front-end workspace (separate package.json on purpose — keeps the dApp light)
cd app
npm install
cd ../..
```

The two installs together pull roughly 600 packages and take 1 – 3 minutes
on a typical laptop.

---

## 3. Configure environment

```bash
# In prototype/
cp .env.example .env

# In prototype/app/
cp .env.example .env.local
```

The defaults in both files are fine for local development. The contract
addresses in `prototype/app/.env.local` get filled in step 5.

---

## 4. Start the local blockchain

In one terminal:

```bash
cd prototype
npx hardhat node
```

This launches a local Ethereum node on `http://127.0.0.1:8545` with 20 funded
test accounts. Account #0 (`0xf39F…2266`) is the deterministic Hardhat
deployer and is used by the front-end's dev signer fallback.

Leave this terminal running.

---

## 5. Deploy contracts

In a second terminal:

```bash
cd prototype
npm run deploy:local
```

The script deploys 2 contracts — `PackageFactory` (which itself deploys the
`Package` implementation in its constructor) and `MerkleIoT` — and prints their
addresses. The default Hardhat account starts with nonce 0, so the addresses
are deterministic. The script also auto-writes `prototype/app/.env.local` so
the front-end picks them up without any manual copy step.

Expected output:

```
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
PackageFactory     : 0x5FbDB2315678afecb367f032d93F642f64180aa3
  Package impl     : 0x… (internal — deployed inside the factory's constructor; not called directly)
MerkleIoT          : 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

---

## 6. Seed demo state

Still in the second terminal:

```bash
npx hardhat run scripts/seed.ts --network localhost
```

This sets up five demo identities and one package:

| Hardhat # | Role     | Demo name      |
|-----------|----------|----------------|
| #0        | admin    | IATA           |
| #1        | carrier  | TAP Air Cargo  |
| #2        | shipper  | Pfizer         |
| #3        | carrier  | DHL Aviation   |
| #4        | receiver | MSF Luanda     |

After seeding:
- Demo package **#1** is created — Pfizer shipping HBL-2026-042 (Lisbon → Luanda).
  The factory spawns a dedicated `Package` clone for this shipment; `factory.packageOf(1)`
  returns its address.

You won't need to copy any addresses into the UI — the **AccountPicker
in the top-right of every dashboard** lets you pick which identity is signing
on the fly (no env edits, no restarts, no Hardhat console).

---

## 7. Start the front-end

In a third terminal:

```bash
cd prototype/app
npm run dev
```

Open <http://localhost:3000>. Four role-based dashboards are linked from the
home page:

| Path           | Role        | Action                                                         |
|----------------|-------------|----------------------------------------------------------------|
| `/shipper`     | Shipper     | Create a package (factory spawns a clone, manifest hash + URI) |
| `/carrier`     | Carrier     | Transfer custody (current-holder check enforced on-chain)      |
| `/simulation`  | Simulation  | Watch IoT batches anchor live + verify any reading on-chain    |
| `/regulator`   | Regulator   | Full audit trail for any package                               |

**Switching identities.** The picker in the top-right of every page lets you
pick which Hardhat account signs the next transaction. Click → choose
"Pfizer" / "TAP Air Cargo" / "DHL Aviation" / "MSF Luanda" / "IATA" → done.
The selection persists in `localStorage`, so you can refresh, navigate
between dashboards, or restart your browser without losing it.

If MetaMask is installed and connected, the UI uses MetaMask instead of the
picker. The picker is purely a no-wallet-extension demo affordance.

---

## 8. Run the IoT oracle simulator

In a fourth terminal:

```bash
cd prototype
MERKLE_ADDR=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 \
TOKEN_ID=1 \
npm run oracle:sim
```

The simulator emits a signed temperature/GPS reading once per second, batches
8 of them into a Merkle tree, anchors the root on-chain, **and writes the
batch (readings + per-leaf Merkle proofs) to**
`prototype/app/public/oracle-batches/batch-N.json`.

Open the Simulation dashboard, click **Start watching**, and within ~10 s
you'll see the first batch appear. Click **Load Readings** to see the 8 raw
readings, then **Verify** on any reading — the contract will recompute the
Merkle path and answer ✅ or ❌.

---

## 8b. Recommended end-to-end demo flow

Here's the cleanest "all four dashboards in 2 minutes" demo using the picker.
Package **#1** has already been created by `seed.ts` (Pfizer is the current
holder of its dedicated `Package` clone).

| # | Pick (top-right)  | Page         | What you do                                                              |
|---|-------------------|--------------|--------------------------------------------------------------------------|
| 1 | **Pfizer**        | `/carrier`   | Token=`1`, Recipient=TAP's address, Location=`PTLIS` → Transfer Custody |
| 2 | (any)             | `/simulation`| Token=`1`, Start watching, Load Readings → click **Verify** on a row    |
| 3 | **TAP Air Cargo** | `/carrier`   | Token=`1`, Recipient=DHL's address, Location=`LISBOA-FRA` → Transfer    |
| 4 | **DHL Aviation**  | `/carrier`   | Token=`1`, Recipient=MSF's address, Location=`AOLAD` → Transfer         |
| 5 | **MSF Luanda**    | `/carrier`   | Token=`1` → **Mark Delivered**                                          |
| 6 | (any)             | `/regulator` | Token=`1`, Run Audit → 3 hops, Status: Delivered, IoT batches anchored  |

You can grab each address from the AccountPicker dropdown — it's right there
in the entry for that role.

For a one-take recording, start the IoT oracle (step 8) before you begin so
batches are accumulating while you walk through hops 1 → 5.

---

## 9. Run the test suite

```bash
cd prototype
npx hardhat test
```

You should see:

```
  17 passing (~800ms)
```

Broken down by file:

| File                              | Cases | Purpose                                                                    |
|-----------------------------------|-------|----------------------------------------------------------------------------|
| `test/PackageFactory.test.ts`     | 6     | Happy path + clone isolation + initializer-lock safety                     |
| `test/Errors.test.ts`             | 5     | Custom-error selectors + on-chain triggers + dashboard decoder             |
| `test/E2E.test.ts`                | 1     | Full shipper → carrier → IoT → simulation → receiver → regulator flow      |
| `test/Security.test.ts`           | 5     | H-2 oracle allowlist (2) + H-3 Merkle integrity (2) + custody gate (1)     |

---

## 10. Troubleshooting

| Symptom                                            | Cause / Fix                                                |
|----------------------------------------------------|------------------------------------------------------------|
| `cannot connect to network localhost`              | The Hardhat node terminal isn't running. Start step 4.     |
| Carrier dashboard shows `NotCurrentHolder`         | You're signing as the wrong identity. Pick the *current* holder in the top-right picker (Run Regulator audit to see who holds it). |
| Simulation page shows "Batch JSON not found"       | The oracle simulator hasn't run yet. Start it (step 8).    |
| Port 3000 already in use                           | `lsof -i :3000` (or `netstat -ano | findstr 3000` on Windows) → kill or `PORT=3001 npm run dev` |
| Front-end says `NEXT_PUBLIC_FACTORY not set`       | `prototype/app/.env.local` is missing — re-run `npm run deploy:local` (it auto-writes the file). |
| MetaMask shows the wrong network                   | Add Hardhat network manually: RPC `http://127.0.0.1:8545`, chainId `31337` |

---

## 11. Where to read next

- [PROJECT_PLAN.md](PROJECT_PLAN.md) — scope, tech choices, deliverables
- [ARCHITECTURE.md](ARCHITECTURE.md) — layered system + contract details
- [SECURITY.md](SECURITY.md) — threat model + audit findings
- [USER_STORIES.md](USER_STORIES.md) — actor-goal stories with concept tags
- [TECH_MAPPING.md](TECH_MAPPING.md) — every T1-T6 concept → file matrix
- [CASE_STUDIES.md](CASE_STUDIES.md) — 14 industry case studies (6 failures, 8 survivors) with primary sources
