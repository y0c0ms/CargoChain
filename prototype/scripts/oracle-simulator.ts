/**
 * Oracle simulator
 * ----------------
 * Emits signed IoT payloads (temp + GPS) on a configurable cadence, builds a
 * Merkle tree every BATCH_SIZE readings, signs the root with m-of-n Ed25519
 * keys, and publishes the root on-chain via `MerkleIoT.anchorBatch`.
 *
 * Concept-map nodes: Oracle · Public-key cryptography (Ed25519) · Non-repudiation ·
 *                    Merkle · Hash · Scaling (off-chain batching).
 *
 * Usage (after contracts deployed):
 *   MERKLE_ADDR=0x... TOKEN_ID=1 npx tsx scripts/oracle-simulator.ts
 */
import { ethers } from "ethers";
import { keccak_256 } from "@noble/hashes/sha3";
import * as ed from "@noble/ed25519";

const BATCH_SIZE = 8;
const INTERVAL_MS = 1_000;

const MERKLE_ADDR = process.env.MERKLE_ADDR ?? "0x0000000000000000000000000000000000000000";
const TOKEN_ID = BigInt(process.env.TOKEN_ID ?? "1");
const RPC = process.env.RPC ?? "http://127.0.0.1:8545";
const PK  = process.env.PK  ?? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // hardhat #0

const merkleAbi = [
  "function anchorBatch(uint256 tokenId,bytes32 merkleRoot,uint32 readingCount,uint64 firstTs,uint64 lastTs) external returns (uint256)",
  "event BatchAnchored(uint256 indexed batchId,uint256 indexed tokenId,bytes32 merkleRoot,uint32 readingCount,uint64 firstTs,uint64 lastTs)",
];

type Reading = { ts: number; tempTenthsC: number; gpsHash: string };

function leafHash(r: Reading): Uint8Array {
  const buf = ethers.solidityPacked(
    ["uint64", "int16", "bytes32"],
    [r.ts, r.tempTenthsC, r.gpsHash]
  );
  return keccak_256(ethers.getBytes(buf));
}

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

function randomReading(prev: number): Reading {
  const drift = (Math.random() - 0.5) * 2;           // ±1°C around previous
  const temp = prev + drift * 0.2;                   // smooth drift
  const gps  = ethers.keccak256(ethers.toUtf8Bytes(`${Date.now()}`));
  return {
    ts: Math.floor(Date.now() / 1000),
    tempTenthsC: Math.round(temp * 10),
    gpsHash: gps,
  };
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PK, provider);
  const merkle = new ethers.Contract(MERKLE_ADDR, merkleAbi, wallet);

  const oracleKeys = await Promise.all([1, 2, 3].map(() => ed.utils.randomPrivateKey()));
  console.log(`Oracle signers: ${oracleKeys.length} (m-of-n = 2/3)`);

  let batch: Reading[] = [];
  let prevTemp = 4.5;

  setInterval(async () => {
    const r = randomReading(prevTemp);
    prevTemp = r.tempTenthsC / 10;
    batch.push(r);
    process.stdout.write(`.${(r.tempTenthsC / 10).toFixed(1)}°C `);

    if (batch.length >= BATCH_SIZE) {
      const leaves = batch.map(leafHash);
      const root = merkleRoot(leaves);
      const msg = ethers.getBytes(root);
      const sigs = await Promise.all(
        oracleKeys.slice(0, 2).map((sk) => ed.signAsync(msg, sk))
      );
      console.log(`\nBatch ready. Root=${root} sigs=${sigs.length}`);
      const first = BigInt(batch[0].ts);
      const last  = BigInt(batch[batch.length - 1].ts);
      const tx = await merkle.anchorBatch(TOKEN_ID, root, batch.length, first, last);
      const rcpt = await tx.wait();
      console.log(`Anchored in block ${rcpt?.blockNumber} tx ${rcpt?.hash}`);
      batch = [];
    }
  }, INTERVAL_MS);
}

main().catch((e) => { console.error(e); process.exit(1); });
