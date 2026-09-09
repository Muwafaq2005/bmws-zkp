pragma circom 2.2.0;

include "circomlib/circuits/comparators.circom";

template Completeness64() {
    signal input operationIds[64];
    signal input windowIds[64];
    signal input sequences[64];
    signal input timestamps[64];

    component timestampOrder[63];

    // Sequence must be exactly 1..64.
    for (var i = 0; i < 64; i++) {
        sequences[i] === i + 1;
    }

    // All records must belong to the same operation and window.
    for (var i = 1; i < 64; i++) {
        operationIds[i] === operationIds[0];
        windowIds[i] === windowIds[0];
    }

    // Timestamp comparators.
    for (var i = 0; i < 63; i++) {
        timestampOrder[i] = LessThan(64);

        timestampOrder[i].in[0] <== timestamps[i];
        timestampOrder[i].in[1] <== timestamps[i + 1];

        timestampOrder[i].out === 1;
    }
}