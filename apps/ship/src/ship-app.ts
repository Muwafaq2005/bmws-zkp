import { generateTelemetryWindow, type TelemetryWindow } from "@bwms/telemetry";
import { buildMerkleTree } from "@bwms/merkle";
import { createVerificationPackage, generateGroth16Proof, type VerificationPackage, type Groth16Proof } from "@bwms/zk";
import { simulateVSATTransmission, type VSATLinkConfig, type TransmissionMetrics } from "@bwms/vsat-simulator";

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

  // 3. Dynamic Groth16 Proof Generation
  const { proof, publicSignals } = await generateGroth16Proof(window);
  const rootInput = publicSignals[0] ?? merkleRoot;

  // 4. Construct Verification Package (No Raw Telemetry Included)
  const verificationPackage = createVerificationPackage(
    window,
    BigInt(rootInput),
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
