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
  } catch {
    // Fallback key mock if build/zk key isn't generated
    vk = {};
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
      "Cryptographically verified against the implemented prototype predicate. NOT an authoritative IMO D-2 biological compliance certification.",
  };

  // If valid and on-chain attestation enabled, execute contract submission
  if (verificationResult.valid && recordOnChain) {
    try {
      const contractInfo = JSON.parse(await readFile(CONTRACT_INFO_PATH, "utf8"));
      // Connect to local Hardhat node or Besu RPC
      const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const signer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

      const contract = new ethers.Contract(contractInfo.address, contractInfo.abi, signer);
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(pkg.proof ?? {})));
      const epochSeconds = Math.floor(Date.parse(timestamp) / 1000);

      const tx = await contract.recordAttestation(
        opId,
        winId,
        BigInt(root),
        ruleSet,
        true,
        epochSeconds,
        proofHash
      );
      const receipt = await tx.wait();

      record.attestationTxHash = receipt.hash;
      record.blockNumber = receipt.blockNumber;
    } catch (err) {
      console.warn("On-chain attestation record skipped or failed:", err instanceof Error ? err.message : err);
    }
  }

  return record;
}
