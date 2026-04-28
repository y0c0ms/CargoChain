import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

/**
 * Network targets:
 *   - localhost : Hardhat node on 127.0.0.1:8545 (instant blocks, dev + tests)
 *   - sepolia   : Ethereum's official public PoS testnet, ~12 s blocks
 *
 * Besu (private permissioned IBFT 2.0) was removed after the case studies
 * (TradeLens, we.trade, Marco Polo, Contour, B3i) made it clear that
 * permissioned-chain logistics platforms have a structural adoption problem.
 * See docs/CASE_STUDIES.md.
 */
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC ?? "https://rpc.sepolia.org",
      chainId: 11155111,
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY ?? "",
  },
  gasReporter: {
    enabled: true,
    currency: "EUR",
  },
};

export default config;
