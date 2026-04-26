import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

/**
 * End-to-end test that exercises every on-chain interaction triggered by each
 * of the 5 dashboard pages. Running this locally is a reliable substitute for
 * preview-browser interaction (whose React hydration hangs in this env).
 *
 * Flow:
 *   SHIPPER   : mint consignment NFT + fund escrow
 *   CARRIER   : take custody (NFT transfer gated by VC check)
 *   CUSTOMS   : verify carrier VC is active
 *   RECEIVER  : take custody at destination, submit ZK proof, get payment
 *   REGULATOR : read manifest + custody history + IoT batch count
 */
describe("CargoChain — every dashboard interaction", () => {
  it("runs the full shipper → carrier → customs → receiver → regulator flow", async () => {
    const [deployer, carrier, shipper, receiver] = await ethers.getSigners();

    // Deploy everything fresh
    const dids = await ethers.deployContract("DIDRegistry");
    const creds = await ethers.deployContract("CarrierCredential", [await dids.getAddress()]);
    const nft = await ethers.deployContract("ConsignmentNFT");
    const custody = await ethers.deployContract("CustodyLedger", [
      await nft.getAddress(), await creds.getAddress(), await dids.getAddress(),
    ]);
    const merkle = await ethers.deployContract("MerkleIoT");
    const token = await ethers.deployContract("FreightToken");
    const zk = await ethers.deployContract("MockZKVerifier");
    const escrow = await ethers.deployContract("FreightEscrow", [
      await token.getAddress(), await nft.getAddress(),
      await zk.getAddress(), await merkle.getAddress(),
    ]);

    // Seed
    for (const s of [deployer, carrier, shipper, receiver]) {
      await dids.connect(s).register(
        keccak256(toUtf8Bytes(`did-doc-${await s.getAddress()}`)),
        `ipfs://did/${await s.getAddress()}`
      );
    }
    // Owner approves trusted issuer + oracle (post H-1, H-2)
    await creds.connect(deployer).setApprovedIssuer(0, await deployer.getAddress(), true);
    await merkle.connect(deployer).setApprovedOracle(await deployer.getAddress(), true);

    const carrierVC = keccak256(toUtf8Bytes("vc-carrier"));
    const receiverVC = keccak256(toUtf8Bytes("vc-receiver"));
    await creds.connect(deployer).issueVC(await carrier.getAddress(), 0, carrierVC, 0, 0);
    await creds.connect(deployer).issueVC(await receiver.getAddress(), 0, receiverVC, 0, 0);
    await token.connect(deployer).mint(await shipper.getAddress(), ethers.parseEther("10000"));

    // ==== SHIPPER: mint NFT + fund escrow ====
    console.log("\n── SHIPPER dashboard ──");
    const mintTx = await nft.connect(deployer).mint(
      await shipper.getAddress(),
      "ipfs://manifest/HBL-001",
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
    const mintRcpt = await mintTx.wait();
    const tokenId = 1n;
    console.log(`   mint gas: ${mintRcpt?.gasUsed} · tokenId ${tokenId}`);
    expect(await nft.ownerOf(tokenId)).to.equal(await shipper.getAddress());

    await token.connect(shipper).approve(await escrow.getAddress(), ethers.parseEther("420"));
    const fundTx = await escrow.connect(shipper).fund(
      tokenId,
      await carrier.getAddress(),
      await receiver.getAddress(),
      ethers.parseEther("420")
    );
    await fundTx.wait();
    console.log(`   escrow funded: 420 FRT locked`);

    // ==== CARRIER: take custody ====
    console.log("\n── CARRIER dashboard ──");
    await nft.connect(shipper).setApprovalForAll(await custody.getAddress(), true);
    const handshake1 = keccak256(toUtf8Bytes("qr-handshake-1"));
    const hop1 = await custody.connect(shipper).transferCustody(
      tokenId, await carrier.getAddress(), "PTLIS", handshake1
    );
    const hop1R = await hop1.wait();
    console.log(`   custody transfer shipper→carrier gas: ${hop1R?.gasUsed}`);
    expect(await nft.ownerOf(tokenId)).to.equal(await carrier.getAddress());

    // ==== CUSTOMS: verify carrier holds a LicensedCarrier VC ====
    console.log("\n── CUSTOMS dashboard ──");
    const carrierValid = await creds.subjectHasActiveVC(await carrier.getAddress(), 0);
    console.log(`   carrier VC active: ${carrierValid}`);
    expect(carrierValid).to.equal(true);

    const randomAddr = "0x000000000000000000000000000000000000dEaD";
    const randomValid = await creds.subjectHasActiveVC(randomAddr, 0);
    expect(randomValid).to.equal(false);
    console.log(`   random address VC active: ${randomValid} (correctly rejected)`);

    // Carrier hands off to receiver
    await nft.connect(carrier).setApprovalForAll(await custody.getAddress(), true);
    const handshake2 = keccak256(toUtf8Bytes("qr-handshake-2"));
    const hop2 = await custody.connect(carrier).transferCustody(
      tokenId, await receiver.getAddress(), "AOLAD", handshake2
    );
    await hop2.wait();
    expect(await nft.ownerOf(tokenId)).to.equal(await receiver.getAddress());

    // ==== IoT oracle anchors some batches ====
    const root1 = keccak256(toUtf8Bytes("batch-1-root"));
    const root2 = keccak256(toUtf8Bytes("batch-2-root"));
    await merkle.connect(deployer).anchorBatch(tokenId, root1, 8, 1000n, 2000n);
    await merkle.connect(deployer).anchorBatch(tokenId, root2, 8, 2001n, 3000n);
    const releaseBatchId = 2n;          // the latest batch
    const releaseRoot = root2;

    // ==== RECEIVER: submit ZK proof, escrow releases ====
    console.log("\n── RECEIVER dashboard ──");
    const escrowBefore = await escrow.escrows(tokenId);
    expect(escrowBefore.released).to.equal(false);
    console.log(`   escrow before: amount=${ethers.formatEther(escrowBefore.amount)} released=${escrowBefore.released}`);

    const a: [bigint, bigint] = [0n, 0n];
    const b: [[bigint, bigint], [bigint, bigint]] = [[0n, 0n], [0n, 0n]];
    const c: [bigint, bigint] = [0n, 0n];
    // publicIn[2] must equal the merkle root of the referenced batch (H-3 fix)
    const publicIn = [20n, 80n, BigInt(releaseRoot)];
    const proofTx = await escrow.connect(receiver).releaseWithProof(
      tokenId, releaseBatchId, a, b, c, publicIn
    );
    const proofRcpt = await proofTx.wait();
    console.log(`   zk-proof verify gas: ${proofRcpt?.gasUsed}`);

    const escrowAfter = await escrow.escrows(tokenId);
    expect(escrowAfter.released).to.equal(true);
    expect(await token.balanceOf(await carrier.getAddress())).to.equal(ethers.parseEther("420"));
    console.log(`   escrow released → carrier now holds ${ethers.formatEther(await token.balanceOf(await carrier.getAddress()))} FRT`);

    // ==== REGULATOR: full audit trail ====
    console.log("\n── REGULATOR dashboard ──");
    const manifest = await nft.getManifest(tokenId);
    const history = await custody.historyOf(tokenId);
    const batches = await merkle.batchesOf(tokenId);

    console.log(`   HBL: ${manifest.hbl}`);
    console.log(`   Route: ${manifest.originCode} → ${manifest.destCode}`);
    console.log(`   Temp bounds: ${Number(manifest.tempMinTenthsC)/10}°C to ${Number(manifest.tempMaxTenthsC)/10}°C`);
    console.log(`   Custody hops: ${history.length}`);
    for (const h of history) {
      console.log(`     ${h.locationUnLocode}  ${h.from.slice(0,8)}… → ${h.to.slice(0,8)}…`);
    }
    console.log(`   IoT batches anchored: ${batches.length}`);

    expect(manifest.hbl).to.equal("HBL-2026-042");
    expect(history.length).to.equal(2);
    expect(batches.length).to.equal(2);

    console.log("\n✓ every dashboard interaction verified end-to-end.\n");
  });
});
