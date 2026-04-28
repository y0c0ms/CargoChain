# ARCHITECTURE — CargoChain

System architecture, layer-by-layer, mapped to the **Blockchain Reference
Architecture (Abed et al. 2023)** presented in T2.

The architecture was simplified after the case-study evidence in
[CASE_STUDIES.md](CASE_STUDIES.md) showed that every major permissioned-chain
logistics platform (TradeLens, we.trade, Marco Polo, Contour, B3i) failed
between 2022 and 2023. Payment, ZK escrow, and the ERC-721 token wrapper were
also dropped — they added complexity without addressing the actual course
material.

---

## 1. High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│  APPLICATION LAYER  (Next.js 14 · React · ethers.js · Tailwind)      │
│                                                                      │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────┐  ┌─────────┐      │
│   │Shipper │  │Carrier │  │Customs │  │Simulation│  │Regulator│      │
│   │  UI    │  │  UI    │  │  UI    │  │   UI     │  │   UI    │      │
│   └───┬────┘  └───┬────┘  └───┬────┘  └────┬─────┘  └────┬────┘      │
│       └───────────┴───────────┴────────────┴─────────────┘           │
│                              │                                       │
├──────────────────────────────┼───────────────────────────────────────┤
│  MODELLING LAYER             │                                       │
│     Flows: Register DID → Issue VC → Create Consignment              │
│            → TransferCustody → AnchorIoTBatch → VerifyReading        │
│            → MarkDelivered                                           │
│                                                                      │
│     State machine: Created → InTransit → Delivered (Disputed)        │
├──────────────────────────────────────────────────────────────────────┤
│  CONTRACT LAYER  (4 Solidity contracts)                              │
│                                                                      │
│  ┌────────────┐ ┌──────────────┐ ┌─────────────────────┐             │
│  │DIDRegistry │ │CarrierCreden-│ │ConsignmentRegistry  │             │
│  │            │ │tial (VC anch)│ │ (state + custody)   │             │
│  └─────┬──────┘ └──────┬───────┘ └──────────┬──────────┘             │
│        │               │                    │                        │
│        └───────┬───────┴────────────────────┘                        │
│                ▼                                                     │
│      ┌──────────────────────────┐                                    │
│      │ MerkleIoT                │                                    │
│      │ (anchor + verifyReading) │                                    │
│      └──────────────┬───────────┘                                    │
├──────────────────────┼───────────────────────────────────────────────┤
│  DATA LAYER          │                                               │
│                      ▼                                               │
│   ┌─────────────────────────────────────────────────────┐            │
│   │         BLOCKS / TRANSACTIONS / STATE               │            │
│   │  (keccak256 tx merkle root per block)               │            │
│   └─────────────────────────────────────────────────────┘            │
├──────────────────────────────────────────────────────────────────────┤
│  NETWORK LAYER  — public EVM only                                    │
│                                                                      │
│   ┌─────────────────────────┐  ┌────────────────────────────────┐    │
│   │ Local Hardhat (dev)     │  │ Ethereum Sepolia (public demo) │    │
│   │ instant blocks          │  │ public PoS, ~12 s blocks       │    │
│   │ deterministic accounts  │  │ free testnet ETH via faucet    │    │
│   └─────────────────────────┘  └────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘

    OFF-CHAIN SIDECARS (not in reference architecture layering)
  ┌────────────────────────────┐    ┌────────────────────────────────┐
  │ IoT Oracle Simulator       │    │ Manifest JSON (IPFS / HTTPS)   │
  │ (Node.js, Ed25519 signed)  │    │ hashed on-chain, fetched on UI │
  └────────────────────────────┘    └────────────────────────────────┘
```

---

## 2. Smart-Contract Details

### 2.1 `DIDRegistry.sol`

- Maps `address` → `DIDEntry { documentHash, documentURI, createdAt, updatedAt, revoked }`
- Anyone can self-register their DID — no operator gating
- Functions: `register(hash, uri)`, `updateDocument(...)`, `revoke()`, `resolve(addr)`, `isActive(addr)`
- Events: `DIDRegistered`, `DIDUpdated`, `DIDRevoked`
- **Security note:** the off-chain DID resolver (`app/lib/did-resolver.ts`)
  must re-hash the fetched document and compare to `documentHash` — the H-4
  fix in `SECURITY.md`.
- Concept nodes: DID · DID Document · Verifiable Data Registry · Decentralization

### 2.2 `CarrierCredential.sol`

- Anchors the **hash of a Verifiable Credential** on-chain (W3C VC v2)
- Stores: issuer DID, subject DID, schema, vcHash, notBefore, expiry, revoked
- Schemas: `LicensedCarrier`, `CustomsOfficer`, `PharmaGrade`, `PortOperator`, `InspectorAuthority`
- Functions: `setApprovedIssuer(schema, addr, bool)` (owner), `issueVC(...)`, `revokeVC(...)`,
  `subjectHasActiveVC(subject, schema)`, `isValid(vcHash)`
- **H-1 protection:** issuer allowlist per schema. Without this, anyone with
  a DID could mint themselves any VC.
- Concept nodes: Verifiable Credentials · VC Lifecycle · Issuer/Holder/Verifier · On-ledger anchors

### 2.3 `ConsignmentRegistry.sol`

The merger of the previous `ConsignmentNFT` + `CustodyLedger`. **Not** an
ERC-721 — see the contract header for the rationale.

- Stores: `Consignment { shipper, currentCustodian, status, manifestHash, manifestURI, createdAt }`
- Stores: `Handover[]` log per consignment id
- Status state machine: `Created → InTransit → Delivered`
- Anyone with an active DID can `createConsignment(manifestHash, uri)` — no operator gating
- `transferCustody(...)` requires recipient to (a) have an active DID and (b) hold a `LicensedCarrier` VC
- `markDelivered(...)` callable only by the current custodian
- Read helpers: `custodianOf(id)`, `historyOf(id)`, `hopCount(id)`
- Concept nodes: Smart Contract · Custody · Immutability · Identity + SC ·
  Events (audit trail) · Hash · Data Integrity · State Machine

### 2.4 `MerkleIoT.sol`

- Accepts a Merkle root for a batch of off-chain IoT readings
- Stores: `Batch { tokenId, merkleRoot, readingCount, firstTs, lastTs, submitter }`
- `verifyReading(batchId, leaf, proof[])` — **anyone** can prove on-chain that
  a specific reading was part of an anchored batch
- **H-2 protection:** oracle allowlist (`approvedOracle` mapping). Only
  approved IoT oracle addresses can call `anchorBatch`.
- Saves ~99 % of gas vs. writing every reading on-chain.
- Concept nodes: Merkle Tree · Hash · Oracle · Scaling (batching) · Data Integrity

---

## 3. SSI Data Flow

```
 Issuer DID (e.g. Licensing Authority)
     │  signs VC → hashes VC → calls CarrierCredential.issueVC(...)
     ▼
Verifiable Data Registry (public chain)   —   anyone can read
     │
     │  {issuer DID, subject DID, schema, vcHash, expiry}
     ▼
 Holder DID (Carrier)  ← stores full VC off-chain in their wallet
     │
     │  When taking custody: signs handover transaction.
     │  The contract's transferCustody() checks the recipient's VC.
     ▼
 Verifier (ConsignmentRegistry.transferCustody)
     │  1) dids.isActive(to)
     │  2) creds.subjectHasActiveVC(to, LicensedCarrier)
     │  → revert if either fails
     ▼
 Custody transfer accepted, event emitted, history appended
```

**Selective disclosure:** when a regulator queries `subjectHasActiveVC`, they
get the *boolean* result without ever reading the VC itself (which lives in
the carrier's wallet only).

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

| Criterion              | Sepolia (PoS)              | Local Hardhat            |
|------------------------|----------------------------|--------------------------|
| Finality               | ~12 s blocks, ~13 min final | Instant (deterministic) |
| Throughput             | ~15 TPS                    | n/a (single-node)        |
| Permissioning          | Permissionless             | Open                     |
| Cost                   | Free (testnet ETH)         | Free                     |
| Course-material match  | T3 PoS · Casper FFG · Validators | n/a                |

Sepolia is the canonical Ethereum testnet — every survivor case study that
operates on public Ethereum (CargoX, OriginTrail's Ethereum integration) is
on this same chain at higher tier.

We **deliberately removed** Hyperledger Besu / IBFT 2.0 from previous versions.
The case studies (TradeLens, we.trade, Marco Polo, Contour, B3i) demonstrate
that permissioned DLT is the failure mode the course should warn students
about, not endorse. See [`CASE_STUDIES.md`](CASE_STUDIES.md).

---

## 6. Trust Assumptions

1. **Public chain validators** — at least 2/3 of stake honest (standard PoS assumption)
2. **Approved issuers (per VC schema)** — the contract owner curates the allowlist; 
   in production this would be a multisig of regulators
3. **Approved IoT oracles** — same allowlist mechanism, same governance question
4. **DID controllers** — each actor safeguards their private key (out-of-band
   key management; production would use hardware wallets)
5. **Off-chain manifest gateway** — *not* trusted; the on-chain `manifestHash`
   is the source of truth, the gateway just serves the document for hashing

Breaking any of these breaks the corresponding guarantee but not the whole
system.

---

## 7. Deployment Targets

| Environment      | Purpose                       | URL / Access                       |
|------------------|-------------------------------|------------------------------------|
| Local Hardhat    | Development + tests + demo    | `http://127.0.0.1:8545`            |
| Sepolia          | Public-chain proof of deploy  | `sepolia.etherscan.io`             |
| IPFS (mocked URI)| Manifest documents            | (optional — placeholder URIs work) |

For the demo: develop and run live on local Hardhat (instant blocks, reliable).
Deploy once to Sepolia and put the Etherscan link in the slides as proof the
contracts work on a real public network.
