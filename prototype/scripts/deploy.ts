import { ethers } from "hardhat";

/**
 * Deploys the CargoChain stack (2 contracts) to the selected network.
 *
 * Stack:
 *   1. ConsignmentRegistry — consignment lifecycle + custody handover log
 *   2. MerkleIoT           — IoT batch anchoring + on-chain verifyReading
 *
 * Run with:
 *   npx hardhat run scripts/deploy.ts --network localhost
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const ConsignmentRegistry = await ethers.deployContract("ConsignmentRegistry");
  await ConsignmentRegistry.waitForDeployment();
  console.log("ConsignmentRegistry:", await ConsignmentRegistry.getAddress());

  const MerkleIoT = await ethers.deployContract("MerkleIoT");
  await MerkleIoT.waitForDeployment();
  console.log("MerkleIoT          :", await MerkleIoT.getAddress());

  console.log("\nCopy these addresses into prototype/app/.env.local:");
  console.log(`NEXT_PUBLIC_REGISTRY=${await ConsignmentRegistry.getAddress()}`);
  console.log(`NEXT_PUBLIC_MERKLE=${await MerkleIoT.getAddress()}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
