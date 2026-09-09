import { describe, expect, it } from "vitest";
import { generateTelemetryWindow } from "../src/generator.js";

describe("generateTelemetryWindow", () => {
  it("generates exactly 64 records", () => {
    const window = generateTelemetryWindow();

    expect(window.records).toHaveLength(64);
  });

  it("generates contiguous sequence numbers from 1 to 64", () => {
    const window = generateTelemetryWindow();

    const sequences = window.records.map((record) => record.sequence);

    expect(sequences).toEqual(
      Array.from({ length: 64 }, (_, index) => index + 1),
    );
  });

  it("uses consistent identifiers", () => {
    const window = generateTelemetryWindow();

    for (const record of window.records) {
      expect(record.operation_id).toBe(window.operation_id);
      expect(record.window_id).toBe(window.window_id);
      expect(record.sensor_id).toBe("BWMS-SENSOR-01");
    }
  });

  it("generates monotonically increasing timestamps", () => {
    const window = generateTelemetryWindow();

    for (let i = 1; i < window.records.length; i += 1) {
      const previous = Date.parse(window.records[i - 1]!.timestamp);
      const current = Date.parse(window.records[i]!.timestamp);

      expect(current).toBeGreaterThan(previous);
    }
  });

  it("generates values within the prototype-compliant range", () => {
    const window = generateTelemetryWindow();

    for (const record of window.records) {
      expect(record.flow_rate).toBeGreaterThanOrEqual(800);
      expect(record.uv_intensity).toBeGreaterThanOrEqual(40);

      expect(record.temperature).toBeGreaterThanOrEqual(20);
      expect(record.temperature).toBeLessThanOrEqual(30);

      expect(record.salinity).toBeGreaterThanOrEqual(25);
      expect(record.salinity).toBeLessThanOrEqual(35);

      expect(record.turbidity).toBeLessThanOrEqual(5);
    }
  });

  it("is deterministic", () => {
    const first = generateTelemetryWindow();
    const second = generateTelemetryWindow();

    expect(second).toEqual(first);
  });

  it("supports custom identifiers", () => {
    const window = generateTelemetryWindow({
      operationId: "OP-TEST-001",
      windowId: "WIN-TEST-001",
      sensorId: "SENSOR-TEST-001",
    });

    expect(window.operation_id).toBe("OP-TEST-001");
    expect(window.window_id).toBe("WIN-TEST-001");
    expect(window.records[0]!.sensor_id).toBe("SENSOR-TEST-001");
  });
});