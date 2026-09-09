import { canonicalizeTelemetryRecord } from "./canonical.js";
import { poseidonHash } from "./poseidon.js";
export const MERKLE_LEAF_COUNT = 64;
export async function hashTelemetryRecord(record) {
    const canonical = await canonicalizeTelemetryRecord(record);
    return poseidonHash([
        canonical.operationId,
        canonical.windowId,
        canonical.sequence,
        canonical.timestamp,
        canonical.sensorId,
        canonical.flowRate,
        canonical.uvIntensity,
        canonical.temperature,
        canonical.salinity,
        canonical.turbidity,
    ]);
}
export async function buildMerkleTree(records) {
    if (records.length !== MERKLE_LEAF_COUNT) {
        throw new Error(`Merkle tree requires exactly ${MERKLE_LEAF_COUNT} records; received ${records.length}.`);
    }
    const leaves = [];
    for (const record of records) {
        leaves.push(await hashTelemetryRecord(record));
    }
    const levels = [leaves];
    let currentLevel = leaves;
    while (currentLevel.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < currentLevel.length; i += 2) {
            const left = currentLevel[i];
            const right = currentLevel[i + 1];
            nextLevel.push(await poseidonHash([left, right]));
        }
        levels.push(nextLevel);
        currentLevel = nextLevel;
    }
    return {
        leaves,
        levels,
        root: currentLevel[0],
    };
}
