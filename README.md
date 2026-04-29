# CargoChain — Public-Chain Logistics Platform

[![CI](https://github.com/y0c0ms/CargoChain/actions/workflows/ci.yml/badge.svg)](https://github.com/y0c0ms/CargoChain/actions/workflows/ci.yml)

> **Course:** Blockchain & DLT · **Institution:** ISCTE
> **Use Case:** 3 — Transportation (Shipping · Logistics · Airlines · Railways)

A prototype multi-modal cargo-tracking platform built on a **public EVM chain**
(Ethereum Sepolia, with local Hardhat for development). Every consignment is
registered as a unique on-chain identity (no ERC-721 — see below); every
stakeholder is authenticated via W3C **DIDs + Verifiable Credentials**; every
IoT batch is anchored as a **Merkle root** and any individual reading can be
verified on-chain by anyone.

The architecture is a direct response to the case-study evidence in
[docs/CASE_STUDIES.md](docs/CASE_STUDIES.md): TradeLens, we.trade, Marco Polo,
Contour, B3i, and ASX CHESS all failed in 2022–2023 — every one of them on a
permissioned chain. We took the opposite stance.

## Quick start

```bash
git clone https://github.com/y0c0ms/CargoChain.git
cd CargoChain/prototype && npm install && cd app && npm install && cd ../..
```

**Windows (one-click):**
```powershell
.\demo\start-all.ps1   # opens 4 terminals; app ready in ~25 s on http://localhost:3000
```

**Manual / cross-platform:**
```bash
# Terminal 1
cd prototype && npx hardhat node

# Terminal 2
cd prototype && npm run deploy:local && npx hardhat run scripts/seed.ts --network localhost

# Terminal 3
cd prototype/app && npm run dev
# http://localhost:3000
```

Full setup with troubleshooting in **[docs/SETUP.md](docs/SETUP.md)**.
PowerShell scripts documented in **[demo/README.md](demo/README.md)**.

## Repository layout

```
CargoChain/
├── README.md                  ← entry point (you are here)
├── demo/                      ← PowerShell launchers (Windows)
│   ├── README.md              ← how to run the .ps1 scripts
│   ├── start-all.ps1          ← orchestrator — opens 4 terminals
│   ├── start-node.ps1         ← T1: Hardhat node
│   ├── deploy-seed.ps1        ← T2: deploy + seed
│   ├── start-app.ps1          ← T3: Next.js
│   ├── start-oracle.ps1       ← T4: IoT oracle
│   └── stop-all.ps1           ← kill everything
├── docs/                      ← project documentation
│   ├── SETUP.md               ← install, deploy, seed, run, test
│   ├── PROJECT_PLAN.md        ← scope, tech choices, deliverables
│   ├── ARCHITECTURE.md        ← layered diagram, contract details
│   ├── TECH_MAPPING.md        ← T1-T6 concept-map traceability
│   ├── USER_STORIES.md        ← actor-goal stories with concept tags
│   ├── SECURITY.md            ← threat model + audit findings
│   └── CASE_STUDIES.md        ← TradeLens, MediLedger, GSBN, VeChain & 11 others
└── prototype/
    ├── contracts/             ← 4 Solidity files (DIDRegistry, CarrierCredential, ConsignmentRegistry, MerkleIoT)
    ├── scripts/               ← deploy + seed + IoT oracle simulator
    ├── test/                  ← 15 Hardhat tests
    ├── app/                   ← Next.js 14 dashboards (5 roles, incl. live IoT simulation)
    └── hardhat.config.ts
```

## Documentation

| Document                                     | What's inside                                                    |
|----------------------------------------------|------------------------------------------------------------------|
| [docs/SETUP.md](docs/SETUP.md)               | step-by-step dev environment, deploy, seed, test, troubleshoot   |
| [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) | executive overview, technology choices                           |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | system diagram + per-contract details                            |
| [docs/TECH_MAPPING.md](docs/TECH_MAPPING.md) | every T1-T6 concept-map node ↔ implementation file               |
| [docs/USER_STORIES.md](docs/USER_STORIES.md) | actor-goal stories in As-X-I-want-Y-so-that-Z form               |
| [docs/SECURITY.md](docs/SECURITY.md)         | audit findings + regression tests + trust-boundaries diagram     |
| [docs/CASE_STUDIES.md](docs/CASE_STUDIES.md) | 14 industry case studies — 6 failures, 8 survivors, with sources |

## Concept-map coverage (summary)

| Area                  | Exercised in                            | Concepts covered                                |
|-----------------------|-----------------------------------------|-------------------------------------------------|
| DLT + Blockchain      | Public chain (Ethereum Sepolia)         | DLT · Blockchain · Block · Tx · P2P             |
| Cryptography          | Hashes, Merkle, public-key signing      | Hash · Merkle · PKI · Ed25519 · Data integrity  |
| Consensus & Finality  | PoS (Ethereum)                          | PoS · Validators · Slashing · Finality · EIP-1559 |
| Smart Contracts       | 4 Solidity contracts                    | SC Definition · Purpose-driven · Solidity       |
| State machines        | ConsignmentRegistry status enum         | Created → InTransit → Delivered                 |
| SSI                   | DIDRegistry + CarrierCredential         | SSI · DIDs · DID Document · VC · VC Lifecycle   |
| On-/off-chain pattern | manifest hash on-chain, JSON off-chain  | Hash anchoring · Selective Disclosure           |
| Oracles / IoT         | `oracle-simulator.ts` + MerkleIoT       | Oracle · Ed25519 · Merkle proof verification    |

Full traceability matrix in [docs/TECH_MAPPING.md](docs/TECH_MAPPING.md).

## Test summary

```
cd prototype && npx hardhat test
# 15 passing
```

| File                       | Cases | Purpose                                                       |
|----------------------------|-------|---------------------------------------------------------------|
| `test/CargoChain.test.ts`  | 2     | Happy-path create + custody + delivery; unlicensed-recipient negative path |
| `test/Errors.test.ts`      | 5     | Custom-error selectors used by every dashboard                |
| `test/E2E.test.ts`         | 1     | Full 5-dashboard flow with gas measurements + IoT verification |
| `test/Security.test.ts`    | 7     | Audit regressions: H-1, H-2, H-3 (IoT integrity)              |

## License

MIT — see `LICENSE` (to be added).
