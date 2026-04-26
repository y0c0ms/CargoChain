# PROJECT PLAN — GX: CargoChain

## Blockchain-Based Multi-Modal Logistics Platform with SSI-Verified Stakeholders and ZKP-Preserved Commercial Privacy

> **Course:** Blockchain & DLT — ISCTE
> **Use Case:** 3 — Transportation (Shipping, Logistics, Airlines, Railways)
> **Professors:** Catarina Ferreira da Silva (T1-T2), Luís Marado (T3-T6)
> **Deliverable scope:** Intermediate presentation + Final presentation + Report + Demo (code + video)

---

## 1. Executive Summary

**CargoChain** is an end-to-end logistics platform that tokenises **every
container / consignment** as an NFT, anchors its custody chain on a permissioned
enterprise blockchain, and uses **Self-Sovereign Identity (SSI)** to authenticate
every stakeholder (shippers, carriers, customs, inspectors, ports, airlines,
railways). Commercially sensitive data (price, counterparties, route) is kept
private using **Zero-Knowledge Proofs** that still let regulators and insurers
verify compliance (temperature kept, weight respected, no customs violations)
without seeing the underlying data.

One sentence: ***A "FedEx-tracking" page, but trustless, cross-border, and
privacy-preserving by cryptographic construction.***

---

## 2. Why This Use Case?

Global logistics suffers from four chronic pains the course technologies fix
one-for-one:

| Pain                                           | Blockchain answer (concept from map)                                           |
|------------------------------------------------|--------------------------------------------------------------------------------|
| Paper Bills of Lading, forgery, lost docs      | **Verifiable Credentials** (W3C VCs) + **DIDs** + on-ledger hash anchor        |
| "Where is my container?" opacity               | **NFT per container** (ERC-721), milestone events on-chain                     |
| Trust between 20+ parties that don't know each other | **Permissioned DLT** + **BFT consensus** (instant finality)              |
| Carriers don't want to reveal pricing / routes | **ZKPs** (zk-SNARKs) — prove "temperature ≤ 4 °C all trip" without route data  |
| Slow customs release → demurrage fees          | **Smart contract escrow** — releases payment on delivery proof, auto customs   |
| Insurance fraud ("cargo was damaged at port X")| **Oracle-fed IoT** sensor data, **Merkle-batched proofs**                      |

Every problem above is a direct instance of a node in the T1-T6 concept map.

---

## 3. Scope (What the Prototype Will Actually Do)

### In scope — demo-able features

1. **Actor onboarding with SSI**
   - Shipper, Carrier, Customs, Port authority each get a **DID** (method: `did:ethr`)
   - Issue a **Verifiable Credential** ("Licensed Carrier — Maersk — valid until …")
   - Wallet stores the VC (simulated Aries-style wallet)
2. **Consignment tokenisation**
   - Shipper mints an **ERC-721 NFT** representing a container (metadata: HBL-ID,
     weight, origin, destination, commodity class)
   - NFT owner = current custodian (handoff transfers ownership on-chain)
3. **Custody transfer flow**
   - Carrier scans QR → calls `transferCustody(tokenId, toDID)` on-chain
   - Event emitted, front-end timeline updates in real time
4. **IoT oracle feed**
   - Mock temperature / GPS sensor pushes signed payloads every 30 s
   - Smart contract stores **Merkle root** of sensor batch, not each reading
5. **ZKP-gated release**
   - At delivery, carrier submits a **zk-SNARK** that proves "all 2 400 temperature
     readings ≤ 4 °C" without revealing the readings
   - Smart-contract verifier accepts proof → **escrow payment released** automatically
6. **Auditor view**
   - Regulator queries any consignment and sees: full DID chain, compliance booleans,
     proof-of-delivery Merkle root — but no commercial pricing

### Out of scope (honest)

- Real IoT hardware (we mock the sensor stream)
- Mainnet deployment (local Hardhat + Sepolia testnet only)
- Full legal framework for cross-border Bill of Lading recognition
- Production-grade Aries agents (we implement a simplified VC/DID flow)

---

## 4. Technology Choices — and Why Each Maps to the Concept Map

| Layer                | Choice                                         | T1-T6 node exercised                                |
|----------------------|------------------------------------------------|-----------------------------------------------------|
| Blockchain runtime   | **Hyperledger Besu** (private IBFT 2.0)        | Enterprise DLT · BFT · Besu · IBFT                  |
| + parallel public    | **Ethereum Sepolia testnet**                   | Public BC · PoS finality                            |
| Smart-contract lang  | **Solidity 0.8.24**                            | Solidity · ERC-721 · ERC-20 · Purpose-driven        |
| Contract standards   | **ERC-721 (NFT)**, ERC-20 (freight coin)       | Token Standards · Tokenisation · NFT                |
| Consensus (demo net) | **IBFT 2.0** (Besu), **PoS** (Sepolia)         | Consensus · BFT · Finality (instant vs determ.)     |
| Identity             | **did:ethr** (Ethereum-anchored DIDs)          | SSI · DIDs · DID Document · Verifiable Data Registry|
| Credentials          | **W3C Verifiable Credentials v2**              | VCs · VC Lifecycle · Holder/Issuer/Verifier         |
| Wallet (user-side)   | MetaMask (keys) + IndexedDB (VC store)         | Wallet · Public-key cryptography · Hot wallet       |
| Privacy              | **zk-SNARKs** via **circom 2 + snarkjs**       | ZKP · Non-interactive · zk-SNARKs · Selective discl.|
| Off-chain proofs     | **Merkle trees** for IoT batches               | Merkle · Hash · Data integrity                      |
| Oracle               | Custom signed-payload oracle (own implementation) | Oracle · Off-chain data · Future Trends          |
| Scaling (discussion) | Optimistic rollup + sharding (analysis slide)  | Rollups · Sharding · Scaling Hub                    |
| Front-end            | **Next.js 14 + React + ethers.js**             | (delivery vehicle for dApp)                         |
| IoT simulator        | Node.js generator → signs payloads with Ed25519 | Public-key crypto · Non-repudiation                |

**Consensus coverage trick:** by running two chains (Besu-IBFT + Sepolia-PoS) plus a
slide comparing PoW/PoS/DPoS/PoH/BFT/Avalanche, we *legitimately* exercise the whole
T3 family.

---

## 5. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FRONT-END (Next.js + ethers.js)                 │
│   Shipper UI · Carrier UI · Customs UI · Regulator UI · Public view │
└───────────────┬───────────────────────────────┬─────────────────────┘
                │                               │
                ▼                               ▼
┌───────────────────────────┐   ┌──────────────────────────────────┐
│  SSI LAYER (off-chain)    │   │       ORACLE & ZKP SERVICE        │
│  - DID resolver           │   │  - IoT simulator (temp/GPS)       │
│  - VC issuer / verifier   │   │  - Merkle batcher                 │
│  - Wallet (IndexedDB)     │   │  - snarkjs prover                 │
└──────────┬────────────────┘   └──────────────┬───────────────────┘
           │                                   │
           ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SMART CONTRACTS (Solidity)                       │
│   DIDRegistry · CarrierCredential (VC anchor) · ConsignmentNFT      │
│   CustodyLedger · MerkleIoT · ZKVerifier · FreightEscrow (ERC-20)   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                ┌──────────────┴────────────────┐
                ▼                               ▼
      ┌────────────────────┐        ┌────────────────────┐
      │   BESU (IBFT 2.0)  │        │  SEPOLIA (Eth PoS) │
      │  Permissioned net  │        │   Public testnet   │
      └────────────────────┘        └────────────────────┘
```

Layers match the course's Blockchain Reference Architecture (Abed et al. 2023):
Application → Modelling → Contract → Data → Network.

---

## 6. Approach / Methodology

1. **Design Science Research** — we build an IT artefact (the platform) that solves
   a demonstrated industry problem, then evaluate against defined criteria.
2. **Concept-first mapping** — every engineering choice is backed by a node in the
   T1-T6 concept map (traceability matrix kept in `TECH_MAPPING.md`).
3. **Iterative prototyping** — two sprints before intermediate, three before final.
4. **Evaluation criteria** — (a) coverage of concepts, (b) demo success, (c) gas cost
   of one custody transfer, (d) proof-generation time, (e) UX of a non-technical user
   (we test with a volunteer outside the team).

---

## 7. State of the Art — Quick Literature Anchor

| Project / Paper                      | What they did                              | What we take / leave                    |
|--------------------------------------|--------------------------------------------|-----------------------------------------|
| **TradeLens** (Maersk + IBM, 2018-22)| Permissioned BC for shipping docs          | ← Took private-channel model; left shutdown lesson: need lighter governance  |
| **Marco Polo Network** (R3 Corda)    | Trade finance on Corda                     | Inspired CorDapp flow pattern            |
| **IATA ONE Record**                  | API standard for air cargo                 | Data model for AWB fields               |
| **GSBN** (Global Shipping Business Network) | Consortium ledger                    | Governance model reference              |
| **VeChain, Ambrosus**                | IoT + BC supply chain                      | Oracle signing pattern                  |
| Dujak et al. 2024 — *Blockchain in logistics: SLR* | Academic synthesis             | Benchmark criteria                      |
| Helo & Hao 2019 — *BC applications in SCM* | Use-case taxonomy                    | Cold-chain cluster                       |
| IATA 2023 — *eAWB adoption*          | 80 % adoption by 2025                      | Motivates VC model                      |
| Kshetri 2018 — *1 Blockchain roles in logistics* | Six-role framework               | Frames our "why DLT"                    |

---

## 8. Team Roles (suggested — adapt to group size)

| Role                                 | Student | Responsibility                              |
|--------------------------------------|---------|---------------------------------------------|
| Project lead / architect             | S1      | Coherence, slides, report, state of art     |
| Smart-contract engineer              | S2      | Solidity contracts, tests, gas analysis     |
| SSI / DID & VC engineer              | S3      | DID registry, issuer/verifier, wallet       |
| ZKP & cryptography engineer          | S4      | Circom circuits, snarkjs integration, Merkle|
| Front-end & UX                       | S5      | Next.js dashboards, demo video              |

(4-person group: merge S4 into S2. 3-person group: merge S5 into S1 + S3.)

---

## 9. Main Findings (to flesh out after build)

Placeholder — to be filled from measurements:

- Custody transfer gas cost: `~___ k gas` on Besu, `~___` on Sepolia
- zk-SNARK proof generation: `___ s` on an average laptop
- Verification on-chain: `~300 k gas` (one Groth16 pairing)
- Concept-map coverage: **≥ 40 / 74 nodes** exercised in code or demo
- UX: non-technical tester completed a full "book → deliver → audit" journey in under `___` min

---

## 10. Main Challenges (already anticipated)

1. **Trusted setup** for zk-SNARKs — mitigate by using a Powers-of-Tau ceremony
2. **Oracle trust problem** — signed payloads + multiple oracle attestations
3. **Key management UX** — seed phrases scare users; we layer social-recovery hints
4. **Legal recognition** — Bill of Lading is MLETR-only in a few jurisdictions;
   we discuss on the "challenges" slide rather than claim to solve it
5. **Cross-chain interoperability** — Besu ↔ Sepolia bridge is out of scope for demo

---

## 11. Remaining Work (intermediate → final)

- [ ] Build all 7 smart contracts and reach 90 % line coverage on tests
- [ ] Implement ZKP circuit for temperature compliance
- [ ] Wire oracle simulator + IndexedDB wallet
- [ ] Build 4 role-specific dashboards in Next.js
- [ ] Record 3-minute demo video
- [ ] Write 15-20 page report `GX-report.pdf`
- [ ] Rehearse presentation × 2 (time-box to 15 min)

---

## 12. Deliverables Checklist

| Artefact                 | Filename                       | Owner     | Deadline               |
|--------------------------|--------------------------------|-----------|------------------------|
| Intermediate slides      | `GX-intermediate.pdf`          | S1        | Intermediate day       |
| Final slides             | `GX-final.pdf` (or `GX.pdf`)   | S1        | Final presentation day |
| Written report           | `GX-report.pdf`                | All       | Final day              |
| Demo code                | `GX-demo.zip` (this repo)      | S2 + S3   | Final day              |
| Demo video (≤ 5 min)     | `GX-video.mp4`                 | S5        | Final day              |

`X` = actual group number. One student uploads everything.

---

## 13. Risks & Mitigations

| Risk                                             | Likelihood | Impact | Mitigation                                    |
|--------------------------------------------------|------------|--------|-----------------------------------------------|
| ZKP circuit doesn't compile in time              | Medium     | High   | Have fallback: plaintext proof + hash anchor  |
| Team member drops out                            | Low        | High   | Roles documented, every component has a buddy |
| Demo fails live                                  | Medium     | High   | Pre-recorded backup video of the full flow    |
| Scope creep (try to implement Hyperledger Aries) | High       | Med    | Explicitly out of scope; simulate VC-issuance |

---

## 14. Repository Structure

```
BlockChain Proj/
├── PROJECT_PLAN.md          ← this file
├── TECH_MAPPING.md          ← concept map ↔ feature matrix
├── ARCHITECTURE.md          ← diagrams & component detail
├── USER_STORIES.md          ← 18 actor-goal-value stories
├── SECURITY.md              ← audit report (5 findings, 9 regression tests)
├── README.md                ← dev setup & run instructions
└── prototype/
    ├── contracts/           ← 9 Solidity files (incl. mock ZK verifier)
    ├── circuits/            ← circom ZK circuit (cold_chain)
    ├── scripts/             ← deploy + seed + IoT oracle simulator
    ├── test/                ← Hardhat tests (CargoChain · Errors · E2E · Security)
    ├── app/                 ← Next.js dashboards (5 role views) + lib helpers
    └── hardhat.config.ts
```

## 15. Verification & Testing

Run the full suite (18 tests):

```
cd prototype && npx hardhat test
```

Tests are organised by purpose so the report can cite them by file:

| File                         | Cases | Purpose                                            |
|------------------------------|-------|----------------------------------------------------|
| `test/CargoChain.test.ts`    | 2     | Happy-path mint + custody; negative path on unlicensed recipient |
| `test/Errors.test.ts`        | 5     | Custom-error selectors + decoder used by all 5 dashboards |
| `test/E2E.test.ts`           | 1     | Full shipper → carrier → customs → receiver → regulator flow with gas measurements |
| `test/Security.test.ts`      | 10    | One regression per audit finding (H-1, H-2, H-3, H-4, M-2) |
