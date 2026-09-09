import { describe, expect, it } from "vitest";
import { generateTelemetryWindow } from "@bwms/telemetry";
import { buildMerkleTree } from "../src/tree.js";

describe("Merkle tree", () => {
  it("builds a tree from exactly 64 records", async () => {
    const window = generateTelemetryWindow();

    const tree = await buildMerkleTree(window.records);

    expect(tree.leaves).toHaveLength(64);
    expect(tree.root).toEqual(expect.any(BigInt));
  });

  it("creates 7 levels for 64 leaves", async () => {
    const window = generateTelemetryWindow();

    const tree = await buildMerkleTree(window.records);

    expect(tree.levels).toHaveLength(7);
    expect(tree.levels.map((level) => level.length)).toEqual([
      64,
      32,
      16,
      8,
      4,
      2,
      1,
    ]);
  });

  it("produces a deterministic root", async () => {
    const window = generateTelemetryWindow();

    const tree1 = await buildMerkleTree(window.records);
    const tree2 = await buildMerkleTree(window.records);

    expect(tree1.root).toBe(tree2.root);
  });

  it("changes the root when one telemetry value changes", async () => {
    const window = generateTelemetryWindow();

    const original = await buildMerkleTree(window.records);

    const modifiedRecords = window.records.map((record) => ({ ...record }));

    modifiedRecords[0]!.flow_rate += 0.1;

    const modified = await buildMerkleTree(modifiedRecords);

    expect(modified.root).not.toBe(original.root);
  });

  it("changes the root when record order changes", async () => {
    const window = generateTelemetryWindow();

    const original = await buildMerkleTree(window.records);

    const reorderedRecords = [...window.records];
    const first = reorderedRecords[0]!;
    const second = reorderedRecords[1]!;

    reorderedRecords[0] = second;
    reorderedRecords[1] = first;

    const reordered = await buildMerkleTree(reorderedRecords);

    expect(reordered.root).not.toBe(original.root);
  });

  it("changes the root when metadata changes", async () => {
    const window = generateTelemetryWindow();

    const original = await buildMerkleTree(window.records);

    const modifiedRecords = window.records.map((record) => ({ ...record }));

    modifiedRecords[0]!.sensor_id = "BWMS-SENSOR-02";

    const modified = await buildMerkleTree(modifiedRecords);

    expect(modified.root).not.toBe(original.root);
  });

  it("rejects a record set that is not exactly 64 records", async () => {
    const window = generateTelemetryWindow();

    await expect(
      buildMerkleTree(window.records.slice(0, 63)),
    ).rejects.toThrow("exactly 64 records");

    await expect(
      buildMerkleTree([...window.records, window.records[63]!]),
    ).rejects.toThrow("exactly 64 records");
  });
});