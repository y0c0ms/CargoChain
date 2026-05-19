# scripts/

Three TypeScript scripts power the CargoChain backend: deploy, seed, and IoT oracle.
All run via Hardhat (`npx hardhat run`) or as standalone Node.js processes.

---

## deploy.ts

Deploys the two root contracts and auto-writes the frontend environment file.

```bash
npm run deploy:local
# or: npx hardhat run scripts/deploy.ts --network localhost
```

**What it does:**
1. Deploys `PackageFactory` — the constructor internally deploys the `Package`
   implementation and records its address in `factory.implementation`
2. Deploys `MerkleIoT` — deployer becomes the oracle allowlist owner
3. Writes `prototype/app/.env.local` automatically with the contract addresses:
   ```
   NEXT_PUBLIC_RPC=http://127.0.0.1:8545
   NEXT_PUBLIC_CHAIN_ID=31337
   NEXT_PUBLIC_FACTORY=0x...
   NEXT_PUBLIC_MERKLE=0x...
   ```

**Deterministic addresses** (Hardhat account #0, nonces 0 and 1):
```
PackageFactory : 0x5FbDB2315678afecb367f032d93F642f64180aa3
MerkleIoT      : 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

---

## seed.ts

Seeds demo state after deploy: creates identities, a package, and starts
custody transfers so all dashboards show something meaningful.

```bash
npx hardhat run scripts/seed.ts --network localhost
```

**Hardhat accounts used:**

| Account # | Role | Demo Identity |
|-----------|------|--------------|
| #0 | Admin / IATA | `0xf39F…2266` |
| #1 | Carrier A | TAP Air Cargo |
| #2 | Shipper | Pfizer |
| #3 | Carrier B | DHL Aviation |
| #4 | Receiver | MSF Luanda |

**What it seeds:**
- Package #1: Pfizer ships `HBL-2026-042` (Lisbon → Luanda)
  - `docsHash = keccak256("docs-HBL-2026-042")`
  - `docsURI = "ipfs://docs/1"` (placeholder — hash is the source of truth)
- Approves the Hardhat deployer (#0) as an oracle in `MerkleIoT`
- Package is left with Pfizer as `currentHolder` so the demo starts from the
  Shipper dashboard handing off to TAP

---

## oracle-simulator.ts

Simulates an IoT sensor oracle: generates readings, batches them into a Merkle
tree, anchors the root on-chain, and writes the batch JSON for the Simulation
dashboard.

```bash
MERKLE_ADDR=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 TOKEN_ID=1 npm run oracle:sim
```

**Configuration (environment variables):**

| Variable | Default | Description |
|----------|---------|-------------|
| `MERKLE_ADDR` | `0x000…` | Address of deployed `MerkleIoT` contract |
| `TOKEN_ID` | `1` | Package ID to associate readings with |
| `RPC` | `http://127.0.0.1:8545` | Hardhat node RPC |
| `PK` | Hardhat account #0 key | Private key of an approved oracle |

**What it does (per cycle):**
1. Generates a reading every 1 second: `{ ts, tempTenthsC, gpsHash }`
   - Temperature: random around 4.5°C (cold chain simulation)
   - GPS: keccak256 of a location string (off-chain; hash on-chain only)
2. After every `BATCH_SIZE=8` readings:
   - Builds a Merkle tree (`keccak256` leaves, sorted-pair parent nodes)
   - Signs the root with Ed25519 (3 oracle signers, m-of-n simulation)
   - Calls `MerkleIoT.anchorBatch(tokenId, root, count, firstTs, lastTs)`
   - Writes `prototype/app/public/oracle-batches/batch-<id>.json`:
     ```json
     {
       "batchId": 1,
       "tokenId": 1,
       "merkleRoot": "0x...",
       "readings": [...],
       "proofs": { "0": ["0x...", ...], "1": [...] }
     }
     ```

**Merkle leaf encoding** (matches `verifyReading` on-chain):
```
leaf = keccak256(abi.encodePacked(uint64 ts, int16 tempTenthsC, bytes32 gpsHash))
```

**Concept-map nodes exercised:**
Oracle · Ed25519 · Non-repudiation · Merkle Tree · Hash Function · Scaling (off-chain batching) · Data Integrity

---

## Running all scripts together

The `demo/` orchestration scripts handle timing automatically:

```bash
# Terminal 1
npx hardhat node

# Terminal 2 (after node is ready)
npm run deploy:local
npx hardhat run scripts/seed.ts --network localhost

# Terminal 3
cd app && npm run dev

# Terminal 4
MERKLE_ADDR=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 TOKEN_ID=1 npm run oracle:sim
```

Or use `bash ./demo/start-all.sh` to run all four in one command.
