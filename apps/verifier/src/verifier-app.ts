import { verifyVerificationPackage, type VerificationPackage, type VerificationOptions } from "@bwms/zk";
import { ethers } from "ethers";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveBuildPath(relativePath: string): string {
  const candidates = [
    path.resolve(process.cwd(), relativePath),
    path.resolve(process.cwd(), "../..", relativePath),
    path.resolve(process.cwd(), "..", relativePath),
    path.resolve(__dirname, "../../..", relativePath),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.resolve(process.cwd(), relativePath);
}

const VK_PATH = resolveBuildPath("build/zk/verification_key.json");
const CONTRACT_INFO_PATH = resolveBuildPath("build/blockchain/contract_info.json");

export interface VerificationRecord {
  operationId: string;
  windowId: string;
  status: "PASS" | "REJECT";
  reason?: string;
  attackVector?: string;
  merkleRoot: string;
  ruleSetId: string;
  verificationTimestamp: string;
  attestationTxHash?: string;
  blockNumber?: number;
  disclaimer: string;
}

const seenAttestations = new Set<string>();

export async function processRemoteVerification(
  rawPackage: unknown,
  recordOnChain: boolean = false,
  customOptions?: VerificationOptions,
): Promise<VerificationRecord> {
  const timestamp = new Date().toISOString();
  let vk: object;

  try {
    vk = JSON.parse(await readFile(VK_PATH, "utf8"));
  } catch (err) {
    throw new Error(
      `Missing verification key artifact at ${VK_PATH}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const options: VerificationOptions = {
    seenAttestations,
    ...customOptions,
  };

  const verificationResult = await verifyVerificationPackage(rawPackage, vk, options);

  const pkg = (typeof rawPackage === "object" && rawPackage !== null ? rawPackage : {}) as Partial<VerificationPackage>;
  const opId = pkg.operation_id ?? "UNKNOWN";
  const winId = pkg.window_id ?? "UNKNOWN";
  const root = pkg.merkle_root ?? "0";
  const ruleSet = pkg.rule_set_id ?? "BWMS-DEMO-V1";

  const record: VerificationRecord = {
    operationId: opId,
    windowId: winId,
    status: verificationResult.valid ? "PASS" : "REJECT",
    reason: verificationResult.reason,
    attackVector: verificationResult.attackVector,
    merkleRoot: root,
    ruleSetId: ruleSet,
    verificationTimestamp: timestamp,
    disclaimer:
      "BWMS-DEMO-V1 is an educational prototype rule set demonstrating privacy-preserving verification of ballast-water operational evidence. It does not constitute IMO D-2 certification.",
  };

  // If valid and on-chain attestation enabled, execute contract submission
  if (verificationResult.valid && recordOnChain) {
    try {
      let contractAddress = process.env.ATTESTATION_CONTRACT_ADDRESS;
      let abi: any;

      if (fs.existsSync(CONTRACT_INFO_PATH)) {
        const contractInfo = JSON.parse(await readFile(CONTRACT_INFO_PATH, "utf8"));
        contractAddress = contractAddress || contractInfo.address;
        abi = contractInfo.abi;
      }

      if (!contractAddress) {
        throw new Error("Contract address is missing. Ensure BWMSAttestation contract is deployed.");
      }

      const rpcUrl = process.env.BESU_RPC_URL || "http://127.0.0.1:8545";
      const privateKey = process.env.VERIFIER_PRIVATE_KEY || "0xc87ecb10b6601ad372c27102a24d3dd819974eb447b9319a28bf2c246f663675";

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const signer = new ethers.Wallet(privateKey, provider);

      if (!abi) {
        // Fallback standard ABI for recordAttestation
        abi = [
          "function recordAttestation(string operationId, string windowId, uint256 merkleRoot, string ruleSetId, bool compliant, uint256 verificationTimestamp, bytes32 proofHash) returns (bytes32)"
        ];
      }

      const contract = new ethers.Contract(contractAddress, abi, signer);
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(pkg.proof ?? {})));
      const epochSeconds = Math.floor(Date.parse(timestamp) / 1000);

      const tx = await contract.recordAttestation(
        opId,
        winId,
        BigInt(root),
        ruleSet,
        true,
        epochSeconds,
        proofHash,
        { type: 0, gasPrice: 0, gasLimit: 1000000 }
      );
      let receipt = null;
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise((r) => setTimeout(r, 600));
        receipt = await provider.getTransactionReceipt(tx.hash);
        if (receipt) break;
      }

      record.attestationTxHash = tx.hash;
      record.blockNumber = receipt ? receipt.blockNumber : await provider.getBlockNumber();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("On-chain attestation transaction failed:", errMsg);
      record.reason = `Blockchain attestation failed: ${errMsg}`;
      // Do NOT set fake transaction hash! Fail closed.
    }
  }

  return record;
}
