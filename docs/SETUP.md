# SETUP

How to run CargoChain locally on Windows, macOS, or Linux. Should take 5 – 10
minutes from a fresh clone to a fully running stack.

> **Windows users:** for the fastest path, see [`demo/README.md`](../demo/README.md) —
> a one-line PowerShell command (`.\demo\start-all.ps1`) opens 4 terminals
> and starts the entire stack with timed delays. Skip to section 9 if you
> only want to run the tests.

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

The script deploys 4 contracts and prints their addresses. The default
Hardhat account starts with nonce 0, so the addresses are deterministic and
already match what `prototype/app/.env.local` expects.

Expected output:

```
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
DIDRegistry        : 0x5FbDB2315678afecb367f032d93F642f64180aa3
CarrierCredential  : 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
ConsignmentRegistry: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
MerkleIoT          : 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

For a public-chain deploy instead:

```bash
npm run deploy:sepolia   # Ethereum Sepolia testnet
```

(Requires `DEPLOYER_KEY` in `prototype/.env` and a small amount of testnet
ETH from a Sepolia faucet, e.g. <https://sepoliafaucet.com>.)

---

## 6. Seed demo state

Still in the second terminal:

```bash
npx hardhat run scripts/seed.ts --network localhost
```

This sets up five demo identities and one consignment:

| Hardhat # | Role     | Demo name      | Has LicensedCarrier VC? |
|-----------|----------|----------------|-------------------------|
| #0        | issuer   | IATA           | (issues VCs)            |
| #1        | carrier  | TAP Air Cargo  | yes                     |
| #2        | shipper  | Pfizer         | no (shippers don't need one) |
| #3        | carrier  | DHL Aviation   | yes                     |
| #4        | receiver | MSF Luanda     | yes (so it can take final custody) |

After seeding:
- Demo consignment **#1** is created — Pfizer shipping HBL-2026-042 (Lisbon → Luanda)
- All addresses are printed at the end of seed output for reference

You won't need to copy any of those addresses into the UI — the **AccountPicker
in the top-right of every dashboard** lets you pick which identity is signing
on the fly (no env edits, no restarts, no Hardhat console).

---

## 7. Start the front-end

In a third terminal:

```bash
cd prototype/app
npm run dev
```

Open <http://localhost:3000>. Five role-based dashboards are linked from the
home page:

| Path           | Role        | Action                                                         |
|----------------|-------------|----------------------------------------------------------------|
| `/shipper`     | Shipper     | Create a consignment (manifest hash + URI)                     |
| `/carrier`     | Carrier     | Transfer custody (recipient must hold a `LicensedCarrier` VC)  |
| `/customs`     | Customs     | Verify a Verifiable Credential by schema                       |
| `/simulation`  | Simulation  | Watch IoT batches anchor live + verify any reading on-chain    |
| `/regulator`   | Regulator   | Full audit trail for any consignment                           |

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
MERKLE_ADDR=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9 \
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

Here's the cleanest "all five dashboards in 2 minutes" demo using the picker.
Consignment **#1** has already been created by `seed.ts` (Pfizer is the
current custodian).

| # | Pick (top-right)  | Page         | What you do                                                              |
|---|-------------------|--------------|--------------------------------------------------------------------------|
| 1 | **Pfizer**        | `/carrier`   | Token=`1`, Recipient=TAP's address, Location=`PTLIS` → Transfer Custody |
| 2 | (any)             | `/customs`   | Subject=TAP's address, Schema=`LicensedCarrier` → **VALID ✓**           |
| 3 | (any)             | `/simulation`| Token=`1`, Start watching, Load Readings → click **Verify** on a row    |
| 4 | **TAP Air Cargo** | `/carrier`   | Token=`1`, Recipient=DHL's address, Location=`LISBOA-FRA` → Transfer    |
| 5 | **DHL Aviation**  | `/carrier`   | Token=`1`, Recipient=MSF's address, Location=`AOLAD` → Transfer         |
| 6 | **MSF Luanda**    | `/carrier`   | Token=`1` → **Mark Delivered**                                          |
| 7 | (any)             | `/regulator` | Token=`1`, Run Audit → 3 hops, Status: Delivered, IoT batches anchored  |

You can grab each address from the AccountPicker dropdown — it's right there
in the entry for that role.

For a one-take recording, start the IoT oracle (step 8) before you begin so
batches are accumulating while you walk through hops 1 → 6.

---

## 9. Run the test suite

```bash
cd prototype
npx hardhat test
```

You should see:

```
  15 passing (~700ms)
```

Broken down by file:

| File                         | Cases | Purpose                                                     |
|------------------------------|-------|-------------------------------------------------------------|
| `test/CargoChain.test.ts`    | 2     | Happy path: create, custody, deliver. Negative path on unlicensed recipient |
| `test/Errors.test.ts`        | 5     | Custom-error selectors + dashboard friendly-message decoder |
| `test/E2E.test.ts`           | 1     | Full shipper → carrier → customs → IoT → receiver → regulator flow with gas |
| `test/Security.test.ts`      | 7     | One regression per audit finding (H-1, H-2, H-3 IoT)        |

---

## 10. Troubleshooting

| Symptom                                            | Cause / Fix                                                |
|----------------------------------------------------|------------------------------------------------------------|
| `cannot connect to network localhost`              | The Hardhat node terminal isn't running. Start step 4.     |
| Carrier dashboard shows `NotCurrentCustodian`      | You're signing as the wrong identity. Pick the *current* custodian in the top-right picker (Run Regulator audit to see who holds it). |
| Carrier dashboard shows `RecipientNotLicensed`     | The recipient address has a DID but no VC. Use one of the seeded carrier addresses (TAP, DHL, MSF). |
| Carrier dashboard shows `RecipientNotActive`       | The recipient has no DID. Run `seed.ts` first.             |
| Simulation page shows "Batch JSON not found"       | The oracle simulator hasn't run yet. Start it (step 8).    |
| Port 3000 already in use                           | `lsof -i :3000` (or `netstat -ano | findstr 3000` on Windows) → kill or `PORT=3001 npm run dev` |
| Front-end says `NEXT_PUBLIC_REGISTRY not set`      | `prototype/app/.env.local` is missing the addresses. Re-run `npm run deploy:local` and copy the printed block. |
| MetaMask shows the wrong network                   | Add Hardhat network manually: RPC `http://127.0.0.1:8545`, chainId `31337` |
| Sepolia deploy times out                           | Public RPC can be flaky. Set `SEPOLIA_RPC` in `prototype/.env` to an Alchemy / Infura endpoint. |

---

## 11. Where to read next

- [PROJECT_PLAN.md](PROJECT_PLAN.md) — scope, tech choices, deliverables
- [ARCHITECTURE.md](ARCHITECTURE.md) — layered system + contract details
- [SECURITY.md](SECURITY.md) — threat model + audit findings
- [USER_STORIES.md](USER_STORIES.md) — actor-goal stories with concept tags
- [TECH_MAPPING.md](TECH_MAPPING.md) — every T1-T6 concept → file matrix
- [CASE_STUDIES.md](CASE_STUDIES.md) — 14 industry case studies (6 failures, 8 survivors) with primary sources
