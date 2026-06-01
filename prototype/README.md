# CargoChain Prototype

Blockchain prototype for pharmaceutical supply-chain traceability, built around a
**factory of EIP-1167 minimal-proxy clones**. Each shipment gets its own contract
instance, so custody transfers on different shipments touch disjoint storage and
do not contend on a single registry.

## Design

`PackageFactory.sol` deploys one lightweight `Package.sol` clone per shipment and
keeps an `id -> address` directory. `MerkleIoT.sol` anchors IoT sensor batches as
32-byte Merkle roots so high-frequency readings never hit on-chain storage
directly. Only document hashes and Merkle roots live on-chain. The full transport
documents and raw readings stay off-chain.

## Contracts (`contracts/`)

- **PackageFactory.sol** spawns per-shipment clones. `create(docsHash, docsURI)`
  returns the new id and clone address. `requirePackage(id)` resolves an id to its
  clone address and reverts `NotAFactoryPackage` for an unknown id.
- **Package.sol** is the per-shipment state machine: `Created -> InTransit ->
  Delivered`. `transferCustody(to, location, proofOfHandshake)` and
  `markDelivered()` are restricted to the current holder (custom errors
  `NotCurrentHolder`, `AlreadyDelivered`, `InvalidRecipient`). Creation commits the
  keccak256 hash of the off-chain transport document.
- **MerkleIoT.sol** anchors batches with `anchorBatch(tokenId, root, ...)` from an
  approved-oracle allowlist (`NotOracle` otherwise) and verifies any single reading
  on-chain with `verifyReading(batchId, leaf, proof)` in O(log N).
- **benchmarks/NaiveIoT.sol** is benchmark-only and never deployed. It stores
  readings directly on-chain so `GasBenchmark.test.ts` can compare it against the
  Merkle-batching approach.

## Layout

```
prototype/
  contracts/
    Package.sol           per-shipment clone (implementation + clones)
    PackageFactory.sol    spawns clones, keeps the id -> address directory
    MerkleIoT.sol         IoT batch anchoring + on-chain verifyReading
    benchmarks/
      NaiveIoT.sol        benchmark-only baseline (never deployed)
  scripts/
    deploy.ts             deploys PackageFactory + MerkleIoT, writes app/.env.local
    seed.ts               approves the demo oracle, creates demo package #1
    oracle-simulator.ts   IoT oracle: signs and anchors Merkle batches
    make_gas_charts.py    regenerates the gas-benchmark charts in docs/
  test/                   25 tests (24 functional + 1 gas benchmark)
  app/                    Next.js dashboards (shipper, carrier, simulation, regulator)
  hardhat.config.ts
  package.json
```

## Run

Easiest path uses the launcher in `demo/` (opens node, deploy+seed, app and oracle):

```
# Windows
powershell -ExecutionPolicy Bypass -File .\demo\start-all.ps1
# Git Bash / Linux / macOS
./demo/start-all.sh
```

Then open http://localhost:3000 after ~25 seconds. Stop with `demo/stop-all`.

Manual, step by step:

```
npm install
npm run node                 # terminal 1: local Hardhat chain
npm run deploy:local         # terminal 2: deploy contracts, write app/.env.local
npx hardhat run scripts/seed.ts --network localhost
cd app && npm install && npm run dev   # terminal 3: Next.js dashboards
```

## Tests

```
npm test
```

25 tests pass across `PackageFactory`, `Package` (lifecycle and errors), `MerkleIoT`
(anchoring and proof verification), an end-to-end multi-actor flow, a security
suite (unauthorized-oracle and tampered-proof rejection), and a gas benchmark.

## Gas benchmark

For a 5-hour trip at one reading per minute (300 readings), anchoring 10-reading
Merkle batches costs about 4.5M gas, against 13.9M for one big on-chain transaction
and 22.1M for one transaction per reading. Regenerate the charts with
`python prototype/scripts/make_gas_charts.py` (needs `pip install matplotlib numpy`).

## Notes

- Clones cannot run constructors. `Package` is initialized once right after the
  factory clones the implementation, guarded against re-initialization.
- The frontend resolves a shipment with `factory.requirePackage(id)` and then calls
  the clone directly, so an unknown id surfaces a readable `NotAFactoryPackage`
  error instead of a silent zero address.
- The oracle simulator signs each Merkle root with an m-of-n Ed25519 quorum before
  `anchorBatch`, so a single compromised key cannot inject readings.
