import express from "express";
import path from "node:path";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";
import { processAndTransmitShipTelemetry } from "@bwms/ship-app";
import { processRemoteVerification } from "@bwms/verifier-app";
import { compareVSATTransmission, simulateVSATTransmission } from "@bwms/vsat-simulator";
import {
  generateTelemetryWindow,
  validateTelemetryWindow,
  SensorSimulator,
} from "@bwms/telemetry";
import { evaluateCompliance, DEMO_RULE_SET } from "@bwms/compliance";
import { buildMerkleTree } from "@bwms/merkle";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const BESU_RPC_URL = process.env.BESU_RPC_URL || "http://127.0.0.1:8545";

let activeSimulator = null;
let currentShipState = {
  sealedWindow: null,
  merkleTree: null,
  merkleRoot: null,
  verificationPackage: null,
};

let seenAttestationKeys = new Set();

function resolveBuildPath(relativePath) {
  const candidates = [
    path.resolve(process.cwd(), relativePath),
    path.resolve(process.cwd(), "../..", relativePath),
    path.resolve(process.cwd(), "..", relativePath),
    path.resolve(__dirname, "../..", relativePath),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.resolve(process.cwd(), relativePath);
}

// ----------------------------------------------------
// SHIP CONSOLE ENDPOINTS — STATEFUL SENSOR SIMULATOR
// ----------------------------------------------------

// Step 1: Initialize Sensor Simulation Session
app.post("/api/ship/operate", async (req, res) => {
  try {
    const scenario = req.body?.scenario || "NORMAL";
    const operationId = req.body?.operationId || `OP-${Date.now().toString().slice(-6)}`;
    const windowId = req.body?.windowId || `WIN-${Date.now().toString().slice(-6)}`;

    activeSimulator = new SensorSimulator({
      scenario,
      operationId,
      windowId,
    });

    const firstReading = activeSimulator.step();

    currentShipState = {
      sealedWindow: null,
      merkleTree: null,
      merkleRoot: null,
      verificationPackage: null,
    };

    const sessionState = {
      operationId: activeSimulator.getOperationId(),
      windowId: activeSimulator.getWindowId(),
      state: activeSimulator.getSimulationState(),
      scenario: activeSimulator.getScenario(),
      currentReadingCount: activeSimulator.getCurrentSequence(),
      readings: activeSimulator.getRecords(),
      isCompliant: activeSimulator.isCompliant(),
    };

    res.json({
      success: true,
      data: {
        sessionState,
        latestReading: firstReading,
        vessel: {
          name: "M/V PACIFIC PROSPERITY",
          imo: "IMO 9876543",
          operationId: activeSimulator.getOperationId(),
          windowId: activeSimulator.getWindowId(),
          timestamp: firstReading.timestamp,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Step 2: Incremental Reading Step (Polled by Client UI)
app.post("/api/ship/step", async (req, res) => {
  try {
    if (!activeSimulator) {
      return res.status(400).json({ success: false, error: "No active simulation session. Click 'START OPERATION' first." });
    }

    const state = activeSimulator.getSimulationState();
    if (state === "SEALED" || state === "COMPLETE") {
      const records = activeSimulator.getRecords();
      return res.json({
        success: true,
        data: {
          sessionState: {
            operationId: activeSimulator.getOperationId(),
            windowId: activeSimulator.getWindowId(),
            state: "SEALED",
            currentReadingCount: records.length,
            readings: records,
            merkleRoot: currentShipState.merkleRoot,
            isCompliant: activeSimulator.isCompliant(),
          },
          latestReading: records[records.length - 1],
        },
      });
    }

    const reading = activeSimulator.step();
    const currentSequence = activeSimulator.getCurrentSequence();
    const simState = activeSimulator.getSimulationState();

    if (simState === "FAILED") {
      return res.json({
        success: true,
        data: {
          sessionState: {
            operationId: activeSimulator.getOperationId(),
            windowId: activeSimulator.getWindowId(),
            state: "FAILED",
            currentReadingCount: currentSequence,
            readings: activeSimulator.getRecords(),
            isCompliant: false,
          },
          latestReading: reading,
        },
      });
    }

    if (currentSequence === 64 || simState === "COMPLETE") {
      const sealedWindow = activeSimulator.seal();
      const merkleTree = await buildMerkleTree(sealedWindow.records);
      const merkleRoot = merkleTree.root.toString();
      const compliance = evaluateCompliance(sealedWindow, DEMO_RULE_SET);

      currentShipState.sealedWindow = sealedWindow;
      currentShipState.merkleTree = merkleTree;
      currentShipState.merkleRoot = merkleRoot;

      return res.json({
        success: true,
        data: {
          sessionState: {
            operationId: activeSimulator.getOperationId(),
            windowId: activeSimulator.getWindowId(),
            state: "SEALED",
            currentReadingCount: 64,
            readings: sealedWindow.records,
            merkleRoot,
            sealedWindow,
            isCompliant: compliance.compliant,
          },
          latestReading: reading,
          compliance,
        },
      });
    }

    res.json({
      success: true,
      data: {
        sessionState: {
          operationId: activeSimulator.getOperationId(),
          windowId: activeSimulator.getWindowId(),
          state: activeSimulator.getSimulationState(),
          currentReadingCount: currentSequence,
          readings: activeSimulator.getRecords(),
          isCompliant: activeSimulator.isCompliant(),
        },
        latestReading: reading,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});


// Step 3: Generate Groth16 ZK Proof (Consumes Sealed Window)
app.post("/api/ship/generate-proof", async (req, res) => {
  try {
    const vsatConfig = req.body?.vsatConfig || {
      bandwidthKbps: 512,
      roundTripLatencyMs: 650,
      packetLossPercent: 2.0,
    };

    if (!currentShipState.sealedWindow) {
      return res.status(400).json({
        success: false,
        error: "Cannot generate proof: telemetry window is incomplete or unsealed. Complete 64 readings first.",
      });
    }

    const window = currentShipState.sealedWindow;
    const compliance = evaluateCompliance(window, DEMO_RULE_SET);

    if (!compliance.compliant) {
      return res.status(400).json({
        success: false,
        compliant: false,
        violations: compliance.violations,
        error: `Compliance predicate failure: telemetry window violates ${DEMO_RULE_SET.rule_set_id} rules. (${compliance.violations.map(v => v.reason).join("; ")})`,
      });
    }

    const shipResult = await processAndTransmitShipTelemetry(window, vsatConfig);

    currentShipState.verificationPackage = shipResult.verificationPackage;
    currentShipState.merkleRoot = shipResult.merkleRoot;

    res.json({
      success: true,
      compliant: true,
      data: {
        merkleRoot: shipResult.merkleRoot,
        verificationPackage: shipResult.verificationPackage,
        circuitId: "BWMS-TELEMETRY-64-GROTH16-V1",
        protocol: "Groth16 / BN254",
        proofSize: "805 bytes",
        status: "GENERATED",
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Step 4: Transmit Verification Package over Simulated VSAT Link
app.post("/api/ship/transmit", async (req, res) => {
  try {
    const vsatConfig = req.body?.vsatConfig || {
      bandwidthKbps: 512,
      roundTripLatencyMs: 650,
      packetLossPercent: 2.0,
    };

    if (!currentShipState.verificationPackage || !currentShipState.sealedWindow) {
      return res.status(400).json({ success: false, error: "No verification package generated yet. Generate ZK proof first." });
    }

    const comparison = compareVSATTransmission(
      currentShipState.sealedWindow.records,
      currentShipState.verificationPackage,
      vsatConfig
    );

    const vsatMetrics = simulateVSATTransmission(
      "Ship-to-Shore VSAT Link",
      currentShipState.verificationPackage,
      vsatConfig
    );

    res.json({
      success: true,
      data: {
        comparison,
        vsatMetrics,
        package: currentShipState.verificationPackage,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// ----------------------------------------------------
// PORT VERIFICATION ENDPOINTS
// ----------------------------------------------------

app.post("/api/verifier/verify", async (req, res) => {
  try {
    const pkg = req.body?.verificationPackage || currentShipState.verificationPackage;
    if (!pkg) {
      return res.status(400).json({ success: false, error: "No verification package received." });
    }

    const verifierRecord = await processRemoteVerification(pkg, false, {
      seenAttestations: new Set(seenAttestationKeys),
    });

    res.json({
      success: true,
      data: { verifierRecord },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post("/api/blockchain/attest", async (req, res) => {
  try {
    const pkg = req.body?.verificationPackage || currentShipState.verificationPackage;
    if (!pkg) {
      return res.status(400).json({ success: false, error: "No verification package provided for attestation." });
    }

    const verifierRecord = await processRemoteVerification(pkg, true, {
      seenAttestations: seenAttestationKeys,
    });

    if (verifierRecord.status === "PASS" && verifierRecord.attestationTxHash) {
      seenAttestationKeys.add(`${pkg.operation_id}:${pkg.window_id}`);
    }

    res.json({
      success: true,
      data: { verifierRecord },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.get("/api/blockchain/history", async (req, res) => {
  try {
    const contractInfoPath = resolveBuildPath("build/blockchain/contract_info.json");
    let contractAddress = process.env.ATTESTATION_CONTRACT_ADDRESS;
    let abi;

    if (fs.existsSync(contractInfoPath)) {
      const contractInfo = JSON.parse(await readFile(contractInfoPath, "utf8"));
      contractAddress = contractAddress || contractInfo.address;
      abi = contractInfo.abi;
    }

    if (!contractAddress) {
      return res.json({
        success: true,
        data: {
          connected: false,
          reason: "BWMSAttestation contract info not found. Ensure contract is deployed.",
          totalAttestations: "0",
          history: [],
        },
      });
    }

    const provider = new ethers.JsonRpcProvider(BESU_RPC_URL);
    
    let blockNumber = 0;
    try {
      blockNumber = await provider.getBlockNumber();
    } catch {
      return res.json({
        success: true,
        data: {
          connected: false,
          reason: `Could not connect to EVM RPC node at ${BESU_RPC_URL}`,
          totalAttestations: "0",
          history: [],
        },
      });
    }

    const contract = new ethers.Contract(contractAddress, abi, provider);
    const filter = contract.filters.AttestationRecorded();
    const events = await contract.queryFilter(filter, 0, "latest");

    const onChainRecords = events.map((event) => {
      const args = event.args;
      return {
        attestationKey: args.attestationKey,
        operationId: args.operationId,
        windowId: args.windowId,
        merkleRoot: args.merkleRoot.toString(),
        ruleSetId: args.ruleSetId,
        compliant: args.compliant,
        verificationTimestamp: new Date(Number(args.verificationTimestamp) * 1000).toISOString(),
        proofHash: args.proofHash,
        verifier: args.verifier,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
      };
    });

    res.json({
      success: true,
      data: {
        connected: true,
        network: "Hyperledger Besu (QBFT)",
        chainId: 1337,
        contractAddress,
        latestBlock: blockNumber,
        totalAttestations: onChainRecords.length.toString(),
        history: onChainRecords,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// ----------------------------------------------------
// FULL SECURITY ATTACK LAB ENDPOINT
// ----------------------------------------------------

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

    let attackName = "";
    let attackDescription = "";
    let expectedProperty = "";

    const options = {};

    switch (attackType) {
      case "root_mutation":
        attackName = "Merkle Root Mutation (Data Tampering)";
        attackDescription = "Altered Poseidon Merkle root commitment to claim invalid telemetry data";
        expectedProperty = "Commitment integrity constraint check rejects invalid public root.";
        tamperedPackage.merkle_root = "999999999999999999999999999999999999999999999999999999999999999999";
        tamperedPackage.public_inputs = [tamperedPackage.merkle_root];
        break;

      case "proof_mutation":
        attackName = "Proof Mutation (Elliptic Curve Forgery)";
        attackDescription = "Mutated Groth16 proof elliptic curve point (pi_a)";
        expectedProperty = "Groth16 cryptographic pairing check e(A,B)=e(α,β) fails on BN254 curve.";
        tamperedPackage.proof.pi_a[0] = "123456789123456789123456789123456789";
        break;

      case "unsupported_ruleset":
        attackName = "Rule-Set Mismatch (Application Metadata)";
        attackDescription = "Submitting proof under unauthorized rule set (BWMS-RELAXED-V0)";
        expectedProperty = "Application policy rejects non-compliant rule set identifier.";
        tamperedPackage.rule_set_id = "BWMS-RELAXED-V0";
        break;

      case "stale_package":
        attackName = "Stale Package Replay Attack";
        attackDescription = "Replaying expired verification package generated >24 hours ago";
        expectedProperty = "Freshness threshold check rejects stale timestamps.";
        tamperedPackage.generated_at = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
        options.maxAgeMs = 3600 * 1000;
        break;

      case "replay":
        attackName = "Duplicate Attestation Replay Attack";
        attackDescription = "Replaying an attestation package that has already been recorded on-chain";
        expectedProperty = "Smart contract & verifier unique attestation key lookup rejects duplicate submissions.";
        options.seenAttestations = new Set([`${tamperedPackage.operation_id}:${tamperedPackage.window_id}`]);
        break;

      case "operation_mismatch":
        attackName = "Operation ID Mismatch";
        attackDescription = "Tampered operation_id in package metadata";
        expectedProperty = "Metadata validation rejects blank or inconsistent operation identifier.";
        tamperedPackage.operation_id = "";
        break;

      case "window_mismatch":
        attackName = "Window ID Mismatch";
        attackDescription = "Tampered window_id in package metadata";
        expectedProperty = "Metadata validation rejects missing window identifier.";
        tamperedPackage.window_id = "";
        break;

      default:
        attackName = "Proof Mutation";
        attackDescription = "Mutated proof point";
        expectedProperty = "Groth16 pairing check fails.";
        tamperedPackage.proof.pi_a[0] = "0000000000000000000";
        break;
    }

    const comparison = compareVSATTransmission(
      shipResult.window.records,
      tamperedPackage,
      vsatConfig
    );

    const verifierRecord = await processRemoteVerification(
      tamperedPackage,
      false,
      options
    );

    const result = {
      timestamp: new Date().toISOString(),
      shipResult: { ...shipResult, verificationPackage: tamperedPackage },
      comparison,
      verifierRecord,
      attackMode: {
        type: attackType,
        name: attackName,
        description: attackDescription,
        expectedProperty,
        expected: "REJECT",
        actual: verifierRecord.status,
        result: verifierRecord.status === "REJECT" ? "ATTACK SUCCESSFULLY MITIGATED" : "ATTACK UNMITIGATED",
      },
    };

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.get("/api/metrics", async (req, res) => {
  try {
    const rawWindow = generateTelemetryWindow();
    const pkgPath = resolveBuildPath("build/zk/verification_package.json");
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
          constraints: 158647,
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
