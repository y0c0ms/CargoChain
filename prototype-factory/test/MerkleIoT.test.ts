import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes, concat, getBytes } from "ethers";

// Sorted-pair Merkle node hash, matching the OZ MerkleProof convention used
// inside MerkleIoT.verifyReading. Lower hash always goes first.
function pairHash(a: string, b: string): string {
  const [lo, hi] = BigInt(a) < BigInt(b) ? [a, b] : [b, a];
  return keccak256(concat([getBytes(lo), getBytes(hi)]));
}

describe("MerkleIoT — oracle gating (H-2)", () => {
  it("reverts NotOracle when caller is not approved", async () => {
    const [, stranger] = await ethers.getSigners();
    const merkle = await ethers.deployContract("MerkleIoT");
    await expect(
      merkle.connect(stranger).anchorBatch(1, keccak256(toUtf8Bytes("r")), 8, 0, 1)
    ).to.be.revertedWithCustomError(merkle, "NotOracle");
  });

  it("succeeds and emits BatchAnchored once owner has approved the oracle", async () => {
    const [owner, oracle] = await ethers.getSigners();
    const merkle = await ethers.deployContract("MerkleIoT");
    await merkle.connect(owner).setApprovedOracle(await oracle.getAddress(), true);
    await expect(
      merkle.connect(oracle).anchorBatch(1, keccak256(toUtf8Bytes("r")), 8, 0, 1)
    ).to.emit(merkle, "BatchAnchored");
  });

  it("OracleApproved event fires on add and on revoke", async () => {
    const [owner, oracle] = await ethers.getSigners();
    const merkle = await ethers.deployContract("MerkleIoT");
    const addr = await oracle.getAddress();

    await expect(merkle.connect(owner).setApprovedOracle(addr, true))
      .to.emit(merkle, "OracleApproved").withArgs(addr, true);
    await expect(merkle.connect(owner).setApprovedOracle(addr, false))
      .to.emit(merkle, "OracleApproved").withArgs(addr, false);
  });

  it("non-owner cannot manage the allowlist", async () => {
    const [, stranger] = await ethers.getSigners();
    const merkle = await ethers.deployContract("MerkleIoT");
    await expect(
      merkle.connect(stranger).setApprovedOracle(await stranger.getAddress(), true)
    ).to.be.revertedWithCustomError(merkle, "OwnableUnauthorizedAccount");
  });
});

describe("MerkleIoT — Merkle proof verification (H-3)", () => {
  it("verifyReading returns true for a valid leaf + correct sibling proof", async () => {
    const [owner] = await ethers.getSigners();
    const merkle = await ethers.deployContract("MerkleIoT");
    await merkle.connect(owner).setApprovedOracle(await owner.getAddress(), true);

    // Tiny 2-leaf tree: root = H(leafA, leafB) sorted.
    const leafA = keccak256(toUtf8Bytes("reading-A"));
    const leafB = keccak256(toUtf8Bytes("reading-B"));
    const root  = pairHash(leafA, leafB);
    await merkle.connect(owner).anchorBatch(1, root, 2, 0, 1);

    expect(await merkle.verifyReading(1, leafA, [leafB])).to.equal(true);
    expect(await merkle.verifyReading(1, leafB, [leafA])).to.equal(true);
  });

  it("verifyReading returns false for a forged leaf or wrong sibling", async () => {
    const [owner] = await ethers.getSigners();
    const merkle = await ethers.deployContract("MerkleIoT");
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

  it("verifyReading returns false for a nonexistent batch", async () => {
    const merkle = await ethers.deployContract("MerkleIoT");
    const leaf = keccak256(toUtf8Bytes("anything"));
    expect(await merkle.verifyReading(999n, leaf, [])).to.equal(false);
  });
});
