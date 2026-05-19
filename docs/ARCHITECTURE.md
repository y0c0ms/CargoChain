# ARCHITECTURE — CargoChain

System architecture, layer-by-layer, mapped to the **Blockchain Reference
Architecture (Abed et al. 2023)** presented in T2.

The architecture was simplified after the case-study evidence in
[CASE_STUDIES.md](CASE_STUDIES.md) showed that every major permissioned-chain
logistics platform (TradeLens, we.trade, Marco Polo, Contour, B3i) failed
between 2022 and 2023. Payment, ZK escrow, the ERC-721 token wrapper, and the
DID/VC contracts were also dropped — they added complexity without addressing
the actual course material or professor feedback requirements.

---

## 1. High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│  APPLICATION LAYER  (Next.js 14 · React · ethers.js · Tailwind)      │
│                                                                      │
│   ┌────────┐  ┌────────┐  ┌──────────┐  ┌─────────┐                  │
│   │Shipper │  │Carrier │  │Simulation│  │Regulator│                  │
│   │  UI    │  │  UI    │  │   UI     │  │   UI    │                  │
│   └───┬────┘  └───┬────┘  └────┬─────┘  └────┬────┘                  │
│       └───────────┴────────────┴─────────────┘                       │
│                              │                                       │
├──────────────────────────────┼───────────────────────────────────────┤
│  MODELLING LAYER             │                                       │
│     Flows: Create Consignment → TransferCustody → AnchorIoTBatch     │
│            → VerifyReading → MarkDelivered                           │
│                                                                      │
│     State machine: Created → InTransit → Delivered (Disputed)        │
├──────────────────────────────────────────────────────────────────────┤
│  CONTRACT LAYER  (2 Solidity contracts)                              │
│                                                                      │
│  ┌─────────────────────────────┐   ┌──────────────────────────────┐   │
│  │ ConsignmentRegistry         │   │ MerkleIoT                    │   │
│  │ (state + custody)           │   │ (anchor + verifyReading)     │   │
│  └──────────────┬──────────────┘   └──────────────┬───────────────┘   │
│                 └─────────────────┬───────────────┘                   │
│                                   ▼                                  │
├───────────────────────────────────────────────────────────────────── │
│  DATA LAYER                                                          │
│   ┌─────────────────────────────────────────────────────┐            │
│   │         BLOCKS / TRANSACTIONS / STATE               │            │
│   │  (keccak256 tx merkle root per block)               │            │
│   └─────────────────────────────────────────────────────┘            │
├──────────────────────────────────────────────────────────────────────┤
│  NETWORK LAYER                                                       │
│                                                                      │
│   ┌─────────────────────────┐                                         │
│   │ Local Hardhat (dev)     │                                         │
│   │ instant blocks          │                                         │
│   │ deterministic accounts  │                                         │
│   └─────────────────────────┘                                         │
└──────────────────────────────────────────────────────────────────────┘

    OFF-CHAIN SIDECARS (not in reference architecture layering)
  ┌────────────────────────────┐    ┌────────────────────────────────┐
  │ IoT Oracle Simulator       │    │ Manifest JSON (IPFS / HTTPS)   │
  │ (Node.js, Ed25519 signed)  │    │ hashed on-chain, fetched on UI │
  └────────────────────────────┘    └────────────────────────────────┘
```

---

## 2. Smart-Contract Details

### 2.1 `ConsignmentRegistry.sol`

The merger of the previous `ConsignmentNFT` + `CustodyLedger`. **Not** an
ERC-721 — see the contract header for the rationale.

- Stores: `Consignment { shipper, currentHolder, status, manifestHash, manifestURI, createdAt }`
- Stores: `Handover[]` log per consignment id
- Status state machine: `Created → InTransit → Delivered`
- Anyone can `createConsignment(manifestHash, uri)` — no operator gating
- `transferCustody(...)` requires `msg.sender == currentHolder`. In
  production, a DID+VC check would be added here (see NOTE in contract and
  SECURITY.md for the full threat model).
- `markDelivered(...)` callable only by the current custodian
- Read helpers: `custodianOf(id)`, `historyOf(id)`, `hopCount(id)`
- Concept nodes: Smart Contract · Custody · Immutability · Identity + SC ·
  Events (audit trail) · Hash · Data Integrity · State Machine

### 2.2 `MerkleIoT.sol`

- Accepts a Merkle root for a batch of off-chain IoT readings
- Stores: `Batch { tokenId, merkleRoot, readingCount, firstTs, lastTs, submitter }`
- `verifyReading(batchId, leaf, proof[])` — **anyone** can prove on-chain that
  a specific reading was part of an anchored batch
- **H-2 protection:** oracle allowlist (`approvedOracle` mapping). Only
  approved IoT oracle addresses can call `anchorBatch`.
- Saves ~99 % of gas vs. writing every reading on-chain.
- Concept nodes: Merkle Tree · Hash · Oracle · Scaling (batching) · Data Integrity

---

## 3. Custody Transfer Flow

```
Current custodian calls transferCustody(id, to, location, handshakeHash)
    → checks msg.sender == currentHolder
    → updates currentHolder = to
    → appends Handover to _history[id]
    → emits CustodyTransferred event

NOTE: A production deployment would also validate `to` against a DID registry
and require a LicensedCarrier Verifiable Credential. Omitted from this prototype.
```

---

## 4. IoT Oracle + Merkle Verification Pattern

```
┌──────────────┐     Ed25519-sign     ┌──────────────────┐
│ IoT sensor   │ ────────────────────►│ Oracle aggregator│
│ (simulated)  │  {ts, temp, gps}     │ (3 signers)      │
└──────────────┘                      └─────────┬────────┘
                                                │
                              m-of-n signature  ▼
                                      ┌─────────────────┐
                                      │ Merkle batcher  │
                                      └──────┬──────────┘
                                             │
                                 merkleRoot  ▼
                                      ┌──────────────────┐
                                      │ MerkleIoT.sol    │ ← only the root on-chain
                                      └──────┬───────────┘
                                             │
                                             ▼
              JSON file written to            ▼ verifyReading(id, leaf, proof)
              prototype/app/public/oracle-batches/batch-N.json
              (raw readings + Merkle proofs per leaf)         ▲
                                                              │
                            ┌──── Simulation page ───────────┘
                            │  - subscribes to BatchAnchored events
                            │  - fetches batch JSON
                            │  - clicks "Verify reading #N" → on-chain check
                            └────────────────────────────────────
```

- 3 oracle signers → m-of-n agreement before batch is accepted
- Individual readings stay off-chain (cost + privacy)
- The Merkle root lets *anyone* prove that any specific reading was in the batch
- Mapping: Oracle · Public-key crypto · Merkle · Non-repudiation · Scaling Hub

---

## 5. Consensus Choice Justification

All demo and testing runs on local Hardhat (instant finality, deterministic
accounts, no cost). The architecture is EVM-compatible — deployment to any
public EVM chain (Ethereum mainnet, Sepolia testnet, Polygon) requires only
changing the RPC endpoint in `hardhat.config.ts`.

We **deliberately removed** Hyperledger Besu / IBFT 2.0 from previous versions.
The case studies (TradeLens, we.trade, Marco Polo, Contour, B3i) demonstrate
that permissioned DLT is the failure mode the course should warn students
about, not endorse. See [`CASE_STUDIES.md`](CASE_STUDIES.md).

---

## 6. Trust Assumptions

1. **Public chain validators** — at least 2/3 of stake honest (standard PoS
   assumption; relevant when deploying to a live network)
2. **Approved IoT oracles** — owner-managed allowlist; in production this
   would be a multisig of trusted sensor gateways
3. **Key management** — each actor safeguards their private key (out-of-band
   key management; production would use hardware wallets)
4. **Off-chain manifest gateway** — *not* trusted; the on-chain `manifestHash`
   is the source of truth, the gateway just serves the document for hashing

Breaking any of these breaks the corresponding guarantee but not the whole
system.

---

## 7. Deployment Targets

| Environment      | Purpose                       | URL / Access                       |
|------------------|-------------------------------|------------------------------------|
| Local Hardhat    | Development + tests + demo    | `http://127.0.0.1:8545`            |
| IPFS (mocked URI)| Manifest documents            | (optional — placeholder URIs work) |

For the demo: develop and run live on local Hardhat (instant blocks, reliable).
The contracts are EVM-compatible and can be deployed to any public chain
(Sepolia, mainnet, Polygon) by updating the RPC configuration — no code changes
needed.
