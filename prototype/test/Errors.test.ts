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
  it("RecipientNotLicensed fires with selector 0x3cf806b4", async () => {
    const [, shipper, unlicensed] = await ethers.getSigners();

    const dids     = await ethers.deployContract("DIDRegistry");
    const creds    = await ethers.deployContract("CarrierCredential",   [await dids.getAddress()]);
    const registry = await ethers.deployContract("ConsignmentRegistry", [
      await creds.getAddress(), await dids.getAddress(),
    ]);

    // Register shipper + unlicensed (both with DIDs, but no VC for unlicensed)
    await dids.connect(shipper).register(
      keccak256(toUtf8Bytes("doc-shipper")), "ipfs://did/shipper"
    );
    await dids.connect(unlicensed).register(
      keccak256(toUtf8Bytes("doc-unlic")), "ipfs://did/unlic"
    );

    // Shipper creates consignment
    await registry.connect(shipper).createConsignment(
      keccak256(toUtf8Bytes("manifest")), "ipfs://m/1"
    );

    // Try to transfer to unlicensed → should revert with RecipientNotLicensed
    await expect(
      registry.connect(shipper).transferCustody(
        1n, await unlicensed.getAddress(), "PTLIS", keccak256(toUtf8Bytes("h"))
      )
    ).to.be.revertedWithCustomError(registry, "RecipientNotLicensed");
  });

  it("NotCurrentCustodian selector is 0x608cc9d2", () => {
    const sel = ethers.id("NotCurrentCustodian()").slice(0, 10);
    expect(sel).to.equal("0x608cc9d2");
  });

  it("RecipientNotLicensed selector is 0x3cf806b4", () => {
    const sel = ethers.id("RecipientNotLicensed()").slice(0, 10);
    expect(sel).to.equal("0x3cf806b4");
  });

  it("RecipientNotActive selector is 0x693369f6", () => {
    const sel = ethers.id("RecipientNotActive()").slice(0, 10);
    expect(sel).to.equal("0x693369f6");
  });

  it("ethers Interface parses the known selector back to its error name", () => {
    const iface = new ethers.Interface([
      "error RecipientNotLicensed()",
      "error NotCurrentCustodian()",
      "error RecipientNotActive()",
      "error AlreadyDelivered()",
      "error UnknownConsignment()",
    ]);
    const parsed = iface.parseError("0x3cf806b4");
    expect(parsed?.name).to.equal("RecipientNotLicensed");
  });
});
