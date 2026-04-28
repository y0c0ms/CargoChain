# SECURITY REVIEW — CargoChain

> **Scope:** all 4 Solidity contracts + scripts/oracle simulator + Next.js front-end libs.
> **Approach:** read-through of each module → identify trust boundaries → enumerate
> what an adversary controls at each one → write a failing test → patch the code →
> re-run the suite. Every fix below has a one-to-one test in
> [`prototype/test/Security.test.ts`](../prototype/test/Security.test.ts).
> **Test count after fixes:** **15 passing** across `CargoChain.test.ts`,
> `Errors.test.ts`, `E2E.test.ts`, `Security.test.ts`.

> **Scope changes (April 2026):** The original audit identified five findings
> (H-1 through M-2). After the professor-driven scope reduction (no payment,
> no ZK escrow, no ERC-721), three findings changed status:
> - **H-3** was about ZK proof binding on FreightEscrow → that contract is gone.
>   The H-3 slot is now filled with a different but equally important property:
>   **on-chain Merkle proof verification of IoT readings**. Same severity, same
>   "data integrity under adversarial input" theme.
> - **H-4** (DID Document hash check) was implemented as a front-end resolver
>   helper that no demo page actually called. Rather than keep dead code, we
>   deleted it and demoted H-4 to a documented threat in the "Designed but
>   not implemented" section below — honest about the gap.
> - **M-2** (refund-after-custody) is gone with the escrow.

---

## Severity legend

| Tag    | Meaning                                                               |
|--------|-----------------------------------------------------------------------|
| 🔴 H   | Trust model is broken — adversary can mint VCs, fake IoT, forge data  |
| 🟠 M   | Behaviour is wrong but adversary needs a special precondition         |
| 🟢 L   | Defence-in-depth, hardening, code smell                               |
| ⚪ Info | Documented limitation by design (demo trade-off)                      |

---

## Findings

### 🔴 H-1 · Anyone could issue any Verifiable Credential (FIXED)

**Location:** [`CarrierCredential.sol`](../prototype/contracts/CarrierCredential.sol) `issueVC`

**Before:** the only check was `dids.isActive(msg.sender)` — i.e. *any*
DID-active address could issue itself or a friend a `LicensedCarrier` VC and
bypass every custody check downstream. The whole point of SSI on-chain is
that verifiers trust the *issuer*, not just any caller.

**Attack:** Mallory registers her DID, calls
`issueVC(mallory, LicensedCarrier, ...)`, and now `subjectHasActiveVC` returns
`true`. Custody can be transferred to her even though no licensing authority
ever signed off.

**Fix:** owner-managed `mapping(Schema => mapping(address => bool)) approvedIssuer`
plus a `setApprovedIssuer(schema, issuer, bool)` setter. `issueVC` now reverts
with `IssuerNotApproved()` if the caller isn't on the schema's allowlist.

**Test:** `Security.test.ts → "H-1 Untrusted issuers cannot mint VCs"` (3 cases).

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

### 🟠 H-4 · DID Document fetched without hash check

**Threat:** a real production system would fetch DID Documents from off-chain
gateways (IPFS or HTTPS). A malicious gateway, hijacked DNS, or swapped IPFS
pin could serve a forged document with a fresh signing key, and the verifier
would happily authenticate VCs against it.

**Mitigation pattern:** read the response as text, recompute
`keccak256(toUtf8Bytes(text))`, compare to the on-chain `documentHash`, throw
on mismatch *before* parsing. The on-chain registry is the source of truth.

**Demo status:** **not implemented.** Our demo dashboards reference DIDs by
Ethereum address directly and don't fetch off-chain DID Document JSON, so the
attack surface doesn't exist in the running code. The earlier version had a
`did-resolver.ts` helper that enforced the hash check, but no UI page called
it — dead code. We removed it rather than ship a fix to a function the demo
never reaches.

A production deployment would (a) build a UI that resolves DIDs to Documents,
and (b) reuse the keccak256-comparison pattern shown above. The on-chain
primitives (`DIDRegistry.documentHash`) already support it.

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
For the demo we treat the licensed-carrier VC as standing consent ("I accept
custody of any consignment offered to me as long as my license is active"). A
production system should require a typed-data signature from the receiver, or
flip to a pull-model where the receiver calls `acceptCustody(tokenId)`.

### ⚪ M-3 · `NEXT_PUBLIC_DEV_KEY` is exposed to the browser bundle

**Status:** intentional for preview/demo.
**Reasoning:** the `NEXT_PUBLIC_` prefix means Next.js inlines the value into
the client bundle. The fallback dev signer in
[`app/lib/signer.ts`](../prototype/app/lib/signer.ts) lets evaluators run the
demo with no MetaMask. The key is a Hardhat default — never use it on a live
network. README and the report explicitly call this out.

### 🟢 L-1 · VC wallet stores credentials unencrypted in IndexedDB

**Status:** acknowledged.
**Reasoning:** browser-extension wallets (MetaMask) and proper SSI agents
(Hyperledger Aries) handle key/credential encryption. We didn't reimplement
that. Future work: encrypt with a user-derived key (e.g. PBKDF2 over a
passphrase) before storage.

### 🟢 L-3 · Naive DID parsing in front-end helpers

**Status:** known.
**Reasoning:** uses `did.split(":").pop()` to get the address. Adequate for
our demo's `did:cargochain:<chainId>:<addr>` format. A general-purpose resolver
should follow the [W3C DID Method spec](https://www.w3.org/TR/did-core/) and
handle methods like `did:web` or `did:ion`.

---

## Trust boundaries (after fixes)

```
                ┌──────────────────────────────────────────────┐
                │  CONTRACT OWNER (deployer / future multisig) │
                │  - approves issuers (per VC schema)          │
                │  - approves IoT oracles                      │
                └────────────────┬─────────────────────────────┘
                                 │ setApprovedIssuer / setApprovedOracle
                                 ▼
       ┌──────────────────────┐  approves  ┌─────────────────────────┐
       │ Approved VC Issuers  │◄───────────│ Approved IoT Oracles    │
       │ (licensing bodies)   │            │ (sensor gateways)       │
       └──────────┬───────────┘            └────────────┬────────────┘
                  │ issueVC                              │ anchorBatch
                  ▼                                      ▼
      ┌────────────────────────┐             ┌──────────────────────────┐
      │ CarrierCredential.sol  │             │ MerkleIoT.sol            │
      │ - per-schema allowlist │             │ - per-address allowlist  │
      │ - VC lifecycle         │             │ - verifyReading() public │
      └──────────┬─────────────┘             └────────────┬─────────────┘
                 │  isValid / subjectHasActiveVC          │  read-only,
                 ▼                                        │  no auth needed
      ┌─────────────────────────────────┐                 ▼
      │ ConsignmentRegistry.sol         │       ┌──────────────────────┐
      │ - public createConsignment      │       │ Anyone can verify    │
      │ - VC-gated transferCustody      │       │ any reading          │
      │ - state-machine invariants      │       └──────────────────────┘
      └─────────────────────────────────┘
```

---

## TDD evidence

Every fix above is asserted by a regression test:

| Finding                  | File                                | Test (`describe` block)                                  |
|--------------------------|-------------------------------------|----------------------------------------------------------|
| H-1                      | `CarrierCredential.sol`             | `H-1 Untrusted issuers cannot mint VCs` (3 cases)        |
| H-2                      | `MerkleIoT.sol`                     | `H-2 Untrusted oracles cannot anchor IoT batches` (2)    |
| H-3 (IoT integrity)      | `MerkleIoT.sol`                     | `H-3 IoT data integrity (Merkle proof verification)` (2) |
| Decoder errors visible   | `app/lib/errors.ts`                 | `Errors.test.ts` (5)                                     |
| Negative custody         | `ConsignmentRegistry.sol`           | `CargoChain.test.ts → "blocks custody transfer..."` (1)  |
| Full happy path + IoT    | all 4 contracts                     | `E2E.test.ts → "full flow"` (1)                          |

Run the suite:

```bash
cd prototype
npx hardhat test
# 15 passing
```

---

## How to demo this in the final presentation

Add one slide between *"Main Findings"* and *"Challenges"* titled
**"Threat model + audit"**, with three bullets:

- **3 attacks we hardened against** (H-1, H-2, H-3 IoT) — each in one sentence
- **7 dedicated security tests** prove the fixes can't regress
- **One documented but unimplemented threat** (H-4 DID Document tampering) —
  with the mitigation pattern explained, just not wired into the demo

Mention that **two original findings (H-3 escrow, M-2) are obsolete** because
the payment scope was removed. Treat that as a maturity signal, not a
concession — *"we removed an attack surface entirely"* is a stronger position
than *"we hardened it"*.
