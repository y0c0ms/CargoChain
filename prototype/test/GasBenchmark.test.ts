import { expect } from "chai";
import { ethers } from "hardhat";

// ============================================================================
// GAS BENCHMARK — "why MerkleIoT, not naive on-chain storage?"
//
// Scenario (set by the assignment):
//   - 1 reading per minute
//   - trip length 5 hours        -> 300 readings
//   - batch size 10 readings     -> 30 Merkle batches (30 anchorBatch calls)
//
// We measure the REAL gasUsed for three ways to record those 300 readings:
//   A. Naive, one tx per reading   (realistic IoT firmware)
//   B. Naive, all in a single tx   (best case for the naive approach)
//   C. MerkleIoT, 30 anchored roots (what CargoChain actually does)
//
// The printed table feeds the gas-cost chart used in the presentation.
// ============================================================================

// sorted-pair keccak256 (OpenZeppelin MerkleProof convention)
function hashPair(a: string, b: string): string {
  const [x, y] = a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
  return ethers.keccak256(ethers.concat([x, y]));
}
function merkleRoot(leaves: string[]): string {
  if (leaves.length === 0) return ethers.ZeroHash;
  let layer = [...leaves];
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      next.push(i + 1 < layer.length ? hashPair(layer[i], layer[i + 1]) : layer[i]);
    }
    layer = next;
  }
  return layer[0];
}

// One synthetic reading -> the same leaf MerkleIoT verifies on-chain.
function makeReading(i: number) {
  const ts = 1_700_000_000 + i * 60;        // +60s each (1/min)
  const tempTenthsC = 40 + (i % 10);        // ~4.0–4.9 °C cold-chain range
  const gpsHash = ethers.keccak256(ethers.toUtf8Bytes(`gps-${i}`));
  const leaf = ethers.solidityPackedKeccak256(
    ["uint64", "int32", "bytes32"],
    [ts, tempTenthsC, gpsHash]
  );
  return { ts, tempTenthsC, gpsHash, leaf };
}

describe("Gas benchmark — naive on-chain vs MerkleIoT", () => {
  const READINGS = 300;   // 5h * 60min
  const BATCH = 10;       // readings per Merkle batch
  const BATCHES = READINGS / BATCH;
  const TOKEN_ID = 1;

  it("records measured gas for the 5h / 1-min / batch-10 scenario", async () => {
    const [deployer, oracle] = await ethers.getSigners();

    const naive = await ethers.deployContract("NaiveIoT");
    await naive.waitForDeployment();

    const merkle = await ethers.deployContract("MerkleIoT");
    await merkle.waitForDeployment();
    await merkle.setApprovedOracle(oracle.address, true);

    const readings = Array.from({ length: READINGS }, (_, i) => makeReading(i));

    // ---- A. Naive: one transaction per reading --------------------------------
    // Per-reading gas is constant after the first slot (each reading is its own
    // fresh storage). Measure a representative sample, then project to 300 so
    // the test stays fast while the number remains the real measured cost.
    const SAMPLE = 25;
    let sampleGas = 0n;
    for (let i = 0; i < SAMPLE; i++) {
      const r = readings[i];
      const tx = await naive.storeReading(TOKEN_ID, r.ts, r.tempTenthsC, r.gpsHash);
      const rc = await tx.wait();
      sampleGas += rc!.gasUsed;
    }
    const perReadingIndividualMeasured = sampleGas / BigInt(SAMPLE);
    const naiveIndividualGas = perReadingIndividualMeasured * BigInt(READINGS);

    // ---- B. Naive: all readings in a single transaction -----------------------
    const naive2 = await ethers.deployContract("NaiveIoT");
    await naive2.waitForDeployment();
    const txB = await naive2.storeReadings(
      TOKEN_ID,
      readings.map((r) => r.ts),
      readings.map((r) => r.tempTenthsC),
      readings.map((r) => r.gpsHash)
    );
    const rcB = await txB.wait();
    const naiveBatchedGas = rcB!.gasUsed;

    // Marginal cost of one reading in batched mode (for honest projection):
    // measure a 10-reading store and subtract to isolate per-reading storage.
    const naive3 = await ethers.deployContract("NaiveIoT");
    await naive3.waitForDeployment();
    const small = readings.slice(0, BATCH);
    const txS = await naive3.storeReadings(
      TOKEN_ID,
      small.map((r) => r.ts),
      small.map((r) => r.tempTenthsC),
      small.map((r) => r.gpsHash)
    );
    const rcS = await txS.wait();
    const naiveBatchedSmallGas = rcS!.gasUsed;
    const naiveMarginalPerReading =
      (naiveBatchedGas - naiveBatchedSmallGas) / BigInt(READINGS - BATCH);

    // ---- C. MerkleIoT: 30 anchored roots --------------------------------------
    let merkleGas = 0n;
    let anchorOnce = 0n;
    for (let b = 0; b < BATCHES; b++) {
      const slice = readings.slice(b * BATCH, (b + 1) * BATCH);
      const root = merkleRoot(slice.map((r) => r.leaf));
      const tx = await merkle
        .connect(oracle)
        .anchorBatch(TOKEN_ID, root, BATCH, slice[0].ts, slice[slice.length - 1].ts);
      const rc = await tx.wait();
      merkleGas += rc!.gasUsed;
      if (b === 0) anchorOnce = rc!.gasUsed;
    }

    // ---- Report ---------------------------------------------------------------
    const perReadingIndividual = perReadingIndividualMeasured;
    const merklePerReading = merkleGas / BigInt(READINGS);
    const savingVsIndividual =
      Number(((naiveIndividualGas - merkleGas) * 10000n) / naiveIndividualGas) / 100;
    const savingVsBatched =
      Number(((naiveBatchedGas - merkleGas) * 10000n) / naiveBatchedGas) / 100;

    const f = (n: bigint) => n.toLocaleString("en-US");
    /* eslint-disable no-console */
    console.log("\n  ============ GAS BENCHMARK (5h trip · 1 reading/min · 300 readings · batch 10) ============");
    console.log(`  A. Naive, one tx per reading   : ${f(naiveIndividualGas).padStart(12)} gas total   (${f(perReadingIndividual)} gas/reading)`);
    console.log(`  B. Naive, single batched tx    : ${f(naiveBatchedGas).padStart(12)} gas total   (${f(naiveMarginalPerReading)} gas/reading marginal)`);
    console.log(`  C. MerkleIoT, 30 anchored roots: ${f(merkleGas).padStart(12)} gas total   (${f(merklePerReading)} gas/reading; ${f(anchorOnce)} gas/anchorBatch)`);
    console.log(`  ------------------------------------------------------------------------------------------`);
    console.log(`  MerkleIoT saves ${savingVsIndividual}% vs naive (per-tx)  and  ${savingVsBatched}% vs naive (single tx)`);
    console.log(`  Ethereum block gas limit ~30,000,000 -> naive single-tx fills ${(Number(naiveBatchedGas) / 30_000_000 * 100).toFixed(1)}% of a whole block for ONE 5h trip`);
    console.log("  ==========================================================================================\n");

    // ---- Scaling projection: 5h -> 10h -> 1 day -> 1 week ---------------------
    // Projected from the per-unit gas MEASURED above (all three paths are linear
    // in the number of readings), so the trend is faithful without minting
    // millions of real transactions.
    const BLOCK = 30_000_000n;
    const anchorAvg = merkleGas / BigInt(BATCHES);                                   // gas / anchorBatch
    const batchedBase = naiveBatchedGas - naiveMarginalPerReading * BigInt(READINGS); // single-tx fixed cost
    const durations: [string, number][] = [
      ["5 h", 300], ["10 h", 600], ["1 day", 1440], ["1 week", 10080],
    ];
    console.log("  ============ SCALING — total gas to record a whole trip (projected from measured units) ============");
    console.log("  duration | readings | Naive 1tx/read |  Naive 1 big tx |  MerkleIoT b=10 | naive-1tx blocks | merkle state");
    for (const [label, mins] of durations) {
      const r = BigInt(mins);
      const batches = (r + BigInt(BATCH) - 1n) / BigInt(BATCH);
      const perTx = perReadingIndividualMeasured * r;
      const batched = batchedBase + naiveMarginalPerReading * r;
      const mk = anchorAvg * batches;
      const feasible = batched <= BLOCK ? "" : "  (> 1 block: impossible in a single tx)";
      console.log(
        `  ${label.padEnd(8)} | ${f(r).padStart(8)} | ${f(perTx).padStart(14)} | ${f(batched).padStart(15)} | ${f(mk).padStart(15)} | ${(Number(perTx) / 3e7).toFixed(1).padStart(6)} blk | ${f(batches * 32n).padStart(7)} B${feasible}`
      );
    }
    console.log("  Naive keeps every reading in state forever; MerkleIoT keeps only 32 bytes per batch (the root).");
    console.log("  ===================================================================================================\n");
    /* eslint-enable no-console */

    // Sanity assertions: MerkleIoT must be dramatically cheaper.
    expect(merkleGas).to.be.lessThan(naiveIndividualGas);
    expect(merkleGas).to.be.lessThan(naiveBatchedGas);
    expect(Number(await naive.count(TOKEN_ID))).to.equal(SAMPLE);
  });
});
