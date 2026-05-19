# test/

Five Hardhat/Mocha test files covering the full CargoChain contract surface.

```bash
cd prototype && npx hardhat test
# 17 passing (~800ms)
```

---

## Test Files

### PackageFactory.test.ts — 6 cases

Tests the factory-of-clones design end-to-end.

| Case | Description |
|------|-------------|
| Happy path | Spawns a Package clone, transfers custody through 2 carriers, marks delivered |
| Clone isolation | Two packages have different addresses; state in one does not affect the other |
| Initializer lock | Calling `initialize()` on an already-initialised clone reverts with `InvalidInitialization` |
| Factory reverse lookup | `idOf(cloneAddr)` returns the correct package ID |
| `requirePackage` | Reverts `NotAFactoryPackage` for a random address not created by the factory |
| Zero-address guard | `transferCustody(address(0), ...)` reverts `InvalidRecipient` |

**Concept-map nodes:** Smart Contracts · Factory Pattern · EIP-1167 · Custody · State Machine · Immutability · Events

---

### Errors.test.ts — 5 cases

Validates every custom error selector so the frontend decoder (`lib/errors.ts`) stays
in sync with the contracts.

| Case | Error tested |
|------|-------------|
| `NotCurrentHolder` | Triggered by wrong account calling `transferCustody` |
| `AlreadyDelivered` | Triggered by calling `transferCustody` on a delivered package |
| `InvalidRecipient` | Triggered by passing `address(0)` as recipient |
| `NotOracle` | Triggered by a non-approved address calling `MerkleIoT.anchorBatch` |
| `NotAFactoryPackage` | Triggered by `requirePackage(id)` for an unregistered id |

---

### E2E.test.ts — 1 case

Full end-to-end flow through all five roles, including gas measurements.

```
Factory.create()           → [Pfizer] creates Package #1
Package.transferCustody()  → [Pfizer → TAP Air Cargo]   (PTLIS)
Package.transferCustody()  → [TAP → DHL Aviation]        (PTLIS-FRA)
MerkleIoT.anchorBatch()    → oracle anchors 8-reading batch
MerkleIoT.verifyReading()  → verify any leaf returns true
Package.markDelivered()    → [MSF Luanda] marks delivered
historyOf()                → returns all 3 handover entries
hopCount()                 → returns 3
```

**Gas measurements logged:**

| Operation | Approx. gas |
|-----------|------------|
| `PackageFactory.create()` | ~155k |
| `Package.transferCustody()` | ~80k |
| `MerkleIoT.anchorBatch()` | ~148k |
| `Package.markDelivered()` | ~40k |

---

### Security.test.ts — 5 cases

Regression tests for the three security findings from the audit.

| Case | Finding | What it tests |
|------|---------|--------------|
| H-2 (oracle allowlist) | Non-approved oracle cannot anchor | `anchorBatch()` reverts `NotOracle` for a random address |
| H-2 (oracle allowlist) | Approved oracle can anchor after `setApprovedOracle()` | Happy path after allowlisting |
| H-3 (Merkle integrity) | Valid reading verifies `true` | `verifyReading()` with correct proof returns `true` |
| H-3 (Merkle integrity) | Tampered reading verifies `false` | `verifyReading()` with wrong leaf returns `false` |
| Custody gate | Non-holder cannot transfer custody | `NotCurrentHolder` regression |

See [docs/SECURITY.md](../../docs/SECURITY.md) for the full threat model and audit findings.

---

### MerkleIoT.test.ts

Additional unit tests for the `MerkleIoT` contract in isolation:

- `anchorBatch` stores batch correctly and emits `BatchAnchored`
- `_batchesByToken` index is populated correctly per token
- Multi-batch: two batches for the same token both appear in the index
- `verifyReading` correctly validates leaves for various batch sizes

---

## Running Individual Files

```bash
npx hardhat test test/PackageFactory.test.ts
npx hardhat test test/Security.test.ts
npx hardhat test test/E2E.test.ts
```

## Gas Report

Gas reporting is enabled in `hardhat.config.ts` (`gasReporter: { enabled: true, currency: "EUR" }`).
Run `npx hardhat test` to see the full table; the E2E test logs the most
representative real-world gas costs.
