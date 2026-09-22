import type {
  SensorReading,
  SensorScenario,
  SensorSimulationConfig,
  SimulationState,
  TelemetryRecord,
  TelemetryWindow,
} from "./types.js";
import { validateTelemetryWindow } from "./validator.js";

const DEFAULT_OPERATION_ID = "OP-000001";
const DEFAULT_WINDOW_ID = "WIN-000001";
const DEFAULT_SENSOR_ID = "BWMS-SENSOR-01";
const DEFAULT_START_TIME = "2026-01-01T10:00:00.000Z";
const MAX_RECORDS = 64;

function createMulberry32(seed: number) {
  let s = seed >>> 0;
  return function random() {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 85), t | 73);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

export class SensorSimulator {
  private operationId: string;
  private windowId: string;
  private sensorId: string;
  private startTime: Date;
  private intervalMs: number;
  private scenario: SensorScenario;
  private prng: () => number;
  private state: SimulationState = "IDLE";
  private records: TelemetryRecord[] = [];
  private sealedWindow: TelemetryWindow | null = null;

  constructor(config: SensorSimulationConfig = {}) {
    this.operationId = config.operationId ?? DEFAULT_OPERATION_ID;
    this.windowId = config.windowId ?? DEFAULT_WINDOW_ID;
    this.sensorId = config.sensorId ?? DEFAULT_SENSOR_ID;
    this.startTime = config.startTime ?? new Date(DEFAULT_START_TIME);
    this.intervalMs = config.samplingIntervalMs ?? 1000;
    this.scenario = config.scenario ?? "NORMAL";

    const baseSeed = config.seed ?? stringToSeed(`${this.operationId}:${this.windowId}:${this.scenario}`);
    this.prng = createMulberry32(baseSeed);
  }

  public getSimulationState(): SimulationState {
    return this.state;
  }

  public getScenario(): SensorScenario {
    return this.scenario;
  }

  public getOperationId(): string {
    return this.operationId;
  }

  public getWindowId(): string {
    return this.windowId;
  }

  public getRecords(): TelemetryRecord[] {
    return [...this.records];
  }

  public getCurrentSequence(): number {
    return this.records.length;
  }

  public step(): TelemetryRecord {
    if (this.state === "SEALED" || this.state === "COMPLETE") {
      throw new Error(`Cannot step simulator: window is already ${this.state} at ${this.records.length} records.`);
    }

    this.state = "RUNNING";
    const index = this.records.length;
    let sequence = index + 1;

    // MISSING_READING scenario: simulate sequence gap at record 32
    if (this.scenario === "MISSING_READING" && sequence === 32) {
      sequence = 33; // Sequence jump creates a sequence gap
    }

    const timestamp = new Date(this.startTime.getTime() + index * this.intervalMs).toISOString();

    // Base nominal values with PRNG noise
    const r1 = (this.prng() - 0.5) * 2; // -1 to 1
    const r2 = (this.prng() - 0.5) * 2;
    const r3 = (this.prng() - 0.5) * 2;
    const r4 = (this.prng() - 0.5) * 2;
    const r5 = (this.prng() - 0.5) * 2;

    let flow_rate = 820.0 + r1 * 0.5;
    let uv_intensity = 42.0 + r2 * 0.3;
    let temperature = 24.0 + r3 * 0.2;
    let salinity = 31.0 + r4 * 0.2;
    let turbidity = 1.2 + r5 * 0.1;

    // Apply Scenario Manipulations
    switch (this.scenario) {
      case "LOW_UV":
        uv_intensity = 35.0 + r2 * 0.3; // Below min threshold 40
        break;

      case "LOW_FLOW":
        flow_rate = 750.0 + r1 * 0.5; // Below min threshold 800
        break;

      case "HIGH_TURBIDITY":
        turbidity = 6.5 + r5 * 0.2; // Above max threshold 5.0
        break;

      case "TEMPERATURE_EXCURSION":
        temperature = 34.0 + r3 * 0.5; // Above max threshold 30
        break;

      case "SENSOR_DRIFT":
        // Progressive downward flow drift across sequence 1..64
        flow_rate = 820.0 - (index * 2.0) + r1 * 0.5;
        break;

      case "OUTLIER":
        if (sequence === 32) {
          turbidity = 12.0; // Severe turbidity spike on record 32
        }
        break;

      case "NORMAL":
      default:
        break;
    }

    // Round scaled fields to 1 decimal place to prevent floating precision artifacts
    flow_rate = Math.round(flow_rate * 10) / 10;
    uv_intensity = Math.round(uv_intensity * 10) / 10;
    temperature = Math.round(temperature * 10) / 10;
    salinity = Math.round(salinity * 10) / 10;
    turbidity = Math.round(turbidity * 10) / 10;

    const record: TelemetryRecord = {
      operation_id: this.operationId,
      window_id: this.windowId,
      sequence,
      timestamp,
      sensor_id: this.sensorId,
      flow_rate,
      uv_intensity,
      temperature,
      salinity,
      turbidity,
    };

    this.records.push(record);

    if (this.records.length === MAX_RECORDS) {
      this.state = "COMPLETE";
    }

    return record;
  }

  public runToCompletion(): TelemetryRecord[] {
    while ((this.state as SimulationState) === "RUNNING" || (this.state as SimulationState) === "IDLE") {
      this.step();
      if ((this.state as SimulationState) === "FAILED") break;
    }
    return [...this.records];
  }

  public isCompliant(): boolean {
    if (this.records.length === 0) return false;
    for (const r of this.records) {
      if (
        r.flow_rate < 800 ||
        r.uv_intensity < 40 ||
        r.temperature < 20 ||
        r.temperature > 30 ||
        r.salinity < 25 ||
        r.salinity > 35 ||
        r.turbidity > 5
      ) {
        return false;
      }
    }
    return true;
  }

  public seal(): TelemetryWindow {
    if (this.records.length !== MAX_RECORDS) {
      this.state = "FAILED";
      throw new Error(`Cannot seal window: expected exactly ${MAX_RECORDS} records, currently collected ${this.records.length}.`);
    }

    const window: TelemetryWindow = {
      operation_id: this.operationId,
      window_id: this.windowId,
      records: [...this.records],
    };

    const validation = validateTelemetryWindow(window);
    if (!validation.valid) {
      this.state = "FAILED";
      const errMsgs = validation.errors.map(e => e.message).join("; ");
      throw new Error(`Telemetry window validation failed during seal: ${errMsgs}`);
    }

    this.sealedWindow = window;
    this.state = "SEALED";
    return window;
  }

  public getSealedWindow(): TelemetryWindow {
    if (this.state !== "SEALED" || !this.sealedWindow) {
      throw new Error(`Window is not sealed yet (current state: ${this.state}).`);
    }
    return this.sealedWindow;
  }
}

