import { ethers } from "hardhat";
import * as fs   from "fs";
import * as path from "path";

/**
 * Seed the local chain with demo state.
 *
 * Account roles (mirrors prototype/app/lib/accounts.ts):
 *   #0  IATA            admin / oracle approver / deployer
 *   #1  TAP Air Cargo   carrier
 *   #2  Pfizer          shipper (creates consignments)
 *   #3  DHL Aviation    carrier
 *   #4  MSF Luanda      receiver
 *
 * Steps:
 *   1. Approve account #0 (IATA/deployer) as trusted IoT oracle  (audit fix H-2)
 *   2. Create demo consignment #1 — Pfizer ships HBL-2026-042
 */

function readAddr(key: string): string {
  const envPath = path.join(__dirname, "..", "app", ".env.local");
  const text = fs.readFileSync(envPath, "utf8");
  const line = text.split("\n").find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`${key} not set in ${envPath}`);
  return line.split("=")[1].trim();
}

async function main() {
  const signers = await ethers.getSigners();
  const iata    = signers[0];
  const pfizer  = signers[2];

  const registry = await ethers.getContractAt("ConsignmentRegistry", readAddr("NEXT_PUBLIC_REGISTRY"));
  const merkle   = await ethers.getContractAt("MerkleIoT",           readAddr("NEXT_PUBLIC_MERKLE"));

  console.log("Accounts:");
  console.log("  IATA   (#0, admin)   =", iata.address);
  console.log("  Pfizer (#2, shipper) =", pfizer.address);

  // ── 1. Approve IATA as trusted IoT oracle (H-2) ──────────────────────────
  if (!(await merkle.approvedOracle(iata.address))) {
    await (await merkle.connect(iata).setApprovedOracle(iata.address, true)).wait();
    console.log("  approved IATA as IoT oracle");
  } else {
    console.log("  IATA already approved as IoT oracle");
  }

  // ── 2. Create demo consignment #1 (Pfizer signs) ─────────────────────────
  const manifest = {
    hbl: "HBL-2026-042",
    originCode: "PTLIS",
    destCode: "AOLAD",
    weightKg: 1200,
    commodity: "PHARMACEUTICAL_VACCINE_CLASS_2",
    tempMinTenthsC: 20,
    tempMaxTenthsC: 80,
  };
  const manifestHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(manifest)));
  if ((await registry.nextId()) === 1n) {
    await (await registry.connect(pfizer).createConsignment(
      manifestHash,
      "ipfs://manifest/HBL-2026-042"
    )).wait();
    console.log("  created consignment #1 (signed by Pfizer)");
    console.log("  manifest hash:", manifestHash);
  } else {
    console.log("  consignment #1 already exists");
  }

  console.log("\n── Ready ───────────────────────────────────────────────────────────");
  console.log("Open http://localhost:3000 — use the picker (top-right) to switch identities.");
  console.log("\nTo start the IoT oracle simulator:");
  console.log(`  MERKLE_ADDR=${await merkle.getAddress()} TOKEN_ID=1 npm run oracle:sim`);
}

main().catch((e) => { console.error(e); process.exit(1); });
