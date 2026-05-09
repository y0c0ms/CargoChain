import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

/**
 * Single network: localhost (Hardhat node on 127.0.0.1:8545).
 * All demo and testing runs locally — no public testnet required.
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
  },
  gasReporter: {
    enabled: true,
    currency: "EUR",
  },
};

export default config;
