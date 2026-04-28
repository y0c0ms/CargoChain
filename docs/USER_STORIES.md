# USER STORIES — CargoChain

Format: **As a** [actor] **I want** [capability] **so that** [value], exercising
[T1-T6 concept]. Each story maps to a concrete screen and/or contract call.

Numbered so the report can cite them as US-01 … US-NN.

> **Scope changes (April 2026):** payment / escrow / ZK stories (originally
> US-02, US-08, US-09, US-18) were removed after the professor-driven scope
> reduction. Numbering is preserved with placeholders so existing references
> stay valid; the gap is part of the historical record.

---

## Actors

| ID | Actor                  | Example          | On-chain identity        |
|----|------------------------|------------------|--------------------------|
| A1 | Shipper                | Pfizer           | DID + creates consignments |
| A2 | Carrier                | TAP Air Cargo    | DID + LicensedCarrier VC |
| A3 | Customs Officer        | Alfândega PT     | DID + CustomsOfficer VC  |
| A4 | Receiver               | MSF Luanda       | DID + LicensedCarrier VC |
| A5 | Regulator / Auditor    | Tribunal de Contas | Read-only auditor      |
| A6 | Issuer (Licensing Authority) | IMT / ANAC / IATA | DID, signs VCs       |
| A7 | IoT Oracle Operator    | Sensitech Gateway| Ed25519 signing key      |

---

## Core on-chain stories

### US-01 · Shipper registers a consignment
**As** a Shipper (A1)
**I want** to register a new consignment on-chain by anchoring the keccak256
hash of its off-chain manifest JSON,
**so that** every downstream party shares one tamper-proof reference for the
shipment without exposing commercial detail in the storage of the contract.
*Concepts:* Smart Contract · Hash anchoring · State machine · On-/off-chain pattern.
*Implementation:* `ConsignmentRegistry.createConsignment(manifestHash, manifestURI)` — Shipper dashboard "Create Consignment" button.
*Acceptance:* a new `id` is returned, `consignments(id).shipper` equals the caller, a `ConsignmentCreated` event is emitted with `manifestHash` and `manifestURI`.

---

### US-02 · *(removed — was: Shipper funds freight escrow)*
Payment is no longer in scope. The case-study analysis (CargoX, OriginTrail,
GSBN) shows that production logistics platforms succeed without on-chain
settlement; payment can be settled out-of-band against the on-chain audit
trail.

---

### US-03 · Licensing authority issues a Verifiable Credential
**As** an Issuer (A6) — e.g. IMT or ANAC —
**I want** to sign a W3C Verifiable Credential stating that a party is a
Licensed Carrier / Customs Officer / Pharma-grade receiver, and anchor its
hash on-chain (only after being added to the issuer allowlist),
**so that** smart contracts can verify the credential independently without
holding personal data on chain.
*Concepts:* SSI · DIDs · Verifiable Credentials · Issuer-Holder-Verifier · On-ledger/Off-ledger.
*Implementation:* `CarrierCredential.setApprovedIssuer(...)` (owner) + `CarrierCredential.issueVC(subject, schema, vcHash, notBefore, expiry)`.
*Acceptance:* `VCIssued` event, `isValid(vcHash) == true`, `subjectHasActiveVC(subject, schema) == true`. Reverts with `IssuerNotApproved` if caller is not on the schema allowlist (audit fix H-1).

---

### US-04 · Carrier accepts custody
**As** a Carrier (A2)
**I want** to take custody of a consignment by presenting my LicensedCarrier
VC and logging the location,
**so that** I inherit responsibility for the goods and the transfer is
uniquely attributable to me.
*Concepts:* Identity + Smart Contract integration · Immutability · Event log · DIDs.
*Implementation:* `ConsignmentRegistry.transferCustody(id, to, unLocode, handshake)` — Carrier dashboard "Transfer Custody" button.
*Acceptance:* transfer reverts with `RecipientNotLicensed` if recipient lacks VC; succeeds with `CustodyTransferred` event otherwise; `hopCount` increments; status auto-advances to `InTransit` on first transfer.

---

### US-05 · Carrier hands off to next leg
**As** a Carrier (A2) on an intermediate leg (e.g. truck → air),
**I want** to transfer custody to the next licensed carrier,
**so that** the chain of responsibility continues without any paper CMR/AWB
changing hands.
*Concepts:* Multi-party flows · Custody chain · Smart Contract.
*Implementation:* same `transferCustody` call with new `to`.
*Acceptance:* chain of `Handover` records accumulates under `historyOf(id)`.

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
**I want** to collect signed temperature + GPS readings per consignment,
build a Merkle tree, and anchor just the root on-chain (only after being
added to the oracle allowlist),
**so that** any individual reading can be proven later without storing
millions of readings on chain.
*Concepts:* Merkle Tree · Hash · Oracle · Ed25519 (m-of-n) · Scaling.
*Implementation:* `scripts/oracle-simulator.ts` → `MerkleIoT.anchorBatch(tokenId, root, count, firstTs, lastTs)`.
*Acceptance:* `BatchAnchored` event; reverts with `NotOracle` for unapproved callers (audit fix H-2); writes JSON file to `prototype/app/public/oracle-batches/batch-N.json` with per-leaf proofs.

---

### US-08 · *(removed — was: Receiver submits cold-chain ZK proof to release escrow)*
ZK escrow removed with payment scope. The "verify without revealing"
property is now satisfied by **on-chain Merkle proof verification of IoT
readings** (US-08-NEW below) — same theme, simpler implementation.

---

### US-08-NEW · Anyone verifies a specific IoT reading on-chain
**As** any verifier — Receiver, Auditor, Insurer (A4 / A5 / external)
**I want** to prove on-chain that a specific temperature reading was part of
an anchored batch (i.e. wasn't tampered with after the fact),
**so that** I can audit individual readings without trusting the off-chain
data store.
*Concepts:* Merkle Tree · Hash · Data integrity · Verification · Selective disclosure.
*Implementation:* `MerkleIoT.verifyReading(batchId, leaf, proof)` — Simulation dashboard "Verify" button per reading.
*Acceptance:* returns `true` for a valid (leaf, proof) pair, `false` for a tampered leaf or wrong proof. Audit test H-3 (2 cases) locks this in.

---

### US-09 · *(removed — was: Shipper refunds escrow on cancellation)*
Payment scope removed.

---

### US-10 · Regulator runs an end-to-end audit
**As** a Regulator / Auditor (A5)
**I want** to see, for any consignment, its full custody chain, IoT-batch
count, manifest hash and URI, and current status,
**so that** I can confirm legal and ESG compliance, fetch the off-chain
manifest from the URI, and verify it hasn't been tampered with.
*Concepts:* Auditability · Privacy · Transparency · Hash anchoring.
*Implementation:* Regulator dashboard "Run Audit" — reads `ConsignmentRegistry.consignments(id)`, `historyOf(id)`, and `MerkleIoT.batchesOf(id)`.
*Acceptance:* audit view shows shipper, current custodian, status, manifest hash, URI, hop list, and batch count. Auditor can fetch the JSON at the URI and re-hash it to verify integrity.

---

### US-11 · Party registers its self-sovereign identity
**As** any actor (A1–A7)
**I want** to register a DID with a JSON-LD DID Document on a decentralised
registry,
**so that** my identity is portable, I hold my own keys, and no centralised
provider can gate my access.
*Concepts:* SSI · DIDs · DID Document · Verifiable Data Registry · Decentralization.
*Implementation:* `DIDRegistry.register(docHash, docURI)`.
*Acceptance:* `DIDRegistered` event; `isActive(subject)` becomes true; the URI resolves to a DID Document whose keccak256 equals `docHash` (front-end resolver enforces this — audit fix H-4).

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

### US-14 · Operator deploys to a public chain
**As** an operator,
**I want** to deploy the stack to Ethereum's public Sepolia testnet,
**so that** any auditor, insurer, or regulator can read the chain state
without joining a consortium.
*Concepts:* Public BC · PoS · Decentralization · Deterministic finality.
*Implementation:* `npm run deploy:sepolia`.
*Acceptance:* contract addresses are reachable from any RPC; transactions appear on Etherscan (`sepolia.etherscan.io`).

---

### US-15 · Receiver marks a consignment delivered
**As** the final custodian (A4 — Receiver),
**I want** to mark the consignment as delivered,
**so that** the on-chain status reflects completion and downstream parties
(insurers, regulators) can rely on it as the canonical end-of-journey.
*Concepts:* State machine · Smart Contract · Auditability.
*Implementation:* `ConsignmentRegistry.markDelivered(id)`.
*Acceptance:* status changes from `InTransit` to `Delivered`; subsequent `transferCustody` calls revert with `AlreadyDelivered`.

---

### US-16 · Preview-friendly UX (no wallet extension needed)
**As** an evaluator or demo viewer,
**I want** the UI to fall back to a development signer when no MetaMask is
injected,
**so that** the demo runs in any browser without crypto-wallet setup.
*Concepts:* Wallet · Public-key cryptography · UX.
*Implementation:* `app/lib/signer.ts` — tries `window.ethereum` first, then `NEXT_PUBLIC_RPC` + `NEXT_PUBLIC_DEV_KEY`.
*Acceptance:* on a stock browser the "Create Consignment" flow completes and the address badge reads `dev · 0xf39F…2266`.

---

### US-17 · Negative path — unlicensed recipient is rejected
**As** a Carrier,
**I want** `transferCustody` to revert if the recipient is not a licensed
carrier (no valid VC),
**so that** the chain cannot accidentally hand off to an unauthorised party.
*Concepts:* Business-rule validation · Custom errors · Identity + Smart Contracts.
*Implementation:* revert `RecipientNotLicensed()` (selector `0x3cf806b4`) when the check fails.
*Acceptance:* UI shows "error: ... (RecipientNotLicensed)" when handing off to an address with a DID but no LicensedCarrier VC.

---

### US-18 · *(removed — was: Insurer queries privacy-preserving compliance)*
ZK escrow removed. The "compliance verifiable without seeing data" property
is now satisfied at a finer granularity by US-08-NEW (per-reading Merkle
verification): the auditor sees `verifyReading == true` without ever reading
the temperature value itself, since they only feed the leaf hash to the
contract.

---

## Quick map: story → test → slide

| Story          | Test in `prototype/test/E2E.test.ts` section            | Slide in the final deck |
|----------------|---------------------------------------------------------|-------------------------|
| US-01          | "SHIPPER dashboard"                                     | Slide 6 demo step 0:00  |
| US-03          | seed.ts (issuer approval + VC issuance)                 | Slide 6 demo step 0:25  |
| US-04, US-05   | "CARRIER dashboard"                                     | Slide 6 demo step 0:50  |
| US-06          | "CUSTOMS dashboard"                                     | Slide 6 demo step 1:15  |
| US-07          | "IoT oracle"                                            | Slide 6 demo step 1:30  |
| US-08-NEW      | "Simulation dashboard"                                  | Slide 6 demo step 1:45  |
| US-15          | "RECEIVER dashboard"                                    | Slide 6 demo step 2:00  |
| US-10          | "REGULATOR dashboard"                                   | Slide 6 demo step 2:15  |
| US-17          | `CargoChain.test.ts → "blocks custody transfer..."`     | Slide 8 results table   |

Run `cd prototype && npx hardhat test test/E2E.test.ts` — every story above
is exercised by that one command, with gas costs printed in console output.
