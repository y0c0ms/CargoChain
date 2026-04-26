# SETUP

How to run CargoChain locally on Windows, macOS, or Linux. Should take 5 – 10
minutes from a fresh clone to a fully running stack.

---

## 1. Prerequisites

| Tool       | Version    | Why                                   |
|------------|------------|---------------------------------------|
| Node.js    | ≥ 20       | Hardhat, Next.js, snarkjs all need it |
| Git        | any recent | clone the repo                        |
| Browser    | Chromium-based or Firefox | run the front-end       |
| MetaMask   | optional   | sign as a real wallet (otherwise the dev signer fallback kicks in) |
| circom 2   | optional   | only if you want to (re)compile the ZK circuit |
| snarkjs    | optional   | only if you want to redo the trusted setup ceremony |

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

The two installs together pull in roughly 800 packages and take 2 – 4 minutes
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

The script prints the addresses of all deployed contracts. The default Hardhat
account starts with nonce 0, so the addresses are deterministic and already
match what `prototype/app/.env.local` expects. If you ever change the deploy
order, copy the printed `NEXT_PUBLIC_*` block into that file.

Expected output (truncated):

```
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
DIDRegistry: 0x5FbDB2315678afecb367f032d93F642f64180aa3
CarrierCredential: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
ConsignmentNFT: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
…
FreightEscrow: 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
```

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
5. Mints 1 000 000 FRT to the shipper account

You'll need the carrier address printed at the end for the Carrier dashboard:

```
Carrier address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
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

| Path          | Role       | Action                                                     |
|---------------|------------|------------------------------------------------------------|
| `/shipper`    | Shipper    | Mint a consignment NFT                                     |
| `/carrier`    | Carrier    | Take custody / hand off (recipient must hold a `LicensedCarrier` VC) |
| `/customs`    | Customs    | Verify a Verifiable Credential by schema                   |
| `/receiver`   | Receiver   | Inspect escrow + submit cold-chain ZK proof                |
| `/regulator`  | Regulator  | Full audit trail for any token                             |

If MetaMask is installed and connected, the UI uses it. Otherwise it falls
back to the dev signer (account #0). The badge on the Shipper dashboard says
`dev · 0xf39F…2266` in fallback mode.

---

## 8. (Optional) Run the IoT oracle simulator

In a fourth terminal:

```bash
cd prototype
MERKLE_ADDR=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9 \
TOKEN_ID=1 \
npm run oracle:sim
```

The simulator emits a signed temperature/GPS reading once per second, batches
8 of them into a Merkle tree, and anchors the root on-chain. After ~10 seconds
you'll have batch IDs to feed into the Receiver dashboard's "IoT Batch ID"
field.

---

## 9. Run the test suite

```bash
cd prototype
npx hardhat test
```

You should see:

```
  18 passing (1s)
```

Broken down by file:

| File                         | Cases | Purpose                                            |
|------------------------------|-------|----------------------------------------------------|
| `test/CargoChain.test.ts`    | 2     | Happy-path mint + custody; negative path on unlicensed recipient |
| `test/Errors.test.ts`        | 5     | Custom-error selectors + dashboard friendly-message decoder |
| `test/E2E.test.ts`           | 1     | Full shipper → carrier → customs → receiver → regulator flow with gas |
| `test/Security.test.ts`      | 10    | One regression per audit finding (H-1, H-2, H-3, H-4, M-2) |

---

## 10. (Optional) ZK circuit setup

The repo ships with a `MockZKVerifier` for fast iteration. To use the real
Groth16 verifier:

```bash
cd prototype

# Compile the circuit
npm run circuit:compile

# Trusted setup (Powers of Tau ceremony) — needs a phase-1 .ptau file
# Download from https://github.com/iden3/snarkjs#7-prepare-phase-2 once and cache
npm run circuit:setup

# Export the Solidity verifier
npm run circuit:verifier

# This overwrites contracts/ZKVerifier.sol — redeploy
npm run deploy:local
```

The escrow's H-3 binding (proof must reference an on-chain Merkle root for the
correct tokenId) works identically with either the mock or the real verifier,
so swapping is safe.

---

## 11. Troubleshooting

| Symptom                                        | Cause / Fix                                        |
|------------------------------------------------|----------------------------------------------------|
| `cannot connect to network localhost`          | The Hardhat node terminal isn't running. Start step 4. |
| Deploy reverts on `mcopy` not found            | Old Solidity. Compiler is pinned to 0.8.26 in `hardhat.config.ts` — re-run `npm install`. |
| Carrier dashboard shows `RecipientNotLicensed` | The recipient address has a DID but no VC. Use the address printed by `seed.ts` (account #1). |
| Receiver dashboard shows `BatchNotForThisShipment` | The IoT Batch ID belongs to a different tokenId — run the oracle for the right token. |
| Port 3000 already in use                       | `lsof -i :3000` (or `netstat -ano | findstr 3000` on Windows) → kill or `PORT=3001 npm run dev` |
| Front-end says `NEXT_PUBLIC_CONSIGNMENT not set` | `prototype/app/.env.local` is missing the addresses. Re-run `npm run deploy:local` and copy the printed block. |
| MetaMask shows the wrong network               | Add Hardhat network manually: RPC `http://127.0.0.1:8545`, chainId `31337` |

---

## 12. Where to read next

- [PROJECT_PLAN.md](PROJECT_PLAN.md) — scope, tech choices, deliverables
- [ARCHITECTURE.md](ARCHITECTURE.md) — layered system + contract details
- [SECURITY.md](SECURITY.md) — threat model + audit findings
- [USER_STORIES.md](USER_STORIES.md) — 18 stories with concept-map tags
- [TECH_MAPPING.md](TECH_MAPPING.md) — every T1-T6 concept → file matrix
