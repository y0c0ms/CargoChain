import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes, concat, getBytes } from "ethers";

/**
 * Full end-to-end flow exercising every dashboard interaction with gas measurement.
 *
 * Flow:
 *   SHIPPER     : create consignment (manifest hash anchored on-chain)
 *   CARRIER     : take custody (gated by LicensedCarrier VC)
 *   CUSTOMS     : verify carrier holds an active VC
 *   IoT ORACLE  : anchor a Merkle batch of sensor readings
 *   SIMULATION  : verify a specific reading on-chain via Merkle proof
 *   RECEIVER    : take custody at destination, mark delivered
 *   REGULATOR   : read manifest hash + custody history + IoT batch count
 *
 * No payment / ZK escrow — those scope items were removed per professor feedback.
 * Replaced with on-chain Merkle proof verification, which is more directly
 * relevant to the course's data-integrity material.
 */

/** Sorted-pair Merkle node hash, matching MerkleIoT.verifyReading. */
function pairHash(a: string, b: string): string {
  const [lo, hi] = BigInt(a) < BigInt(b) ? [a, b] : [b, a];
  return keccak256(concat([getBytes(lo), getBytes(hi)]));
}

describe("CargoChain — every dashboard interaction", () => {
  it("runs the full shipper → carrier → customs → simulation → receiver → regulator flow", async () => {
    const [deployer, carrier, shipper, receiver] = await ethers.getSigners();

    // ─── Deploy ────────────────────────────────────────────────────────────
    const dids     = await ethers.deployContract("DIDRegistry");
    const creds    = await ethers.deployContract("CarrierCredential",   [await dids.getAddress()]);
    const registry = await ethers.deployContract("ConsignmentRegistry", [
      await creds.getAddress(), await dids.getAddress(),
    ]);
    const merkle   = await ethers.deployContract("MerkleIoT");

    // ─── Seed: DIDs, issuer allowlist, oracle allowlist, VCs ───────────────
    for (const s of [deployer, carrier, shipper, receiver]) {
      await dids.connect(s).register(
        keccak256(toUtf8Bytes(`did-doc-${await s.getAddress()}`)),
        `ipfs://did/${await s.getAddress()}`
      );
    }
    await creds.connect(deployer).setApprovedIssuer(0, await deployer.getAddress(), true);
    await merkle.connect(deployer).setApprovedOracle(await deployer.getAddress(), true);
    await creds.connect(deployer).issueVC(await carrier.getAddress(),  0, keccak256(toUtf8Bytes("vc-c")), 0, 0);
    await creds.connect(deployer).issueVC(await receiver.getAddress(), 0, keccak256(toUtf8Bytes("vc-r")), 0, 0);

    // ─── SHIPPER: create consignment ───────────────────────────────────────
    console.log("\n── SHIPPER dashboard ──");
    const manifest = JSON.stringify({
      hbl: "HBL-2026-042",
      originCode: "PTLIS",
      destCode: "AOLAD",
      weightKg: 1200,
      commodity: "PHARMACEUTICAL_VACCINE_CLASS_2",
      tempMinTenthsC: 20,
      tempMaxTenthsC: 80,
    });
    const manifestHash = keccak256(toUtf8Bytes(manifest));

    const createTx   = await registry.connect(shipper).createConsignment(
      manifestHash,
      "ipfs://manifest/HBL-2026-042"
    );
    const createRcpt = await createTx.wait();
    const id = 1n;
    console.log(`   create gas    : ${createRcpt?.gasUsed}  · id=${id}`);
    expect(await registry.custodianOf(id)).to.equal(await shipper.getAddress());

    // ─── CARRIER: take custody ─────────────────────────────────────────────
    console.log("\n── CARRIER dashboard ──");
    const hop1Tx = await registry.connect(shipper).transferCustody(
      id, await carrier.getAddress(), "PTLIS", keccak256(toUtf8Bytes("qr-1"))
    );
    const hop1Rcpt = await hop1Tx.wait();
    console.log(`   handover gas  : ${hop1Rcpt?.gasUsed}`);
    expect(await registry.custodianOf(id)).to.equal(await carrier.getAddress());

    // ─── CUSTOMS: verify carrier VC ────────────────────────────────────────
    console.log("\n── CUSTOMS dashboard ──");
    expect(await creds.subjectHasActiveVC(await carrier.getAddress(), 0)).to.equal(true);
    expect(await creds.subjectHasActiveVC("0x000000000000000000000000000000000000dEaD", 0)).to.equal(false);
    console.log(`   carrier VC active: true`);
    console.log(`   random   VC active: false (correctly rejected)`);

    // ─── IoT ORACLE: anchor a 2-leaf batch ─────────────────────────────────
    console.log("\n── IoT oracle ──");
    const leaf1 = keccak256(toUtf8Bytes("reading-0"));
    const leaf2 = keccak256(toUtf8Bytes("reading-1"));
    const root  = pairHash(leaf1, leaf2);
    await merkle.connect(deployer).anchorBatch(id, root, 2, 1000n, 2000n);
    const batchId = 1n;

    // ─── SIMULATION: verify a specific reading on-chain ────────────────────
    console.log("\n── Simulation dashboard ──");
    const valid   = await merkle.verifyReading(batchId, leaf1, [leaf2]);
    const forged  = await merkle.verifyReading(batchId, keccak256(toUtf8Bytes("tampered")), [leaf2]);
    console.log(`   verifyReading(valid leaf)  : ${valid}`);
    console.log(`   verifyReading(forged leaf) : ${forged}`);
    expect(valid).to.equal(true);
    expect(forged).to.equal(false);

    // ─── RECEIVER: take custody, mark delivered ────────────────────────────
    console.log("\n── RECEIVER dashboard ──");
    await registry.connect(carrier).transferCustody(
      id, await receiver.getAddress(), "AOLAD", keccak256(toUtf8Bytes("qr-2"))
    );
    expect(await registry.custodianOf(id)).to.equal(await receiver.getAddress());
    await registry.connect(receiver).markDelivered(id);
    const c = await registry.consignments(id);
    expect(c.status).to.equal(2); // Delivered
    console.log(`   status: Delivered`);

    // ─── REGULATOR: full audit trail ───────────────────────────────────────
    console.log("\n── REGULATOR dashboard ──");
    const cFull   = await registry.consignments(id);
    const history = await registry.historyOf(id);
    const batches = await merkle.batchesOf(id);

    console.log(`   manifest hash : ${cFull.manifestHash}`);
    console.log(`   manifest URI  : ${cFull.manifestURI}`);
    console.log(`   shipper       : ${cFull.shipper.slice(0,8)}…`);
    console.log(`   custody hops  : ${history.length}`);
    for (const h of history) {
      console.log(`     ${h.locationUnLocode}  ${h.from.slice(0,8)}… → ${h.to.slice(0,8)}…`);
    }
    console.log(`   IoT batches anchored: ${batches.length}`);

    expect(cFull.manifestHash).to.equal(manifestHash);
    expect(cFull.manifestURI).to.equal("ipfs://manifest/HBL-2026-042");
    expect(history.length).to.equal(2);
    expect(batches.length).to.equal(1);

    console.log("\n✓ every dashboard interaction verified end-to-end.\n");
  });
});
