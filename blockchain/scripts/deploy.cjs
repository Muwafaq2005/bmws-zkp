const { ethers } = require("hardhat");
const fs = require("node:fs/promises");
const path = require("node:path");

async function main() {
  console.log("Deploying BWMSAttestation smart contract...");

  const signers = await ethers.getSigners();
  let deployer = signers[0];
  if (!deployer) {
    const defaultPrivateKey = process.env.VERIFIER_PRIVATE_KEY || "0xc87ecb10b6601ad372c27102a24d3dd819974eb447b9319a28bf2c246f663675";
    deployer = new ethers.Wallet(defaultPrivateKey, ethers.provider);
  }
  console.log("Deployer account:", deployer.address);

  const BWMSAttestation = await ethers.getContractFactory("BWMSAttestation", deployer);
  const attestation = await BWMSAttestation.deploy({ type: 0, gasPrice: 0, gasLimit: 3000000 });
  await attestation.waitForDeployment();

  const address = await attestation.getAddress();
  console.log("BWMSAttestation deployed to:", address);

  const artifact = require("../artifacts/contracts/BWMSAttestation.sol/BWMSAttestation.json");

  const buildDir = path.resolve(__dirname, "../../build/blockchain");
  await fs.mkdir(buildDir, { recursive: true });

  const deploymentInfo = {
    address,
    abi: artifact.abi,
    network: "hardhat/besu",
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  await fs.writeFile(
    path.join(buildDir, "contract_info.json"),
    JSON.stringify(deploymentInfo, null, 2),
    "utf8"
  );

  console.log("Wrote deployment artifact to build/blockchain/contract_info.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
