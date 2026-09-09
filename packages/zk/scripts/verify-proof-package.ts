import { readFile , writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { VerificationPackage } from "../src/proof-package.js";

const execFileAsync = promisify(execFile);

const PACKAGE_PATH = "../../build/zk/verification_package.json";
const VERIFICATION_KEY_PATH = "../../build/zk/verification_key.json";

async function main(): Promise<void> {
  const verificationPackage = JSON.parse(
    await readFile(PACKAGE_PATH, "utf8"),
  ) as VerificationPackage;

  if (verificationPackage.version !== 1) {
    throw new Error("Unsupported verification package version.");
  }

  if (verificationPackage.public_inputs.length !== 1) {
    throw new Error("Expected exactly one public input.");
  }

  if (
    verificationPackage.public_inputs[0] !== verificationPackage.merkle_root
  ) {
    throw new Error("Merkle root does not match public input.");
  }

  const proofPath = "/tmp/bwms-zkp-proof.json";
  const publicPath = "/tmp/bwms-zkp-public.json";

  await writeFile(proofPath, JSON.stringify(verificationPackage.proof), "utf8");

  await writeFile(
    publicPath,
    JSON.stringify(verificationPackage.public_inputs),
    "utf8",
  );

  const { stdout, stderr } = await execFileAsync("snarkjs", [
    "groth16",
    "verify",
    VERIFICATION_KEY_PATH,
    publicPath,
    proofPath,
  ]);

  process.stdout.write(stdout);
  process.stderr.write(stderr);

  console.log(
    `Verified operation ${verificationPackage.operation_id}, ` +
      `window ${verificationPackage.window_id}.`,
  );
}

await main();
