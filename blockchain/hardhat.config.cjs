require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
    besu: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
      accounts: [
        "0xc87ecb10b6601ad372c27102a24d3dd819974eb447b9319a28bf2c246f663675", // Besu test account key
      ],
    },
  },
};
