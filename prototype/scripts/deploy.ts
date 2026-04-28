import { ethers } from "hardhat";

/**
 * Deploys the CargoChain stack (4 contracts) to the selected network.
 *
 * Stack:
 *   1. DIDRegistry         — DID anchor (W3C DID Core)
 *   2. CarrierCredential   — VC anchor (W3C VC Data Model)
 *   3. ConsignmentRegistry — consignment identity + custody (replaces NFT + Ledger)
 *   4. MerkleIoT           — IoT batch anchoring + on-chain verifyReading
 *
 * Concept-map mapping per contract is documented inline in each .sol file.
 *
 * Run with:
 *   npx hardhat run scripts/deploy.ts --network localhost
 *   npx hardhat run scripts/deploy.ts --network polygonAmoy
 *   npx hardhat run scripts/deploy.ts --network sepolia
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const DIDRegistry = await ethers.deployContract("DIDRegistry");
  await DIDRegistry.waitForDeployment();
  console.log("DIDRegistry        :", await DIDRegistry.getAddress());

  const CarrierCredential = await ethers.deployContract("CarrierCredential", [
    await DIDRegistry.getAddress(),
  ]);
  await CarrierCredential.waitForDeployment();
  console.log("CarrierCredential  :", await CarrierCredential.getAddress());

  const ConsignmentRegistry = await ethers.deployContract("ConsignmentRegistry", [
    await CarrierCredential.getAddress(),
    await DIDRegistry.getAddress(),
  ]);
  await ConsignmentRegistry.waitForDeployment();
  console.log("ConsignmentRegistry:", await ConsignmentRegistry.getAddress());

  const MerkleIoT = await ethers.deployContract("MerkleIoT");
  await MerkleIoT.waitForDeployment();
  console.log("MerkleIoT          :", await MerkleIoT.getAddress());

  console.log("\nCopy these addresses into prototype/app/.env.local:");
  console.log(`NEXT_PUBLIC_DID_REGISTRY=${await DIDRegistry.getAddress()}`);
  console.log(`NEXT_PUBLIC_CARRIER_CRED=${await CarrierCredential.getAddress()}`);
  console.log(`NEXT_PUBLIC_REGISTRY=${await ConsignmentRegistry.getAddress()}`);
  console.log(`NEXT_PUBLIC_MERKLE=${await MerkleIoT.getAddress()}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
