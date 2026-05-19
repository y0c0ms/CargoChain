import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes, concat, getBytes } from "ethers";

/**
 * Security regression suite — one block per audit finding from SECURITY.md.
 *   H-2 — Oracle allowlist on MerkleIoT (untrusted oracle cannot anchor batches)
 *   H-3 — IoT data integrity via on-chain Merkle proof verification
 *       Also covers: custody transfer gated to current holder only.
 */

async function setup() {
  const [owner, alice, bob] = await ethers.getSigners();
  const factory = await ethers.deployContract("PackageFactory");
  const merkle  = await ethers.deployContract("MerkleIoT");
  return { owner, alice, bob, factory, merkle };
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

  // ── Bonus: custody transfer is gated to current holder only ──────────────
  it("transferCustody reverts NotCurrentHolder when caller is not holder", async () => {
    const { factory, alice, bob } = await setup();
    const hash = keccak256(toUtf8Bytes("manifest"));
    await factory.connect(alice).create(hash, "ipfs://manifest");
    const pkg = await ethers.getContractAt("Package", await factory.packageOf(1n));
    // bob is NOT the holder — alice is
    await expect(
      pkg.connect(bob).transferCustody(await bob.getAddress(), "PTLIS", hash)
    ).to.be.revertedWithCustomError(pkg, "NotCurrentHolder");
  });
});
