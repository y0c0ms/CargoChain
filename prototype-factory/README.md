# CargoChain Prototype — Factory Variant

Parallel implementation of the CargoChain core, using a **factory of EIP-1167
minimal-proxy clones** instead of a single mapping-based registry.

## Why this exists

The original `../prototype/` works fine and is what the dissertation describes.
This folder is a side-by-side comparison meant to address one concern: at very
high package counts and on future L2s with parallel execution, a single
registry contract becomes a serialization bottleneck because every custody
transfer mutates the same contract's storage.

The factory variant gives each package its own contract address, so
custody transfers on different packages touch disjoint storage and can run in
parallel.

## What's different

| Aspect                      | `prototype/` (mapping)                 | `prototype-factory/` (this folder)         |
| --------------------------- | -------------------------------------- | ------------------------------------------ |
| Storage layout              | `mapping(uint256 => Consignment)`      | One `Package` contract per package         |
| Per-package state           | A row in the registry                  | A whole contract instance                  |
| Create cost                 | ~80k gas (SSTOREs)                     | ~75k gas (EIP-1167 clone + initialize)     |
| Per-transfer cost           | Baseline                               | + ~2.5k gas (one extra CALL)               |
| Lookup by id                | `registry.consignments(id)`            | `factory.packageOf(id)` → call clone       |
| Parallel execution friendly | ❌ all writes contend                  | ✅ different addresses, no contention      |
| Blast radius of a bug       | All packages                           | One package                                |
| Naming                      | `Consignment` / `manifestHash` / `URI` | `Package` / `docsHash` / `docsURI`         |

## Layout

```
prototype-factory/
├── contracts/
│   ├── Package.sol         — per-package contract (implementation + clones)
│   ├── PackageFactory.sol  — spawns clones, keeps id → address directory
│   └── MerkleIoT.sol       — unchanged from prototype/ (shared design)
├── scripts/
│   └── deploy.ts           — deploys PackageFactory + MerkleIoT
├── test/
│   └── PackageFactory.test.ts
├── hardhat.config.ts
├── package.json
└── tsconfig.json
```

## Run

```bash
cd prototype-factory
npm install
npx hardhat node            # in one terminal
npm run deploy:local        # in another
npm test
```

## Notes

- Clones can't run constructors. `Package.initialize()` is guarded by
  `if (shipper != address(0)) revert AlreadyInitialized()` and can only be
  called once, right after the factory clones the implementation.
- The factory keeps both `packageOf[id] → address` and `idOf[address] → id`
  so other contracts (Escrow, MerkleIoT) can verify a given address really
  is a factory-spawned package.
- The `app/` frontend lives in `../prototype/app/` and currently targets the
  mapping variant. Migrating it is left for later — the contract API is the
  only thing that changes (every `registry.X(id, ...)` becomes
  `factory.packageOf(id) → Package(addr).X(...)`).
```
