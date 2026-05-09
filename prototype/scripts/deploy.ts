import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploys the CargoChain stack (2 contracts) to the selected network.
 *
 * Stack:
 *   1. ConsignmentRegistry — consignment lifecycle + custody handover log
 *   2. MerkleIoT           — IoT batch anchoring + on-chain verifyReading
 *
 * Run with:
 *   npx hardhat run scripts/deploy.ts --network localhost
 *
 * After deploy, prototype/app/.env.local is written automatically — no manual
 * copy-paste step needed.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const ConsignmentRegistry = await ethers.deployContract("ConsignmentRegistry");
  await ConsignmentRegistry.waitForDeployment();
  const regAddr = await ConsignmentRegistry.getAddress();
  console.log("ConsignmentRegistry:", regAddr);

  const MerkleIoT = await ethers.deployContract("MerkleIoT");
  await MerkleIoT.waitForDeployment();
  const iotAddr = await MerkleIoT.getAddress();
  console.log("MerkleIoT          :", iotAddr);

  // Auto-write app/.env.local so the Next.js app picks up addresses immediately
  const envPath = path.resolve(__dirname, "../app/.env.local");
  const envContent = [
    "NEXT_PUBLIC_RPC=http://127.0.0.1:8545",
    "NEXT_PUBLIC_CHAIN_ID=31337",
    `NEXT_PUBLIC_REGISTRY=${regAddr}`,
    `NEXT_PUBLIC_MERKLE=${iotAddr}`,
  ].join("\n") + "\n";

  fs.writeFileSync(envPath, envContent, "utf8");
  console.log(`\n✅  app/.env.local written automatically — no manual copy needed.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
