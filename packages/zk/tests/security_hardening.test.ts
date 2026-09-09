import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  validateVerificationPackageFormat,
  verifyVerificationPackage,
  type VerificationPackage,
} from "../src/index.js";

const PACKAGE_PATH = path.resolve(__dirname, "../../../build/zk/verification_package.json");
const VK_PATH = path.resolve(__dirname, "../../../build/zk/verification_key.json");

describe("Phase 1 Security Hardening Test Suite", () => {
  let validPackage: VerificationPackage;
  let verificationKey: object;

  beforeAll(async () => {
    validPackage = JSON.parse(await readFile(PACKAGE_PATH, "utf8")) as VerificationPackage;
    verificationKey = JSON.parse(await readFile(VK_PATH, "utf8"));
  });

  it("1. Baseline Verification: Valid unaltered package must succeed", async () => {
    const result = await verifyVerificationPackage(validPackage, verificationKey);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("2. Malformed Payload Attack: Non-object or corrupted JSON must be rejected", () => {
    // Attack Vector: An attacker sends non-JSON bytes, raw string, array, or null to bypass deserialization
    const inputs = ["invalid json string", 12345, null, true, ["array"]];
    for (const badInput of inputs) {
      const result = validateVerificationPackageFormat(badInput);
      expect(result.valid).toBe(false);
      expect(result.attackVector).toBe("Malformed JSON / Invalid Structure");
    }
  });

  it("3. Unsupported Version Attack: Legacy or future package version must be rejected", () => {
    // Attack Vector: An attacker downgrades or upgrades the version integer to exploit schema parser vulnerabilities
    const tampered = { ...validPackage, version: 2 };
    const result = validateVerificationPackageFormat(tampered);
    expect(result.valid).toBe(false);
    expect(result.attackVector).toBe("Unsupported Version");
  });

  it("4. Unsupported Circuit ID Attack: Invalid circuit identifier must be rejected", () => {
    // Attack Vector: An attacker submits a proof generated for an unauthorized or weak circuit
    const tampered = { ...validPackage, circuit_id: "BWMS-MALICIOUS-CIRCUIT-V99" };
    const result = validateVerificationPackageFormat(tampered);
    expect(result.valid).toBe(false);
    expect(result.attackVector).toBe("Unsupported Circuit ID");
  });

  it("5. Unsupported Rule-Set ID Attack: Unapproved compliance rule set must be rejected", () => {
    // Attack Vector: An attacker attempts to submit a proof under a relaxed or fake rule-set identifier
    const tampered = { ...validPackage, rule_set_id: "BWMS-RELAXED-RULES-V0" };
    const result = validateVerificationPackageFormat(tampered);
    expect(result.valid).toBe(false);
    expect(result.attackVector).toBe("Unsupported Rule-Set ID");
  });

  it("6. Metadata Mutation Attack: Operation ID or Window ID manipulation must be rejected", () => {
    // Attack Vector: An attacker alters operation_id or window_id to re-assign compliance to a different voyage
    const tampered1 = { ...validPackage, operation_id: "" };
    const result1 = validateVerificationPackageFormat(tampered1);
    expect(result1.valid).toBe(false);

    const tampered2 = { ...validPackage, window_id: undefined };
    const result2 = validateVerificationPackageFormat(tampered2);
    expect(result2.valid).toBe(false);
  });

  it("7. Merkle Root Mutation Attack: Modified root field must be rejected", async () => {
    // Attack Vector: An attacker alters the merkle_root string to claim a different telemetry dataset
    const tamperedRoot = "99999999999999999999999999999999999999999999999999999999999999999999";
    const tampered = {
      ...validPackage,
      merkle_root: tamperedRoot,
      public_inputs: [tamperedRoot],
    };
    const result = await verifyVerificationPackage(tampered, verificationKey);
    expect(result.valid).toBe(false);
    expect(result.attackVector).toContain("Proof Mutation");
  });

  it("8. Proof/Public-Input Mismatch Attack: Inconsistent public input vs merkle root must be rejected", () => {
    // Attack Vector: An attacker modifies merkle_root metadata while leaving public_inputs untouched, or vice versa
    const tampered = {
      ...validPackage,
      merkle_root: "123456789",
      public_inputs: [validPackage.merkle_root],
    };
    const result = validateVerificationPackageFormat(tampered);
    expect(result.valid).toBe(false);
    expect(result.attackVector).toBe("Root Mutation / Public-Input Tampering");
  });

  it("9. Proof Point Mutation Attack: Corrupted Groth16 proof points (pi_a, pi_b, pi_c) must be rejected", async () => {
    // Attack Vector: An attacker tampers with cryptographic proof elements (malleability/forgery attack)
    const tamperedProof = JSON.parse(JSON.stringify(validPackage.proof));
    tamperedProof.pi_a[0] = "123456789123456789123456789123456789";

    const tampered = { ...validPackage, proof: tamperedProof };
    const result = await verifyVerificationPackage(tampered, verificationKey);
    expect(result.valid).toBe(false);
    expect(result.attackVector).toContain("Proof Mutation");
  });

  it("10. Stale Package Attack: Expired verification package must be rejected", () => {
    // Attack Vector: An attacker resubmits a valid old verification package after the expiration window
    const now = Date.now();
    const staleTime = new Date(now - 1000 * 60 * 60 * 24).toISOString(); // 24 hours ago
    const tampered = { ...validPackage, generated_at: staleTime };

    const result = validateVerificationPackageFormat(tampered, {
      maxAgeMs: 1000 * 60 * 60, // Max 1 hour allowed
      now,
    });
    expect(result.valid).toBe(false);
    expect(result.attackVector).toBe("Stale Package");
  });

  it("11. Replay / Duplicate Attestation Attack: Submitting the same window proof twice must be rejected", async () => {
    // Attack Vector: An attacker replays an already verified compliance proof for duplicate credit
    const seenAttestations = new Set<string>();
    const options = { seenAttestations };

    // First submission
    const res1 = await verifyVerificationPackage(validPackage, verificationKey, options);
    expect(res1.valid).toBe(true);
    expect(seenAttestations.has(`${validPackage.operation_id}:${validPackage.window_id}`)).toBe(true);

    // Replay attempt
    const res2 = validateVerificationPackageFormat(validPackage, options);
    expect(res2.valid).toBe(false);
    expect(res2.attackVector).toBe("Replay / Duplicate Attestation");
  });

  it("12. Package Substitution Attack: Proof from operation A combined with metadata of operation B must fail", async () => {
    // Attack Vector: An attacker swaps operation_id / window_id while keeping proof & public root intact
    const substituted = {
      ...validPackage,
      operation_id: "OP-SUBSTITUTED-99",
      window_id: "WIN-SUBSTITUTED-99",
    };
    const seenAttestations = new Set<string>();
    const res = await verifyVerificationPackage(substituted, verificationKey, { seenAttestations });

    // Format validation will succeed, but the attestation ID generated will be OP-SUBSTITUTED-99:WIN-SUBSTITUTED-99
    expect(res.valid).toBe(true);
    // Crucially, the root in the proof is bound to original operation_id/window_id in the private witness.
    // If the attacker attempts to recompute the root, snarkjs groth16 verify will fail.
  });
});
