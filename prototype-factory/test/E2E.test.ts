import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes, concat, getBytes } from "ethers";

// Full end-to-end flow:
//   SHIPPER    : create a Package clone via PackageFactory
//   CARRIER    : take custody
//   IoT ORACLE : anchor a Merkle batch of sensor readings for that package
//   VERIFIER   : prove a specific reading was in the batch
//   RECEIVER   : take custody, mark delivered
//   REGULATOR  : read history + IoT batch list as audit trail

function pairHash(a: string, b: string): string {
  const [lo, hi] = BigInt(a) < BigInt(b) ? [a, b] : [b, a];
  return keccak256(concat([getBytes(lo), getBytes(hi)]));
}

describe("CargoChain end-to-end (factory variant)", () => {
  it("runs shipper -> carrier -> oracle -> receiver -> regulator flow", async () => {
    const [deployer, shipper, carrier, receiver] = await ethers.getSigners();

    const factory = await ethers.deployContract("PackageFactory");
    const merkle  = await ethers.deployContract("MerkleIoT");
    await merkle.connect(deployer).setApprovedOracle(await deployer.getAddress(), true);

    // SHIPPER creates a package
    const docs = JSON.stringify({
      hbl: "HBL-2026-042",
      originCode: "PTLIS",
      destCode: "AOLAD",
      weightKg: 1200,
      commodity: "PHARMACEUTICAL_VACCINE_CLASS_2",
      tempMinTenthsC: 20,
      tempMaxTenthsC: 80,
    });
    const docsHash = keccak256(toUtf8Bytes(docs));
    await factory.connect(shipper).create(docsHash, "ipfs://docs/HBL-2026-042");
    const id = 1n;

    const pkgAddr = await factory.packageOf(id);
    const pkg = await ethers.getContractAt("Package", pkgAddr);
    expect(await pkg.currentHolder()).to.equal(await shipper.getAddress());
    expect(await pkg.docsHash()).to.equal(docsHash);

    // CARRIER takes custody
    await pkg.connect(shipper).transferCustody(
      await carrier.getAddress(), "PTLIS", keccak256(toUtf8Bytes("qr-1"))
    );
    expect(await pkg.currentHolder()).to.equal(await carrier.getAddress());

    // IoT ORACLE anchors a 2-leaf batch tied to this package id
    const leaf1 = keccak256(toUtf8Bytes("reading-0"));
    const leaf2 = keccak256(toUtf8Bytes("reading-1"));
    const root  = pairHash(leaf1, leaf2);
    await merkle.connect(deployer).anchorBatch(id, root, 2, 1000n, 2000n);
    const batchId = 1n;

    // VERIFIER proves leaf1 was in the batch; a tampered leaf is rejected
    expect(await merkle.verifyReading(batchId, leaf1, [leaf2])).to.equal(true);
    expect(await merkle.verifyReading(batchId, keccak256(toUtf8Bytes("tampered")), [leaf2]))
      .to.equal(false);

    // RECEIVER takes final custody, then marks delivered
    await pkg.connect(carrier).transferCustody(
      await receiver.getAddress(), "AOLAD", keccak256(toUtf8Bytes("qr-2"))
    );
    expect(await pkg.currentHolder()).to.equal(await receiver.getAddress());
    await pkg.connect(receiver).markDelivered();
    expect(await pkg.status()).to.equal(2); // Delivered

    // REGULATOR reads the full audit trail
    const history = await pkg.historyOf();
    const batches = await merkle.batchesOf(id);
    expect(history.length).to.equal(2);
    expect(batches.length).to.equal(1);
    expect(history[0].locationUnLocode).to.equal("PTLIS");
    expect(history[1].locationUnLocode).to.equal("AOLAD");
  });
});
