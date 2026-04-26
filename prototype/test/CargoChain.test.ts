import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

/**
 * Happy-path end-to-end test exercising:
 *   DIDRegistry → CarrierCredential → ConsignmentNFT → CustodyLedger
 *
 * Concept-map nodes covered: DID · DID Document · VC · VC Lifecycle · ERC-721 ·
 * Custody · Smart Contracts · Identity + Smart Contracts · Immutability.
 */
describe("CargoChain happy path", () => {
  async function deployAll() {
    const [shipper, carrierA, carrierB, issuer] = await ethers.getSigners();

    const dids = await ethers.deployContract("DIDRegistry");
    const creds = await ethers.deployContract("CarrierCredential", [await dids.getAddress()]);
    const nft = await ethers.deployContract("ConsignmentNFT");
    const custody = await ethers.deployContract("CustodyLedger", [
      await nft.getAddress(),
      await creds.getAddress(),
      await dids.getAddress(),
    ]);

    // Register DIDs for every party
    const register = async (signer: any) =>
      dids.connect(signer).register(
        keccak256(toUtf8Bytes(`did-doc-${await signer.getAddress()}`)),
        `ipfs://did/${await signer.getAddress()}`
      );
    await register(shipper);
    await register(carrierA);
    await register(carrierB);
    await register(issuer);

    // Owner approves the issuer for the LicensedCarrier schema (post H-1 fix)
    const [deployer2] = await ethers.getSigners(); // owner == first signer
    await creds.connect(deployer2).setApprovedIssuer(0, await issuer.getAddress(), true);

    // Issuer grants a LicensedCarrier VC to both carriers
    const vcHashA = keccak256(toUtf8Bytes("vc-carrier-A"));
    const vcHashB = keccak256(toUtf8Bytes("vc-carrier-B"));
    await creds.connect(issuer).issueVC(await carrierA.getAddress(), 0, vcHashA, 0, 0);
    await creds.connect(issuer).issueVC(await carrierB.getAddress(), 0, vcHashB, 0, 0);

    return { dids, creds, nft, custody, shipper, carrierA, carrierB, issuer };
  }

  it("mints an NFT, transfers custody through 2 carriers", async () => {
    const { nft, custody, shipper, carrierA, carrierB } = await deployAll();

    const tx = await nft.mint(
      await shipper.getAddress(),
      "ipfs://manifest/1",
      {
        hbl: "HBL-2026-042",
        originCode: "PTLIS",
        destCode: "AOLAD",
        weightKg: 1200,
        commodity: "PHARMACEUTICAL_VACCINE_CLASS_2",
        tempMinTenthsC: 20,
        tempMaxTenthsC: 80,
        mintedAt: 0,
      }
    );
    await tx.wait();

    // Shipper approves custody contract to move the NFT on their behalf
    await nft.connect(shipper).setApprovalForAll(await custody.getAddress(), true);

    // Shipper → Carrier A
    await custody.connect(shipper).transferCustody(
      1,
      await carrierA.getAddress(),
      "PTLIS",
      keccak256(toUtf8Bytes("handshake-1"))
    );
    expect(await nft.ownerOf(1)).to.equal(await carrierA.getAddress());

    // Carrier A approves and hands off to Carrier B
    await nft.connect(carrierA).setApprovalForAll(await custody.getAddress(), true);
    await custody.connect(carrierA).transferCustody(
      1,
      await carrierB.getAddress(),
      "PTOPO",
      keccak256(toUtf8Bytes("handshake-2"))
    );
    expect(await nft.ownerOf(1)).to.equal(await carrierB.getAddress());
    expect(await custody.hopCount(1)).to.equal(2n);
  });

  it("blocks custody transfer to an unlicensed recipient", async () => {
    const { nft, custody, shipper, issuer } = await deployAll();
    await nft.mint(await shipper.getAddress(), "ipfs://m", {
      hbl: "X", originCode: "PTLIS", destCode: "AOLAD",
      weightKg: 1, commodity: "C", tempMinTenthsC: 20, tempMaxTenthsC: 80, mintedAt: 0,
    });
    await nft.connect(shipper).setApprovalForAll(await custody.getAddress(), true);

    await expect(
      custody.connect(shipper).transferCustody(
        1,
        await issuer.getAddress(),         // issuer has DID but no LicensedCarrier VC
        "PTLIS",
        keccak256(toUtf8Bytes("no-handshake"))
      )
    ).to.be.revertedWithCustomError(custody, "RecipientNotLicensed");
  });
});
