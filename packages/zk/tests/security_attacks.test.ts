import { describe, it, expect, beforeAll } from "vitest";
import { generateTelemetryWindow } from "@bwms/telemetry";
import { validateTelemetryWindow } from "@bwms/telemetry";
import { buildMerkleTree } from "@bwms/merkle";
import {
  createVerificationPackage,
  validateVerificationPackageFormat,
  verifyVerificationPackage,
} from "../src/index.js";
import fs from "node:fs";
import path from "node:path";

const PROOF_PATH = path.resolve(__dirname, "../../../build/zk/proof.json");
const VK_PATH = path.resolve(__dirname, "../../../build/zk/verification_key.json");

describe("BWMS-ZKP Security Attack Vectors & Verifier Policy Suite", () => {
  const window = generateTelemetryWindow();
  let merkleRoot: string;
  let sampleProof: any;
  let sampleVk: any;

  function makePkg() {
    return createVerificationPackage(
      window,
      BigInt(merkleRoot),
      JSON.parse(JSON.stringify(sampleProof)),
      new Date().toISOString()
    );
  }

  beforeAll(async () => {
    const tree = await buildMerkleTree(window.records);
    merkleRoot = tree.root.toString();
    sampleProof = JSON.parse(fs.readFileSync(PROOF_PATH, "utf8"));
    sampleVk = JSON.parse(fs.readFileSync(VK_PATH, "utf8"));
  });

  it("1. Should pass valid baseline verification package format", () => {
    const pkg = makePkg();
    const result = validateVerificationPackageFormat(pkg);
    expect(result.valid).toBe(true);
  });

  it("2. Should pass complete Groth16 cryptographic proof verification", async () => {
    const pkg = makePkg();
    const result = await verifyVerificationPackage(pkg, sampleVk);
    expect(result.valid).toBe(true);
  });

  it("3. Should reject Merkle root mutation (Public Input / Root mismatch)", async () => {
    const pkg = makePkg();
    pkg.merkle_root = "999999999999999999999999999999999999999999999999999999999999999999";
    
    const result = validateVerificationPackageFormat(pkg);
    expect(result.valid).toBe(false);
    expect(result.attackVector).toContain("Root Mutation");
  });

  it("4. Should reject Groth16 proof mutation (pi_a curve forgery)", async () => {
    const pkg = makePkg();
    pkg.proof.pi_a[0] = "123456789123456789123456789123456789";

    const result = await verifyVerificationPackage(pkg, sampleVk);
    expect(result.valid).toBe(false);
    expect(result.attackVector).toContain("Proof Mutation");
  });

  it("5. Should reject unsupported rule-set metadata (BWMS-RELAXED-V0)", () => {
    const pkg = makePkg();
    pkg.rule_set_id = "BWMS-RELAXED-V0" as any;

    const result = validateVerificationPackageFormat(pkg);
    expect(result.valid).toBe(false);
    expect(result.attackVector).toContain("Rule-Set ID");
  });

  it("6. Should reject stale verification package exceeding max age threshold", () => {
    const pkg = makePkg();
    pkg.generated_at = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

    const result = validateVerificationPackageFormat(pkg, { maxAgeMs: 3600 * 1000 });
    expect(result.valid).toBe(false);
    expect(result.attackVector).toContain("Stale Package");
  });

  it("7. Should reject duplicate attestation replay for same operation and window ID", () => {
    const pkg = makePkg();
    const seenAttestations = new Set<string>([`${pkg.operation_id}:${pkg.window_id}`]);

    const result = validateVerificationPackageFormat(pkg, { seenAttestations });
    expect(result.valid).toBe(false);
    expect(result.attackVector).toContain("Replay");
  });

  it("8. Should reject telemetry window with sequence gap", () => {
    const tamperedWin = structuredClone(window);
    tamperedWin.records[10].sequence = 12;

    const validation = validateTelemetryWindow(tamperedWin);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.code === "INVALID_SEQUENCE")).toBe(true);
  });

  it("9. Should reject telemetry window with duplicate sequence", () => {
    const tamperedWin = structuredClone(window);
    tamperedWin.records[10].sequence = tamperedWin.records[9].sequence;

    const validation = validateTelemetryWindow(tamperedWin);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.code === "DUPLICATE_SEQUENCE")).toBe(true);
  });

  it("10. Should reject telemetry window with non-monotonic timestamp", () => {
    const tamperedWin = structuredClone(window);
    tamperedWin.records[10].timestamp = tamperedWin.records[8].timestamp;

    const validation = validateTelemetryWindow(tamperedWin);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.code === "NON_MONOTONIC_TIMESTAMP")).toBe(true);
  });

  it("11. Should reject telemetry window with operation ID mismatch", () => {
    const tamperedWin = structuredClone(window);
    tamperedWin.records[10].operation_id = "OP-MISMATCH-999";

    const validation = validateTelemetryWindow(tamperedWin);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.code === "OPERATION_ID_MISMATCH")).toBe(true);
  });
});
