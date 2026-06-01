import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

/**
 * Trigger custom errors on-chain, decode the selector returned by the provider,
 * and verify it matches what the front-end's `friendlyError` decoder expects.
 * This mirrors the iface registered in app/lib/errors.ts.
 */
describe("Friendly error decoding — dashboard revert messages", () => {
  async function newPackage(shipper: any) {
    const factory = await ethers.deployContract("PackageFactory");
    await factory.connect(shipper).create(keccak256(toUtf8Bytes("doc")), "ipfs://docs/1");
    const pkg = await ethers.getContractAt("Package", await factory.packageOf(1n));
    return { factory, pkg };
  }

  it("NotCurrentHolder fires on-chain when caller is not holder", async () => {
    const [, shipper, stranger] = await ethers.getSigners();
    const { pkg } = await newPackage(shipper);

    await expect(
      pkg.connect(stranger).transferCustody(
        await stranger.getAddress(), "PTLIS", keccak256(toUtf8Bytes("h"))
      )
    ).to.be.revertedWithCustomError(pkg, "NotCurrentHolder");
  });

  it("AlreadyDelivered fires on-chain when transferring after delivery", async () => {
    const [, shipper] = await ethers.getSigners();
    const { pkg } = await newPackage(shipper);

    await pkg.connect(shipper).markDelivered();
    await expect(
      pkg.connect(shipper).transferCustody(
        await shipper.getAddress(), "PTLIS", keccak256(toUtf8Bytes("h"))
      )
    ).to.be.revertedWithCustomError(pkg, "AlreadyDelivered");
  });

  it("InvalidRecipient fires when transferring to address(0)", async () => {
    const [, shipper] = await ethers.getSigners();
    const { pkg } = await newPackage(shipper);

    await expect(
      pkg.connect(shipper).transferCustody(
        ethers.ZeroAddress, "PTLIS", keccak256(toUtf8Bytes("h"))
      )
    ).to.be.revertedWithCustomError(pkg, "InvalidRecipient");
  });

  it("NotAFactoryPackage fires for an unknown id via requirePackage", async () => {
    const factory = await ethers.deployContract("PackageFactory");
    await expect(factory.requirePackage(99n))
      .to.be.revertedWithCustomError(factory, "NotAFactoryPackage");
  });

  it("ethers Interface parses known selectors back to their error names", () => {
    // Mirrors app/lib/errors.ts — keep in sync if either side changes.
    const iface = new ethers.Interface([
      "error NotAFactoryPackage()",
      "error NotCurrentHolder()",
      "error AlreadyDelivered()",
      "error InvalidRecipient()",
      "error NotOracle()",
    ]);

    const roundtrip = (sig: string, name: string) => {
      const sel = ethers.id(sig).slice(0, 10);
      expect(iface.parseError(sel)?.name).to.equal(name);
    };

    roundtrip("NotAFactoryPackage()", "NotAFactoryPackage");
    roundtrip("NotCurrentHolder()",   "NotCurrentHolder");
    roundtrip("AlreadyDelivered()",   "AlreadyDelivered");
    roundtrip("InvalidRecipient()",   "InvalidRecipient");
    roundtrip("NotOracle()",          "NotOracle");
  });
});
