import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import {
  buildMerkleTree,
  canonicalizeTelemetryRecord,
} from "../../packages/merkle/dist/index.js";import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CIRCUIT_INPUT = "circuits/telemetry_merkle_root_input.json";
const WASM = "telemetry_merkle_root_js/telemetry_merkle_root.wasm";
const WITNESS_GENERATOR = "telemetry_merkle_root_js/generate_witness.cjs";
const R1CS = "telemetry_merkle_root.r1cs";

const original = JSON.parse(await readFile(CIRCUIT_INPUT, "utf8"));

function decodeRecords(input) {
  return input.telemetry.map((row) => ({
    operation_id: "OP-000001",
    window_id: "WIN-000001",
    sequence: Number(row[2]),
    timestamp: new Date(Number(row[3])).toISOString(),
    sensor_id: "BWMS-SENSOR-01",
    flow_rate: Number(row[5]) / 10,
    uv_intensity: Number(row[6]) / 10,
    temperature: Number(row[7]) / 10,
    salinity: Number(row[8]) / 10,
    turbidity: Number(row[9]) / 10,
  }));
}

async function encodeInput(records, recomputeRoot = true) {
  const telemetry = [];

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

  const root = recomputeRoot
    ? (await buildMerkleTree(records)).root.toString()
    : original.publicRoot;

  return { telemetry, publicRoot: root };
}

async function runCase(name, records, recomputeRoot, expected) {
  const inputPath = `/tmp/bwms-${name}.json`;
  const witnessPath = `/tmp/bwms-${name}.wtns`;

  const input = await encodeInput(records, recomputeRoot);
  await writeFile(inputPath, `${JSON.stringify(input, null, 2)}\n`);

  let passed = false;
  let output = "";

  try {
    const result = await execFileAsync(
      "node",
      [WITNESS_GENERATOR, WASM, inputPath, witnessPath],
      { maxBuffer: 10 * 1024 * 1024 },
    );

    output = result.stdout + result.stderr;
    passed = expected === "accept";
  } catch (error) {
    output = `${error.stdout ?? ""}${error.stderr ?? ""}${error.message ?? ""}`;
    passed = expected === "reject";
  }

  console.log(`\n[${passed ? "PASS" : "FAIL"}] ${name}`);
  console.log(`Expected: ${expected}`);
  console.log(`Result:   ${passed ? expected : "unexpected"}`);

  if (!passed) {
    console.log(output);
    process.exitCode = 1;
  }

  await rm(inputPath, { force: true });
  await rm(witnessPath, { force: true });
}

const base = decodeRecords(original);

// 1. Valid baseline.
await runCase(
  "valid",
  structuredClone(base),
  false,
  "accept",
);

// 2. Non-compliant flow rate, original root.
{
  const records = structuredClone(base);
  records[0].flow_rate = 799.9;

  await runCase(
    "noncompliant-original-root",
    records,
    false,
    "reject",
  );
}

// 3. Non-compliant flow rate, recomputed root.
{
  const records = structuredClone(base);
  records[0].flow_rate = 799.9;

  await runCase(
    "noncompliant-recomputed-root",
    records,
    true,
    "reject",
  );
}

// 4. Sequence gap.
{
  const records = structuredClone(base);
  records[10].sequence = 12;

  await runCase(
    "sequence-gap",
    records,
    true,
    "reject",
  );
}

// 5. Duplicate sequence.
{
  const records = structuredClone(base);
  records[10].sequence = records[9].sequence;

  await runCase(
    "duplicate-sequence",
    records,
    true,
    "reject",
  );
}

// 6. Reordered records.
{
  const records = structuredClone(base);
  [records[9], records[10]] = [records[10], records[9]];

  await runCase(
    "reordered-records",
    records,
    true,
    "reject",
  );
}

// 7. Equal timestamp.
{
  const records = structuredClone(base);
  records[10].timestamp = records[9].timestamp;

  await runCase(
    "equal-timestamp",
    records,
    true,
    "reject",
  );
}

// 8. Decreasing timestamp.
{
  const records = structuredClone(base);
  records[10].timestamp = records[8].timestamp;
  
  await runCase(
    "decreasing-timestamp",
    records,
    true,
    "reject",
  );
}

// 9. Operation ID mismatch.
{
  const records = structuredClone(base);
  records[10].operation_id = "OP-999999";

  await runCase(
    "operation-mismatch",
    records,
    true,
    "reject",
  );
}

// 10. Window ID mismatch.
{
  const records = structuredClone(base);
  records[10].window_id = "WIN-999999";

  await runCase(
    "window-mismatch",
    records,
    true,
    "reject",
  );
}

// 11. Compliant telemetry mutation with recomputed root.
// This should ACCEPT: the Merkle root must change, but the data remains compliant.
{
  const records = structuredClone(base);
  records[0].flow_rate = 820.2;

  await runCase(
    "compliant-mutation-recomputed-root",
    records,
    true,
    "accept",
  );
}
