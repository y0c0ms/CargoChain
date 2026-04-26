# TECH MAPPING — Concept Map (T1-T6) → CargoChain Features

Traceability matrix. Every node from `mapa_conceitual_blockchain_T1-T6.html`
is listed here with one of four coverage statuses:

- 🟢 **Coded** — implemented in prototype code
- 🟡 **Demo'd** — visible in demo but not custom-implemented (uses existing lib)
- 🟠 **Reported** — analysed / discussed in slides or report, not in code
- ⚪ **Out of scope** — acknowledged, not covered

**Target coverage (final):** ≥ 69 % **Coded + Demo'd** (51 / 74 nodes).

---

## T1-T2 — Fundamentals & Central Concepts

| Node                          | Status | Where exercised                                        |
|-------------------------------|--------|--------------------------------------------------------|
| DLT (Distributed Ledger Tech) | 🟢     | Besu network + Sepolia                                 |
| Blockchain                    | 🟢     | Both networks running                                  |
| Evolution 1.0 → 4.0           | 🟠     | State-of-Art slide (positioning CargoChain as 3.0/4.0) |
| Purpose (coord/proven/consensus)| 🟠   | Problem framing slide                                  |
| Block                         | 🟢     | Every tx produces blocks on both networks              |
| Transaction                   | 🟢     | Custody, mint, escrow, VC-anchor transactions          |
| Consensus                     | 🟢     | IBFT 2.0 (Besu) + PoS (Sepolia)                        |
| P2P Network                   | 🟢     | Besu 4-node P2P + Sepolia                              |
| Immutability                  | 🟢     | Inherent; demonstrated in demo                         |
| Decentralization              | 🟢     | Multi-node Besu + public Sepolia                       |
| Hash Function                 | 🟢     | keccak256 used in Merkle + NFT metadata                |
| Merkle Tree                   | 🟢     | `MerkleIoT.sol` + off-chain builder script             |
| Cryptography                  | 🟢     | Signing, hashing, ZKP all exercised                    |
| Public-key Cryptography       | 🟢     | Ethereum secp256k1 (wallets) + Ed25519 (oracles)       |
| Zero-Knowledge Proofs         | 🟢     | Groth16 zk-SNARK for cold-chain compliance             |
| Network Types                 | 🟢     | Private (Besu) + Public (Sepolia) both demo'd          |
| Public Blockchain             | 🟢     | Sepolia deployment                                     |
| Private Blockchain            | 🟢     | Besu permissioned                                      |
| Architecture (layers)         | 🟠     | ARCHITECTURE.md + slides 6 & 12                        |
| Smart Contracts               | 🟢     | 7 Solidity contracts                                   |
| Wallet                        | 🟢     | MetaMask (keys) + IndexedDB (VCs)                      |
| NFT                           | 🟢     | `ConsignmentNFT.sol` (ERC-721)                         |
| Non-blockchain DLTs           | 🟠     | State-of-Art slide (Hedera, DAGs contrast)             |
| Platforms comparison          | 🟠     | Tech-stack slide                                       |
| Use Cases                     | 🟢     | This project IS a use case (transport)                 |
| Digital Identity              | 🟢     | DID-based identity for each actor                      |

**T1-T2 subtotal:** 22 Coded · 4 Reported · 0 Out of scope

---

## T3 — Consensus, Finality, Scaling, Governance

| Node                          | Status | Where exercised                                        |
|-------------------------------|--------|--------------------------------------------------------|
| Consensus Mechanisms          | 🟢     | IBFT 2.0 + PoS both running                            |
| PoW (Proof of Work)           | 🟠     | Comparison slide (not deployed, explained why not)     |
| PoS (Proof of Stake)          | 🟢     | Sepolia uses PoS                                       |
| DPoS                          | 🟠     | Comparison slide (Solana example)                      |
| PoH (Proof of History)        | 🟠     | Comparison slide                                       |
| BFT (Byzantine Fault Tolerance)| 🟢    | IBFT 2.0 in Besu                                       |
| Avalanche Consensus           | 🟠     | Comparison slide                                       |
| Finality (probab/instant/determ) | 🟢 | Demonstrated: Besu = instant, Sepolia = determ.        |
| Throughput                    | 🟢     | Benchmarked: Besu ~1000 TPS vs Sepolia ~15 TPS         |
| Scaling Solutions (hub)       | 🟠     | Dedicated analysis slide                               |
| Sharding                      | 🟠     | Discussed as future work                               |
| Rollups (L2)                  | 🟠     | Discussed; ZK-rollup is natural extension              |
| Sidechains                    | 🟠     | Discussed (Polygon comparison)                         |
| State Channels                | ⚪     | Mentioned only                                         |
| DAGs                          | 🟠     | Hedera contrast in State of Art                        |
| Governance of DLTs            | 🟠     | "Canton-style Foundation" model in report              |
| Privacy Mechanisms            | 🟢     | ZKPs + Besu private channels                           |

**T3 subtotal:** 6 Coded · 10 Reported · 1 Out of scope

---

## T4 — Smart Contracts & Platforms

| Node                          | Status | Where exercised                                        |
|-------------------------------|--------|--------------------------------------------------------|
| Smart Contract Definition     | 🟢     | Every contract in `contracts/` folder                  |
| Legal vs Smart Contract       | 🟠     | Report section on MLETR Bill of Lading                 |
| SC Categories                 | 🟠     | Tech-choice rationale slide (Solidity = purpose-driven)|
| Solidity                      | 🟢     | All 7 contracts                                        |
| Daml                          | 🟠     | Comparison slide (considered but rejected for demo)    |
| Chaincode                     | 🟠     | Compared in platforms slide                            |
| CorDapp                       | 🟠     | Compared in platforms slide                            |
| Token Standards               | 🟢     | ERC-721 + ERC-20                                       |
| Challenges & limitations      | 🟠     | Challenges slide                                       |
| Future Trends                 | 🟠     | Final "future work" slide                              |
| Hyperledger Fabric            | 🟠     | Comparison: why we chose Besu instead                  |
| R3 Corda                      | 🟠     | Comparison; Marco Polo case study                      |
| Canton Network                | 🟠     | Governance model borrowed; not deployed                |
| Hyperledger Besu              | 🟢     | Running in prototype                                   |
| Solana / Cardano / Avalanche / Hedera | 🟠 | Public DLT comparison slide                        |

**T4 subtotal:** 3 Coded · 12 Reported · 0 Out of scope

---

## T5 — Self-Sovereign Identity

| Node                          | Status | Where exercised                                        |
|-------------------------------|--------|--------------------------------------------------------|
| Self-Sovereign Identity (SSI) | 🟢     | Core of stakeholder layer                              |
| How SSI works (4 steps)       | 🟢     | Demo walks exactly these 4 steps                       |
| SSI Benefits                  | 🟠     | Discussion slide                                       |
| SSI Challenges                | 🟠     | Challenges slide                                       |
| DID                           | 🟢     | did:ethr implementation                                |
| DID Document                  | 🟢     | JSON-LD stored; returned by DIDRegistry                |
| DID Architecture              | 🟢     | Subject / Controller / Registry all modelled           |
| Verification Methods          | 🟢     | Authentication key + assertion key per DID             |
| DID Services                  | 🟡     | Static `serviceEndpoint` for each actor                |
| Verifiable Credentials        | 🟢     | 3 schemas: LicensedCarrier, CustomsOfficer, PharmaGrade|
| VC Lifecycle                  | 🟢     | Issue → Hold → Present → Verify all in demo            |
| On-ledger vs Off-ledger       | 🟢     | VCs off-ledger in wallet, DIDs + schema hashes on-chain|
| Identity + Smart Contracts    | 🟢     | `CarrierCredential.sol` checks VC before custody       |
| Hyperledger Identity Stack    | 🟠     | Inspired; simulated in our code                        |
| Sovrin                        | 🟠     | State-of-Art slide                                     |
| EBSI                          | 🟠     | State-of-Art + EU pilot relevance                      |
| Privado ID                    | 🟠     | State-of-Art; privacy-first positioning                |
| Identity Future Trends        | 🟠     | Future work slide                                      |
| Identity Challenges           | 🟠     | Challenges slide                                       |

**T5 subtotal:** 9 Coded · 1 Demo'd · 9 Reported · 0 Out of scope

---

## T6 — Deep ZKP + Daml

| Node                          | Status | Where exercised                                        |
|-------------------------------|--------|--------------------------------------------------------|
| ZKP Properties                | 🟢     | Our Groth16 proof has all 3 (complete/sound/ZK)        |
| ZKP Interactive               | 🟠     | Explained in slide; not used in demo                   |
| ZKP Non-Interactive           | 🟢     | Groth16 = NIZKP                                        |
| zk-SNARKs                     | 🟢     | Groth16 circuit in `circuits/`                         |
| zk-STARKs                     | 🟠     | Compared in ZKP slide                                  |
| ZKP Applications              | 🟢     | Selective disclosure demonstrated                       |
| ZKP Challenges                | 🟠     | Trusted setup + perf issues discussed                   |
| Daml Templates & Choices      | 🟠     | Contrasted with Solidity in a slide                     |
| Daml Contract Flow            | 🟠     | Mentioned in Daml comparison                            |

**T6 subtotal:** 4 Coded · 5 Reported · 0 Out of scope

---

## Totals

| Category         | Count | Target |
|------------------|-------|--------|
| 🟢 Coded         | 44    | ≥ 40   |
| 🟡 Demo'd        | 1     | —      |
| 🟠 Reported      | 41    | —      |
| ⚪ Out of scope  | 1     | —      |
| **Total nodes**  | ~87   | 74     |
| **Coverage (Coded + Demo'd)** | **~52 %** | ≥ 55 %  |
| **Coverage (any form)**       | **~99 %** | ≥ 95 %  |

*(Numbers are placeholders until final build; update after each sprint.)*

---

## Security & Access Control (added in audit pass)

The course concept map doesn't have a dedicated "access control" node, but
the audit work exercises several T1-T4 concepts in their *adversarial*
direction (Cryptography → integrity verification, Smart Contract → custom
errors + role gates, Verifiable Credentials → trusted-issuer model).

| Audit finding              | Status | Concept exercised                              |
|----------------------------|--------|------------------------------------------------|
| H-1 Trusted issuer registry | 🟢    | VC Lifecycle · Issuer authority · SSI trust    |
| H-2 Oracle allowlist        | 🟢    | Oracle problem · Trust assumption              |
| H-3 ZK-proof binding        | 🟢    | ZKP soundness · Replay protection · Selective disclosure |
| H-4 DID Document hash check | 🟢    | Hash · Integrity · Verifiable Data Registry    |
| M-2 Refund pre-custody only | 🟢    | Smart Contract state machine · Custody invariant |
| M-1 Recipient consent       | 🟠    | Documented as known limitation                  |

Tests that lock these in: `prototype/test/Security.test.ts` (9 cases).

---

## Concept → File Quick-Lookup

| Concept      | Primary file                                          |
|--------------|-------------------------------------------------------|
| DID Registry | `prototype/contracts/DIDRegistry.sol`                 |
| VC Anchor + issuer allowlist | `prototype/contracts/CarrierCredential.sol`  |
| Consignment NFT | `prototype/contracts/ConsignmentNFT.sol`           |
| Custody log  | `prototype/contracts/CustodyLedger.sol`               |
| IoT Merkle + oracle allowlist | `prototype/contracts/MerkleIoT.sol`         |
| ZK verifier  | `prototype/contracts/ZKVerifier.sol` (auto-generated) |
| Escrow + replay protection | `prototype/contracts/FreightEscrow.sol`     |
| ZK circuit   | `prototype/circuits/cold_chain.circom`                |
| Oracle sim   | `prototype/scripts/oracle-simulator.ts`               |
| Wallet       | `prototype/app/lib/wallet.ts`                         |
| VC issuer    | `prototype/app/lib/vc-issuer.ts`                      |
| DID resolver + hash check | `prototype/app/lib/did-resolver.ts`        |
| Friendly errors | `prototype/app/lib/errors.ts`                      |
| Security regressions | `prototype/test/Security.test.ts`             |

Keep this page open when writing the report — it is the concept-coverage
Appendix A table.
