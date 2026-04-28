# SETUP

How to run CargoChain locally on Windows, macOS, or Linux. Should take 5 – 10
minutes from a fresh clone to a fully running stack.

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

This:

1. Registers DIDs for the deployer + carrier + shipper Hardhat accounts
2. Approves the deployer as a `LicensedCarrier` issuer (audit fix H-1)
3. Issues a `LicensedCarrier` Verifiable Credential to account #1 (carrier)
4. Approves the deployer as an IoT oracle (audit fix H-2)
5. Creates demo consignment #1 (signed by the shipper — no operator gating)

You'll need the carrier address printed at the end for the Carrier dashboard:

```
Carrier address : 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

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

If MetaMask is installed and connected, the UI uses it. Otherwise it falls
back to the dev signer (account #0). The badge on the Shipper dashboard says
`dev · 0xf39F…2266` in fallback mode.

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
| Carrier dashboard shows `RecipientNotLicensed`     | The recipient address has a DID but no VC. Use the address printed by `seed.ts` (account #1). |
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
