import { ethers } from "hardhat";

/**
 * Deploys the factory-variant CargoChain stack:
 *
 *   1. PackageFactory — deploys the Package implementation in its
 *                       constructor, then spawns clones via create().
 *   2. MerkleIoT     — unchanged from the mapping prototype; uses an
 *                      integer id that resolves through the factory.
 *
 * Run with:
 *   npx hardhat run scripts/deploy.ts --network localhost
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
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
