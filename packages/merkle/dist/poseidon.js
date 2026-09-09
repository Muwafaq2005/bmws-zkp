import { buildPoseidon } from "circomlibjs";
let poseidonInstance;
async function getPoseidon() {
    poseidonInstance ??= await buildPoseidon();
    return poseidonInstance;
}
export async function poseidonHash(inputs) {
    if (inputs.length === 0) {
        throw new Error("Poseidon requires at least one input.");
    }
    const poseidon = await getPoseidon();
    const result = poseidon(inputs.map((input) => input.toString()));
    return poseidon.F.toObject(result);
}
