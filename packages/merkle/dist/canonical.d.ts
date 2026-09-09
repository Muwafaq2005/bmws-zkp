import type { TelemetryRecord } from "@bwms/telemetry";
export declare const NUMERIC_SCALE = 10;
export interface CanonicalTelemetryRecord {
    operationId: bigint;
    windowId: bigint;
    sequence: bigint;
    timestamp: bigint;
    sensorId: bigint;
    flowRate: bigint;
    uvIntensity: bigint;
    temperature: bigint;
    salinity: bigint;
    turbidity: bigint;
}
export declare function scaleNumeric(value: number): bigint;
/**
 * Temporary deterministic string encoding.
 *
 * We will replace this with the shared Poseidon string
 * encoding once the Merkle hashing layer is implemented.
 */
export declare function encodeTimestamp(timestamp: string): bigint;
export declare function canonicalizeTelemetryRecord(record: TelemetryRecord): Promise<CanonicalTelemetryRecord>;
