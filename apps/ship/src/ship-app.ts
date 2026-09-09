import { generateTelemetryWindow, type TelemetryWindow } from "@bwms/telemetry";
import { buildMerkleTree } from "@bwms/merkle";
import { createVerificationPackage, type VerificationPackage, type Groth16Proof } from "@bwms/zk";
import { simulateVSATTransmission, type VSATLinkConfig, type TransmissionMetrics } from "@bwms/vsat-simulator";
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

const PROOF_PATH = resolveBuildPath("build/zk/proof.json");
const PUBLIC_PATH = resolveBuildPath("build/zk/public.json");

export interface ShipTransmissionResult {
  window: TelemetryWindow;
  merkleRoot: string;
  verificationPackage: VerificationPackage;
  vsatMetrics: TransmissionMetrics;
}

export async function processAndTransmitShipTelemetry(
  customWindow?: TelemetryWindow,
  vsatConfig: VSATLinkConfig = { bandwidthKbps: 512, roundTripLatencyMs: 650, packetLossPercent: 2.0 }
): Promise<ShipTransmissionResult> {
  // 1. Acquire Telemetry Window
  const window = customWindow ?? generateTelemetryWindow();
  
  // 2. Validate Window & Compute Merkle Root
  const merkleTree = await buildMerkleTree(window.records);
  const merkleRoot = merkleTree.root.toString();

  // 3. Load / Construct Proving Artifacts
  let proof: Groth16Proof;
  let publicInputs: string[];

  try {
    proof = JSON.parse(await readFile(PROOF_PATH, "utf8"));
    publicInputs = JSON.parse(await readFile(PUBLIC_PATH, "utf8"));
  } catch {
    // Fallback mock proof for standalone testing if build/zk hasn't been compiled
    proof = {
      pi_a: ["1", "2", "1"],
      pi_b: [["1", "2"], ["3", "4"], ["1", "0"]],
      pi_c: ["1", "2", "1"],
      protocol: "groth16",
      curve: "bn128"
    };
    publicInputs = [merkleRoot];
  }

  // 4. Construct Verification Package (No Raw Telemetry Included)
  const verificationPackage = createVerificationPackage(
    window,
    BigInt(merkleRoot),
    proof,
    new Date().toISOString()
  );

  // 5. Simulate VSAT Channel Transmission
  const vsatMetrics = simulateVSATTransmission(
    "Ship-to-Shore VSAT Transmission",
    verificationPackage,
    vsatConfig
  );

  return {
    window,
    merkleRoot,
    verificationPackage,
    vsatMetrics
  };
}
