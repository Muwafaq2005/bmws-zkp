pragma circom 2.2.0;

include "circomlib/circuits/poseidon.circom";

template TelemetryLeaf() {
    signal input operationId;
    signal input windowId;
    signal input sequence;
    signal input timestamp;
    signal input sensorId;
    signal input flowRate;
    signal input uvIntensity;
    signal input temperature;
    signal input salinity;
    signal input turbidity;

    signal output leafHash;

    component poseidon = Poseidon(10);

    poseidon.inputs[0] <== operationId;
    poseidon.inputs[1] <== windowId;
    poseidon.inputs[2] <== sequence;
    poseidon.inputs[3] <== timestamp;
    poseidon.inputs[4] <== sensorId;
    poseidon.inputs[5] <== flowRate;
    poseidon.inputs[6] <== uvIntensity;
    poseidon.inputs[7] <== temperature;
    poseidon.inputs[8] <== salinity;
    poseidon.inputs[9] <== turbidity;

    leafHash <== poseidon.out;
}