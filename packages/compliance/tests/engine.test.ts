import { describe, expect, it } from "vitest";
import { generateTelemetryWindow } from "@bwms/telemetry";
import { DEMO_RULE_SET } from "../src/rules.js";
import { evaluateCompliance } from "../src/engine.js";

describe("evaluateCompliance", () => {
  it("accepts a compliant telemetry window", () => {
    const window = generateTelemetryWindow();

    const result = evaluateCompliance(window, DEMO_RULE_SET);

    expect(result.compliant).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.rule_set_id).toBe("BWMS-DEMO-V1");
  });

  it("rejects flow rate below the minimum", () => {
    const window = generateTelemetryWindow();

    window.records[10]!.flow_rate = 799;

    const result = evaluateCompliance(window, DEMO_RULE_SET);

    expect(result.compliant).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        sequence: 11,
        parameter: "flow_rate",
        value: 799,
      }),
    );
  });

  it("rejects UV intensity below the minimum", () => {
    const window = generateTelemetryWindow();

    window.records[20]!.uv_intensity = 39;

    const result = evaluateCompliance(window, DEMO_RULE_SET);

    expect(result.compliant).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        sequence: 21,
        parameter: "uv_intensity",
        value: 39,
      }),
    );
  });

  it("rejects temperature outside the allowed range", () => {
    const window = generateTelemetryWindow();

    window.records[5]!.temperature = 31;

    const result = evaluateCompliance(window, DEMO_RULE_SET);

    expect(result.compliant).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        sequence: 6,
        parameter: "temperature",
        value: 31,
      }),
    );
  });

  it("rejects salinity outside the allowed range", () => {
    const window = generateTelemetryWindow();

    window.records[30]!.salinity = 36;

    const result = evaluateCompliance(window, DEMO_RULE_SET);

    expect(result.compliant).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        sequence: 31,
        parameter: "salinity",
        value: 36,
      }),
    );
  });

  it("rejects turbidity above the maximum", () => {
    const window = generateTelemetryWindow();

    window.records[40]!.turbidity = 6;

    const result = evaluateCompliance(window, DEMO_RULE_SET);

    expect(result.compliant).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        sequence: 41,
        parameter: "turbidity",
        value: 6,
      }),
    );
  });

  it("reports multiple violations", () => {
    const window = generateTelemetryWindow();

    window.records[0]!.flow_rate = 700;
    window.records[1]!.uv_intensity = 30;
    window.records[2]!.temperature = 35;

    const result = evaluateCompliance(window, DEMO_RULE_SET);

    expect(result.compliant).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(3);
  });

  it("accepts values exactly on the configured boundaries", () => {
    const window = generateTelemetryWindow();

    for (const record of window.records) {
      record.flow_rate = 800;
      record.uv_intensity = 40;
      record.temperature = 20;
      record.salinity = 25;
      record.turbidity = 5;
    }

    const result = evaluateCompliance(window, DEMO_RULE_SET);

    expect(result.compliant).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});