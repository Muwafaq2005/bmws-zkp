import { describe, it, expect } from "vitest";
import { generateTelemetryWindow } from "@bwms/telemetry";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  simulateVSATTransmission,
  compareVSATTransmission,
  type VSATLinkConfig,
} from "../src/index.js";

const PACKAGE_PATH = path.resolve(__dirname, "../../../build/zk/verification_package.json");

describe("VSAT Communication Link Simulator Test Suite", () => {
  const defaultConfig: VSATLinkConfig = {
    bandwidthKbps: 512, // 512 kbps maritime satellite connection
    roundTripLatencyMs: 650, // GEO satellite latency
    packetLossPercent: 2.0, // 2% packet loss rate
  };

  it("1. Should simulate raw telemetry transmission metrics accurately", () => {
    const window = generateTelemetryWindow();
    const metrics = simulateVSATTransmission("Raw Telemetry", window.records, defaultConfig);

    expect(metrics.rawPayloadBytes).toBeGreaterThan(5000); // 64 records JSON is ~8-12 KB
    expect(metrics.packetsSent).toBeGreaterThan(0);
    expect(metrics.totalLatencyMs).toBeGreaterThan(defaultConfig.roundTripLatencyMs);
  });

  it("2. Should simulate verification package transmission metrics accurately", async () => {
    const verificationPackage = JSON.parse(await readFile(PACKAGE_PATH, "utf8"));
    const metrics = simulateVSATTransmission("ZK Verification Package", verificationPackage, defaultConfig);

    expect(metrics.rawPayloadBytes).toBeLessThan(2000); // verification package is compact (~1.3 KB)
    expect(metrics.packetsSent).toBeGreaterThan(0);
  });

  it("3. Should compare raw vs verification package transmission without hardcoded assumptions", async () => {
    const window = generateTelemetryWindow();
    const verificationPackage = JSON.parse(await readFile(PACKAGE_PATH, "utf8"));

    const comparison = compareVSATTransmission(window.records, verificationPackage, defaultConfig);

    expect(comparison.rawTelemetryMetrics.rawPayloadBytes).toBeGreaterThan(
      comparison.verificationPackageMetrics.rawPayloadBytes,
    );
    expect(comparison.byteSavingsPercent).toBeGreaterThan(50); // Verification package is significantly smaller
    expect(comparison.latencySavingsMs).toBeGreaterThan(0);
    expect(comparison.speedupFactor).toBeGreaterThan(1.0);
  });

  it("4. Should model retransmission delays under high packet loss link conditions", () => {
    const window = generateTelemetryWindow();
    const cleanConfig: VSATLinkConfig = { ...defaultConfig, packetLossPercent: 0 };
    const lossyConfig: VSATLinkConfig = { ...defaultConfig, packetLossPercent: 15 };

    const cleanRes = simulateVSATTransmission("Clean Link", window.records, cleanConfig, 42);
    const lossyRes = simulateVSATTransmission("Lossy Link", window.records, lossyConfig, 42);

    expect(lossyRes.retransmissions).toBeGreaterThanOrEqual(cleanRes.retransmissions);
    expect(lossyRes.totalLatencyMs).toBeGreaterThanOrEqual(cleanRes.totalLatencyMs);
  });
});
