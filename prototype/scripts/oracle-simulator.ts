/**
 * IoT Oracle Simulator
 * --------------------
 * Generates signed temperature + GPS readings, builds a Merkle tree every
 * BATCH_SIZE readings, signs the root with m-of-n Ed25519 keys, and anchors
 * it on-chain via `MerkleIoT.anchorBatch`.
 *
 * After each successful anchor the full batch — readings, leaf hashes, and
 * Merkle proofs for every leaf — is written to:
 *   <repo>/prototype/app/public/oracle-batches/batch-<id>.json
 *
 * The Simulation dashboard fetches these static files so any reading can be
 * verified on-chain with a single `verifyReading(batchId, leaf, proof)` call.
 *
 * Concept-map nodes exercised:
 *   Oracle · Ed25519 · Non-repudiation · Merkle Tree · Hash Function ·
 *   Scaling (off-chain batching) · Data Integrity.
 *
 * Usage:
 *   MERKLE_ADDR=0x... TOKEN_ID=1 npm run oracle:sim
 */
import { ethers } from "ethers";
import { keccak_256 } from "@noble/hashes/sha3";
import * as ed from "@noble/ed25519";
import * as fs   from "fs";
import * as path from "path";

// ─── configuration ────────────────────────────────────────────────────────────
const BATCH_SIZE  = 8;
const INTERVAL_MS = 1_000;

const MERKLE_ADDR = process.env.MERKLE_ADDR ?? "0x0000000000000000000000000000000000000000";
const TOKEN_ID    = BigInt(process.env.TOKEN_ID ?? "1");
const RPC         = process.env.RPC ?? "http://127.0.0.1:8545";
const PK          = process.env.PK  ?? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Where to write batch JSON files (Next.js public folder = served as static files)
const OUT_DIR = path.join(__dirname, "..", "app", "public", "oracle-batches");

const merkleAbi = [
  "function anchorBatch(uint256 tokenId,bytes32 merkleRoot,uint32 readingCount,uint64 firstTs,uint64 lastTs) external returns (uint256)",
  "event BatchAnchored(uint256 indexed batchId,uint256 indexed tokenId,bytes32 merkleRoot,uint32 readingCount,uint64 firstTs,uint64 lastTs)",
];

// ─── types ────────────────────────────────────────────────────────────────────
type Reading = { ts: number; tempTenthsC: number; gpsHash: string };

// ─── Merkle helpers ───────────────────────────────────────────────────────────
/** keccak256(abi.encodePacked(ts, tempTenthsC, gpsHash)) — matches the Solidity comment */
function leafHash(r: Reading): Uint8Array {
  const buf = ethers.solidityPacked(
    ["uint64", "int16", "bytes32"],
    [r.ts, r.tempTenthsC, r.gpsHash]
  );
  return keccak_256(ethers.getBytes(buf));
}

/** Sorted-pair node hash — matches MerkleIoT.verifyReading */
function pair(a: Uint8Array, b: Uint8Array): Uint8Array {
  const [x, y] = Buffer.compare(Buffer.from(a), Buffer.from(b)) < 0 ? [a, b] : [b, a];
  return keccak_256(Buffer.concat([Buffer.from(x), Buffer.from(y)]));
}

function merkleRoot(leaves: Uint8Array[]): string {
  if (leaves.length === 0) throw new Error("empty batch");
  let level = [...leaves];
  while (level.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(pair(level[i], level[i + 1] ?? level[i]));
    }
    level = next;
  }
  return "0x" + Buffer.from(level[0]).toString("hex");
}

/**
 * Return the sibling path from `leafIndex` to the root.
 * Each element is the hex-encoded sibling at that tree level.
 * Passes directly into `MerkleIoT.verifyReading(batchId, leaf, proof[])`.
 */
function computeProof(leaves: Uint8Array[], leafIndex: number): string[] {
  const proof: string[] = [];
  let level = [...leaves];
  let idx   = leafIndex;

  while (level.length > 1) {
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    const sibling    = level[siblingIdx] ?? level[level.length - 1]; // duplicate last if odd
    proof.push("0x" + Buffer.from(sibling).toString("hex"));

    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(pair(level[i], level[i + 1] ?? level[i]));
    }
    level = next;
    idx   = Math.floor(idx / 2);
  }

  return proof;
}

// ─── sensor data generator ────────────────────────────────────────────────────
function randomReading(prevTempC: number): Reading {
  const drift = (Math.random() - 0.5) * 0.4;          // ±0.2°C smooth drift
  const temp  = Math.max(0, Math.min(8, prevTempC + drift)); // clamp 0–8°C cold chain
  return {
    ts:          Math.floor(Date.now() / 1000),
    tempTenthsC: Math.round(temp * 10),
    gpsHash:     ethers.keccak256(ethers.toUtf8Bytes(`gps-${Date.now()}`)),
  };
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet   = new ethers.Wallet(PK, provider);
  const merkle   = new ethers.Contract(MERKLE_ADDR, merkleAbi, wallet);

  // m-of-n Ed25519 oracle signers (simulated multi-oracle setup)
  const oracleKeys = await Promise.all([1, 2, 3].map(() => ed.utils.randomPrivateKey()));
  console.log(`Oracle running — ${oracleKeys.length} signers (m-of-n = 2/3)`);
  console.log(`Token ID : ${TOKEN_ID}`);
  console.log(`Output   : ${OUT_DIR}`);
  console.log("────────────────────────────────────────────");

  let batch: Reading[] = [];
  let prevTempC = 4.5;

  setInterval(async () => {
    const r = randomReading(prevTempC);
    prevTempC = r.tempTenthsC / 10;
    batch.push(r);
    process.stdout.write(`  ${(r.tempTenthsC / 10).toFixed(1)}°C`);

    if (batch.length < BATCH_SIZE) return;

    // ── build Merkle tree ────────────────────────────────────────────────
    const leaves = batch.map(leafHash);
    const root   = merkleRoot(leaves);

    // ── m-of-n Ed25519 signatures over the root ──────────────────────────
    const msg  = ethers.getBytes(root);
    const sigs = await Promise.all(
      oracleKeys.slice(0, 2).map((sk) => ed.signAsync(msg, sk))
    );
    console.log(`\nBatch ready  root=${root}  sigs=${sigs.length}`);

    // ── anchor on-chain ──────────────────────────────────────────────────
    const first = BigInt(batch[0].ts);
    const last  = BigInt(batch[batch.length - 1].ts);
    try {
      const tx   = await merkle.anchorBatch(TOKEN_ID, root, batch.length, first, last);
      const rcpt = await tx.wait();

      // Extract batchId from the event
      const event = rcpt?.logs
        .map((l: { topics: string[]; data: string }) => {
          try { return merkle.interface.parseLog(l); } catch { return null; }
        })
        .find((e: { name: string } | null) => e?.name === "BatchAnchored");
      const batchId: number = event ? Number(event.args[0]) : -1;

      console.log(`Anchored   block=${rcpt?.blockNumber}  batchId=${batchId}`);

      // ── write JSON for the Simulation dashboard ──────────────────────
      const batchData = {
        batchId,
        tokenId:      TOKEN_ID.toString(),
        root,
        readingCount: batch.length,
        firstTs:      Number(first),
        lastTs:       Number(last),
        readings: batch.map((reading, i) => ({
          index:       i,
          ts:          reading.ts,
          tempTenthsC: reading.tempTenthsC,
          tempC:       (reading.tempTenthsC / 10).toFixed(1),
          gpsHash:     reading.gpsHash,
          leafHex:     "0x" + Buffer.from(leaves[i]).toString("hex"),
          proof:       computeProof(leaves, i),
        })),
      };

      fs.writeFileSync(
        path.join(OUT_DIR, `batch-${batchId}.json`),
        JSON.stringify(batchData, null, 2)
      );
      console.log(`Saved      batch-${batchId}.json  (${batch.length} readings + proofs)`);
    } catch (err) {
      console.error("Anchor failed:", (err as Error).message);
    }

    batch = [];
    console.log("────────────────────────────────────────────");
  }, INTERVAL_MS);
}

main().catch((e) => { console.error(e); process.exit(1); });
