import { hashString } from "./stringEncoding.js";
export const NUMERIC_SCALE = 10;
export function scaleNumeric(value) {
    if (!Number.isFinite(value)) {
        throw new Error(`Invalid numeric value: ${value}`);
    }
    return BigInt(Math.round(value * NUMERIC_SCALE));
}
/**
 * Temporary deterministic string encoding.
 *
 * We will replace this with the shared Poseidon string
 * encoding once the Merkle hashing layer is implemented.
 */
export function encodeTimestamp(timestamp) {
    const milliseconds = Date.parse(timestamp);
    if (Number.isNaN(milliseconds)) {
        throw new Error(`Invalid timestamp: ${timestamp}`);
    }
    return BigInt(milliseconds);
}
export async function canonicalizeTelemetryRecord(record) {
    return {
        operationId: await hashString(record.operation_id),
        windowId: await hashString(record.window_id),
        sequence: BigInt(record.sequence),
        timestamp: encodeTimestamp(record.timestamp),
        sensorId: await hashString(record.sensor_id),
        flowRate: scaleNumeric(record.flow_rate),
        uvIntensity: scaleNumeric(record.uv_intensity),
        temperature: scaleNumeric(record.temperature),
        salinity: scaleNumeric(record.salinity),
        turbidity: scaleNumeric(record.turbidity),
    };
}
