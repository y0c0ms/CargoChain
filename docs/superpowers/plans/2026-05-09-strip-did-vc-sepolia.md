# Strip DID/VC Contracts + Sepolia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove DIDRegistry, CarrierCredential, and Sepolia from the project; simplify ConsignmentRegistry to trust-free custody passing with a production comment; remove the Customs VC tab from the front-end.

**Architecture:** ConsignmentRegistry becomes standalone — no constructor arguments, no external contract calls. `transferCustody` only guards that `msg.sender == currentCustodian`. A comment explains that production would add DID/VC checks here. MerkleIoT is untouched. The front-end loses the `/customs` page and its home-page card.

**Tech Stack:** Solidity 0.8.26, Hardhat, ethers.js v6, Next.js 14, TypeScript

---

### Task 1: Delete the two identity contracts

**Files:**
- Delete: `prototype/contracts/DIDRegistry.sol`
- Delete: `prototype/contracts/CarrierCredential.sol`

- [ ] **Step 1: Delete both contract files**

```bash
rm "prototype/contracts/DIDRegistry.sol"
rm "prototype/contracts/CarrierCredential.sol"
```

- [ ] **Step 2: Verify they're gone**

```bash
ls prototype/contracts/
```
Expected output: only `ConsignmentRegistry.sol` and `MerkleIoT.sol` listed.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete DIDRegistry and CarrierCredential contracts (out of scope per professor)"
```

---

### Task 2: Simplify `ConsignmentRegistry.sol`

**Files:**
- Modify: `prototype/contracts/ConsignmentRegistry.sol`

- [ ] **Step 1: Replace the entire file content**

Replace `prototype/contracts/ConsignmentRegistry.sol` with the following:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ConsignmentRegistry — single contract for consignment identity + custody
/// @notice Registers each container/consignment as a unique on-chain entity and
///         tracks every custody handover. Stores only **state and hashes**;
///         the full cargo manifest (HBL, route, commodity, temp bounds) lives
///         off-chain at `manifestURI` and is committed here as a keccak256.
///
/// @dev Why this isn't an ERC-721:
///      ERC-721 has `transferFrom`/`approve` semantics designed for token
///      ownership. Physical custody handover is different — every transfer
///      needs business-rule checks that don't fit the standard interface.
///      A plain registry is simpler and cheaper.
///
///      Why custody is in the same contract as the registry:
///      Consignment identity and custody are the same domain concept — every
///      consignment has exactly one current custodian, and a transfer always
///      mutates both the registry entry and the history log.
///
///      Concept-map nodes: Smart Contract · Custody · Immutability ·
///      Events (audit trail) · Hash · Data Integrity · State Machine.
contract ConsignmentRegistry {
    // ─────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────

    enum Status { Created, InTransit, Delivered, Disputed }

    struct Consignment {
        address shipper;            // who created it (immutable)
        address currentCustodian;   // who has it now
        Status  status;
        bytes32 manifestHash;       // keccak256 of off-chain JSON manifest
        string  manifestURI;        // ipfs:// or https:// to fetch the JSON
        uint64  createdAt;
    }

    struct Handover {
        address from;
        address to;
        uint64  timestamp;
        string  locationUnLocode;   // UN/LOCODE, e.g. "PTLIS"
        bytes32 proofOfHandshake;   // hash of QR-code / nonce both parties signed
    }

    // ─────────────────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────────────────

    uint256 public nextId = 1;
    mapping(uint256 => Consignment) public consignments;
    mapping(uint256 => Handover[])  private _history;

    // ─────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────

    event ConsignmentCreated(
        uint256 indexed id,
        address indexed shipper,
        bytes32 manifestHash,
        string  manifestURI
    );
    event CustodyTransferred(
        uint256 indexed id,
        address indexed from,
        address indexed to,
        string  locationUnLocode,
        bytes32 proofOfHandshake
    );
    event StatusChanged(uint256 indexed id, Status status);

    // ─────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────

    error UnknownConsignment();
    error NotCurrentCustodian();
    error AlreadyDelivered();

    // ─────────────────────────────────────────────────────────────────────
    // Mutating functions
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Create a new consignment. Anyone can ship — no allowlist.
    ///         The consignment's first custodian is the shipper themselves.
    /// @param manifestHash  keccak256 of the JSON document at `manifestURI`.
    /// @param manifestURI   IPFS or HTTPS URI of the off-chain manifest JSON.
    function createConsignment(
        bytes32 manifestHash,
        string  calldata manifestURI
    ) external returns (uint256 id) {
        id = nextId++;
        consignments[id] = Consignment({
            shipper:           msg.sender,
            currentCustodian:  msg.sender,
            status:            Status.Created,
            manifestHash:      manifestHash,
            manifestURI:       manifestURI,
            createdAt:         uint64(block.timestamp)
        });
        emit ConsignmentCreated(id, msg.sender, manifestHash, manifestURI);
    }

    /// @notice Transfer custody to a new party.
    ///         Only the current custodian can call this.
    ///
    /// NOTE: In a production deployment, `to` would be validated against a
    ///       DID Registry and required to hold a LicensedCarrier Verifiable
    ///       Credential issued by a trusted authority (e.g. IATA).
    ///       Omitted from this prototype to keep the scope focused on core
    ///       consignment tracking logic.
    ///
    /// @dev Status auto-advances Created -> InTransit on the first transfer.
    function transferCustody(
        uint256 id,
        address to,
        string  calldata locationUnLocode,
        bytes32 proofOfHandshake
    ) external {
        Consignment storage c = consignments[id];
        if (c.shipper == address(0)) revert UnknownConsignment();
        if (c.currentCustodian != msg.sender) revert NotCurrentCustodian();
        if (c.status == Status.Delivered) revert AlreadyDelivered();

        address from = c.currentCustodian;
        c.currentCustodian = to;
        if (c.status == Status.Created) {
            c.status = Status.InTransit;
            emit StatusChanged(id, Status.InTransit);
        }

        _history[id].push(Handover({
            from:              from,
            to:                to,
            timestamp:         uint64(block.timestamp),
            locationUnLocode:  locationUnLocode,
            proofOfHandshake:  proofOfHandshake
        }));

        emit CustodyTransferred(id, from, to, locationUnLocode, proofOfHandshake);
    }

    /// @notice Mark the consignment as delivered. Only the current custodian
    ///         can call this — they're the receiver attesting the cargo arrived.
    function markDelivered(uint256 id) external {
        Consignment storage c = consignments[id];
        if (c.shipper == address(0)) revert UnknownConsignment();
        if (c.currentCustodian != msg.sender) revert NotCurrentCustodian();
        if (c.status == Status.Delivered) revert AlreadyDelivered();
        c.status = Status.Delivered;
        emit StatusChanged(id, Status.Delivered);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Read-only helpers
    // ─────────────────────────────────────────────────────────────────────

    function historyOf(uint256 id) external view returns (Handover[] memory) {
        return _history[id];
    }

    function hopCount(uint256 id) external view returns (uint256) {
        return _history[id].length;
    }

    /// @notice Returns the address holding custody now.
    function custodianOf(uint256 id) external view returns (address) {
        return consignments[id].currentCustodian;
    }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd prototype && npx hardhat compile
```
Expected: `Compiled 2 Solidity files successfully` (ConsignmentRegistry + MerkleIoT).

- [ ] **Step 3: Commit**

```bash
git add prototype/contracts/ConsignmentRegistry.sol
git commit -m "refactor: remove DID/VC dependencies from ConsignmentRegistry, add production comment"
```

---

### Task 3: Update `deploy.ts` — deploy 2 contracts instead of 4

**Files:**
- Modify: `prototype/scripts/deploy.ts`

- [ ] **Step 1: Replace the entire file content**

```typescript
import { ethers } from "hardhat";

/**
 * Deploys the CargoChain stack (2 contracts) to the selected network.
 *
 * Stack:
 *   1. ConsignmentRegistry — consignment lifecycle + custody handover log
 *   2. MerkleIoT           — IoT batch anchoring + on-chain verifyReading
 *
 * Run with:
 *   npx hardhat run scripts/deploy.ts --network localhost
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const ConsignmentRegistry = await ethers.deployContract("ConsignmentRegistry");
  await ConsignmentRegistry.waitForDeployment();
  console.log("ConsignmentRegistry:", await ConsignmentRegistry.getAddress());

  const MerkleIoT = await ethers.deployContract("MerkleIoT");
  await MerkleIoT.waitForDeployment();
  console.log("MerkleIoT          :", await MerkleIoT.getAddress());

  console.log("\nCopy these addresses into prototype/app/.env.local:");
  console.log(`NEXT_PUBLIC_REGISTRY=${await ConsignmentRegistry.getAddress()}`);
  console.log(`NEXT_PUBLIC_MERKLE=${await MerkleIoT.getAddress()}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Commit**

```bash
git add prototype/scripts/deploy.ts
git commit -m "refactor: deploy.ts now deploys 2 contracts (dropped DIDRegistry + CarrierCredential)"
```

---

### Task 4: Simplify `seed.ts` — remove DID + VC steps

**Files:**
- Modify: `prototype/scripts/seed.ts`

- [ ] **Step 1: Replace the entire file content**

```typescript
import { ethers } from "hardhat";
import * as fs   from "fs";
import * as path from "path";

/**
 * Seed the local chain with demo state.
 *
 * Account roles (mirrors prototype/app/lib/accounts.ts):
 *   #0  IATA            admin / oracle approver / deployer
 *   #1  TAP Air Cargo   carrier
 *   #2  Pfizer          shipper (creates consignments)
 *   #3  DHL Aviation    carrier
 *   #4  MSF Luanda      receiver
 *
 * Steps:
 *   1. Approve account #0 (IATA/deployer) as trusted IoT oracle  (audit fix H-2)
 *   2. Create demo consignment #1 — Pfizer ships HBL-2026-042
 */

function readAddr(key: string): string {
  const envPath = path.join(__dirname, "..", "app", ".env.local");
  const text = fs.readFileSync(envPath, "utf8");
  const line = text.split("\n").find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`${key} not set in ${envPath}`);
  return line.split("=")[1].trim();
}

async function main() {
  const signers = await ethers.getSigners();
  const iata    = signers[0];
  const pfizer  = signers[2];

  const registry = await ethers.getContractAt("ConsignmentRegistry", readAddr("NEXT_PUBLIC_REGISTRY"));
  const merkle   = await ethers.getContractAt("MerkleIoT",           readAddr("NEXT_PUBLIC_MERKLE"));

  console.log("Accounts:");
  console.log("  IATA   (#0, admin)   =", iata.address);
  console.log("  Pfizer (#2, shipper) =", pfizer.address);

  // ── 1. Approve IATA as trusted IoT oracle (H-2) ──────────────────────────
  if (!(await merkle.approvedOracle(iata.address))) {
    await (await merkle.connect(iata).setApprovedOracle(iata.address, true)).wait();
    console.log("  approved IATA as IoT oracle");
  } else {
    console.log("  IATA already approved as IoT oracle");
  }

  // ── 2. Create demo consignment #1 (Pfizer signs) ─────────────────────────
  const manifest = {
    hbl: "HBL-2026-042",
    originCode: "PTLIS",
    destCode: "AOLAD",
    weightKg: 1200,
    commodity: "PHARMACEUTICAL_VACCINE_CLASS_2",
    tempMinTenthsC: 20,
    tempMaxTenthsC: 80,
  };
  const manifestHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(manifest)));
  if ((await registry.nextId()) === 1n) {
    await (await registry.connect(pfizer).createConsignment(
      manifestHash,
      "ipfs://manifest/HBL-2026-042"
    )).wait();
    console.log("  created consignment #1 (signed by Pfizer)");
    console.log("  manifest hash:", manifestHash);
  } else {
    console.log("  consignment #1 already exists");
  }

  console.log("\n── Ready ───────────────────────────────────────────────────────────");
  console.log("Open http://localhost:3000 — use the picker (top-right) to switch identities.");
  console.log("\nTo start the IoT oracle simulator:");
  console.log(`  MERKLE_ADDR=${await merkle.getAddress()} TOKEN_ID=1 npm run oracle:sim`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Commit**

```bash
git add prototype/scripts/seed.ts
git commit -m "refactor: seed.ts — remove DID registration and VC issuance steps"
```

---

### Task 5: Update `hardhat.config.ts` — remove Sepolia

**Files:**
- Modify: `prototype/hardhat.config.ts`

- [ ] **Step 1: Replace the file content**

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

/**
 * Single network: localhost (Hardhat node on 127.0.0.1:8545).
 * All demo and testing runs locally — no public testnet required.
 */
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  gasReporter: {
    enabled: true,
    currency: "EUR",
  },
};

export default config;
```

- [ ] **Step 2: Remove the `deploy:sepolia` script from `package.json`**

In `prototype/package.json`, find and remove the line:
```json
"deploy:sepolia": "hardhat run scripts/deploy.ts --network sepolia",
```

- [ ] **Step 3: Commit**

```bash
git add prototype/hardhat.config.ts prototype/package.json
git commit -m "chore: remove Sepolia network and deploy:sepolia script — localhost only"
```

---

### Task 6: Update `Security.test.ts` — remove H-1, simplify setup

**Files:**
- Modify: `prototype/test/Security.test.ts`

- [ ] **Step 1: Replace the entire file content**

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes, concat, getBytes } from "ethers";

/**
 * Security regression suite — one block per audit finding from SECURITY.md.
 *
 *   H-1 (VC issuer allowlist) — removed: CarrierCredential contract dropped
 *       from scope per professor feedback. The concept is documented in
 *       SECURITY.md as "designed but not implemented in prototype".
 *   H-2 — Oracle allowlist on MerkleIoT (untrusted oracle cannot anchor batches)
 *   H-3 — IoT data integrity via on-chain Merkle proof verification
 */

async function setup() {
  const [owner, alice, bob] = await ethers.getSigners();
  const registry = await ethers.deployContract("ConsignmentRegistry");
  const merkle   = await ethers.deployContract("MerkleIoT");
  return { owner, alice, bob, registry, merkle };
}

/** Sorted-pair Merkle node hash, matching MerkleIoT.verifyReading. */
function pairHash(a: string, b: string): string {
  const [lo, hi] = BigInt(a) < BigInt(b) ? [a, b] : [b, a];
  return keccak256(concat([getBytes(lo), getBytes(hi)]));
}

// ─────────────────────────────────────────────────────────────────────────────
// H-2  Untrusted oracles cannot anchor IoT batches
// ─────────────────────────────────────────────────────────────────────────────

describe("H-2  Untrusted oracles cannot anchor IoT batches", () => {
  it("reverts NotOracle for any non-approved sender", async () => {
    const { merkle, alice } = await setup();
    await expect(
      merkle.connect(alice).anchorBatch(1, keccak256(toUtf8Bytes("r")), 8, 0, 1)
    ).to.be.revertedWithCustomError(merkle, "NotOracle");
  });

  it("succeeds once owner has approved the oracle", async () => {
    const { merkle, owner, alice } = await setup();
    await merkle.connect(owner).setApprovedOracle(await alice.getAddress(), true);
    await expect(
      merkle.connect(alice).anchorBatch(1, keccak256(toUtf8Bytes("r")), 8, 0, 1)
    ).to.emit(merkle, "BatchAnchored");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H-3  IoT data integrity — Merkle proof verification
// ─────────────────────────────────────────────────────────────────────────────

describe("H-3  IoT data integrity (Merkle proof verification)", () => {
  it("verifyReading returns true for a valid leaf + correct sibling proof", async () => {
    const { merkle, owner } = await setup();
    await merkle.connect(owner).setApprovedOracle(await owner.getAddress(), true);

    const leafA = keccak256(toUtf8Bytes("reading-A"));
    const leafB = keccak256(toUtf8Bytes("reading-B"));
    const root  = pairHash(leafA, leafB);
    await merkle.connect(owner).anchorBatch(1, root, 2, 0, 1);

    expect(await merkle.verifyReading(1, leafA, [leafB])).to.equal(true);
    expect(await merkle.verifyReading(1, leafB, [leafA])).to.equal(true);
  });

  it("verifyReading returns false for a forged leaf or wrong sibling", async () => {
    const { merkle, owner } = await setup();
    await merkle.connect(owner).setApprovedOracle(await owner.getAddress(), true);

    const leafA = keccak256(toUtf8Bytes("reading-A"));
    const leafB = keccak256(toUtf8Bytes("reading-B"));
    const root  = pairHash(leafA, leafB);
    await merkle.connect(owner).anchorBatch(1, root, 2, 0, 1);

    const forged = keccak256(toUtf8Bytes("tampered"));
    expect(await merkle.verifyReading(1, forged, [leafB])).to.equal(false);

    const wrongSibling = keccak256(toUtf8Bytes("not-a-sibling"));
    expect(await merkle.verifyReading(1, leafA, [wrongSibling])).to.equal(false);
  });

  // ── Bonus: custody transfer is gated to current custodian only ──────────
  it("transferCustody reverts NotCurrentCustodian when caller is not custodian", async () => {
    const { registry, alice, bob } = await setup();
    const hash = keccak256(toUtf8Bytes("manifest"));
    await registry.connect(alice).createConsignment(hash, "ipfs://manifest");
    // bob is NOT the custodian — alice is
    await expect(
      registry.connect(bob).transferCustody(1, await bob.getAddress(), "PTLIS", hash)
    ).to.be.revertedWithCustomError(registry, "NotCurrentCustodian");
  });
});
```

- [ ] **Step 2: Run the tests to confirm they pass**

```bash
cd prototype && npx hardhat test test/Security.test.ts
```
Expected: `4 passing`

- [ ] **Step 3: Commit**

```bash
git add prototype/test/Security.test.ts
git commit -m "test: remove H-1 VC tests (contract dropped), add custody gate regression test"
```

---

### Task 7: Remove the Customs page from the front-end

**Files:**
- Delete: `prototype/app/pages/customs.tsx`
- Modify: `prototype/app/pages/index.tsx`
- Modify: `prototype/app/pages/carrier.tsx`

- [ ] **Step 1: Delete the customs page**

```bash
rm "prototype/app/pages/customs.tsx"
```

- [ ] **Step 2: Remove the Customs card from `index.tsx`**

In `prototype/app/pages/index.tsx`, replace the `dashboards` array with:

```typescript
const dashboards = [
  { href: "/shipper",    name: "Shipper",    desc: "Create a consignment (manifest hash anchored on-chain)" },
  { href: "/carrier",    name: "Carrier",    desc: "Take custody, hand off to next carrier, or mark delivered" },
  { href: "/simulation", name: "Simulation", desc: "Live IoT batches + on-chain Merkle proof verification" },
  { href: "/regulator",  name: "Regulator",  desc: "Full audit trail for any consignment" },
];
```

Also update the description paragraph — replace:
```typescript
          Public-chain logistics platform: SSI-authenticated stakeholders, custody
          tracking, and IoT data integrity verifiable by anyone.
```
with:
```typescript
          Blockchain logistics platform: immutable custody tracking and
          IoT data integrity verifiable by anyone on-chain.
```

- [ ] **Step 3: Remove the VC mention from `carrier.tsx`**

In `prototype/app/pages/carrier.tsx`, replace the `<p>` description paragraph:
```tsx
        <p className="text-slate-600 mb-6">
          Transfer custody to the next carrier (must hold a <code>LicensedCarrier</code> VC),
          or mark the consignment delivered when it reaches its destination.
          Both actions must be signed by the <strong>current custodian</strong> —
          use the picker in the top-right to switch identities.
        </p>
```
with:
```tsx
        <p className="text-slate-600 mb-6">
          Transfer custody to the next carrier, or mark the consignment delivered
          when it reaches its destination. Both actions must be signed by the{" "}
          <strong>current custodian</strong> — use the picker in the top-right to
          switch identities.
        </p>
```

- [ ] **Step 4: Commit**

```bash
git add prototype/app/pages/customs.tsx prototype/app/pages/index.tsx prototype/app/pages/carrier.tsx
git commit -m "feat: remove Customs/VC dashboard — out of scope per professor feedback"
```

---

### Task 8: Final verification

- [ ] **Step 1: Compile contracts**

```bash
cd prototype && npx hardhat compile
```
Expected: `Compiled 2 Solidity files successfully`

- [ ] **Step 2: Run all tests**

```bash
cd prototype && npx hardhat test
```
Expected: `4 passing`, `0 failing`

- [ ] **Step 3: Check the front-end builds cleanly**

```bash
cd prototype/app && npm run build
```
Expected: build completes with no errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify clean build after DID/VC + Sepolia removal"
```
