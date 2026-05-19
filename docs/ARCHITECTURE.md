# ARCHITECTURE — CargoChain

System architecture, layer-by-layer, mapped to the **Blockchain Reference
Architecture (Abed et al. 2023)** presented in T2.

The architecture was simplified after the case-study evidence in
[CASE_STUDIES.md](CASE_STUDIES.md) showed that every major permissioned-chain
logistics platform (TradeLens, we.trade, Marco Polo, Contour, B3i) failed
between 2022 and 2023. Payment, ZK escrow, the ERC-721 token wrapper, and the
DID/VC contracts were dropped — they added complexity without addressing
the actual course material. The system was subsequently migrated from a
single-mapping registry to a **factory-of-clones design** (EIP-1167 minimal proxies):
each shipment now has its own on-chain contract address, eliminating cross-shipment
state pollution and enabling address-level isolation.

---

## 1. High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│  APPLICATION LAYER  (Next.js 14 · React · ethers.js · Tailwind)      │
│                                                                      │
│   ┌────────┐  ┌────────┐  ┌──────────┐  ┌─────────┐                 │
│   │Shipper │  │Carrier │  │Simulation│  │Regulator│                 │
│   │  UI    │  │  UI    │  │   UI     │  │   UI    │                 │
│   └───┬────┘  └───┬────┘  └────┬─────┘  └────┬────┘                 │
│       └───────────┴────────────┴─────────────┘                      │
│                              │                                       │
├──────────────────────────────┼───────────────────────────────────────┤
│  MODELLING LAYER             │                                       │
│     Flows: Create → TransferCustody → AnchorIoTBatch                 │
│            → VerifyReading → MarkDelivered                           │
│                                                                      │
│     State machine: Created → InTransit → Delivered (/ Disputed)      │
├──────────────────────────────────────────────────────────────────────┤
│  CONTRACT LAYER  (3 Solidity contracts + OpenZeppelin)               │
│                                                                      │
│  ┌──────────────────────┐   ┌────────────────────┐                   │
│  │  PackageFactory      │   │   MerkleIoT         │                  │
│  │  (EIP-1167 spawner)  │──►│  (anchor + verify)  │                  │
│  └──────────┬───────────┘   └────────────────────┘                   │
│             │ Clones.clone()                                         │
│             ▼                                                        │
│  ┌──────────────────────┐                                            │
│  │  Package             │  (one contract address per shipment)       │
│  │  (state + history)   │                                            │
│  └──────────────────────┘                                            │
├──────────────────────────────────────────────────────────────────────┤
│  DATA LAYER                                                          │
│   ┌─────────────────────────────────────────────────────┐            │
│   │         BLOCKS / TRANSACTIONS / STATE               │            │
│   │  (keccak256 tx merkle root per block)               │            │
│   └─────────────────────────────────────────────────────┘            │
├──────────────────────────────────────────────────────────────────────┤
│  NETWORK LAYER                                                       │
│   Local Hardhat (dev): instant blocks, deterministic accounts         │
│   EVM-compatible → deploy to Sepolia / mainnet / Polygon             │
│   by changing RPC only; no contract changes required                 │
└──────────────────────────────────────────────────────────────────────┘

    OFF-CHAIN SIDECARS (not in reference architecture layering)
  ┌────────────────────────────┐    ┌────────────────────────────────┐
  │ IoT Oracle Simulator       │    │ Manifest JSON (IPFS / HTTPS)   │
  │ (Node.js · Ed25519 signs)  │    │ hashed on-chain, fetched on UI │
  └────────────────────────────┘    └────────────────────────────────┘
```

---

## 2. Smart-Contract Details

### 2.1 `PackageFactory.sol`

Deploys the `Package` implementation contract once in its constructor, then
spawns one **EIP-1167 minimal proxy (clone)** per shipment via `create()`.

- **Gas cost per new package:** ~45k (clone) + ~30k (initialize) — far cheaper
  than deploying a full contract per shipment
- `packageOf(id)` → clone address; `idOf(clone)` → id (reverse lookup)
- `requirePackage(id)` — view used by downstream contracts (e.g. `MerkleIoT`)
  to reject forged addresses
- `implementation` is `immutable` — set once in constructor, cannot be changed
- Emits `PackageCreated(id, package, shipper, docsHash, docsURI)`

**Academic basis:** EIP-1167 minimal proxy pattern (OpenZeppelin `Clones.sol`).
The factory-of-clones design ensures address-level isolation of shipment state,
preventing cross-shipment storage collisions present in the earlier
single-mapping registry design.

### 2.2 `Package.sol`

One contract instance per shipment (deployed as an EIP-1167 clone). Implements
the custody state machine:

- `Status` enum: `Created (0) → InTransit (1) → Delivered (2) / Disputed (3)`
- Stores per-shipment: `shipper`, `currentHolder`, `status`, `docsHash`,
  `docsURI`, `createdAt`
- `Handover[]` log: each entry records `from`, `to`, `timestamp`,
  `locationUnLocode` (UN/LOCODE string, e.g. `"PTLIS"` for Lisbon), and
  `proofOfHandshake` (keccak256 of a QR/nonce both parties agreed on)
- `transferCustody(to, location, handshakeHash)` — only `currentHolder` can
  call; reverts `NotCurrentHolder` if not; reverts `AlreadyDelivered` if done
- `markDelivered()` — called by the final recipient to lock the package
- `historyOf()` / `hopCount()` — read helpers for the Regulator dashboard

**Academic basis:** Bilateral custody transfer pattern from Musamih et al. (2021,
IEEE Access, ~324 citations): the receiver must explicitly confirm, preventing
disputes when cargo is damaged or missing in transit.

> **Production extension:** `transferCustody()` would also validate `to` against
> a DID registry and require a Licensed Carrier Verifiable Credential (GDP licence).
> Omitted from this prototype per scope constraints — see SECURITY.md.

### 2.3 `MerkleIoT.sol`

Anchors batches of off-chain IoT readings as Merkle roots. Saves ~99% of gas
vs. writing every reading on-chain; individual readings are proved off-chain.

- `approvedOracle` allowlist — only whitelisted oracle addresses can call
  `anchorBatch()` (H-2 security fix; see SECURITY.md)
- `anchorBatch(tokenId, merkleRoot, readingCount, firstTs, lastTs)` — writes
  one `Batch` struct on-chain per call
- `verifyReading(batchId, leaf, proof[])` — **anyone** can call; the contract
  recomputes the Merkle path using OZ `MerkleProof.sol` and returns `true/false`
- `setApprovedOracle(oracle, approved)` — `onlyOwner` (deployer)
- `Ownable2Step` from OpenZeppelin: two-step ownership transfer to prevent
  accidental renouncement

**Academic basis:** Merkle batching pattern from Fernández-Iglesias et al. (2024,
IEEE Access): 64–75% gas reduction vs. on-chain storage, with per-reading
verifiability retained via O(log N) Merkle proofs.

---

## 3. Custody Transfer Flow

```
Shipper calls PackageFactory.create(docsHash, docsURI)
  → Factory deploys EIP-1167 clone, calls Package.initialize(factory, shipper, ...)
  → Factory records packageOf[id] = cloneAddr; idOf[cloneAddr] = id
  → Emits PackageCreated(id, cloneAddr, shipper, docsHash, docsURI)

Current holder calls Package.transferCustody(to, locationUnLocode, proofOfHandshake)
  → Checks msg.sender == currentHolder (reverts NotCurrentHolder otherwise)
  → Checks status != Delivered (reverts AlreadyDelivered otherwise)
  → Checks to != address(0) (reverts InvalidRecipient otherwise)
  → Updates currentHolder = to
  → If status == Created: sets status = InTransit, emits StatusChanged
  → Appends Handover to _history[]
  → Emits CustodyTransferred(from, to, locationUnLocode, proofOfHandshake)

Final recipient calls Package.markDelivered()
  → Checks msg.sender == currentHolder
  → Sets status = Delivered, emits StatusChanged
```

---

## 4. IoT Oracle + Merkle Verification Pattern

```
┌──────────────┐  1 reading/sec   ┌────────────────────────────┐
│ IoT sensor   │ ────────────────►│ oracle-simulator.ts        │
│ (simulated)  │  {ts, temp, gps} │ (Ed25519 signing · Node.js)│
└──────────────┘                  └──────────┬─────────────────┘
                                             │ every 8 readings
                                  build Merkle tree
                                             │
                                   merkleRoot (bytes32)
                                             ▼
                              ┌──────────────────────────┐
                              │ MerkleIoT.anchorBatch()   │  ← only the root on-chain
                              └──────────┬───────────────┘
                                         │
                         JSON written to ▼
                    prototype/app/public/oracle-batches/batch-N.json
                    (raw readings + Merkle proofs per leaf)
                                         │
                    ┌────── Simulation dashboard ──────────┐
                    │ - subscribes to BatchAnchored events  │
                    │ - fetches batch-N.json               │
                    │ - click "Verify reading #N"          │
                    │   → MerkleIoT.verifyReading()  ✅/❌  │
                    └──────────────────────────────────────┘
```

- Oracle builds a **sorted-pair Merkle tree** (same sorting logic on-chain and
  off-chain, so proofs match)
- Individual readings stay off-chain (cost + privacy)
- The Merkle root lets **anyone** prove a specific reading was in the anchored batch

**Concept-map nodes:** Oracle · Ed25519 · Non-repudiation · Merkle · Hash ·
Scaling (off-chain batching) · Data Integrity

---

## 5. Consensus Choice Justification

All demo and testing runs on local Hardhat (instant finality, deterministic
accounts, zero cost). The architecture is EVM-compatible — deployment to any
public EVM chain requires only changing the RPC endpoint in `hardhat.config.ts`.

We **deliberately removed** Hyperledger Besu / IBFT 2.0 from previous versions.
Hanisch et al. (2026) analyse 81 blockchain projects across 25 industries and
find that 73% of failures are governance-related, not technical — and every
failure in our case study analysis (TradeLens, we.trade, Marco Polo, Contour,
B3i) ran on a permissioned chain. See [CASE_STUDIES.md](CASE_STUDIES.md).

---

## 6. Trust Assumptions

| Assumption | If broken |
|-----------|-----------|
| Public chain validators ≥ 2/3 stake honest (PoS) | Finality is unsafe — relevant only on live networks |
| Approved IoT oracles are honest | Fake readings could be anchored (operator-managed allowlist mitigates; multisig in production) |
| Each actor safeguards their private key | Custody could be hijacked (hardware wallets in production) |
| Off-chain manifest gateway is available | Documents cannot be fetched, but `docsHash` on-chain remains the source of truth |

---

## 7. Deployment Targets

| Environment | Purpose | URL / Access |
|-------------|---------|-------------|
| Local Hardhat | Development + tests + demo | `http://127.0.0.1:8545` (chainId 31337) |
| Ethereum Sepolia | Public testnet validation | change RPC in `hardhat.config.ts` |
| IPFS (mocked URI) | Manifest documents | placeholder URIs work for demo |

The contracts are EVM-compatible and require no code changes to deploy to Sepolia,
mainnet, or Polygon — only the RPC and account configuration change.
