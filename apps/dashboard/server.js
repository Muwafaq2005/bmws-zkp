import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { processAndTransmitShipTelemetry } from "@bwms/ship-app";
import { processRemoteVerification } from "@bwms/verifier-app";
import { compareVSATTransmission } from "@bwms/vsat-simulator";
import { generateTelemetryWindow } from "@bwms/telemetry";
import { readFile } from "node:fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
let lastPipelineResult = null;

// Route 1: Execute Complete End-to-End Valid Pipeline
app.post("/api/pipeline/run", async (req, res) => {
  try {
    const vsatConfig = req.body?.vsatConfig || {
      bandwidthKbps: 512,
      roundTripLatencyMs: 650,
      packetLossPercent: 2.0,
    };

    // 1. Ship-side Telemetry & ZK Proof Package creation
    const shipResult = await processAndTransmitShipTelemetry(undefined, vsatConfig);

    // 2. VSAT Payload Comparison
    const comparison = compareVSATTransmission(
      shipResult.window.records,
      shipResult.verificationPackage,
      vsatConfig
    );

    // 3. Remote Verifier Execution & On-Chain Attestation Recording
    const verifierRecord = await processRemoteVerification(
      shipResult.verificationPackage,
      true, // Record on-chain attestation
      { seenAttestations: new Set() } // Fresh attestation set for demo pipeline runs
    );

    lastPipelineResult = {
      timestamp: new Date().toISOString(),
      shipResult,
      comparison,
      verifierRecord,
      attackMode: null,
    };

    res.json({ success: true, data: lastPipelineResult });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Route 2: Simulate Adversarial Security Attack Case
app.post("/api/pipeline/attack", async (req, res) => {
  try {
    const attackType = req.body?.attackType || "proof_mutation";
    const vsatConfig = req.body?.vsatConfig || {
      bandwidthKbps: 512,
      roundTripLatencyMs: 650,
      packetLossPercent: 2.0,
    };

    const shipResult = await processAndTransmitShipTelemetry(undefined, vsatConfig);
    const tamperedPackage = JSON.parse(JSON.stringify(shipResult.verificationPackage));

    let attackDescription = "";

    switch (attackType) {
      case "root_mutation":
        attackDescription = "Altered Merkle root commitment to claim invalid telemetry data";
        tamperedPackage.merkle_root = "999999999999999999999999999999999999999999999999999999999999999999";
        tamperedPackage.public_inputs = [tamperedPackage.merkle_root];
        break;

      case "proof_mutation":
        attackDescription = "Mutated Groth16 proof elliptic curve point (pi_a)";
        tamperedPackage.proof.pi_a[0] = "123456789123456789123456789123456789";
        break;

      case "unsupported_ruleset":
        attackDescription = "Submitting proof under unauthorized rule set (BWMS-RELAXED-V0)";
        tamperedPackage.rule_set_id = "BWMS-RELAXED-V0";
        break;

      case "stale_package":
        attackDescription = "Replaying expired package generated 48 hours ago";
        tamperedPackage.generated_at = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
        break;

      case "replay":
        attackDescription = "Replaying an attestation window package that has already been verified on-chain";
        break;

      default:
        attackDescription = "Mutated proof point";
        tamperedPackage.proof.pi_a[0] = "0000000000000000000";
        break;
    }

    const comparison = compareVSATTransmission(
      shipResult.window.records,
      tamperedPackage,
      vsatConfig
    );

    const options = {};
    if (attackType === "stale_package") {
      options.maxAgeMs = 3600 * 1000;
    } else if (attackType === "replay") {
      options.seenAttestations = new Set([`${tamperedPackage.operation_id}:${tamperedPackage.window_id}`]);
    }

    const verifierRecord = await processRemoteVerification(
      tamperedPackage,
      false, // Do not record invalid proof on chain
      options
    );

    const result = {
      timestamp: new Date().toISOString(),
      shipResult: { ...shipResult, verificationPackage: tamperedPackage },
      comparison,
      verifierRecord,
      attackMode: {
        type: attackType,
        description: attackDescription,
      },
    };

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Route 3: Fetch Baseline System Benchmark Data
app.get("/api/metrics", async (req, res) => {
  try {
    const rawWindow = generateTelemetryWindow();
    const pkgPath = path.resolve(__dirname, "../../build/zk/verification_package.json");
    let verificationPackage;
    try {
      verificationPackage = JSON.parse(await readFile(pkgPath, "utf8"));
    } catch {
      verificationPackage = { version: 1 };
    }

    const vsatConfig = { bandwidthKbps: 512, roundTripLatencyMs: 650, packetLossPercent: 2.0 };
    const comparison = compareVSATTransmission(rawWindow.records, verificationPackage, vsatConfig);

    res.json({
      success: true,
      data: {
        comparison,
        circuitInfo: {
          constraints: 68420,
          publicInputs: 1,
          leaves: 64,
          field: "BN254",
          provingSystem: "Groth16",
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.listen(PORT, () => {
  console.log(`BWMS ZKP Live Demonstration Dashboard listening at http://localhost:${PORT}`);
});
