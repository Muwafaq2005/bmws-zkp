import { describe, expect, it } from "vitest";
import { poseidonHash } from "../src/poseidon.js";

describe("poseidonHash", () => {
  it("produces a deterministic hash", async () => {
    const first = await poseidonHash([1n, 2n]);
    const second = await poseidonHash([1n, 2n]);

    expect(first).toBe(second);
  });

  it("changes when an input changes", async () => {
    const first = await poseidonHash([1n, 2n]);
    const second = await poseidonHash([1n, 3n]);

    expect(first).not.toBe(second);
  });

  it("returns a bigint", async () => {
    const result = await poseidonHash([123n, 456n]);

    expect(typeof result).toBe("bigint");
  });
});