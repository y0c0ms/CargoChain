# CargoChain — Blockchain for Multi-Modal Logistics

[![CI](https://github.com/y0c0ms/CargoChain/actions/workflows/ci.yml/badge.svg)](https://github.com/y0c0ms/CargoChain/actions/workflows/ci.yml)

> **Course:** Blockchain & DLT · **Institution:** ISCTE
> **Use Case:** 3 — Transportation (Shipping · Logistics · Airlines · Railways)

A prototype multi-modal cargo-tracking platform that tokenises each container
as an NFT, authenticates every party with Self-Sovereign Identity (DIDs +
W3C Verifiable Credentials), and uses zero-knowledge proofs to demonstrate
cold-chain compliance without revealing commercial data.

## Quick start

```bash
git clone https://github.com/y0c0ms/CargoChain.git
cd CargoChain/prototype && npm install && cd app && npm install && cd ../..

# Terminal 1
cd prototype && npx hardhat node

# Terminal 2
cd prototype && npm run deploy:local && npx hardhat run scripts/seed.ts --network localhost

# Terminal 3
cd prototype/app && npm run dev
# http://localhost:3000
```

Full setup with troubleshooting in **[docs/SETUP.md](docs/SETUP.md)**.

## Repository layout

```
CargoChain/
├── README.md                  ← entry point (you are here)
├── docs/                      ← project documentation
│   ├── SETUP.md               ← install, deploy, seed, run, test
│   ├── PROJECT_PLAN.md        ← scope, tech choices, deliverables
│   ├── ARCHITECTURE.md        ← layered diagram, contract details
│   ├── TECH_MAPPING.md        ← T1-T6 concept-map traceability
│   ├── USER_STORIES.md        ← 18 actor-goal stories
│   └── SECURITY.md            ← threat model + audit findings
└── prototype/
    ├── contracts/             ← 9 Solidity files
    ├── circuits/              ← circom cold-chain ZK circuit
    ├── scripts/               ← deploy + seed + IoT oracle simulator
    ├── test/                  ← 18 Hardhat tests
    ├── app/                   ← Next.js 14 dashboards (5 roles)
    └── hardhat.config.ts
```

## Documentation

| Document                                     | What's inside                                                  |
|----------------------------------------------|----------------------------------------------------------------|
| [docs/SETUP.md](docs/SETUP.md)               | step-by-step dev environment, deploy, seed, test, troubleshoot |
| [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) | executive overview, technology choices                         |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | system diagram + per-contract details                          |
| [docs/TECH_MAPPING.md](docs/TECH_MAPPING.md) | every T1-T6 concept-map node ↔ implementation file             |
| [docs/USER_STORIES.md](docs/USER_STORIES.md) | 18 stories in As-X-I-want-Y-so-that-Z form, mapped to tests    |
| [docs/SECURITY.md](docs/SECURITY.md)         | 5 audit findings + 9 regression tests + trust-boundaries diagram |

## Concept-map coverage (summary)

| Area                  | Exercised in                          | Concepts covered                                |
|-----------------------|---------------------------------------|-------------------------------------------------|
| DLT + Blockchain      | Besu + Sepolia networks               | DLT · Blockchain · Block · Tx · P2P             |
| Cryptography          | Hashes, Merkle, keys, ZKP             | Hash · Merkle · PKI · ZKP · zk-SNARKs           |
| Consensus & Finality  | IBFT 2.0 (Besu) + PoS (Sepolia)       | BFT · PoS · Finality · Throughput               |
| Smart Contracts       | 9 Solidity contracts                  | SC Definition · Purpose-driven · Solidity       |
| Tokens                | ERC-721 NFTs + ERC-20 payment         | NFT · ERC-721 · ERC-20 · Tokenisation           |
| SSI                   | DIDRegistry + CarrierCredential       | SSI · DIDs · DID Document · VC · VC Lifecycle   |
| Privacy               | ZK circuit + on-ledger/off-ledger     | ZKP · Selective Disclosure · Privacy Mechanisms |
| Enterprise platforms  | Besu deployment                        | Besu · Fabric · Corda · Canton · BFT            |
| Scaling               | Merkle batching of IoT                | Merkle · Scaling Hub · Rollup analysis          |
| Oracles / IoT         | `oracle-simulator.ts`                 | Oracle · Ed25519 · Non-repudiation              |

Full traceability matrix in [docs/TECH_MAPPING.md](docs/TECH_MAPPING.md).

## Test summary

```
cd prototype && npx hardhat test
# 18 passing
```

| File                         | Cases | Purpose                                                |
|------------------------------|-------|--------------------------------------------------------|
| `test/CargoChain.test.ts`    | 2     | Happy-path mint + custody, negative path on unlicensed |
| `test/Errors.test.ts`        | 5     | Custom-error decoder used by every dashboard           |
| `test/E2E.test.ts`           | 1     | Full 5-dashboard flow with gas measurements            |
| `test/Security.test.ts`      | 10    | One regression per audit finding (H-1, H-2, H-3, H-4, M-2) |

## License

MIT — see `LICENSE` (to be added).
