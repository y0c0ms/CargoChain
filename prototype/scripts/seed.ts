import { ethers } from "hardhat";

/**
 * Seed the local chain with demo state so every UI dashboard has something to
 * act on. Registers DIDs for the first 3 Hardhat accounts and issues a
 * LicensedCarrier VC to account[1]. Also mints FRT to the shipper.
 *
 * Contract addresses MUST match the latest deploy output; read them from the
 * env so this script stays in sync with `.env.local`.
 */
import * as fs from "fs";
import * as path from "path";

function readAddr(key: string): string {
  const envPath = path.join(__dirname, "..", "app", ".env.local");
  const text = fs.readFileSync(envPath, "utf8");
  const line = text.split("\n").find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`${key} not set in ${envPath}`);
  return line.split("=")[1].trim();
}

async function main() {
  const [deployer, carrier, shipper] = await ethers.getSigners();

  const didAddr = readAddr("NEXT_PUBLIC_DID_REGISTRY");
  const credAddr = readAddr("NEXT_PUBLIC_CARRIER_CRED");
  const ftAddr = readAddr("NEXT_PUBLIC_FREIGHT_TOKEN");

  const dids = await ethers.getContractAt("DIDRegistry", didAddr);
  const creds = await ethers.getContractAt("CarrierCredential", credAddr);
  const ft = await ethers.getContractAt("FreightToken", ftAddr);

  console.log("Accounts:");
  console.log("  deployer =", deployer.address);
  console.log("  carrier  =", carrier.address);
  console.log("  shipper  =", shipper.address);

  // Register DIDs (skip if already registered)
  for (const s of [deployer, carrier, shipper]) {
    const active = await dids.isActive(s.address);
    if (!active) {
      const docHash = ethers.keccak256(ethers.toUtf8Bytes(`did-doc-${s.address}`));
      const tx = await dids.connect(s).register(docHash, `ipfs://did/${s.address}`);
      await tx.wait();
      console.log("  registered DID for", s.address);
    } else {
      console.log("  DID already active for", s.address);
    }
  }

  // Approve deployer as a trusted LicensedCarrier issuer (audit fix H-1)
  const alreadyApproved = await creds.approvedIssuer(0, deployer.address);
  if (!alreadyApproved) {
    const tx = await creds.connect(deployer).setApprovedIssuer(0, deployer.address, true);
    await tx.wait();
    console.log("  approved deployer as LicensedCarrier issuer");
  }

  // Issue LicensedCarrier VC to the carrier account (schema 0)
  const vcHash = ethers.keccak256(ethers.toUtf8Bytes(`vc-carrier-${carrier.address}`));
  try {
    const tx = await creds.connect(deployer).issueVC(carrier.address, 0, vcHash, 0, 0);
    await tx.wait();
    console.log("  issued LicensedCarrier VC to", carrier.address);
  } catch (e) {
    if (e instanceof Error && e.message.includes("AlreadyIssued")) {
      console.log("  LicensedCarrier VC already issued");
    } else {
      throw e;
    }
  }

  // Approve deployer as a trusted IoT oracle (audit fix H-2)
  const merkleAddr = readAddr("NEXT_PUBLIC_MERKLE");
  const merkle = await ethers.getContractAt("MerkleIoT", merkleAddr);
  const oracleApproved = await merkle.approvedOracle(deployer.address);
  if (!oracleApproved) {
    const tx = await merkle.connect(deployer).setApprovedOracle(deployer.address, true);
    await tx.wait();
    console.log("  approved deployer as IoT oracle");
  }

  // Mint FRT to the shipper so it can fund escrows
  const mintTx = await ft.connect(deployer).mint(shipper.address, ethers.parseEther("1000000"));
  await mintTx.wait();
  console.log("  minted 1,000,000 FRT to shipper");

  console.log("\nSeed targets (paste these into UI when prompted):");
  console.log("  Carrier address:", carrier.address);
  console.log("  Shipper address:", shipper.address);
}

main().catch((e) => { console.error(e); process.exit(1); });
