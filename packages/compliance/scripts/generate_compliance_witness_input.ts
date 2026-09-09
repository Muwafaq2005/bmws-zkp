import { writeFile } from "node:fs/promises";

import { generateTelemetryWindow } from "@bwms/telemetry";
import { canonicalizeTelemetryRecord } from "@bwms/merkle";

const OUTPUT = "../../circuits/compliance_input.json";

async function main(): Promise<void> {
  const window = generateTelemetryWindow();

  const flowRate: string[] = [];
  const uvIntensity: string[] = [];
  const temperature: string[] = [];
  const salinity: string[] = [];
  const turbidity: string[] = [];

  for (const record of window.records) {
    const canonical = await canonicalizeTelemetryRecord(record);

    flowRate.push(canonical.flowRate.toString());
    uvIntensity.push(canonical.uvIntensity.toString());
    temperature.push(canonical.temperature.toString());
    salinity.push(canonical.salinity.toString());
    turbidity.push(canonical.turbidity.toString());
  }

  const input = {
    flowRate,
    uvIntensity,
    temperature,
    salinity,
    turbidity,
  };

  await writeFile(
    OUTPUT,
    `${JSON.stringify(input, null, 2)}\n`,
    "utf8",
  );

  console.log(`Wrote ${OUTPUT}`);
  console.log(`Records: ${window.records.length}`);
}

await main();