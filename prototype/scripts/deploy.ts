import { ethers } from "hardhat";

/**
 * Deploys the full CargoChain stack to the currently-selected network.
 *
 * Concept-map mapping per contract is documented inline in each .sol file.
 * Run with:
 *   npx hardhat run scripts/deploy.ts --network localhost
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const DIDRegistry = await ethers.deployContract("DIDRegistry");
  await DIDRegistry.waitForDeployment();
  console.log("DIDRegistry:", await DIDRegistry.getAddress());

  const CarrierCredential = await ethers.deployContract("CarrierCredential", [
    await DIDRegistry.getAddress(),
  ]);
  await CarrierCredential.waitForDeployment();
  console.log("CarrierCredential:", await CarrierCredential.getAddress());

  const ConsignmentNFT = await ethers.deployContract("ConsignmentNFT");
  await ConsignmentNFT.waitForDeployment();
  console.log("ConsignmentNFT:", await ConsignmentNFT.getAddress());

  const CustodyLedger = await ethers.deployContract("CustodyLedger", [
    await ConsignmentNFT.getAddress(),
    await CarrierCredential.getAddress(),
    await DIDRegistry.getAddress(),
  ]);
  await CustodyLedger.waitForDeployment();
  console.log("CustodyLedger:", await CustodyLedger.getAddress());

  const MerkleIoT = await ethers.deployContract("MerkleIoT");
  await MerkleIoT.waitForDeployment();
  console.log("MerkleIoT:", await MerkleIoT.getAddress());

  const FreightToken = await ethers.deployContract("FreightToken");
  await FreightToken.waitForDeployment();
  console.log("FreightToken:", await FreightToken.getAddress());

  // ZKVerifier placeholder — replaced by `snarkjs zkey export solidityverifier`
  // For now we deploy a mock that returns true; swap after the real circuit is
  // compiled and the auto-generated `ZKVerifier.sol` is in place.
  const MockZK = await ethers.getContractFactory("MockZKVerifier");
  const mockZK = await MockZK.deploy();
  await mockZK.waitForDeployment();
  console.log("(Mock) ZKVerifier:", await mockZK.getAddress());

  const FreightEscrow = await ethers.deployContract("FreightEscrow", [
    await FreightToken.getAddress(),
    await ConsignmentNFT.getAddress(),
    await mockZK.getAddress(),
    await MerkleIoT.getAddress(),
  ]);
  await FreightEscrow.waitForDeployment();
  console.log("FreightEscrow:", await FreightEscrow.getAddress());

  console.log("\nCopy these addresses into app/.env.local:");
  console.log(`NEXT_PUBLIC_DID_REGISTRY=${await DIDRegistry.getAddress()}`);
  console.log(`NEXT_PUBLIC_CARRIER_CRED=${await CarrierCredential.getAddress()}`);
  console.log(`NEXT_PUBLIC_CONSIGNMENT=${await ConsignmentNFT.getAddress()}`);
  console.log(`NEXT_PUBLIC_CUSTODY=${await CustodyLedger.getAddress()}`);
  console.log(`NEXT_PUBLIC_MERKLE=${await MerkleIoT.getAddress()}`);
  console.log(`NEXT_PUBLIC_FREIGHT_TOKEN=${await FreightToken.getAddress()}`);
  console.log(`NEXT_PUBLIC_ESCROW=${await FreightEscrow.getAddress()}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
