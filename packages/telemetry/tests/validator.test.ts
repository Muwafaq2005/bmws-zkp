import { describe, expect, it } from "vitest";
import {
  generateTelemetryWindow,
} from "../src/generator.js";
import {
  validateTelemetryWindow,
} from "../src/validator.js";

describe("validateTelemetryWindow", () => {
  it("accepts a valid 64-record window", () => {
    const window = generateTelemetryWindow();

    const result = validateTelemetryWindow(window);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects an incomplete window", () => {
    const window = generateTelemetryWindow();

    window.records.pop();

    const result = validateTelemetryWindow(window);

    expect(result.valid).toBe(false);
    expect(result.errors.some(
      (error) => error.code === "INVALID_RECORD_COUNT",
    )).toBe(true);
  });

  it("rejects a missing sequence", () => {
    const window = generateTelemetryWindow();

    window.records[10]!.sequence = 12;

    const result = validateTelemetryWindow(window);

    expect(result.valid).toBe(false);
    expect(result.errors.some(
      (error) => error.code === "INVALID_SEQUENCE",
    )).toBe(true);
  });

  it("rejects a duplicate sequence", () => {
    const window = generateTelemetryWindow();

    window.records[10]!.sequence = window.records[9]!.sequence;

    const result = validateTelemetryWindow(window);

    expect(result.valid).toBe(false);
    expect(result.errors.some(
      (error) => error.code === "DUPLICATE_SEQUENCE",
    )).toBe(true);
  });

  it("rejects reordered records", () => {
    const window = generateTelemetryWindow();

    const first = window.records[0]!;
    const second = window.records[1]!;

    window.records[0] = second;
    window.records[1] = first;

    const result = validateTelemetryWindow(window);

    expect(result.valid).toBe(false);
    expect(result.errors.some(
      (error) => error.code === "INVALID_SEQUENCE",
    )).toBe(true);
  });

  it("rejects non-monotonic timestamps", () => {
    const window = generateTelemetryWindow();

    window.records[20]!.timestamp =
      window.records[19]!.timestamp;

    const result = validateTelemetryWindow(window);

    expect(result.valid).toBe(false);
    expect(result.errors.some(
      (error) => error.code === "NON_MONOTONIC_TIMESTAMP",
    )).toBe(true);
  });

  it("rejects an operation ID mismatch", () => {
    const window = generateTelemetryWindow();

    window.records[15]!.operation_id = "OP-TAMPERED";

    const result = validateTelemetryWindow(window);

    expect(result.valid).toBe(false);
    expect(result.errors.some(
      (error) => error.code === "OPERATION_ID_MISMATCH",
    )).toBe(true);
  });

  it("rejects a window ID mismatch", () => {
    const window = generateTelemetryWindow();

    window.records[15]!.window_id = "WIN-TAMPERED";

    const result = validateTelemetryWindow(window);

    expect(result.valid).toBe(false);
    expect(result.errors.some(
      (error) => error.code === "WINDOW_ID_MISMATCH",
    )).toBe(true);
  });
});