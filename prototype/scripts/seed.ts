import { ethers } from "hardhat";
import * as fs   from "fs";
import * as path from "path";

/**
 * Seed the local chain with demo state.
 *
 * Steps:
 *   1. Register DIDs for deployer, carrier, and shipper accounts
 *   2. Approve deployer as trusted LicensedCarrier issuer  (audit fix H-1)
 *   3. Issue a LicensedCarrier VC to account[1] (carrier)
 *   4. Approve deployer as trusted IoT oracle             (audit fix H-2)
 *   5. Create demo consignment #1 (shipper signs the tx — public-chain spirit)
 *
 * Note: only the manifest hash is on-chain; full data lives in the event log
 *       and at the off-chain `manifestURI`.
 */

function readAddr(key: string): string {
  const envPath = path.join(__dirname, "..", "app", ".env.local");
  const text = fs.readFileSync(envPath, "utf8");
  const line = text.split("\n").find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`${key} not set in ${envPath}`);
  return line.split("=")[1].trim();
}

async function main() {
  const [deployer, carrier, shipper] = await ethers.getSigners();

  const dids     = await ethers.getContractAt("DIDRegistry",         readAddr("NEXT_PUBLIC_DID_REGISTRY"));
  const creds    = await ethers.getContractAt("CarrierCredential",   readAddr("NEXT_PUBLIC_CARRIER_CRED"));
  const registry = await ethers.getContractAt("ConsignmentRegistry", readAddr("NEXT_PUBLIC_REGISTRY"));
  const merkle   = await ethers.getContractAt("MerkleIoT",           readAddr("NEXT_PUBLIC_MERKLE"));

  console.log("Accounts:");
  console.log("  deployer =", deployer.address);
  console.log("  carrier  =", carrier.address);
  console.log("  shipper  =", shipper.address);

  // ── 1. Register DIDs ─────────────────────────────────────────────────────
  for (const s of [deployer, carrier, shipper]) {
    if (!(await dids.isActive(s.address))) {
      const docHash = ethers.keccak256(ethers.toUtf8Bytes(`did-doc-${s.address}`));
      await (await dids.connect(s).register(docHash, `ipfs://did/${s.address}`)).wait();
      console.log("  registered DID for", s.address);
    } else {
      console.log("  DID already active for", s.address);
    }
  }

  // ── 2. Approve trusted issuer (H-1) ──────────────────────────────────────
  if (!(await creds.approvedIssuer(0, deployer.address))) {
    await (await creds.connect(deployer).setApprovedIssuer(0, deployer.address, true)).wait();
    console.log("  approved deployer as LicensedCarrier issuer");
  }

  // ── 3. Issue LicensedCarrier VC to carrier ────────────────────────────────
  const vcHash = ethers.keccak256(ethers.toUtf8Bytes(`vc-carrier-${carrier.address}`));
  try {
    await (await creds.connect(deployer).issueVC(carrier.address, 0, vcHash, 0, 0)).wait();
    console.log("  issued LicensedCarrier VC to", carrier.address);
  } catch (e) {
    if (e instanceof Error && e.message.includes("AlreadyIssued")) {
      console.log("  LicensedCarrier VC already issued");
    } else throw e;
  }

  // ── 4. Approve trusted IoT oracle (H-2) ──────────────────────────────────
  if (!(await merkle.approvedOracle(deployer.address))) {
    await (await merkle.connect(deployer).setApprovedOracle(deployer.address, true)).wait();
    console.log("  approved deployer as IoT oracle");
  }

  // ── 5. Create demo consignment #1 ────────────────────────────────────────
  // Shipper signs their own consignment creation — no operator gating.
  const manifest = {
    hbl: "HBL-2026-042",
    originCode: "PTLIS",
    destCode: "AOLAD",
    weightKg: 1200,
    commodity: "PHARMACEUTICAL_VACCINE_CLASS_2",
    tempMinTenthsC: 20,
    tempMaxTenthsC: 80,
  };
  const manifestJson = JSON.stringify(manifest);
  const manifestHash = ethers.keccak256(ethers.toUtf8Bytes(manifestJson));
  if ((await registry.nextId()) === 1n) {
    await (await registry.connect(shipper).createConsignment(
      manifestHash,
      "ipfs://manifest/HBL-2026-042"
    )).wait();
    console.log("  created consignment #1 (shipper-signed)");
    console.log("  manifest hash:", manifestHash);
  } else {
    console.log("  consignment #1 already exists");
  }

  console.log("\n── Ready ───────────────────────────────────────────────────────────");
  console.log("  Carrier address :", carrier.address);
  console.log("  Shipper address :", shipper.address);
  console.log("\nTo start the IoT oracle simulator:");
  console.log(`  MERKLE_ADDR=${await merkle.getAddress()} TOKEN_ID=1 npm run oracle:sim`);
}

main().catch((e) => { console.error(e); process.exit(1); });
