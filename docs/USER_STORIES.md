# USER STORIES — CargoChain

Format: **As a** [actor] **I want** [capability] **so that** [value], exercising
[T1-T6 concept]. Each story maps to a concrete screen and/or contract call.

Numbered so the report can cite them as US-01 … US-NN.

---

## Actors

| ID | Actor                  | Example          | On-chain identity    |
|----|------------------------|------------------|----------------------|
| A1 | Shipper                | Pfizer           | DID + Consignment owner |
| A2 | Carrier                | TAP Air Cargo    | DID + LicensedCarrier VC |
| A3 | Customs Officer        | Alfândega PT     | DID + CustomsOfficer VC  |
| A4 | Receiver               | MSF Luanda       | DID + PharmaGrade VC     |
| A5 | Regulator / Auditor    | Tribunal de Contas | Read-only auditor DID  |
| A6 | Issuer (Licensing Authority) | IMT / ANAC / IATA | DID, signs VCs     |
| A7 | IoT Oracle Operator    | Sensitech Gateway| Ed25519 signing key      |

---

## Core on-chain stories

### US-01 · Shipper tokenises a consignment
**As** a Shipper (A1)
**I want** to mint a non-fungible token that represents a physical container,
with its House Bill of Lading, route, weight, commodity class and temperature
bounds baked into the metadata,
**so that** every downstream party shares one tamper-proof reference for the
shipment.
*Concepts:* NFT · ERC-721 · Tokenisation · Smart Contract · Hash of manifest.
*Implementation:* `ConsignmentNFT.mint(shipper, metadataURI, manifest)` — Shipper dashboard "Mint Consignment" button.
*Acceptance:* a new `tokenId` is returned, the shipper owns the NFT, a `ConsignmentMinted` event is emitted.

---

### US-02 · Shipper funds freight escrow
**As** a Shipper (A1)
**I want** to lock the agreed freight amount in an on-chain escrow keyed to
the consignment tokenId,
**so that** the carrier is paid automatically on verified delivery and no
manual invoicing is needed.
*Concepts:* ERC-20 · Smart Contract escrow · Atomic settlement.
*Implementation:* `FreightToken.approve(...)` + `FreightEscrow.fund(tokenId, carrier, receiver, amount)`.
*Acceptance:* `EscrowFunded` emitted, `escrows(tokenId).amount > 0`, shipper's FRT balance decremented.

---

### US-03 · Licensing authority issues a Verifiable Credential
**As** an Issuer (A6) — e.g. IMT or ANAC —
**I want** to sign a W3C Verifiable Credential stating that a party is a
Licensed Carrier / Customs Officer / Pharma-grade receiver, and anchor its
hash on-chain,
**so that** smart contracts can verify the credential independently without
holding personal data on chain.
*Concepts:* SSI · DIDs · Verifiable Credentials · Issuer-Holder-Verifier · On-ledger/Off-ledger.
*Implementation:* `CarrierCredential.issueVC(subject, schema, vcHash, notBefore, expiry)`.
*Acceptance:* `VCIssued` event, `isValid(vcHash) == true`, `subjectHasActiveVC(subject, schema) == true`.

---

### US-04 · Carrier accepts custody
**As** a Carrier (A2)
**I want** to take custody of a consignment NFT by presenting my VC, signing
a handshake nonce with my DID key, and logging the location,
**so that** I inherit responsibility for the goods and the transfer is
uniquely attributable to me.
*Concepts:* Identity + Smart Contract integration · Immutability · Event log · DIDs.
*Implementation:* `ConsignmentNFT.setApprovalForAll` + `CustodyLedger.transferCustody(tokenId, to, unLocode, handshake)` — Carrier dashboard "Transfer Custody" button.
*Acceptance:* transfer reverts with `RecipientNotLicensed` if receiver lacks VC; succeeds with `CustodyTransferred` event otherwise; `hopCount` increments.

---

### US-05 · Carrier hands off to next leg
**As** a Carrier (A2) on an intermediate leg (e.g. truck → air),
**I want** to transfer custody to the next licensed carrier,
**so that** the chain of responsibility continues without any paper CMR/AWB
changing hands.
*Concepts:* Multi-party flows · Custody chain · Smart Contract.
*Implementation:* same `transferCustody` call with new `to`.
*Acceptance:* chain of `Handover` records accumulates under `historyOf(tokenId)`.

---

### US-06 · Customs officer verifies credentials on crossing
**As** a Customs Officer (A3)
**I want** to check, for a given party address and schema, whether a valid
VC is on-chain,
**so that** I can clear or block the shipment without reading any private
commercial data.
*Concepts:* SSI · Selective disclosure · Verifier role.
*Implementation:* `CarrierCredential.subjectHasActiveVC(addr, schema)` — Customs dashboard "Check VC" button.
*Acceptance:* returns `true` for a valid, non-revoked, unexpired credential; `false` otherwise.

---

### US-07 · IoT oracle anchors a batch of sensor readings
**As** an Oracle Operator (A7)
**I want** to collect ~8-2400 signed temperature + GPS readings per
consignment, build a Merkle tree and anchor just the root on-chain,
**so that** compliance can be proven later without writing every reading on
chain (~99% gas saving).
*Concepts:* Merkle Tree · Hash · Oracle · Ed25519 (m-of-n) · Scaling.
*Implementation:* `scripts/oracle-simulator.ts` → `MerkleIoT.anchorBatch(tokenId, root, count, firstTs, lastTs)`.
*Acceptance:* `BatchAnchored` event; `verifyReading(batchId, leaf, proof)` accepts a leaf with a valid path.

---

### US-08 · Receiver submits cold-chain ZK compliance proof
**As** a Receiver (A4)
**I want** to produce a zk-SNARK proving that every temperature reading in
the journey was within [2 °C, 8 °C], without revealing the readings
themselves,
**so that** the escrow releases automatically while commercial temperature
curves stay confidential (an insurer / regulator sees only "compliant: true").
*Concepts:* ZKP · zk-SNARKs · Non-interactive · Selective Disclosure · Completeness · Soundness · Zero-Knowledge.
*Implementation:* circom `cold_chain.circom` + snarkjs browser prover → `FreightEscrow.releaseWithProof(tokenId, a, b, c, publicInputs)`.
*Acceptance:* proof accepted ⇒ `EscrowReleased` event, carrier's FRT balance increases by `amount`, NFT owner is the receiver.

---

### US-09 · Shipper refunds a failed shipment
**As** a Shipper (A1)
**I want** to reclaim the escrowed amount if the shipment fails or is
cancelled before release,
**so that** capital is not stranded.
*Concepts:* Smart Contract escrow · State machine.
*Implementation:* `FreightEscrow.refund(tokenId)`.
*Acceptance:* `EscrowRefunded`; shipper balance restored; escrow state locked.

---

### US-10 · Regulator runs an end-to-end audit
**As** a Regulator / Auditor (A5)
**I want** to see, for any consignment, its full custody chain, IoT-batch
count, and compliance verdict — but NOT the commercial freight rate —
**so that** I can confirm legal and ESG compliance without needing NDAs with
the carriers.
*Concepts:* Auditability · Privacy · Transparency · Selective disclosure.
*Implementation:* Regulator dashboard "Run Audit" — reads `ConsignmentNFT.getManifest`, `CustodyLedger.historyOf`, `MerkleIoT.batchesOf`.
*Acceptance:* audit view shows HBL, route, hops, IoT batches; no `amount` or `shipper.balance` leaks.

---

### US-11 · Party registers its self-sovereign identity
**As** any actor (A1–A7)
**I want** to register a DID with a JSON-LD DID Document on a decentralized
registry,
**so that** my identity is portable, I hold my own keys, and no centralized
provider can gate my access.
*Concepts:* SSI · DIDs · DID Document · Verifiable Data Registry · Decentralization.
*Implementation:* `DIDRegistry.register(docHash, docURI)`.
*Acceptance:* `DIDRegistered` event; `isActive(subject)` becomes true; the URI resolves to a DID Document whose keccak256 equals `docHash`.

---

### US-12 · Party rotates / revokes keys
**As** any actor,
**I want** to update my DID Document (e.g. key rotation) or revoke my DID on
compromise,
**so that** stolen keys cannot keep signing on my behalf.
*Concepts:* SSI · Key lifecycle · Cryptography.
*Implementation:* `DIDRegistry.updateDocument(...)` and `DIDRegistry.revoke()`.
*Acceptance:* `DIDUpdated` / `DIDRevoked` events; VCs issued to a revoked DID return `isValid == false`.

---

### US-13 · Issuer revokes a credential
**As** an Issuer (A6),
**I want** to revoke a VC I previously issued (e.g. if a carrier's license
lapses),
**so that** the smart contract immediately stops accepting it.
*Concepts:* VC Lifecycle · Revocation · Issuer authority.
*Implementation:* `CarrierCredential.revokeVC(vcHash)`.
*Acceptance:* `VCRevoked` event; `isValid(vcHash) == false`; any subsequent custody transfer to that subject reverts.

---

## Cross-cutting / quality stories

### US-14 · Operator runs on a private permissioned chain
**As** a consortium operator,
**I want** to deploy the stack to a Hyperledger Besu network with IBFT 2.0
consensus,
**so that** throughput is ~1000 TPS with instant finality and only whitelisted
validators produce blocks.
*Concepts:* Private/Permissioned BC · BFT · IBFT 2.0 · Finality (instant) · Besu.
*Implementation:* `hardhat.config.ts` → `networks.besu`; deploy via `npm run deploy:besu`.
*Acceptance:* every deployed contract reachable at the addresses printed by `deploy.ts`.

---

### US-15 · Operator mirrors to a public chain
**As** a consortium operator,
**I want** to additionally deploy to Ethereum Sepolia,
**so that** third parties can audit key records (e.g. DID registry hashes)
without joining the consortium.
*Concepts:* Public BC · PoS · Deterministic finality · Cross-chain.
*Implementation:* `npm run deploy:sepolia`.
*Acceptance:* the same contract addresses work against `NEXT_PUBLIC_RPC=https://rpc.sepolia.org`.

---

### US-16 · Preview-friendly UX (no wallet extension needed)
**As** an evaluator or demo viewer,
**I want** the UI to fall back to a development signer when no MetaMask is
injected,
**so that** the demo runs in any browser — screenshots, headless CI, preview
panes — without crypto-wallet setup.
*Concepts:* Wallet · Public-key cryptography · UX.
*Implementation:* `app/lib/signer.ts` — tries `window.ethereum` first, then `NEXT_PUBLIC_RPC` + `NEXT_PUBLIC_DEV_KEY`.
*Acceptance:* on a stock browser the "Mint Consignment" flow completes and the address badge reads `dev · 0xf39F…2266`.

---

### US-17 · Negative path — unlicensed recipient is rejected
**As** a Carrier,
**I want** `transferCustody` to revert if the recipient is not a licensed
carrier (no valid VC),
**so that** the chain cannot accidentally hand off to an unauthorised party.
*Concepts:* Business-rule validation · Custom errors · Identity + Smart Contracts.
*Implementation:* revert `RecipientNotLicensed()` (selector `0x3cf806b4`) when the check fails.
*Acceptance:* UI shows "error: execution reverted (RecipientNotLicensed)" when handing off to e.g. `0xf39Fd6…` (deployer) which has no `LicensedCarrier` VC. **This is exactly the error you just hit — it's a feature, not a bug.**

---

### US-18 · Privacy-preserving compliance to third-party insurer
**As** an Insurer (not modelled as a distinct dashboard but a consumer of
regulator data),
**I want** proof that the cold chain was respected without seeing the
readings or the commercial rate,
**so that** I can settle claims (or refuse fraudulent ones) with
mathematically verifiable evidence.
*Concepts:* ZKP · Selective disclosure · Privacy mechanisms.
*Implementation:* `FreightEscrow.releaseWithProof` publishes proof hash; insurer queries `escrows(tokenId).released`.
*Acceptance:* an insurer can verify release happened and the ZK proof was accepted, but can't read individual temperature readings or the 420 FRT amount from a regulator-facing query.

---

## Quick map: story → test → slide

| Story | Test in `prototype/test/E2E.test.ts` line | Slide in the final deck |
|-------|-------------------------------------------|-------------------------|
| US-01 | "mint NFT"                                | Slide 6 demo step 0:00  |
| US-02 | "fund escrow"                             | Slide 5 (case study)    |
| US-03 | "issue VC" (seed.ts)                      | Slide 6 demo step 0:25  |
| US-04, US-05 | "transferCustody"                  | Slide 6 demo step 0:50  |
| US-06 | "subjectHasActiveVC"                      | Slide 6 demo step 1:45  |
| US-07 | oracle-simulator.ts                       | Slide 6 demo step 1:15  |
| US-08 | "releaseWithProof"                        | Slide 6 demo step 2:10  |
| US-10 | "historyOf + getManifest + batchesOf"     | Slide 6 demo step 2:30  |
| US-17 | negative path                             | Slide 8 results table   |

Run `cd prototype && npx hardhat test test/E2E.test.ts` — every story above is exercised by that one command and the gas cost feeds straight into the Results slide.
