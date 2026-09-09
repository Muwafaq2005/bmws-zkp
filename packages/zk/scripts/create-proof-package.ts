import { readFile, writeFile } from "node:fs/promises";

import {
  createVerificationPackage,
  type Groth16Proof,
} from "../src/proof-package.js";
import { generateTelemetryWindow } from "@bwms/telemetry";

const PROOF_PATH = "../../build/zk/proof.json";
const PUBLIC_PATH = "../../build/zk/public.json";
const OUTPUT_PATH = "../../build/zk/verification_package.json";

async function main(): Promise<void> {
  const proof = JSON.parse(
    await readFile(PROOF_PATH, "utf8"),
  ) as Groth16Proof;

  const publicInputs = JSON.parse(
    await readFile(PUBLIC_PATH, "utf8"),
  ) as string[];

  if (publicInputs.length !== 1) {
    throw new Error(
      `Expected exactly one public input; received ${publicInputs.length}.`,
    );
  }

  const window = generateTelemetryWindow();

  const verificationPackage = createVerificationPackage(
    window,
    BigInt(publicInputs[0]!),
    proof,
    new Date().toISOString(),
  );

  await writeFile(
    OUTPUT_PATH,
    `${JSON.stringify(verificationPackage, null, 2)}\n`,
    "utf8",
  );

  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Operation: ${verificationPackage.operation_id}`);
  console.log(`Window: ${verificationPackage.window_id}`);
  console.log(`Merkle root: ${verificationPackage.merkle_root}`);
  console.log("Raw telemetry: NOT INCLUDED");
}

await main();