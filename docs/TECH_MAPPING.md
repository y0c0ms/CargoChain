# TECH MAPPING — Concept Map (T1-T6) → CargoChain Features

Traceability matrix. Every node from `mapa_conceitual_blockchain_T1-T6.html`
is listed here with one of four coverage statuses:

- 🟢 **Coded** — implemented in prototype code
- 🟡 **Demo'd** — visible in demo but not custom-implemented (uses existing lib)
- 🟠 **Reported** — analysed / discussed in slides or report, not in code
- ⚪ **Out of scope** — acknowledged, not covered

---

## T1-T2 — Fundamentals & Central Concepts

| Node                          | Status | Where exercised                                        |
|-------------------------------|--------|--------------------------------------------------------|
| DLT (Distributed Ledger Tech) | 🟢     | Ethereum Sepolia (public PoS) + local Hardhat          |
| Blockchain                    | 🟢     | Both networks running                                  |
| Evolution 1.0 → 4.0           | 🟠     | State-of-Art slide (positioning CargoChain as 3.0/4.0) |
| Purpose (coord/proven/consensus)| 🟠   | Problem framing slide                                  |
| Block                         | 🟢     | Every tx produces blocks on both networks              |
| Transaction                   | 🟢     | Custody, create-consignment, IoT-anchor, VC issuance   |
| Consensus                     | 🟢     | PoS (Ethereum / Polygon)                               |
| P2P Network                   | 🟢     | Public PoS networks                                    |
| Immutability                  | 🟢     | Inherent; demonstrated in regulator dashboard          |
| Decentralization              | 🟢     | Public chain (no operator)                             |
| Hash Function                 | 🟢     | keccak256 throughout (manifest hash, DID document hash, Merkle nodes) |
| Merkle Tree                   | 🟢     | `MerkleIoT.sol` + off-chain builder + `verifyReading`  |
| Cryptography                  | 🟢     | Hashing, signing all exercised                         |
| Public-key Cryptography       | 🟢     | Ethereum secp256k1 (wallets) + Ed25519 (oracles)       |
| Zero-Knowledge Proofs         | 🟠     | Discussed as future-work extension; out of scope after professor feedback |
| Network Types                 | 🟠     | Discussed; we run public only                          |
| Public Blockchain             | 🟢     | Ethereum Sepolia                                       |
| Private Blockchain            | 🟠     | Discussed (TradeLens / we.trade case studies)          |
| Architecture (layers)         | 🟠     | ARCHITECTURE.md + slides                               |
| Smart Contracts               | 🟢     | 4 Solidity contracts                                   |
| Wallet                        | 🟢     | MetaMask + dev signer fallback                         |
| NFT                           | 🟠     | Discussed; intentionally not used (see ConsignmentRegistry header) |
| Non-blockchain DLTs           | 🟠     | State-of-Art slide (Hedera, DAGs contrast)             |
| Platforms comparison          | 🟠     | Tech-stack slide                                       |
| Use Cases                     | 🟢     | This project IS a use case (transport)                 |
| Digital Identity              | 🟢     | DID-based identity for each actor                      |

---

## T3 — Consensus, Finality, Scaling, Governance

| Node                          | Status | Where exercised                                        |
|-------------------------------|--------|--------------------------------------------------------|
| Consensus Mechanisms          | 🟢     | PoS in production (Sepolia)                            |
| PoW (Proof of Work)           | 🟠     | Comparison slide                                       |
| PoS (Proof of Stake)          | 🟢     | Sepolia uses Casper FFG / LMD-GHOST PoS                |
| DPoS                          | 🟠     | Comparison slide (Solana example)                      |
| PoH (Proof of History)        | 🟠     | Comparison slide                                       |
| BFT (Byzantine Fault Tolerance)| 🟠    | Discussed; abandoned in favour of public PoS (case studies) |
| IBFT 2.0                      | 🟠     | **Discussed as failure mode** (TradeLens case study)   |
| Avalanche Consensus           | 🟠     | Comparison slide                                       |
| Finality (probab/instant/determ) | 🟢 | Demonstrated: Hardhat instant; Sepolia ~13 min full finality |
| Throughput                    | 🟢     | Benchmarked: Sepolia ~15 TPS                           |
| Validator Economics           | 🟢     | PoS staking + slashing discussed in T3 slide           |
| EIP-1559 Fee Market           | 🟢     | Both target chains use it                              |
| Mempool                       | 🟢     | Standard PoS mempool                                   |
| Scaling Solutions (hub)       | 🟠     | Dedicated analysis slide                               |
| Sharding                      | 🟠     | Discussed as future work                               |
| Rollups (L2)                  | 🟠     | Discussed; ZK-rollup is natural extension              |
| Sidechains                    | 🟠     | Discussed (Polygon comparison); not deployed           |
| State Channels                | ⚪     | Mentioned only                                         |
| DAGs                          | 🟠     | Hedera contrast in State of Art                        |
| Governance of DLTs            | 🟠     | Section 3 of CASE_STUDIES.md analyses governance failure |
| Privacy Mechanisms            | 🟠     | Discussed; manifest off-chain is the privacy primitive |

---

## T4 — Smart Contracts & Platforms

| Node                          | Status | Where exercised                                        |
|-------------------------------|--------|--------------------------------------------------------|
| Smart Contract Definition     | 🟢     | Every file in `contracts/`                             |
| Legal vs Smart Contract       | 🟠     | Report section on MLETR Bill of Lading                 |
| SC Categories                 | 🟠     | Tech-choice rationale slide                            |
| Solidity                      | 🟢     | All 4 contracts in Solidity 0.8.26                     |
| Daml                          | 🟠     | Comparison slide                                       |
| Chaincode (Fabric)            | 🟠     | TradeLens / we.trade case studies                      |
| CorDapp                       | 🟠     | Marco Polo / Contour case studies                      |
| Token Standards               | 🟠     | Discussed (ERC-721 critique); not used                 |
| State Machines                | 🟢     | ConsignmentRegistry: Created → InTransit → Delivered   |
| Custom Errors                 | 🟢     | All 4 contracts use them; decoded by `lib/errors.ts`   |
| Challenges & limitations      | 🟠     | Challenges slide                                       |
| Future Trends                 | 🟠     | Final "future work" slide                              |
| Hyperledger Fabric            | 🟠     | TradeLens case study (failure mode)                    |
| R3 Corda                      | 🟠     | Marco Polo + Contour case studies (failure modes)      |
| Canton Network                | 🟠     | Comparison; not deployed                               |
| Hyperledger Besu              | 🟠     | **Removed** after case-study analysis                  |
| Solana / Cardano / Avalanche / Hedera | 🟠 | Public DLT comparison slide                        |
| OpenZeppelin                  | 🟠     | Discussed; intentionally not used (no token standards needed) |

---

## T5 — Self-Sovereign Identity

| Node                          | Status | Where exercised                                        |
|-------------------------------|--------|--------------------------------------------------------|
| Self-Sovereign Identity (SSI) | 🟢     | Core of stakeholder layer                              |
| How SSI works (4 steps)       | 🟢     | Demo walks exactly these 4 steps                       |
| SSI Benefits                  | 🟠     | Discussion slide                                       |
| SSI Challenges                | 🟠     | Challenges slide                                       |
| DID                           | 🟢     | Address-anchored DID implementation                    |
| DID Document                  | 🟢     | JSON-LD stored off-chain; hash anchored on-chain       |
| DID Architecture              | 🟢     | Subject / Controller / Registry all modelled           |
| Verification Methods          | 🟢     | Authentication key per DID                             |
| DID Services                  | 🟡     | Static `serviceEndpoint` for each actor                |
| Verifiable Credentials        | 🟢     | 5 schemas (LicensedCarrier, CustomsOfficer, PharmaGrade, PortOperator, InspectorAuthority) |
| VC Lifecycle                  | 🟢     | Issue → Hold → Present → Verify all in demo            |
| On-ledger vs Off-ledger       | 🟢     | VCs off-ledger in wallet; hashes + schemas on-chain    |
| Identity + Smart Contracts    | 🟢     | `ConsignmentRegistry.transferCustody` checks VC before handover |
| Hyperledger Identity Stack    | 🟠     | Inspired; simulated in our code                        |
| Sovrin                        | 🟠     | State-of-Art slide                                     |
| EBSI                          | 🟠     | State-of-Art + EU pilot relevance                      |
| Privado ID                    | 🟠     | State-of-Art; privacy-first positioning                |
| Identity Future Trends        | 🟠     | Future work slide                                      |
| Identity Challenges           | 🟠     | Challenges slide                                       |
| Selective Disclosure          | 🟢     | `subjectHasActiveVC` returns boolean — VC body not exposed |

---

## T6 — Privacy, ZKP, Smart Contract Languages

| Node                          | Status | Where exercised                                        |
|-------------------------------|--------|--------------------------------------------------------|
| Hash anchoring                | 🟢     | manifestHash, vcHash, documentHash all on-chain        |
| Off-chain data + on-chain proof | 🟢   | Manifest JSON off-chain; Merkle IoT batches            |
| Merkle proof verification     | 🟢     | `MerkleIoT.verifyReading` — anyone can prove on-chain  |
| Daml Templates & Choices      | 🟠     | Contrasted with Solidity in a slide                    |
| Daml Contract Flow            | 🟠     | Mentioned in Daml comparison                           |
| ZKP Properties (compl/sound/ZK) | 🟠   | Explained in slide; out of scope after professor feedback |
| ZKP Interactive               | 🟠     | Explained in slide                                     |
| ZKP Non-Interactive           | 🟠     | Explained in slide                                     |
| zk-SNARKs                     | 🟠     | Discussed; not implemented after scope reduction       |
| zk-STARKs                     | 🟠     | Compared in ZKP slide                                  |
| ZKP Applications              | 🟠     | Discussed (selective disclosure achievable via VC architecture) |
| ZKP Challenges                | 🟠     | Trusted setup, perf, complexity discussed              |

---

## Security & Access Control (audit-driven)

The audit work exercises several T1-T4 concepts in their *adversarial*
direction (Cryptography → integrity verification, Smart Contract → custom
errors + role gates, Verifiable Credentials → trusted-issuer model).

| Audit finding                      | Status | Concept exercised                                |
|------------------------------------|--------|--------------------------------------------------|
| H-1 Trusted issuer registry        | 🟢     | VC Lifecycle · Issuer authority · SSI trust      |
| H-2 Oracle allowlist               | 🟢     | Oracle problem · Trust assumption                |
| H-3 IoT Merkle proof verification  | 🟢     | Merkle · Hash · Data integrity · Verification    |
| H-4 DID Document hash check        | 🟠     | Documented threat; demo doesn't fetch DID Documents |
| M-1 Recipient consent (open)       | 🟠     | Documented as known limitation                   |

Regression tests live in `prototype/test/Security.test.ts` (7 cases).

---

## Industry positioning (case-study-driven)

The case-study analysis ([CASE_STUDIES.md](CASE_STUDIES.md)) maps to several
T3-T4 concepts in a way the original concept map doesn't:

| Concept exercised             | Case-study evidence                                                      |
|-------------------------------|--------------------------------------------------------------------------|
| Permissioned-chain failure modes | TradeLens, we.trade, Marco Polo, Contour, B3i, ASX CHESS              |
| Public-chain enterprise scale | CargoX (3 m+ docs on Ethereum) + OriginTrail (Swiss Federal Railways) at production |
| Adoption-as-forcing-function  | IBM Food Trust (Walmart mandate), MediLedger (DSCSA legal mandate)       |
| Governance neutrality         | GSBN's non-profit model vs TradeLens's Maersk-controlled model           |

---

## Concept → File Quick-Lookup

| Concept                            | Primary file                                          |
|------------------------------------|-------------------------------------------------------|
| DID Registry                       | `prototype/contracts/DIDRegistry.sol`                 |
| VC Anchor + issuer allowlist       | `prototype/contracts/CarrierCredential.sol`           |
| Consignment + custody (state mach.)| `prototype/contracts/ConsignmentRegistry.sol`         |
| IoT Merkle + verifyReading         | `prototype/contracts/MerkleIoT.sol`                   |
| Oracle simulator                   | `prototype/scripts/oracle-simulator.ts`               |
| Friendly error decoder             | `prototype/app/lib/errors.ts`                         |
| Wallet abstraction (signer)        | `prototype/app/lib/signer.ts`                         |
| Live IoT verification UI           | `prototype/app/pages/simulation.tsx`                  |
| Security regressions               | `prototype/test/Security.test.ts`                     |
| End-to-end gas measurement         | `prototype/test/E2E.test.ts`                          |

Keep this page open when writing the report — it is the concept-coverage
Appendix A table.
