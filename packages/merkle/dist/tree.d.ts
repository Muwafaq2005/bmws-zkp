import type { TelemetryRecord } from "@bwms/telemetry";
export declare const MERKLE_LEAF_COUNT = 64;
export interface MerkleTree {
    leaves: bigint[];
    levels: bigint[][];
    root: bigint;
}
export declare function hashTelemetryRecord(record: TelemetryRecord): Promise<bigint>;
export declare function buildMerkleTree(records: TelemetryRecord[]): Promise<MerkleTree>;
