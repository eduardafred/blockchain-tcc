import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.24",
        settings: {
          evmVersion: "london",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    instituicaoA: {
      type: "http",
      url: "http://localhost:8545",
      gasPrice: 0,
      chainId: 1337,
      accounts: "remote",
    },
    instituicaoB: {
      type: "http",
      url: "http://localhost:8555",
      gasPrice: 0,
      chainId: 1337,
      accounts: "remote",
    },
    secretaria: {
      type: "http",
      url: "http://localhost:8565",
      gasPrice: 0,
      chainId: 1337,
      accounts: "remote",
    }
  },
});
