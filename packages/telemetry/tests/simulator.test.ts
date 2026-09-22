import { describe, expect, it } from "vitest";
import { SensorSimulator } from "../src/simulator.js";

describe("SensorSimulator", () => {
  it("initializes in IDLE state and transitions to RUNNING on first step", () => {
    const sim = new SensorSimulator({ scenario: "NORMAL" });
    expect(sim.getSimulationState()).toBe("IDLE");

    const r1 = sim.step();
    expect(sim.getSimulationState()).toBe("RUNNING");
    expect(r1.sequence).toBe(1);
    expect(sim.getCurrentSequence()).toBe(1);
  });

  it("produces 64 readings step by step with monotonic timestamps", () => {
    const sim = new SensorSimulator({ scenario: "NORMAL" });
    const readings = [];

    while (sim.getSimulationState() === "RUNNING" || sim.getSimulationState() === "IDLE") {
      readings.push(sim.step());
    }

    expect(readings).toHaveLength(64);
    expect(sim.getSimulationState()).toBe("COMPLETE");

    for (let i = 1; i < readings.length; i++) {
      const prevTs = Date.parse(readings[i - 1]!.timestamp);
      const currTs = Date.parse(readings[i]!.timestamp);
      expect(currTs).toBeGreaterThan(prevTs);
    }
  });

  it("guarantees 100% PRNG reproducibility for identical configs", () => {
    const sim1 = new SensorSimulator({ scenario: "NORMAL", seed: 12345, operationId: "OP-001", windowId: "WIN-001" });
    const sim2 = new SensorSimulator({ scenario: "NORMAL", seed: 12345, operationId: "OP-001", windowId: "WIN-001" });

    const records1 = [];
    const records2 = [];

    for (let i = 0; i < 64; i++) {
      records1.push(sim1.step());
      records2.push(sim2.step());
    }

    expect(records1).toEqual(records2);
  });

  it("seals window at 64 records into valid TelemetryWindow object", () => {
    const sim = new SensorSimulator({ scenario: "NORMAL" });
    sim.runToCompletion();

    expect(sim.getSimulationState()).toBe("COMPLETE");
    const window = sim.seal();

    expect(sim.getSimulationState()).toBe("SEALED");
    expect(window.records).toHaveLength(64);
    expect(sim.isCompliant()).toBe(true);
  });

  it("throws error when trying to seal incomplete window (<64 records)", () => {
    const sim = new SensorSimulator({ scenario: "NORMAL" });
    sim.step(); // 1 record
    expect(() => sim.seal()).toThrow(/Cannot seal window/);
  });

  it("detects predicate failure for LOW_UV scenario", () => {
    const sim = new SensorSimulator({ scenario: "LOW_UV" });
    sim.runToCompletion();
    expect(sim.isCompliant()).toBe(false);

    const window = sim.seal();
    const violatingRecords = window.records.filter((r) => r.uv_intensity < 40);
    expect(violatingRecords.length).toBeGreaterThan(0);
  });

  it("detects predicate failure for LOW_FLOW scenario", () => {
    const sim = new SensorSimulator({ scenario: "LOW_FLOW" });
    sim.runToCompletion();
    expect(sim.isCompliant()).toBe(false);

    const window = sim.seal();
    const violatingRecords = window.records.filter((r) => r.flow_rate < 800);
    expect(violatingRecords.length).toBeGreaterThan(0);
  });

  it("detects predicate failure for HIGH_TURBIDITY scenario", () => {
    const sim = new SensorSimulator({ scenario: "HIGH_TURBIDITY" });
    sim.runToCompletion();
    expect(sim.isCompliant()).toBe(false);

    const window = sim.seal();
    const violatingRecords = window.records.filter((r) => r.turbidity > 5);
    expect(violatingRecords.length).toBeGreaterThan(0);
  });

  it("detects predicate failure for TEMPERATURE_EXCURSION scenario", () => {
    const sim = new SensorSimulator({ scenario: "TEMPERATURE_EXCURSION" });
    sim.runToCompletion();
    expect(sim.isCompliant()).toBe(false);

    const window = sim.seal();
    const violatingRecords = window.records.filter((r) => r.temperature > 30);
    expect(violatingRecords.length).toBeGreaterThan(0);
  });

  it("detects predicate failure for OUTLIER scenario at sequence 32", () => {
    const sim = new SensorSimulator({ scenario: "OUTLIER" });
    sim.runToCompletion();
    expect(sim.isCompliant()).toBe(false);

    const window = sim.seal();
    const record32 = window.records.find((r) => r.sequence === 32);
    expect(record32).toBeDefined();
    expect(record32!.turbidity).toBeGreaterThan(5);
  });

  it("fails window sealing on MISSING_READING scenario due to sequence gap", () => {
    const sim = new SensorSimulator({ scenario: "MISSING_READING" });
    sim.runToCompletion();
    expect(() => sim.seal()).toThrow(/sequence/i);
    expect(sim.getSimulationState()).toBe("FAILED");
  });

});
