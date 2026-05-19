# PROJECT PLAN — GX: CargoChain

## Public-Chain Multi-Modal Logistics Platform with IoT Data Integrity



> **Course:** Blockchain & DLT — ISCTE
> **Use Case:** 3 — Transportation (Shipping, Logistics, Airlines, Railways)
> **Professors:** Catarina Ferreira da Silva (T1-T2), Luís Marado (T3-T6)
> **Deliverable scope:** Intermediate presentation + Final presentation + Report + Demo (code + video)

---

## 1. Executive Summary

**CargoChain** is a logistics platform built on a **public EVM chain**
(local Hardhat for development, EVM-compatible for any public deployment)
that registers each container/consignment as a unique on-chain entity,
authenticates stakeholder custody handovers by wallet signature (with DID/VC
infrastructure noted as a production extension), and anchors IoT sensor batches
as Merkle roots so any individual reading can be cryptographically verified
on-chain by anyone.

The architecture deliberately avoids three patterns that the industry's
recent track record shows do not scale:

1. **Permissioned consortium chains** — TradeLens, we.trade, Marco Polo,
   Contour, B3i, and ASX CHESS all failed in 2022–2023, every one of them
   running on Hyperledger Fabric, R3 Corda, or a custom permissioned stack.
2. **ERC-721 as a data store** — NFTs are designed for token ownership.
   Embedding manifest data inside an NFT struct misuses the standard and
   forces expensive on-chain storage.
3. **On-chain payment for cargo** — adds escrow, ZK, and dispute-resolution
   complexity orthogonal to the actual blockchain-data-integrity question.

See [CASE_STUDIES.md](CASE_STUDIES.md) for the full evidence behind these
choices.

One-sentence pitch: ***A "FedEx-tracking" page, but trustless, public, and
cryptographically auditable end-to-end.***

---

## 2. Why This Use Case?

Global logistics suffers from four chronic pains the course technologies fix
one-for-one:

| Pain                                              | Blockchain answer (concept from map)                                |
|---------------------------------------------------|---------------------------------------------------------------------|
| Paper Bills of Lading, forgery, lost docs         | **On-chain manifest hash commitment** (keccak256 anchor + IPFS URI) |
| "Where is my container?" opacity                  | **On-chain consignment registry** + custody handover events         |
| Trust between 20+ parties that don't know each other | **Public DLT** + **PoS finality** — no operator to trust         |
| Carriers don't trust each other's IoT data        | **Merkle-batched proofs** — any reading can be verified on-chain    |
| Insurance fraud ("cargo was damaged at port X")   | **Oracle-fed IoT** sensor data, **Merkle-batched proofs**           |

Every problem above is a direct instance of a node in the T1-T6 concept map.

---

## 3. Scope (What the Prototype Will Actually Do)

### In scope — demo-able features

1. **Consignment registration**
   - Shipper signs `createConsignment(manifestHash, manifestURI)` directly — no operator gating
   - The full manifest JSON lives off-chain at `manifestURI`; only its
     keccak256 hash is on-chain
   - State machine: `Created → InTransit → Delivered`
2. **Custody transfer flow**
   - Carrier calls `transferCustody(id, to, location, handshake)`
   - Current custodian check enforced on-chain (`msg.sender == currentHolder`)
   - Custody history is appended on-chain
   - NOTE: DID/VC gating on the recipient is a documented production extension
     (see SECURITY.md)
3. **IoT oracle feed**
   - Mock temperature / GPS sensor pushes signed payloads every 1 s
   - Smart contract stores **Merkle root** of each 8-reading batch
   - Allowlisted oracles only (audit fix H-2)
4. **On-chain IoT verification**
   - Simulation dashboard subscribes to `BatchAnchored` events
   - Any reading + its Merkle proof can be verified on-chain
   - Tampered readings or wrong proofs are rejected (audit test H-3)
5. **Auditor view**
   - Regulator queries any consignment and sees: shipper, current custodian,
     status, manifest hash, manifest URI, full custody hop list, IoT batch count

### Out of scope (honest)

- Real IoT hardware (we mock the sensor stream)
- Full legal framework for cross-border Bill of Lading recognition
- DID/VC contracts (DIDRegistry, CarrierCredential) — discussed in report
  as production extensions; removed from prototype per professor feedback
- **On-chain payment** (originally in scope; removed per professor feedback)
- **ZK escrow** (same)
- **ERC-721 token wrapper** (replaced with a plain registry per professor feedback)

---

## 4. Technology Choices — and Why Each Maps to the Concept Map

| Layer                  | Choice                                            | T1-T6 node exercised                                |
|------------------------|---------------------------------------------------|-----------------------------------------------------|
| Blockchain runtime     | **EVM-compatible** (public PoS testnet)           | Public BC · DLT · Block · Tx · P2P                  |
| Local dev environment  | **Hardhat node**                                  | Block · Tx · Mempool                                |
| Smart-contract lang    | **Solidity 0.8.26**                               | Solidity · Smart Contract · Purpose-driven          |
| Contract design        | Plain registry, **no token standard**             | Smart Contract · State Machine · Tokenisation (discussion) |
| Consensus              | **PoS** (Ethereum)                                 | PoS · Validators · Slashing · Finality              |
| Identity (discussion)  | DIDs + W3C VCs — analysed as production extension | SSI · DIDs · DID Document · Verifiable Data Registry|
| Wallet (user-side)     | MetaMask + dev-signer fallback                    | Wallet · Public-key cryptography · Hot wallet       |
| Off-chain proofs       | **Merkle trees** for IoT batches                  | Merkle · Hash · Data integrity                      |
| Oracle                 | Custom signed-payload oracle (Ed25519, m-of-n)    | Oracle · Off-chain data · Non-repudiation           |
| Scaling (discussion)   | Optimistic rollup + sharding (analysis slide)     | Rollups · Sharding · Scaling Hub                    |
| Front-end              | **Next.js 14 + React + ethers.js v6**             | (delivery vehicle for the dApp)                     |
| IoT simulator          | Node.js generator → signs payloads with Ed25519    | Public-key crypto · Non-repudiation                 |

**Removed from earlier versions** (with rationale):

| Removed                  | Why                                                          |
|--------------------------|--------------------------------------------------------------|
| Hyperledger Besu / IBFT  | TradeLens et al. proved permissioned chains have a structural adoption problem (see CASE_STUDIES.md) |
| ERC-721 ConsignmentNFT   | The token standard's transfer semantics don't model physical custody handovers; storing manifest data on-chain misuses storage |
| FreightEscrow + FreightToken | Payment isn't the course's core blockchain content       |
| circom / snarkjs / ZK escrow | ZK was tied to payment; without payment, IoT integrity via Merkle proofs covers the same "verify without revealing" theme |
| DIDRegistry + CarrierCredential | Removed per professor feedback; documented as production extension |

---

## 5. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FRONT-END (Next.js + ethers.js)                 │
│         Shipper UI · Carrier UI · Simulation UI · Regulator         │
└───────────────┬─────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SMART CONTRACTS (2 Solidity files)            │
│              ConsignmentRegistry · MerkleIoT                     │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
                    ┌────────────────────┐
                    │ Local Hardhat (dev)│
                    │ instant blocks     │
                    └────────────────────┘

    OFF-CHAIN SIDECARS
  ┌────────────────────────────┐    ┌────────────────────────────────┐
  │ IoT Oracle Simulator       │    │ Manifest JSON (IPFS / HTTPS)   │
  │ (Node.js, Ed25519 signed)  │    │ hashed on-chain, fetched on UI │
  └────────────────────────────┘    └────────────────────────────────┘
```

Layers match the course's Blockchain Reference Architecture (Abed et al. 2023):
Application → Modelling → Contract → Data → Network.

---

## 6. Approach / Methodology

1. **Design Science Research** — we build an IT artefact (the platform) that
   solves a demonstrated industry problem, then evaluate against defined criteria.
2. **Concept-first mapping** — every engineering choice is backed by a node
   in the T1-T6 concept map (traceability matrix in [TECH_MAPPING.md](TECH_MAPPING.md)).
3. **Case-study grounding** — every architectural choice has a precedent in
   [CASE_STUDIES.md](CASE_STUDIES.md). Permissioned-chain failure modes drove
   the public-chain decision; production deployments (CargoX on Ethereum,
   OriginTrail on multi-chain DKG) validate the public-chain pattern.
4. **TDD discipline** — every audit finding has a regression test before the fix.
5. **Evaluation criteria** — (a) coverage of concepts, (b) demo success,
   (c) gas cost of one custody handover, (d) Merkle verify gas, (e) UX of a
   non-technical user.

---

## 7. State of the Art

A comprehensive review of 14 platforms (6 failures, 8 survivors) lives in
[CASE_STUDIES.md](CASE_STUDIES.md) with primary sources for every claim.

The headline takeaways:

- **Failures (2022-2023):** TradeLens (Maersk + IBM), we.trade (12 EU banks),
  Marco Polo (R3 + 30 banks), Contour (R3 + 9 banks), B3i (insurance
  consortium), ASX CHESS (securities settlement). All on permissioned DLT.
  All killed by the same mechanic: insufficient adoption to justify
  member-dues funding while waiting for competitors to join.
- **Survivors:** IBM Food Trust (Walmart mandate), VeChain (public chain,
  BMW + Walmart China), GSBN (post-TradeLens, neutral non-profit), MediLedger
  (anchored to DSCSA legal mandate), WaveBL + **CargoX** (eBL — CargoX runs
  on **public Ethereum** and processes 3 million+ documents across 100+
  countries), OriginTrail (public DKG, deployed at Swiss Federal Railways),
  Komgo (last surviving trade-finance consortium).

The pattern is unambiguous: public chains + adoption forcing functions
(regulatory mandate or commercial pressure) survive; permissioned consortiums
funded by member dues fail. CargoChain takes the public-chain stance.

---

## 8. Team Roles (suggested — adapt to group size)

| Role                                 | Student | Responsibility                              |
|--------------------------------------|---------|---------------------------------------------|
| Project lead / architect             | S1      | Coherence, slides, report, state of art     |
| Smart-contract engineer              | S2      | Solidity contracts, tests, gas analysis     |
| IoT / oracle engineer                | S3      | Oracle simulator, Merkle batcher, simulation page |
| Front-end & UX                       | S4      | Next.js dashboards, demo video              |

(3-person group: merge S3 into S2. 2-person group: merge S4 into S1.)

---

## 9. Main Findings (to flesh out after build)

Placeholder — to be filled from measurements:

- Custody handover gas cost: ~155 k gas on Hardhat (measured)
- Consignment creation gas: ~148 k gas (measured)
- IoT batch anchor gas: ~166 k gas (measured)
- IoT batch verify gas: <30 k gas (constant-cost view function)
- Concept-map coverage: see TECH_MAPPING.md for full matrix
- UX: non-technical tester completed a full "create → handover → verify → audit" journey in under `___` min

---

## 10. Main Challenges (already anticipated)

1. **Oracle trust problem** — signed payloads + multiple oracle attestations + on-chain allowlist (H-2 fix).
2. **Key management UX** — seed phrases scare users; the dev-signer fallback
   means the demo works without MetaMask. Production would need WalletConnect
   + social recovery.
3. **Legal recognition** — Bill of Lading is MLETR-only in a few jurisdictions;
   we discuss on the "challenges" slide rather than claim to solve it.
4. **DID/VC gap** — the prototype omits DID/VC gating on custody recipients.
   The threat model and production mitigation are documented in SECURITY.md.

---

## 11. Remaining Work (intermediate → final)

- [x] Build all smart contracts (2 of them) and reach 90 % line coverage on tests
- [x] Wire oracle simulator + Merkle proof export
- [x] Build 4 role-specific dashboards in Next.js (incl. live Simulation page)
- [x] Run a security audit and fix all H-severity findings
- [x] Compile 14-case-study state-of-the-art document
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
| Demo video (≤ 5 min)     | `GX-video.mp4`                 | S4        | Final day              |

`X` = actual group number. One student uploads everything.

---

## 13. Risks & Mitigations

| Risk                                             | Likelihood | Impact | Mitigation                                    |
|--------------------------------------------------|------------|--------|-----------------------------------------------|
| Public-chain RPC outage during demo              | Medium     | High   | Live demo runs on local Hardhat anyway        |
| Team member drops out                            | Low        | High   | Roles documented, every component has a buddy |
| Demo fails live                                  | Medium     | High   | Pre-recorded backup video of the full flow    |

---

## 14. Repository Structure

```
CargoChain/
├── README.md               ← entry point
├── docs/
│   ├── SETUP.md            ← install, deploy, seed, run, test
│   ├── PROJECT_PLAN.md     ← this file
│   ├── ARCHITECTURE.md     ← layered diagram, contract details
│   ├── TECH_MAPPING.md     ← T1-T6 concept-map traceability
│   ├── USER_STORIES.md     ← actor-goal stories
│   ├── SECURITY.md         ← threat model + audit findings
│   └── CASE_STUDIES.md     ← 14 industry case studies with sources
└── prototype/
    ├── contracts/          ← 2 Solidity files
    ├── scripts/            ← deploy + seed + IoT oracle simulator
    ├── test/               ← 14 Hardhat tests
    ├── app/                ← Next.js 14 dashboards (4 roles)
    └── hardhat.config.ts
```

## 15. Verification & Testing

Run the full suite:

```
cd prototype && npx hardhat test
# 14 passing
```

| File                         | Cases | Purpose                                            |
|------------------------------|-------|----------------------------------------------------|
| `test/CargoChain.test.ts`    | 2     | Happy-path create + custody + delivery; non-custodian negative |
| `test/Errors.test.ts`        | 6     | Custom-error selectors + on-chain triggers + decoder used by every dashboard |
| `test/E2E.test.ts`           | 1     | Full 4-dashboard flow with gas measurements + IoT verification |
| `test/Security.test.ts`      | 5     | Audit regressions: H-2 (oracle), H-3 (IoT integrity), custody gate |
