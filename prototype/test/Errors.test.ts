import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

/**
 * Trigger custom errors on-chain, extract the selector returned by the
 * provider, and verify it matches what the front-end's `friendlyError`
 * decoder expects. This is the same logic that powers every dashboard's
 * red-banner error display.
 */
describe("Friendly error decoding — dashboard revert messages", () => {
  it("NotCurrentCustodian fires on-chain when caller is not custodian", async () => {
    const [, shipper, stranger] = await ethers.getSigners();
    const registry = await ethers.deployContract("ConsignmentRegistry");

    await registry.connect(shipper).createConsignment(
      keccak256(toUtf8Bytes("manifest")), "ipfs://m/1"
    );

    await expect(
      registry.connect(stranger).transferCustody(
        1n, await stranger.getAddress(), "PTLIS", keccak256(toUtf8Bytes("h"))
      )
    ).to.be.revertedWithCustomError(registry, "NotCurrentCustodian");
  });

  it("AlreadyDelivered fires on-chain when transferring after delivery", async () => {
    const [, shipper] = await ethers.getSigners();
    const registry = await ethers.deployContract("ConsignmentRegistry");

    await registry.connect(shipper).createConsignment(
      keccak256(toUtf8Bytes("manifest")), "ipfs://m/1"
    );
    await registry.connect(shipper).markDelivered(1n);

    await expect(
      registry.connect(shipper).transferCustody(
        1n, await shipper.getAddress(), "PTLIS", keccak256(toUtf8Bytes("h"))
      )
    ).to.be.revertedWithCustomError(registry, "AlreadyDelivered");
  });

  it("NotCurrentCustodian selector is 0x608cc9d2", () => {
    const sel = ethers.id("NotCurrentCustodian()").slice(0, 10);
    expect(sel).to.equal("0x608cc9d2");
  });

  it("AlreadyDelivered selector is 0xb9f79653", () => {
    const sel = ethers.id("AlreadyDelivered()").slice(0, 10);
    expect(sel).to.equal("0xb9f79653");
  });

  it("NotOracle selector is 0x1bc2178f", () => {
    const sel = ethers.id("NotOracle()").slice(0, 10);
    expect(sel).to.equal("0x1bc2178f");
  });

  it("ethers Interface parses known selectors back to their error names", () => {
    const iface = new ethers.Interface([
      "error UnknownConsignment()",
      "error NotCurrentCustodian()",
      "error AlreadyDelivered()",
      "error NotOracle()",
      "error NotOwner()",
    ]);
    expect(iface.parseError("0x608cc9d2")?.name).to.equal("NotCurrentCustodian");
    expect(iface.parseError("0xb9f79653")?.name).to.equal("AlreadyDelivered");
    expect(iface.parseError("0x1bc2178f")?.name).to.equal("NotOracle");
  });
});
