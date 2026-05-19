import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploys the CargoChain stack (factory-of-clones design):
 *   1. PackageFactory — deploys the Package implementation in its constructor,
 *                       then spawns per-package clones via create().
 *   2. MerkleIoT     — IoT batch anchoring + on-chain verifyReading.
 *
 * Run with:
 *   npx hardhat run scripts/deploy.ts --network localhost
 *
 * After deploy, app/.env.local is written automatically — no manual copy-paste step.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const factory = await ethers.deployContract("PackageFactory");
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  const implAddr = await factory.implementation();
  console.log("PackageFactory     :", factoryAddr);
  console.log("  Package impl     :", implAddr);

  const merkle = await ethers.deployContract("MerkleIoT");
  await merkle.waitForDeployment();
  const merkleAddr = await merkle.getAddress();
  console.log("MerkleIoT          :", merkleAddr);

  // Auto-write app/.env.local so the Next.js app picks up addresses immediately
  const envPath = path.resolve(__dirname, "../app/.env.local");
  const envContent = [
    "NEXT_PUBLIC_RPC=http://127.0.0.1:8545",
    "NEXT_PUBLIC_CHAIN_ID=31337",
    `NEXT_PUBLIC_FACTORY=${factoryAddr}`,
    `NEXT_PUBLIC_MERKLE=${merkleAddr}`,
  ].join("\n") + "\n";

  fs.writeFileSync(envPath, envContent, "utf8");
  console.log(`\n✅  app/.env.local written automatically — no manual copy needed.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
