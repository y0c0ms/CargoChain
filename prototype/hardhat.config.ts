import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

/**
 * Factory-variant config. Identical to ../prototype/hardhat.config.ts.
 * Kept as a separate file so the two prototypes can be compiled and
 * tested in isolation (different artifacts/, cache/, typechain-types/).
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
