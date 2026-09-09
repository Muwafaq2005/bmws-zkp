import type { TelemetryWindow } from "@bwms/telemetry";

export interface Groth16Proof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
}

export interface VerificationPackage {
  version: 1;
  circuit_id: "BWMS-TELEMETRY-64-GROTH16-V1";
  operation_id: string;
  window_id: string;
  merkle_root: string;
  public_inputs: string[];
  rule_set_id: "BWMS-DEMO-V1";
  proof: Groth16Proof;
  generated_at: string;
}

export function createVerificationPackage(
  window: TelemetryWindow,
  merkleRoot: bigint,
  proof: Groth16Proof,
  generatedAt: string,
): VerificationPackage {
  const root = merkleRoot.toString();

  return {
    version: 1,
    circuit_id: "BWMS-TELEMETRY-64-GROTH16-V1",
    operation_id: window.operation_id,
    window_id: window.window_id,
    merkle_root: root,
    public_inputs: [root],
    rule_set_id: "BWMS-DEMO-V1",
    proof,
    generated_at: generatedAt,
  };
}