# contracts/

Three Solidity contracts implement the CargoChain on-chain logic.
All use Solidity `^0.8.24` with the OpenZeppelin library.

---

## Contract Overview

| Contract | Pattern | Gas per deploy | Purpose |
|----------|---------|---------------|---------|
| `PackageFactory.sol` | Factory (EIP-1167) | ~450k (once) | Spawns one Package clone per shipment |
| `Package.sol` | EIP-1167 clone / proxy | ~45k per clone | Per-shipment state + custody history |
| `MerkleIoT.sol` | Ownable2Step | ~600k (once) | Anchors IoT Merkle roots; proves individual readings |

---

## PackageFactory.sol

**Deploys the `Package` implementation once** in its constructor, then spawns an
EIP-1167 minimal proxy (clone) for every new shipment.

```
PackageFactory.create(docsHash, docsURI)
  → Clones.clone(implementation)       // ~45k gas
  → Package.initialize(factory, shipper, docsHash, docsURI)
  → packageOf[id] = cloneAddr
  → idOf[cloneAddr] = id
  → emit PackageCreated(id, cloneAddr, shipper, docsHash, docsURI)
```

Key points:
- `implementation` is `immutable` — set once, never changed
- `requirePackage(id)` resolves an id → clone address and reverts `NotAFactoryPackage` for any unregistered id. It is the id-validity guard the frontend uses on every lookup (`carrier.tsx`, `regulator.tsx`) and is covered by `test/Errors.test.ts`. Wiring it as a cross-check inside `MerkleIoT.anchorBatch` is left out of scope.
- Each clone delegates all calls to the single implementation via `delegatecall`
- Two-directional lookup: `packageOf(id)` and `idOf(address)`

---

## Package.sol

One deployed contract per shipment (each clone has its own storage). Manages
the custody state machine and handover history.

**State machine:**

```
Created (0) ──── transferCustody() ──►  InTransit (1) ──── markDelivered() ──► Delivered (2)
                                            │
                                    (future: dispute logic)
                                            ▼
                                       Disputed (3)
```

**Key functions:**

| Function | Who can call | Description |
|----------|-------------|-------------|
| `initialize(factory, shipper, docsHash, docsURI)` | Factory only (once) | Sets up the clone; `initializer` modifier prevents re-initialization |
| `transferCustody(to, locationUnLocode, proofOfHandshake)` | `currentHolder` only | Moves custody; first call flips status to `InTransit` |
| `markDelivered()` | `currentHolder` only | Locks the package; no more transfers |
| `historyOf()` | Anyone | Returns full `Handover[]` array |
| `hopCount()` | Anyone | Returns number of custody transfers |

**`Handover` struct:**

```solidity
struct Handover {
    address from;
    address to;
    uint64  timestamp;
    string  locationUnLocode;  // e.g. "PTLIS" = Lisbon, "AOLAD" = Luanda
    bytes32 proofOfHandshake;  // keccak256(QR nonce both parties scanned)
}
```

**Custom errors** (gas-efficient, used in dashboard error decoder):
- `NotCurrentHolder()` — `msg.sender` is not the current package holder
- `AlreadyDelivered()` — package is locked, no more transfers
- `InvalidRecipient()` — `to == address(0)`, would lock the package forever

---

## MerkleIoT.sol

Anchors batches of off-chain IoT sensor readings. Only a 32-byte Merkle root
is stored on-chain; individual readings are proved via a Merkle path.

**Gas comparison:**

| Approach | Gas per reading (approx.) | Cost at 10 gwei |
|----------|--------------------------|----------------|
| Store each reading on-chain | ~20,000 | ~0.0002 ETH |
| Merkle root (8 readings/batch) | ~2,500 per reading | ~0.000025 ETH |
| **Reduction** | **~87%** | |

**Key functions:**

| Function | Who can call | Description |
|----------|-------------|-------------|
| `setApprovedOracle(oracle, approved)` | `onlyOwner` | Add/remove oracle addresses from the allowlist |
| `anchorBatch(tokenId, merkleRoot, readingCount, firstTs, lastTs)` | Approved oracles only | Stores one `Batch` on-chain; returns `batchId` |
| `verifyReading(batchId, leaf, proof[])` | Anyone | Returns `true` if `leaf` is in the Merkle tree for that batch (uses OZ `MerkleProof.sol`) |

**`Batch` struct:**

```solidity
struct Batch {
    uint256 tokenId;       // which package this batch belongs to
    bytes32 merkleRoot;    // root of the reading Merkle tree
    uint32  readingCount;  // how many leaves (e.g. 8)
    uint64  firstTs;       // timestamp of first reading
    uint64  lastTs;        // timestamp of last reading
    address submitter;     // which oracle submitted (forensic trail)
}
```

**Security model:** `approvedOracle` mapping gates `anchorBatch()`. Without this,
any address could inject false readings. The owner (deployer) manages the
allowlist; in production, this would be a multisig of trusted sensor gateway
operators.

---

## OpenZeppelin Dependencies

| OZ Contract | Used by | Purpose |
|-------------|---------|---------|
| `Clones.sol` | `PackageFactory` | EIP-1167 minimal proxy deployment |
| `Initializable.sol` | `Package` | Prevents double-initialization of clones |
| `Ownable2Step.sol` | `MerkleIoT` | Two-step ownership transfer |
| `MerkleProof.sol` | `MerkleIoT` | On-chain Merkle path verification |

---

## Deployment Order

```
1. PackageFactory  →  deploys Package implementation internally
2. MerkleIoT       →  deployer becomes owner; add oracle with setApprovedOracle()
```

The `deploy.ts` script handles both and auto-writes `app/.env.local`.
