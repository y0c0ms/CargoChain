import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

/**
 * Happy-path end-to-end test exercising:
 *   DIDRegistry → CarrierCredential → ConsignmentRegistry
 *
 * Concept-map nodes covered: DID · DID Document · VC · VC Lifecycle ·
 * Custody · State Machine · Smart Contracts · Identity + Smart Contracts ·
 * Immutability · Hash · Data Integrity.
 */
describe("CargoChain happy path", () => {
  async function deployAll() {
    const [owner, shipper, carrierA, carrierB, issuer] = await ethers.getSigners();

    const dids     = await ethers.deployContract("DIDRegistry");
    const creds    = await ethers.deployContract("CarrierCredential",   [await dids.getAddress()]);
    const registry = await ethers.deployContract("ConsignmentRegistry", [
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
    await creds.connect(owner).setApprovedIssuer(0, await issuer.getAddress(), true);

    // Issuer grants a LicensedCarrier VC to both carriers
    await creds.connect(issuer).issueVC(await carrierA.getAddress(), 0, keccak256(toUtf8Bytes("vc-A")), 0, 0);
    await creds.connect(issuer).issueVC(await carrierB.getAddress(), 0, keccak256(toUtf8Bytes("vc-B")), 0, 0);

    return { dids, creds, registry, shipper, carrierA, carrierB, issuer };
  }

  it("creates a consignment, transfers custody through 2 carriers, marks delivered", async () => {
    const { registry, shipper, carrierA, carrierB } = await deployAll();

    // Shipper creates the consignment (no operator gating — public-chain spirit)
    const manifestHash = keccak256(toUtf8Bytes("manifest-HBL-2026-042"));
    await registry.connect(shipper).createConsignment(manifestHash, "ipfs://manifest/1");

    const id = 1n;
    expect(await registry.custodianOf(id)).to.equal(await shipper.getAddress());

    // Status starts as Created (0)
    let c = await registry.consignments(id);
    expect(c.status).to.equal(0);

    // Shipper → Carrier A (advances status to InTransit)
    await registry.connect(shipper).transferCustody(
      id,
      await carrierA.getAddress(),
      "PTLIS",
      keccak256(toUtf8Bytes("handshake-1"))
    );
    expect(await registry.custodianOf(id)).to.equal(await carrierA.getAddress());
    c = await registry.consignments(id);
    expect(c.status).to.equal(1); // InTransit

    // Carrier A → Carrier B
    await registry.connect(carrierA).transferCustody(
      id,
      await carrierB.getAddress(),
      "PTOPO",
      keccak256(toUtf8Bytes("handshake-2"))
    );
    expect(await registry.custodianOf(id)).to.equal(await carrierB.getAddress());
    expect(await registry.hopCount(id)).to.equal(2n);

    // Carrier B (now playing receiver) marks delivered
    await registry.connect(carrierB).markDelivered(id);
    c = await registry.consignments(id);
    expect(c.status).to.equal(2); // Delivered

    // After delivery, no further transfers
    await expect(
      registry.connect(carrierB).transferCustody(
        id, await shipper.getAddress(), "PT", keccak256(toUtf8Bytes("late"))
      )
    ).to.be.revertedWithCustomError(registry, "AlreadyDelivered");
  });

  it("blocks custody transfer to an unlicensed recipient", async () => {
    const { registry, shipper, issuer } = await deployAll();
    const manifestHash = keccak256(toUtf8Bytes("manifest-X"));
    await registry.connect(shipper).createConsignment(manifestHash, "ipfs://m");

    // issuer has a DID but no LicensedCarrier VC
    await expect(
      registry.connect(shipper).transferCustody(
        1n,
        await issuer.getAddress(),
        "PTLIS",
        keccak256(toUtf8Bytes("no-handshake"))
      )
    ).to.be.revertedWithCustomError(registry, "RecipientNotLicensed");
  });
});
