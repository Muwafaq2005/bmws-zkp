import type { TelemetryRecord, TelemetryWindow } from "./types.js";

export interface GeneratorOptions {
  operationId?: string;
  windowId?: string;
  sensorId?: string;
  startTime?: Date;
}

const DEFAULT_OPERATION_ID = "OP-000001";
const DEFAULT_WINDOW_ID = "WIN-000001";
const DEFAULT_SENSOR_ID = "BWMS-SENSOR-01";
const DEFAULT_START_TIME = "2026-01-01T10:00:00.000Z";

const RECORD_COUNT = 64;
const INTERVAL_MS = 1_000;

export function generateTelemetryWindow(
  options: GeneratorOptions = {},
): TelemetryWindow {
  const operationId = options.operationId ?? DEFAULT_OPERATION_ID;
  const windowId = options.windowId ?? DEFAULT_WINDOW_ID;
  const sensorId = options.sensorId ?? DEFAULT_SENSOR_ID;
  const startTime = options.startTime ?? new Date(DEFAULT_START_TIME);

  const records: TelemetryRecord[] = [];

  for (let i = 0; i < RECORD_COUNT; i += 1) {
    const sequence = i + 1;

    const timestamp = new Date(
      startTime.getTime() + i * INTERVAL_MS,
    ).toISOString();

    records.push({
      operation_id: operationId,
      window_id: windowId,
      sequence,
      timestamp,
      sensor_id: sensorId,

      flow_rate: 820 + (sequence % 5) * 0.1,
      uv_intensity: 42 + (sequence % 4) * 0.2,
      temperature: 24 + (sequence % 3) * 0.1,
      salinity: 31 + (sequence % 4) * 0.1,
      turbidity: 1 + (sequence % 5) * 0.1,
    });
  }

  return {
    operation_id: operationId,
    window_id: windowId,
    records,
  };
}