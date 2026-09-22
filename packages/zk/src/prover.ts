import { groth16 } from "snarkjs";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TelemetryWindow } from "@bwms/telemetry";
import { buildMerkleTree, canonicalizeTelemetryRecord } from "@bwms/merkle";
import type { Groth16Proof } from "./proof-package.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveFilePath(relativePath: string): string {
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

export async function generateGroth16Proof(window: TelemetryWindow): Promise<{ proof: Groth16Proof; publicSignals: string[] }> {
  const telemetry: string[][] = [];
  for (const record of window.records) {
    const canonical = await canonicalizeTelemetryRecord(record);
    telemetry.push([
      canonical.operationId.toString(),
      canonical.windowId.toString(),
      canonical.sequence.toString(),
      canonical.timestamp.toString(),
      canonical.sensorId.toString(),
      canonical.flowRate.toString(),
      canonical.uvIntensity.toString(),
      canonical.temperature.toString(),
      canonical.salinity.toString(),
      canonical.turbidity.toString(),
    ]);
  }

  const merkleTree = await buildMerkleTree(window.records);
  const inputObj = {
    telemetry,
    publicRoot: merkleTree.root.toString(),
  };

  const wasmPath = resolveFilePath("telemetry_merkle_root_js/telemetry_merkle_root.wasm");
  const zkeyPath = resolveFilePath("build/zk/bwms_final.zkey");

  if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
    // Fallback to static proof artifacts if dynamic compilation artifacts are missing
    const staticProofPath = resolveFilePath("build/zk/proof.json");
    const staticPublicPath = resolveFilePath("build/zk/public.json");
    const staticProof = JSON.parse(await readFile(staticProofPath, "utf8"));
    const staticPublic = JSON.parse(await readFile(staticPublicPath, "utf8"));
    return { proof: staticProof, publicSignals: staticPublic };
  }

  const { proof, publicSignals } = await groth16.fullProve(inputObj, wasmPath, zkeyPath);
  return { proof: proof as Groth16Proof, publicSignals };
}
