pragma circom 2.2.0;

include "circomlib/circuits/poseidon.circom";

template MerkleParent() {
    signal input left;
    signal input right;
    signal output parent;

    component poseidon = Poseidon(2);

    poseidon.inputs[0] <== left;
    poseidon.inputs[1] <== right;

    parent <== poseidon.out;
}