import { writeFile } from "node:fs/promises";

import { generateTelemetryWindow } from "@bwms/telemetry";
import {
  buildMerkleTree,
  canonicalizeTelemetryRecord,
} from "../src/index.js";

const OUTPUT_DIR = "../../circuits";

async function buildInput(
  records: Parameters<typeof buildMerkleTree>[0],
): Promise<{ telemetry: string[][]; publicRoot: string }> {
  const telemetry: string[][] = [];

  for (const record of records) {
    const canonical = await canonicalizeTelemetryRecord(record);

    telemetry.push([
      canonical.operationId.toString(),
      canonical.windowId.toString(),
      canonical.sequence.toString(),
      canonical.timestamp.toString(),
      canonical.sensorId.toString(),
      canonical.flowRate.toString(),
      canonical.uvIntensity.toString(),
      canonical.temperature.toString(),
      canonical.salinity.toString(),
      canonical.turbidity.toString(),
    ]);
  }

  const merkleTree = await buildMerkleTree(records);

  return {
    telemetry,
    publicRoot: merkleTree.root.toString(),
  };
}

async function writeCase(
  name: string,
  mutate: (
    records: ReturnType<typeof generateTelemetryWindow>["records"],
  ) => void,
): Promise<void> {
  const window = generateTelemetryWindow();

  mutate(window.records);

  const input = await buildInput(window.records);

  const output = `${OUTPUT_DIR}/test_${name}_recomputed_root.json`;

  const validWindow = generateTelemetryWindow();
  const validInput = await buildInput(validWindow.records);

  await writeFile(
    `${OUTPUT_DIR}/telemetry_merkle_root_input.json`,
    `${JSON.stringify(validInput, null, 2)}\n`,
    "utf8",
  );

  console.log(`valid:`);
  console.log(`  root = ${validInput.publicRoot}`);

  await writeFile(
    output,
    `${JSON.stringify(input, null, 2)}\n`,
    "utf8",
  );

  console.log(`${name}:`);
  console.log(`  root = ${input.publicRoot}`);
  console.log(`  output = ${output}`);
}

// Sequence gap.
await writeCase("sequence_gap", (records) => {
  records[10]!.sequence = 999;
});

// Equal timestamps.
await writeCase("equal_timestamp", (records) => {
  records[20]!.timestamp = records[19]!.timestamp;
});

// Different operation ID.
await writeCase("operation_mismatch", (records) => {
  records[20]!.operation_id = "OP-OTHER";
});

// Different window ID.
await writeCase("window_mismatch", (records) => {
  records[20]!.window_id = "WIN-OTHER";
});