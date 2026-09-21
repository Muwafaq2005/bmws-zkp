const { ethers } = require("ethers");
const fs = require("node:fs/promises");
const path = require("node:path");

async function main() {
  console.log("Deploying BWMSAttestation via Direct Ethers v6...");

  const rpcUrl = process.env.BESU_RPC_URL || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const privateKey = process.env.VERIFIER_PRIVATE_KEY || "0xc87ecb10b6601ad372c27102a24d3dd819974eb447b9319a28bf2c246f663675";
  const signer = new ethers.Wallet(privateKey, provider);
  console.log("Deployer account:", signer.address);

  const artifactPath = path.resolve(__dirname, "../artifacts/contracts/BWMSAttestation.sol/BWMSAttestation.json");
  const artifact = JSON.parse(await fs.readFile(artifactPath, "utf8"));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  
  // Deploy contract with explicit gas limit
  const contract = await factory.deploy({
    gasLimit: 3000000,
    gasPrice: 1000000000n, // 1 gwei
  });

  console.log("Tx sent. Tx Hash:", contract.deploymentTransaction().hash);
  console.log("Waiting for block confirmation...");

  const receipt = await contract.deploymentTransaction().wait();
  const address = await contract.getAddress();

  console.log("BWMSAttestation successfully deployed to:", address);
  console.log("Block Number:", receipt.blockNumber);

  const buildDir = path.resolve(__dirname, "../../build/blockchain");
  await fs.mkdir(buildDir, { recursive: true });

  const deploymentInfo = {
    address,
    abi: artifact.abi,
    network: "hardhat/besu",
    deployedAt: new Date().toISOString(),
    deployer: signer.address,
  };

  await fs.writeFile(
    path.join(buildDir, "contract_info.json"),
    JSON.stringify(deploymentInfo, null, 2),
    "utf8"
  );

  console.log("Wrote deployment artifact to build/blockchain/contract_info.json");
}

main().catch((error) => {
  console.error("Deployment Error:", error);
  process.exitCode = 1;
});
