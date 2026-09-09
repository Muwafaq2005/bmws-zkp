import { buildPoseidon } from "circomlibjs";

type Poseidon = Awaited<ReturnType<typeof buildPoseidon>>;

let poseidonInstance: Poseidon | undefined;

async function getPoseidon(): Promise<Poseidon> {
  poseidonInstance ??= await buildPoseidon();
  return poseidonInstance;
}

export async function poseidonHash(inputs: bigint[]): Promise<bigint> {
  if (inputs.length === 0) {
    throw new Error("Poseidon requires at least one input.");
  }

  const poseidon = await getPoseidon();

  const result = poseidon(inputs.map((input) => input.toString()));

  return poseidon.F.toObject(result);
}