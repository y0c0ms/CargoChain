import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes, concat, getBytes } from "ethers";

/**
 * Security regression suite — one block per audit finding from SECURITY.md.
 *
 * Notes after the scope change (April 2026):
 *   - H-3 was originally about ZK-proof binding on FreightEscrow.
 *     FreightEscrow was removed (no payment in scope per professor feedback).
 *     The new H-3 tests on-chain Merkle-proof verification of IoT readings,
 *     which is now the core data-integrity guarantee of the project.
 *   - M-2 (refund-after-custody) is obsolete with the escrow gone; not tested.
 *
 * Tests are TDD-style: they assert post-fix behaviour and would have failed
 * against the pre-fix code.
 */

async function setup() {
  const [owner, alice, bob, carol] = await ethers.getSigners();
  const dids     = await ethers.deployContract("DIDRegistry");
  const creds    = await ethers.deployContract("CarrierCredential",   [await dids.getAddress()]);
  const registry = await ethers.deployContract("ConsignmentRegistry", [
    await creds.getAddress(), await dids.getAddress(),
  ]);
  const merkle   = await ethers.deployContract("MerkleIoT");

  // Register DIDs for all four signers so other checks pass
  for (const s of [owner, alice, bob, carol]) {
    await dids.connect(s).register(
      keccak256(toUtf8Bytes(`doc-${await s.getAddress()}`)),
      `ipfs://did/${await s.getAddress()}`
    );
  }
  return { owner, alice, bob, carol, dids, creds, registry, merkle };
}

/** Sorted-pair Merkle node hash, matching MerkleIoT.verifyReading. */
function pairHash(a: string, b: string): string {
  const [lo, hi] = BigInt(a) < BigInt(b) ? [a, b] : [b, a];
  return keccak256(concat([getBytes(lo), getBytes(hi)]));
}

// ─────────────────────────────────────────────────────────────────────────────
// H-1  Untrusted issuers cannot mint VCs
// ─────────────────────────────────────────────────────────────────────────────

describe("H-1  Untrusted issuers cannot mint VCs", () => {
  it("reverts IssuerNotApproved when caller is not on the allowlist", async () => {
    const { creds, alice, bob } = await setup();
    const vcHash = keccak256(toUtf8Bytes("forged-vc"));
    await expect(
      creds.connect(alice).issueVC(await bob.getAddress(), 0, vcHash, 0, 0)
    ).to.be.revertedWithCustomError(creds, "IssuerNotApproved");
  });

  it("succeeds once owner has approved the issuer", async () => {
    const { creds, owner, alice, bob } = await setup();
    await creds.connect(owner).setApprovedIssuer(0, await alice.getAddress(), true);
    const vcHash = keccak256(toUtf8Bytes("real-vc"));
    await expect(
      creds.connect(alice).issueVC(await bob.getAddress(), 0, vcHash, 0, 0)
    ).to.emit(creds, "VCIssued");
    expect(await creds.subjectHasActiveVC(await bob.getAddress(), 0)).to.equal(true);
  });

  it("only the owner can manage the issuer allowlist", async () => {
    const { creds, alice, bob } = await setup();
    await expect(
      creds.connect(alice).setApprovedIssuer(0, await bob.getAddress(), true)
    ).to.be.revertedWithCustomError(creds, "NotOwner");
  });
});

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

    // verify leafA with proof [leafB]
    expect(await merkle.verifyReading(1, leafA, [leafB])).to.equal(true);
    // and leafB with proof [leafA]
    expect(await merkle.verifyReading(1, leafB, [leafA])).to.equal(true);
  });

  it("verifyReading returns false for a forged leaf or wrong sibling", async () => {
    const { merkle, owner } = await setup();
    await merkle.connect(owner).setApprovedOracle(await owner.getAddress(), true);

    const leafA = keccak256(toUtf8Bytes("reading-A"));
    const leafB = keccak256(toUtf8Bytes("reading-B"));
    const root  = pairHash(leafA, leafB);
    await merkle.connect(owner).anchorBatch(1, root, 2, 0, 1);

    // tampered reading should not validate
    const forged = keccak256(toUtf8Bytes("tampered"));
    expect(await merkle.verifyReading(1, forged, [leafB])).to.equal(false);

    // wrong sibling should also fail
    const wrongSibling = keccak256(toUtf8Bytes("not-a-sibling"));
    expect(await merkle.verifyReading(1, leafA, [wrongSibling])).to.equal(false);
  });
});

