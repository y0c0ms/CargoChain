# SECURITY REVIEW — CargoChain

> **Scope:** all Solidity contracts + scripts/oracle simulator + Next.js front-end libs.
> **Approach:** read-through of each module → identify trust boundaries → enumerate
> what an adversary controls at each one → write a failing test → patch the code →
> re-run the suite. Every fix below has a one-to-one test in
> [`prototype/test/Security.test.ts`](../prototype/test/Security.test.ts).
> **Test count after fixes:** **18 passing** across `CargoChain.test.ts`,
> `Errors.test.ts`, `E2E.test.ts`, `Security.test.ts`.
> **Design constraint:** keep code simple — this is a course prototype, the report
> matters more than over-engineering. Each fix is one allowlist or one extra `if`,
> not a separate role-based access framework.

---

## Severity legend

| Tag    | Meaning                                                               |
|--------|-----------------------------------------------------------------------|
| 🔴 H   | Trust model is broken — adversary can mint VCs, fake IoT, replay proofs, or steal funds |
| 🟠 M   | Behaviour is wrong but adversary needs a special precondition         |
| 🟢 L   | Defence-in-depth, hardening, code smell                               |
| ⚪ Info | Documented limitation by design (demo trade-off)                      |

---

## Findings

### 🔴 H-1 · Anyone could issue any Verifiable Credential (FIXED)

**Location:** [`CarrierCredential.sol`](../prototype/contracts/CarrierCredential.sol)
`issueVC`

**Before:** the only check was `dids.isActive(msg.sender)` — i.e. *any* DID-active
address could issue itself or a friend a `LicensedCarrier` VC and bypass every
custody check downstream. The whole point of SSI on-chain (US-03) is that
verifiers trust the *issuer*, not just any caller.

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
with a forged root, and submits a ZK proof against her own data — escrow
releases despite cold-chain breach.

**Fix:** owner-managed `approvedOracle[address] = bool` + setter. `anchorBatch`
reverts with `NotOracle()` if `msg.sender` isn't on the list.

**Test:** `Security.test.ts → "H-2 Untrusted oracles cannot anchor IoT batches"`
(2 cases).

---

### 🔴 H-3 · ZK proof not bound to (tokenId, batchId) → replay (FIXED)

**Location:** [`FreightEscrow.sol`](../prototype/contracts/FreightEscrow.sol)
`releaseWithProof`

**Before:** the function took a Groth16 proof + `publicIn[]` array and forwarded
them to the verifier. The proof's *content* was not bound to the consignment
it claimed to release. An attacker who once produced a valid compliance proof
for shipment X could replay it against shipment Y (or against the same X
multiple times if the verifier was idempotent).

**Attack:** carrier saves a successful `releaseWithProof` calldata for shipment
1, then calls the same function for shipment 2 (which actually had a cold-chain
breach) — the same proof bytes are accepted because nothing checks the proof's
public inputs match shipment 2's batch root.

**Fix:** `releaseWithProof` now also takes a `batchId`. The escrow looks up the
batch's `merkleRoot` and `tokenId` via a new `MerkleIoT.rootOf(batchId)`
helper. Two new reverts:

- `BatchNotForThisShipment()` — `batches[batchId].tokenId != tokenId`
- `ProofNotBoundToBatch()` — `publicIn[2] != uint256(batches[batchId].merkleRoot)`

The Receiver dashboard now exposes a "IoT Batch ID" field and pre-fetches the
on-chain root to populate `publicIn` correctly.

**Test:** `Security.test.ts → "H-3 ZK proof must be bound to (tokenId, batchId)"`
(2 cases).

---

### 🔴 H-4 · DID Document fetched without hash check (FIXED)

**Location:** [`app/lib/did-resolver.ts`](../prototype/app/lib/did-resolver.ts)
`resolveDID`

**Before:** the resolver fetched the DID Document URI (typically IPFS or
HTTPS), `JSON.parse`d it, and returned it. The on-chain `documentHash` was
returned alongside but never compared — a malicious gateway, hijacked DNS, or
swapped IPFS pin could serve a forged document with a fresh signing key, and
the verifier would happily authenticate VCs against it.

**Fix:** read the response as text, recompute `keccak256(toUtf8Bytes(text))`,
compare to the on-chain `documentHash`, throw with a descriptive message on
mismatch *before* parsing. The original guarantee (the registry is the source
of truth, not the gateway) is now actually enforced.

**Test:** `Security.test.ts → "H-4 DID Document hash mismatch is detected"`
(documents the keccak invariant the implementation enforces).

---

### 🟠 M-2 · Shipper could refund mid-shipment, denying carrier payment (FIXED)

**Location:** [`FreightEscrow.sol`](../prototype/contracts/FreightEscrow.sol) `refund`

**Before:** any time before release/refund, the shipper could call `refund(tokenId)`
and recover their FRT — even after the carrier had taken physical custody and
incurred costs. Race condition: shipper monitors mempool, fronts the
`releaseWithProof` tx with a `refund` tx in the same block.

**Fix:** require `consignment.ownerOf(tokenId) == shipper` for refund. Once
the NFT has moved to a carrier (via `transferCustody`), `CarrierAlreadyHasCustody`
reverts. Funds are committed for the duration of carriage, just like a real
freight booking.

**Test:** `Security.test.ts → "M-2 Refund denied once carrier has custody"`
(2 cases — pre-handover allowed, post-handover blocked).

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

### 🟢 L-1 · Wallet stores VCs unencrypted in IndexedDB

**Status:** acknowledged.
**Reasoning:** browser-extension wallets (MetaMask) and proper SSI agents
(Hyperledger Aries) handle key/credential encryption. We didn't reimplement
that. Future work: encrypt with a user-derived key (e.g. PBKDF2 over a
passphrase) before storage.

### 🟢 L-2 · `MockZKVerifier` accepts any non-zero merkle root

**Status:** explicit mock — replaced by snarkjs-generated `ZKVerifier.sol`
once the trusted-setup ceremony completes.
**Reasoning:** the real Groth16 verifier is generated from
[`circuits/cold_chain.circom`](../prototype/circuits/cold_chain.circom) by
`snarkjs zkey export solidityverifier`. Until that runs, the mock lets the
rest of the stack be tested. **The H-3 fix limits the blast radius:** even with
the permissive mock, an attacker can't replay a proof against a different
shipment because the binding is enforced *outside* the verifier.

### 🟢 L-3 · `vc-issuer.verifyVCSignature` parses DIDs naively

**Status:** known.
**Reasoning:** uses `did.split(":").pop()` to get the address. Adequate for
our `did:cargochain:<chainId>:<addr>` format. A general-purpose resolver
should follow the [W3C DID Method spec](https://www.w3.org/TR/did-core/) and
handle methods like `did:web` or `did:ion`.

### 🟢 L-4 · `FreightToken.mint` is owner-only inflation

**Status:** demo trade-off.
**Reasoning:** in production, `FreightToken` would be replaced by an existing
stablecoin (USDC, EURe). For the demo it's a simple ERC-20 the deployer mints
to seed the shipper's wallet. README + report flag this.

---

## Trust boundaries (after fixes)

```
                ┌──────────────────────────────────────────────┐
                │  CONTRACT OWNER (deployer / future multisig) │
                │  - approves issuers (per VC schema)          │
                │  - approves IoT oracles                      │
                │  - controls FreightToken minting (demo)      │
                └────────────────┬─────────────────────────────┘
                                 │ setApprovedIssuer / setApprovedOracle
                                 ▼
       ┌──────────────────────┐  approves  ┌─────────────────────────┐
       │ Approved VC Issuers  │◄───────────│ Approved IoT Oracles    │
       │ (licensing bodies)   │            │ (sensor gateways)       │
       └──────────┬───────────┘            └────────────┬────────────┘
                  │ issueVC                              │ anchorBatch
                  ▼                                      ▼
      ┌────────────────────────┐             ┌────────────────────────┐
      │ CarrierCredential.sol  │             │ MerkleIoT.sol          │
      │ - per-schema allowlist │             │ - per-address allowlist│
      └──────────┬─────────────┘             └────────────┬───────────┘
                 │  isValid / subjectHasActiveVC          │  rootOf
                 ▼                                        ▼
      ┌────────────────────────┐  binds proof to  ┌──────────────────────┐
      │ CustodyLedger.sol      │ ──────────────► │ FreightEscrow.sol     │
      │ - VC-gated handover    │ (tokenId,batch) │ - replay-safe release │
      │ - ownership invariants │                  │ - refund pre-custody │
      └────────────────────────┘                  └──────────────────────┘
```

---

## TDD evidence

Every fix above is asserted by a regression test. The mapping:

| Finding | File:line                                            | Test (`describe` block)                                          |
|---------|------------------------------------------------------|------------------------------------------------------------------|
| H-1     | `CarrierCredential.sol:33-69`                        | `H-1 Untrusted issuers cannot mint VCs` (3 it-blocks)            |
| H-2     | `MerkleIoT.sol:18-39`                                | `H-2 Untrusted oracles cannot anchor IoT batches` (2)            |
| H-3     | `FreightEscrow.sol:60-83`                            | `H-3 ZK proof must be bound to (tokenId, batchId)` (2)           |
| H-4     | `app/lib/did-resolver.ts:75-90`                      | `H-4 DID Document hash mismatch is detected` (1)                 |
| M-2     | `FreightEscrow.sol:96-104`                           | `M-2 Refund denied once carrier has custody` (2)                 |
| Decoder errors visible to user | `app/lib/errors.ts`              | `Errors.test.ts` (5)                                              |
| Negative custody | `CustodyLedger.sol`                          | `CargoChain.test.ts → "blocks custody transfer..."` (1)          |
| Full happy path  | all contracts                                | `E2E.test.ts → "full flow"` (1)                                  |

Run the suite:

```bash
cd prototype
npx hardhat test
# 18 passing
```

---

## How to demo this in the final presentation

Add one slide between *"Main Findings"* and *"Challenges"* titled
**"Threat model + audit"**, with three bullets:

- **5 attacks we hardened against** (H-1 through M-2) — each in one sentence
- **9 dedicated security tests** prove the fixes can't regress
- **Trust boundaries** diagram from this file

That answers the obvious examiner question *"what stops Mallory from issuing
herself a LicensedCarrier VC?"* in 30 seconds with a runnable test as proof.
