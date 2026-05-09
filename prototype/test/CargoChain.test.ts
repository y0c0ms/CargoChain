import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

/**
 * Happy-path end-to-end test exercising ConsignmentRegistry:
 *   create → transferCustody (x2) → markDelivered
 *
 * Concept-map nodes covered: Custody · State Machine · Smart Contracts ·
 * Immutability · Hash · Data Integrity · Events (audit trail).
 */
describe("CargoChain happy path", () => {
  async function deployAll() {
    const [owner, shipper, carrierA, carrierB, stranger] = await ethers.getSigners();
    const registry = await ethers.deployContract("ConsignmentRegistry");
    return { registry, owner, shipper, carrierA, carrierB, stranger };
  }

  it("creates a consignment, transfers custody through 2 carriers, marks delivered", async () => {
    const { registry, shipper, carrierA, carrierB } = await deployAll();

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

    // Carrier B (receiver) marks delivered
    await registry.connect(carrierB).markDelivered(id);
    c = await registry.consignments(id);
    expect(c.status).to.equal(2); // Delivered

    // After delivery, no further transfers allowed
    await expect(
      registry.connect(carrierB).transferCustody(
        id, await shipper.getAddress(), "PT", keccak256(toUtf8Bytes("late"))
      )
    ).to.be.revertedWithCustomError(registry, "AlreadyDelivered");
  });

  it("blocks custody transfer when caller is not the current custodian", async () => {
    const { registry, shipper, stranger } = await deployAll();
    const manifestHash = keccak256(toUtf8Bytes("manifest-X"));
    await registry.connect(shipper).createConsignment(manifestHash, "ipfs://m");

    // stranger has never had custody — should revert
    await expect(
      registry.connect(stranger).transferCustody(
        1n,
        await stranger.getAddress(),
        "PTLIS",
        keccak256(toUtf8Bytes("no-handshake"))
      )
    ).to.be.revertedWithCustomError(registry, "NotCurrentCustodian");
  });
});
