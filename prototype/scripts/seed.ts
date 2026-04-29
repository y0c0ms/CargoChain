import { ethers } from "hardhat";
import * as fs   from "fs";
import * as path from "path";

/**
 * Seed the local chain with demo state.
 *
 * Account roles (mirrors prototype/app/lib/accounts.ts):
 *   #0  IATA            issuer / admin / deployer
 *   #1  TAP Air Cargo   carrier  → gets a LicensedCarrier VC
 *   #2  Pfizer          shipper  (no VC needed — only creates consignments)
 *   #3  DHL Aviation    carrier  → gets a LicensedCarrier VC
 *   #4  MSF Luanda      receiver → gets a LicensedCarrier VC (so it can take final custody)
 *
 * Steps:
 *   1. Register DIDs for accounts #0-#4
 *   2. Approve account #0 (deployer) as a trusted LicensedCarrier issuer  (audit fix H-1)
 *   3. Issue LicensedCarrier VCs to TAP, DHL, MSF Luanda
 *   4. Approve account #0 as a trusted IoT oracle                         (audit fix H-2)
 *   5. Create demo consignment #1 — Pfizer ships HBL-2026-042
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
  const tap     = signers[1];
  const pfizer  = signers[2];
  const dhl     = signers[3];
  const msf     = signers[4];

  const dids     = await ethers.getContractAt("DIDRegistry",         readAddr("NEXT_PUBLIC_DID_REGISTRY"));
  const creds    = await ethers.getContractAt("CarrierCredential",   readAddr("NEXT_PUBLIC_CARRIER_CRED"));
  const registry = await ethers.getContractAt("ConsignmentRegistry", readAddr("NEXT_PUBLIC_REGISTRY"));
  const merkle   = await ethers.getContractAt("MerkleIoT",           readAddr("NEXT_PUBLIC_MERKLE"));

  console.log("Accounts:");
  console.log("  IATA          (#0, issuer)   =", iata.address);
  console.log("  TAP Air Cargo (#1, carrier)  =", tap.address);
  console.log("  Pfizer        (#2, shipper)  =", pfizer.address);
  console.log("  DHL Aviation  (#3, carrier)  =", dhl.address);
  console.log("  MSF Luanda    (#4, receiver) =", msf.address);

  // ── 1. Register DIDs ─────────────────────────────────────────────────────
  for (const s of [iata, tap, pfizer, dhl, msf]) {
    if (!(await dids.isActive(s.address))) {
      const docHash = ethers.keccak256(ethers.toUtf8Bytes(`did-doc-${s.address}`));
      await (await dids.connect(s).register(docHash, `ipfs://did/${s.address}`)).wait();
      console.log("  registered DID for", s.address);
    } else {
      console.log("  DID already active for", s.address);
    }
  }

  // ── 2. Approve IATA as trusted issuer (H-1) ──────────────────────────────
  if (!(await creds.approvedIssuer(0, iata.address))) {
    await (await creds.connect(iata).setApprovedIssuer(0, iata.address, true)).wait();
    console.log("  approved IATA as LicensedCarrier issuer");
  }

  // ── 3. Issue LicensedCarrier VCs to TAP, DHL, MSF Luanda ─────────────────
  for (const carrier of [tap, dhl, msf]) {
    const vcHash = ethers.keccak256(ethers.toUtf8Bytes(`vc-licensed-${carrier.address}`));
    if (!(await creds.subjectHasActiveVC(carrier.address, 0))) {
      try {
        await (await creds.connect(iata).issueVC(carrier.address, 0, vcHash, 0, 0)).wait();
        console.log("  issued LicensedCarrier VC to", carrier.address);
      } catch (e) {
        if (e instanceof Error && e.message.includes("AlreadyIssued")) {
          console.log("  VC hash collision (already issued) for", carrier.address);
        } else throw e;
      }
    } else {
      console.log("  LicensedCarrier VC already active for", carrier.address);
    }
  }

  // ── 4. Approve IATA as trusted IoT oracle (H-2) ──────────────────────────
  if (!(await merkle.approvedOracle(iata.address))) {
    await (await merkle.connect(iata).setApprovedOracle(iata.address, true)).wait();
    console.log("  approved IATA as IoT oracle");
  }

  // ── 5. Create demo consignment #1 (Pfizer signs) ─────────────────────────
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
