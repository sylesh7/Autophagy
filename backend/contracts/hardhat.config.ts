import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

/**
 * Hardhat configuration for the EfficiencyRegistry.
 *
 * Secrets are referenced with configVariable() rather than inlined, so the
 * private key never lives in a committed file. It resolves from the Hardhat
 * keystore or the environment, which is what deploy.sh relies on when it
 * exports backend/.env before invoking Ignition.
 */
export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],

  // Solidity sources live in src/ rather than the default contracts/, which
  // would nest as contracts/contracts. The solidity plugin reads the
  // `sources.solidity` key specifically — a bare `sources: "src"` string is
  // silently ignored and compiles nothing.
  paths: {
    sources: { solidity: "src" },
  },

  solidity: {
    profiles: {
      default: {
        version: "0.8.24",
      },
      production: {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },

  networks: {
    // Local in-process chain for fast test runs.
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },

    // Base Sepolia is an OP-stack L2, hence chainType "op".
    baseSepolia: {
      type: "http",
      chainType: "op",
      url: configVariable("BASE_SEPOLIA_RPC_URL"),
      chainId: 84532,
      accounts: [configVariable("BACKEND_SIGNER_PRIVATE_KEY")],
    },
  },

  verify: {
    etherscan: {
      apiKey: configVariable("BASESCAN_API_KEY"),
    },
  },
});
