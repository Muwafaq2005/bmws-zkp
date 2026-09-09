import { readFile } from "node:fs/promises";
import { verifyVerificationPackage } from "../src/verifier.js";

const PACKAGE_PATH = "../../build/zk/verification_package.json";
const VERIFICATION_KEY_PATH = "../../build/zk/verification_key.json";

async function main(): Promise<void> {
  const verificationPackage = JSON.parse(
    await readFile(PACKAGE_PATH, "utf8"),
  );

  const verificationKey = JSON.parse(
    await readFile(VERIFICATION_KEY_PATH, "utf8"),
  );

  const result = await verifyVerificationPackage(
    verificationPackage,
    verificationKey,
  );

  if (!result.valid) {
    console.error(`Verification Failed! Attack vector: ${result.attackVector ?? "Unknown"}`);
    console.error(`Reason: ${result.reason ?? "Unknown failure"}`);
    process.exit(1);
  }

  console.log("[INFO] snarkJS Verification: OK!");
  console.log(
    `Verified operation ${verificationPackage.operation_id}, ` +
      `window ${verificationPackage.window_id}.`,
  );
}

await main();
