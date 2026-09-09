import { describe, expect, it } from "vitest";
import { generateTelemetryWindow } from "@bwms/telemetry";
import {
  canonicalizeTelemetryRecord,
  encodeTimestamp,
  scaleNumeric,
} from "../src/canonical.js";
import {
  bytesToFieldChunks,
  encodeStringToBytes,
  hashString,
} from "../src/stringEncoding.js";

describe("canonical telemetry encoding", () => {
  it("scales numeric values deterministically", () => {
    expect(scaleNumeric(820.4)).toBe(8204n);
    expect(scaleNumeric(42.7)).toBe(427n);
    expect(scaleNumeric(24.3)).toBe(243n);
    expect(scaleNumeric(31.2)).toBe(312n);
    expect(scaleNumeric(1.7)).toBe(17n);
  });

  it("converts timestamps to milliseconds", () => {
    expect(
      encodeTimestamp("2026-01-01T10:00:00.000Z"),
    ).toBe(1767261600000n);
  });

  it("encodes strings as UTF-8 bytes", () => {
    const bytes = encodeStringToBytes("BWMS");

    expect(Array.from(bytes)).toEqual([66, 87, 77, 83]);
  });

  it("packs UTF-8 bytes into deterministic field chunks", () => {
    const bytes = encodeStringToBytes("BWMS");

    expect(bytesToFieldChunks(bytes)).toEqual([
      0x42574d53n,
    ]);
  });

  it("hashes the same string deterministically", async () => {
    const first = await hashString("BWMS-SENSOR-01");
    const second = await hashString("BWMS-SENSOR-01");

    expect(first).toBe(second);
    expect(typeof first).toBe("bigint");
  });

  it("produces different hashes for different strings", async () => {
    const first = await hashString("BWMS-SENSOR-01");
    const second = await hashString("BWMS-SENSOR-02");

    expect(first).not.toBe(second);
  });

  it("canonicalizes a telemetry record", async () => {
    const window = generateTelemetryWindow();
    const record = window.records[0]!;

    const canonical = await canonicalizeTelemetryRecord(record);

    expect(canonical.sequence).toBe(1n);
    expect(canonical.timestamp).toBe(1767261600000n);

    expect(canonical.flowRate).toBe(8201n);
    expect(canonical.uvIntensity).toBe(422n);
    expect(canonical.temperature).toBe(241n);
    expect(canonical.salinity).toBe(311n);
    expect(canonical.turbidity).toBe(11n);
  });

  it("canonicalization is deterministic", async () => {
    const window = generateTelemetryWindow();
    const record = window.records[10]!;

    const first = await canonicalizeTelemetryRecord(record);
    const second = await canonicalizeTelemetryRecord(record);

    expect(second).toEqual(first);
  });
});