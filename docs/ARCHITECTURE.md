# ARCHITECTURE — CargoChain

System architecture, layer-by-layer, with mapping to the **Blockchain Reference
Architecture (Abed et al. 2023)** presented in T2.

---

## 1. High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│  APPLICATION LAYER  (Next.js 14 · React · ethers.js · Tailwind)      │
│                                                                      │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐         │
│   │Shipper │  │Carrier │  │Customs │  │Receiver│  │Regulator│        │
│   │  UI    │  │  UI    │  │  UI    │  │  UI    │  │   UI   │         │
│   └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └────┬───┘         │
│       └───────────┴───────────┴───────────┴────────────┘             │
│                              │                                       │
├──────────────────────────────┼───────────────────────────────────────┤
│  MODELLING LAYER             │                                       │
│     Flows: Mint → Assign DID → Issue VC → TakeCustody                │
│            → IoT Batch → ProveCompliance → ReleaseEscrow             │
│                                                                      │
│     Multi-party state machines modelled as Solidity modifiers        │
├──────────────────────────────────────────────────────────────────────┤
│  CONTRACT LAYER  (7 Solidity contracts)                              │
│                                                                      │
│  ┌────────────┐ ┌──────────────┐ ┌────────────────┐ ┌─────────────┐  │
│  │DIDRegistry │ │CarrierCreden-│ │ConsignmentNFT  │ │CustodyLedger│  │
│  │            │ │tial (VC anch)│ │(ERC-721)       │ │             │  │
│  └─────┬──────┘ └──────┬───────┘ └───────┬────────┘ └──────┬──────┘  │
│        │               │                 │                 │         │
│        └──────┬────────┴────────┬────────┴─────────────────┘         │
│               ▼                 ▼                                    │
│      ┌────────────┐      ┌────────────┐    ┌──────────────────┐      │
│      │ MerkleIoT  │◄────►│ZKVerifier  │    │  FreightEscrow   │      │
│      │            │      │(Groth16)   │    │  (ERC-20 payout) │      │
│      └─────┬──────┘      └─────┬──────┘    └────────┬─────────┘      │
│            │                   │                    │                │
├────────────┼───────────────────┼────────────────────┼────────────────┤
│  DATA LAYER│                   │                    │                │
│            ▼                   ▼                    ▼                │
│   ┌─────────────────────────────────────────────────────┐            │
│   │         BLOCKS / TRANSACTIONS / STATE               │            │
│   │  (keccak256 tx merkle root per block)               │            │
│   └─────────────────────────────────────────────────────┘            │
├──────────────────────────────────────────────────────────────────────┤
│  NETWORK LAYER                                                       │
│                                                                      │
│   ┌──────────────────────┐  ┌───────────────────────────┐            │
│   │ Besu (IBFT 2.0)      │  │ Ethereum Sepolia (PoS)    │            │
│   │ 4 validator nodes    │  │ Public testnet            │            │
│   │ Permissioned         │  │ Permissionless            │            │
│   │ Instant finality     │  │ Deterministic finality    │            │
│   └──────────────────────┘  └───────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘

    OFF-CHAIN SIDECARS (not in reference architecture layering)
  ┌────────────────────────────┐    ┌────────────────────────────────┐
  │ IoT Oracle Simulator       │    │ ZK Prover Service              │
  │ (Node.js, Ed25519 signed)  │    │ (snarkjs WASM in browser)      │
  └────────────────────────────┘    └────────────────────────────────┘
  ┌────────────────────────────┐    ┌────────────────────────────────┐
  │ VC Wallet (IndexedDB)      │    │ DID Resolver + cache           │
  └────────────────────────────┘    └────────────────────────────────┘
```

---

## 2. Smart-Contract Details

### 2.1 `DIDRegistry.sol`
- Maps `address` → `DIDDocument` (JSON-LD stored as `bytes`)
- Functions: `register()`, `updateDocument()`, `resolve(did)`, `revoke()`
- Events: `DIDRegistered`, `DIDUpdated`, `DIDRevoked`
- Concept nodes: DID · DID Document · Verifiable Data Registry

### 2.2 `CarrierCredential.sol`
- Anchors the **hash of a Verifiable Credential** on-chain
- Stores: issuer DID, subject DID, schema ID, VC hash, not-before, expiry
- Functions: `issueVC(subject, schemaId, vcHash, expiry)`, `revokeVC()`, `isValid(vcHash)`
- Concept nodes: Verifiable Credentials · VC Lifecycle · On-ledger anchors

### 2.3 `ConsignmentNFT.sol`
- Inherits OpenZeppelin `ERC721URIStorage`
- Each token = a physical container / consignment
- Metadata URI points to IPFS-style JSON: `{hbl, originPort, destPort, weightKg, commodity, tempRange}`
- Functions: `mintConsignment(to, metadataURI)`, `burn(tokenId)`
- Concept nodes: NFT · ERC-721 · Tokenisation · Smart Contract

### 2.4 `CustodyLedger.sol`
- Maps `tokenId` → current custodian DID
- Function: `transferCustody(tokenId, toDID, proofOfHandshake)` — requires both
  parties' signatures (EIP-712 typed data)
- Verifies that `toDID` holds a valid VC of type `LicensedCarrier`
- Event: `CustodyTransferred(tokenId, fromDID, toDID, timestamp)`
- Concept nodes: Custody · Smart Contract · Identity+Smart-Contract integration

### 2.5 `MerkleIoT.sol`
- Accepts a Merkle root for a batch of IoT readings every N blocks
- Stores: `batchId` → `merkleRoot`, `firstTimestamp`, `lastTimestamp`, `count`
- Off-chain tool builds the tree from signed sensor payloads
- Concept nodes: Merkle · Hash · Oracle · Batched anchor

### 2.6 `ZKVerifier.sol` (auto-generated)
- Produced by `snarkjs zkey export solidityverifier`
- Function `verifyProof(a, b, c, publicInputs)` → returns `bool`
- Called by `FreightEscrow` to release funds on valid compliance proof
- Concept nodes: ZKP · zk-SNARKs · Non-interactive · Groth16

### 2.7 `FreightEscrow.sol`
- ERC-20 wrapper around an "FRT" payment token
- Shipper locks funds keyed to `tokenId`; released atomically on:
  1. Final-leg custody transfer reaching destination DID **AND**
  2. Valid ZK proof of compliance accepted by `ZKVerifier`
- Concept nodes: Escrow · ERC-20 · Smart Contract · Atomic settlement

---

## 3. SSI Data Flow

```
 Issuer (e.g. Licensing Authority DID)
     │  signs VC → hashes VC → calls CarrierCredential.issueVC(...)
     ▼
Verifiable Data Registry (Besu chain)   —   public, anchored
     │
     │  {issuer DID, subject DID, schema, vcHash, expiry}
     ▼
 Holder (Carrier DID)  ← stores full VC off-chain in wallet
     │
     │  When taking custody: signs message with DID key,
     │  provides VC to verifier
     ▼
 Verifier (CustodyLedger.sol)
     │  1) resolves issuer DID
     │  2) checks vcHash on-chain via CarrierCredential
     │  3) verifies holder signature with DID key
     ▼
 Custody transfer accepted
```

**Selective disclosure**: when a regulator queries, they get the *boolean*
result of `CarrierCredential.isValid(vcHash)` without reading the VC itself
(which lives in the carrier's wallet only).

---

## 4. ZKP Circuit (cold-chain compliance)

### Inputs
- **Private:** `readings[2400]` — array of signed temperature readings
- **Public:** `lowerBound` (e.g. 20 → 2°C * 10), `upperBound` (80 → 8°C * 10),
  `count` (2400), `merkleRoot` (on-chain reference)

### Constraints
1. Merkle root recomputed from private readings equals the public root
2. For each reading `r[i]`: `lowerBound ≤ r[i] ≤ upperBound`

### Tooling
- **Circom 2** for the circuit
- **snarkjs** for trusted setup (Powers-of-Tau phase 2 contribution) + Groth16
- **WASM prover** runs in-browser (Web Worker) — no private data leaves client

### Output
- `π = (a, b, c)` ≈ 200 bytes
- Verification on-chain costs ~286 k gas (constant, regardless of 2400 reads)

**Concept nodes:** Zero-Knowledge Proofs · zk-SNARKs · Non-interactive ·
Completeness · Soundness · Zero-Knowledge · Selective Disclosure · Merkle

---

## 5. Oracle / IoT Pattern

```
┌──────────────┐     Ed25519-sign     ┌──────────────────┐
│ IoT sensor   │ ────────────────────►│ Oracle aggregator│
│ (simulated)  │  {ts, temp, gps}     │ (3 signers)      │
└──────────────┘                      └─────────┬────────┘
                                                │
                              m-of-n signature  ▼
                                      ┌─────────────────┐
                                      │ MerkleBatch tool│
                                      └──────┬──────────┘
                                             │
                                 merkleRoot  ▼
                                      ┌────────────────┐
                                      │ MerkleIoT.sol  │
                                      └────────────────┘
```

- 3 oracle signers → must agree on batch before root is accepted
- Individual readings remain off-chain (cost, privacy)
- Merkle root lets anyone prove any particular reading was in the batch
- Mapping: Oracle · Public-key crypto · Merkle · Non-repudiation

---

## 6. Consensus Choice Justification

| Criterion               | IBFT 2.0 (Besu) | PoS (Sepolia)       | Why we pick |
|-------------------------|-----------------|---------------------|-------------|
| Finality                | Instant         | Deterministic (12 s)| Fast demo   |
| Throughput              | ~1000 TPS       | ~15 TPS             | Realistic scale |
| Energy                  | Very low        | Low                 | Good optics |
| Permissioning           | Permissioned    | Permissionless      | Enterprise fit |
| Live public comparison  | No              | Yes                 | Dual-chain for T3 coverage |

We run **both chains simultaneously** so we can compare finality, throughput,
gas, UX — one-for-one with T3 course content.

---

## 7. Trust Assumptions

1. **Validators (Besu):** majority of 4 validator nodes honest → BFT threshold (≥ 3 of 4)
2. **Oracle signers:** m-of-n honest (m = 2, n = 3)
3. **Trusted setup (zk-SNARKs):** at least one contributor in the Powers-of-Tau
   ceremony was honest (standard assumption)
4. **DID controllers:** each actor safeguards their DID private key (out-of-band
   key-management; we recommend hardware wallets for production)

Breaking any of these breaks the corresponding guarantee but not the whole system.

---

## 8. Deployment Targets

| Environment  | Purpose               | URL / Access            |
|--------------|-----------------------|-------------------------|
| Local Besu   | Dev + intermediate demo | `http://localhost:8545` |
| Sepolia      | Public showcase       | `sepolia.etherscan.io`  |
| IPFS (mock)  | Metadata / NFT URIs   | Local IPFS node         |
| Vercel       | Front-end preview     | `cargochain-gx.vercel.app` (placeholder) |

For the final demo day, run Besu locally; have Sepolia as redundant path.
