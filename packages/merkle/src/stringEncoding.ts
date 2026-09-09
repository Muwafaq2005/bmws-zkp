import { poseidonHash } from "./poseidon.js";

const CHUNK_SIZE = 31;

export function encodeStringToBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function bytesToFieldChunks(bytes: Uint8Array): bigint[] {
  const chunks: bigint[] = [];

  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const chunk = bytes.slice(offset, offset + CHUNK_SIZE);

    let value = 0n;

    for (const byte of chunk) {
      value = (value << 8n) + BigInt(byte);
    }

    chunks.push(value);
  }

  return chunks;
}

export async function hashString(value: string): Promise<bigint> {
  const bytes = encodeStringToBytes(value);
  const chunks = bytesToFieldChunks(bytes);

  return poseidonHash([
    BigInt(bytes.length),
    ...chunks,
  ]);
}