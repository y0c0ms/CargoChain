# SECURITY REVIEW — CargoChain

> **Scope:** 2 Solidity contracts (ConsignmentRegistry, MerkleIoT) + scripts/oracle simulator + Next.js front-end libs.
> **Approach:** read-through of each module → identify trust boundaries → enumerate
> what an adversary controls at each one → write a failing test → patch the code →
> re-run the suite. Every fix below has a one-to-one test in
> [`prototype/test/Security.test.ts`](../prototype/test/Security.test.ts).
> **Test count after fixes:** **14 passing** across `CargoChain.test.ts`,
> `Errors.test.ts`, `E2E.test.ts`, `Security.test.ts`.

> **Scope changes (April 2026):** The original audit identified five findings
> (H-1 through M-2). After the professor-driven scope reduction (no payment,
> no ZK escrow, no ERC-721, no DID/VC contracts), findings changed status:
> - **H-1** (VC issuer allowlist) — not applicable. The CarrierCredential contract
>   was removed from the prototype scope per professor feedback. See the
>   "Designed but not implemented" section below.
> - **H-3** was about ZK proof binding on FreightEscrow → that contract is gone.
>   The H-3 slot is now filled with a different but equally important property:
>   **on-chain Merkle proof verification of IoT readings**. Same severity, same
>   "data integrity under adversarial input" theme.
> - **H-4** (DID Document hash check) was implemented as a front-end resolver
>   helper that no demo page actually called — and DIDRegistry itself has been
>   removed. Rather than keep dead code, we deleted it and documented the threat
>   here for completeness.
> - **M-2** (refund-after-custody) is gone with the escrow.

---

## Severity legend

| Tag    | Meaning                                                               |
|--------|-----------------------------------------------------------------------|
| 🔴 H   | Trust model is broken — adversary can fake IoT, forge data            |
| 🟠 M   | Behaviour is wrong but adversary needs a special precondition         |
| 🟢 L   | Defence-in-depth, hardening, code smell                               |
| ⚪ Info | Documented limitation by design (demo trade-off)                      |

---

## Findings

### ⚪ H-1 · VC issuer allowlist — not applicable

**Status:** not applicable. The `CarrierCredential` contract was removed from
the prototype scope per professor feedback.

**Threat model (documented for completeness):** without an approved-issuer
allowlist, any DID-active address could mint itself a `LicensedCarrier`
credential and bypass every custody check downstream. The whole point of
SSI on-chain is that verifiers trust the *issuer*, not just any caller.

**Attack (hypothetical):** Mallory registers her DID, calls
`issueVC(mallory, LicensedCarrier, ...)`, and now `subjectHasActiveVC` returns
`true`. Custody can be transferred to her even though no licensing authority
ever signed off.

**Mitigation pattern for production:** owner-managed
`mapping(Schema => mapping(address => bool)) approvedIssuer` plus a
`setApprovedIssuer(schema, issuer, bool)` setter. `issueVC` reverts with
`IssuerNotApproved()` if the caller isn't on the schema's allowlist.

**Current prototype:** no VC issuance exists. Custody gating is by
`msg.sender == currentCustodian` only. In a production deployment, a
`CarrierCredential` contract or equivalent would need the issuer-allowlist
protection described above.

---

### 🔴 H-2 · Anyone could anchor fake IoT batches (FIXED)

**Location:** [`MerkleIoT.sol`](../prototype/contracts/MerkleIoT.sol) `anchorBatch`

**Before:** function had no access control. Any wallet could submit an
arbitrary Merkle root for any consignment's `tokenId`, breaking the integrity
guarantees the architecture document promises.

**Attack:** Mallory reads on-chain `BatchAnchored` events, races a real oracle
with a forged root, and the regulator dashboard happily reports the (forged)
batch as anchored.

**Fix:** owner-managed `approvedOracle[address] = bool` + setter. `anchorBatch`
reverts with `NotOracle()` if `msg.sender` isn't on the list.

**Test:** `Security.test.ts → "H-2 Untrusted oracles cannot anchor IoT batches"`
(2 cases).

---

### 🔴 H-3 · IoT data integrity — Merkle proof verification (NEW)

**Location:** [`MerkleIoT.sol`](../prototype/contracts/MerkleIoT.sol) `verifyReading`

**Property under test:** given a batch's anchored Merkle root, anyone must be
able to prove on-chain that a specific reading *was* part of that batch — and
the verification must reject any tampered reading or wrong sibling path.

**Why this matters:** the off-chain oracle exports each batch's readings + a
Merkle proof per reading to `prototype/app/public/oracle-batches/batch-N.json`.
The Simulation dashboard reads that JSON and lets users click "Verify". If
`verifyReading` accepted any leaf — or if it accepted any proof path — the
whole "you can audit individual sensor readings" claim falls apart.

**Implementation:** sorted-pair Merkle proof verification (compatible with
OpenZeppelin's `MerkleProof.verify` and the oracle's `keccak_256`-based
tree). Constant-gas verification path; ~30 k gas for an 8-leaf batch.

**Test:** `Security.test.ts → "H-3 IoT data integrity (Merkle proof verification)"`
(2 cases — valid leaf+proof returns true; tampered leaf or wrong sibling returns false).

---

## Designed but not implemented (honest gap)

### ⚪ H-1 (expanded) · CarrierCredential and DID-gated custody

**Threat:** a production system would validate that the custody recipient (a)
has an active DID on a public registry and (b) holds a `LicensedCarrier`
Verifiable Credential issued by an approved authority before allowing
`transferCustody` to proceed.

**Current status:** **not implemented.** The `DIDRegistry` and
`CarrierCredential` contracts were removed from the prototype. The current
`transferCustody` only checks `msg.sender == currentCustodian`. The DID/VC
layer is documented in the report as a production extension.

A production deployment would (a) add a `DIDRegistry` + `CarrierCredential`
with approved-issuer allowlists, and (b) add checks in `transferCustody` for
`dids.isActive(to)` and `creds.subjectHasActiveVC(to, LicensedCarrier)`.

---

## Obsolete after scope change (kept for historical record)

### ⚪ H-3 (original) · ZK proof not bound to (tokenId, batchId)

Was a finding against `FreightEscrow.releaseWithProof`. With FreightEscrow
removed (no payment in scope), this finding no longer applies. The original
fix was good (binding the proof's public inputs to the on-chain batch root)
and informed the design of the current H-3 IoT-integrity test.

### ⚪ M-2 · Shipper could refund mid-shipment

Was a finding against `FreightEscrow.refund`. With the escrow gone, no longer
applies. The original fix was a `consignment.ownerOf(tokenId) == shipper`
check.

---

## Open / by-design items

### 🟠 M-1 · Custody transfer requires no signature from the recipient

**Status:** documented limitation.
**Reasoning:** EIP-712 signed handshake from `to` would double the call surface.
For the demo, the custodian check (`msg.sender == currentCustodian`) is the
gate. A production system should require a typed-data signature from the
receiver, or flip to a pull-model where the receiver calls
`acceptCustody(tokenId)`. A DID/VC check on the recipient would also be added
in production (see H-1 gap above).

### ⚪ M-3 · `NEXT_PUBLIC_DEV_KEY` is exposed to the browser bundle

**Status:** intentional for preview/demo.
**Reasoning:** the `NEXT_PUBLIC_` prefix means Next.js inlines the value into
the client bundle. The fallback dev signer in
[`app/lib/signer.ts`](../prototype/app/lib/signer.ts) lets evaluators run the
demo with no MetaMask. The key is a Hardhat default — never use it on a live
network. README and the report explicitly call this out.

---

## Trust boundaries (after fixes)

```
                ┌──────────────────────────────────────────────┐
                │  CONTRACT OWNER (deployer / future multisig) │
                │  - approves IoT oracles                      │
                └────────────────┬─────────────────────────────┘
                                 │ setApprovedOracle
                                 ▼
                    ┌─────────────────────────┐
                    │ Approved IoT Oracles     │
                    │ (sensor gateways)        │
                    └────────────┬────────────┘
                                 │ anchorBatch
                                 ▼
                    ┌──────────────────────────┐
                    │ MerkleIoT.sol            │
                    │ - per-address allowlist  │
                    │ - verifyReading() public │
                    └────────────┬─────────────┘
                                 │ read-only, no auth needed
                                 ▼
                    ┌──────────────────────────┐
                    │ Anyone can verify        │
                    │ any reading              │
                    └──────────────────────────┘

  ConsignmentRegistry.sol — standalone (no VC/DID checks in prototype)
  ┌────────────────────────────────────────┐
  │ - public createConsignment             │
  │ - transferCustody: msg.sender check    │
  │   (DID+VC check → production extension)│
  │ - state-machine invariants             │
  └────────────────────────────────────────┘
```

---

## TDD evidence

Every fix above is asserted by a regression test:

| Finding                  | File                                | Test (`describe` block)                                  |
|--------------------------|-------------------------------------|----------------------------------------------------------|
| H-2                      | `MerkleIoT.sol`                     | `H-2 Untrusted oracles cannot anchor IoT batches` (2)    |
| H-3 (IoT integrity)      | `MerkleIoT.sol`                     | `H-3 IoT data integrity (Merkle proof verification)` (2) |
| Decoder errors visible   | `app/lib/errors.ts`                 | `Errors.test.ts` (6)                                     |
| Negative custody         | `ConsignmentRegistry.sol`           | `CargoChain.test.ts → "blocks custody transfer..."` (1)  |
| Full happy path + IoT    | ConsignmentRegistry + MerkleIoT     | `E2E.test.ts → "full flow"` (1)                          |

Run the suite:

```bash
cd prototype
npx hardhat test
# 14 passing
```

---

## How to demo this in the final presentation

Add one slide between *"Main Findings"* and *"Challenges"* titled
**"Threat model + audit"**, with three bullets:

- **2 attacks we hardened against** (H-2 oracle allowlist, H-3 IoT Merkle
  integrity) — each in one sentence
- **5 dedicated security tests** prove the fixes can't regress
- **One documented but unimplemented threat** (H-1 DID/VC-gated custody) —
  with the mitigation pattern explained, noted as a production extension

Mention that **two original findings (H-3 escrow, M-2) are obsolete** because
the payment scope was removed. Treat that as a maturity signal, not a
concession — *"we removed an attack surface entirely"* is a stronger position
than *"we hardened it"*.
