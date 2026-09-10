import { groth16 } from "snarkjs";
import type { VerificationPackage } from "./proof-package.js";

export interface VerificationOptions {
  maxAgeMs?: number; // Maximum age in milliseconds for stale package check
  now?: number; // Current timestamp in ms (for testing deterministic time checks)
  seenAttestations?: Set<string>; // Set of seen "operation_id:window_id" for replay prevention
}

export interface VerificationResult {
  valid: boolean;
  reason?: string;
  attackVector?: string;
  mitigationType?: "Groth16 Cryptographic Verification" | "Application-Level Package Policy" | "Application Freshness Threshold" | "Blockchain Duplicate Protection";
}

const SUPPORTED_VERSION = 1;
const SUPPORTED_CIRCUIT_ID = "BWMS-TELEMETRY-64-GROTH16-V1";
const SUPPORTED_RULE_SET_ID = "BWMS-DEMO-V1";

/**
 * Validates the metadata, schema, and structural sanity of a VerificationPackage before running snarkjs proof verification.
 */
export function validateVerificationPackageFormat(
  pkg: unknown,
  options: VerificationOptions = {},
): VerificationResult {
  // 1. Malformed JSON / non-object check
  if (typeof pkg !== "object" || pkg === null || Array.isArray(pkg)) {
    return {
      valid: false,
      reason: "Invalid payload format: expected a JSON object.",
      attackVector: "Malformed JSON / Invalid Structure",
      mitigationType: "Application-Level Package Policy",
    };
  }

  const p = pkg as Record<string, unknown>;

  // 2. Unsupported Version Check
  if (p.version !== SUPPORTED_VERSION) {
    return {
      valid: false,
      reason: `Unsupported package version: expected ${SUPPORTED_VERSION}, got ${String(p.version)}.`,
      attackVector: "Unsupported Version",
      mitigationType: "Application-Level Package Policy",
    };
  }

  // 3. Unsupported Circuit ID Check
  if (p.circuit_id !== SUPPORTED_CIRCUIT_ID) {
    return {
      valid: false,
      reason: `Unsupported circuit ID: expected ${SUPPORTED_CIRCUIT_ID}, got ${String(p.circuit_id)}.`,
      attackVector: "Unsupported Circuit ID",
      mitigationType: "Application-Level Package Policy",
    };
  }

  // 4. Unsupported Rule-Set ID Check
  if (p.rule_set_id !== SUPPORTED_RULE_SET_ID) {
    return {
      valid: false,
      reason: `Unsupported rule-set ID: expected ${SUPPORTED_RULE_SET_ID}, got ${String(p.rule_set_id)}. Note: rule_set_id is metadata verified at application layer, not a public ZKP input in V1.`,
      attackVector: "Unsupported Rule-Set ID (Application Metadata)",
      mitigationType: "Application-Level Package Policy",
    };
  }

  // 5. Metadata fields presence check
  if (
    typeof p.operation_id !== "string" ||
    !p.operation_id ||
    typeof p.window_id !== "string" ||
    !p.window_id
  ) {
    return {
      valid: false,
      reason: "Missing or invalid operation_id / window_id metadata. Note: metadata fields are verified at application layer, not public ZKP inputs in V1.",
      attackVector: "Metadata Mutation / Missing Metadata",
      mitigationType: "Application-Level Package Policy",
    };
  }

  // 6. Merkle root presence check
  if (typeof p.merkle_root !== "string" || !p.merkle_root) {
    return {
      valid: false,
      reason: "Missing or invalid merkle_root in verification package.",
      attackVector: "Root Mutation / Missing Root",
      mitigationType: "Application-Level Package Policy",
    };
  }

  // 7. Public inputs validation
  if (!Array.isArray(p.public_inputs) || p.public_inputs.length !== 1) {
    return {
      valid: false,
      reason: `Expected exactly 1 public input (publicRoot); received ${Array.isArray(p.public_inputs) ? p.public_inputs.length : "non-array"}.`,
      attackVector: "Proof / Public-Input Mismatch",
      mitigationType: "Application-Level Package Policy",
    };
  }

  // 8. Public input vs Merkle Root alignment
  if (p.public_inputs[0] !== p.merkle_root) {
    return {
      valid: false,
      reason: `Public input [0] (${String(p.public_inputs[0])}) does not match merkle_root (${String(p.merkle_root)}).`,
      attackVector: "Root Mutation / Public-Input Tampering",
      mitigationType: "Groth16 Cryptographic Verification",
    };
  }

  // 9. Proof structure validation
  if (typeof p.proof !== "object" || p.proof === null) {
    return {
      valid: false,
      reason: "Missing or invalid proof object.",
      attackVector: "Proof Mutation / Missing Proof",
      mitigationType: "Application-Level Package Policy",
    };
  }

  const proof = p.proof as Record<string, unknown>;
  if (
    !Array.isArray(proof.pi_a) ||
    proof.pi_a.length < 2 ||
    !Array.isArray(proof.pi_b) ||
    proof.pi_b.length < 2 ||
    !Array.isArray(proof.pi_c) ||
    proof.pi_c.length < 2
  ) {
    return {
      valid: false,
      reason: "Proof structure missing required curve points (pi_a, pi_b, pi_c).",
      attackVector: "Proof Mutation / Malformed Curve Points",
      mitigationType: "Application-Level Package Policy",
    };
  }

  // 10. Generated timestamp & Stale Package Check
  if (typeof p.generated_at !== "string") {
    return {
      valid: false,
      reason: "Missing generated_at timestamp.",
      attackVector: "Metadata Mutation / Missing Timestamp",
      mitigationType: "Application-Level Package Policy",
    };
  }

  const generatedTime = Date.parse(p.generated_at);
  if (isNaN(generatedTime)) {
    return {
      valid: false,
      reason: "Invalid ISO timestamp in generated_at.",
      attackVector: "Metadata Mutation / Invalid Timestamp",
      mitigationType: "Application-Level Package Policy",
    };
  }

  if (options.maxAgeMs && options.maxAgeMs > 0) {
    const now = options.now ?? Date.now();
    if (now - generatedTime > options.maxAgeMs) {
      return {
        valid: false,
        reason: `Package is stale: generated at ${p.generated_at}, age exceeds ${options.maxAgeMs} ms threshold.`,
        attackVector: "Stale Package",
        mitigationType: "Application Freshness Threshold",
      };
    }
  }

  // 11. Replay / Duplicate Attestation Check
  const attestationId = `${p.operation_id}:${p.window_id}`;
  if (options.seenAttestations && options.seenAttestations.has(attestationId)) {
    return {
      valid: false,
      reason: `Duplicate attestation detected for ${attestationId}. Package has already been processed.`,
      attackVector: "Replay / Duplicate Attestation",
      mitigationType: "Blockchain Duplicate Protection",
    };
  }

  return { valid: true };
}

/**
 * Performs complete verification package validation, including snarkjs Groth16 cryptographic proof check.
 */
export async function verifyVerificationPackage(
  pkg: unknown,
  verificationKey: object,
  options: VerificationOptions = {},
): Promise<VerificationResult> {
  const formatResult = validateVerificationPackageFormat(pkg, options);
  if (!formatResult.valid) {
    return formatResult;
  }

  const verifiedPkg = pkg as VerificationPackage;

  try {
    const isValidProof = await groth16.verify(
      verificationKey,
      verifiedPkg.public_inputs,
      verifiedPkg.proof,
    );

    if (!isValidProof) {
      return {
        valid: false,
        reason: "Groth16 proof verification failed (snarkjs groth16 verify returned false).",
        attackVector: "Proof Mutation / Invalid Zero-Knowledge Proof",
        mitigationType: "Groth16 Cryptographic Verification",
      };
    }

    // Mark attestation as seen if options container is passed
    if (options.seenAttestations) {
      options.seenAttestations.add(`${verifiedPkg.operation_id}:${verifiedPkg.window_id}`);
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      reason: `Groth16 proof verification error: ${error instanceof Error ? error.message : String(error)}`,
      attackVector: "Proof Mutation / Malformed Proof",
      mitigationType: "Groth16 Cryptographic Verification",
    };
  }
}
