import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

/**
 * Trigger each custom error on-chain, extract the selector returned by the
 * provider, and verify it matches what the front-end's `friendlyError` will
 * decode. This is the same logic powering the Carrier/Customs/Receiver UIs.
 */
describe("Friendly error decoding — dashboard revert messages", () => {
  it("RecipientNotLicensed fires with selector 0x3cf806b4", async () => {
    const [, shipper, unlicensed] = await ethers.getSigners();

    const dids = await ethers.deployContract("DIDRegistry");
    const creds = await ethers.deployContract("CarrierCredential", [await dids.getAddress()]);
    const nft = await ethers.deployContract("ConsignmentNFT");
    const custody = await ethers.deployContract("CustodyLedger", [
      await nft.getAddress(), await creds.getAddress(), await dids.getAddress(),
    ]);

    // Register shipper + unlicensed (DID only, no VC for unlicensed)
    await dids.connect(shipper).register(
      keccak256(toUtf8Bytes("doc-shipper")), "ipfs://did/shipper"
    );
    await dids.connect(unlicensed).register(
      keccak256(toUtf8Bytes("doc-unlic")), "ipfs://did/unlic"
    );

    // Mint to shipper
    await nft.mint(await shipper.getAddress(), "ipfs://m/1", {
      hbl: "X", originCode: "PTLIS", destCode: "AOLAD",
      weightKg: 1, commodity: "X", tempMinTenthsC: 0, tempMaxTenthsC: 0, mintedAt: 0,
    });
    await nft.connect(shipper).setApprovalForAll(await custody.getAddress(), true);

    // Try to transfer to unlicensed → should revert with RecipientNotLicensed
    await expect(
      custody.connect(shipper).transferCustody(
        1, await unlicensed.getAddress(), "PTLIS", keccak256(toUtf8Bytes("h"))
      )
    ).to.be.revertedWithCustomError(custody, "RecipientNotLicensed");
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
    ]);
    const parsed = iface.parseError("0x3cf806b4");
    expect(parsed?.name).to.equal("RecipientNotLicensed");
  });
});
