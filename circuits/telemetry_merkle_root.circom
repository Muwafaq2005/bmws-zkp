pragma circom 2.2.0;

include "telemetry_leaf.circom";
include "merkle.circom";
include "completeness.circom";

template TelemetryMerkleRoot64() {
    signal input telemetry[64][10];
    signal input publicRoot;

    signal leaves[64];

    component leaf[64];

    component completeness = Completeness64();

    for (var i = 0; i < 64; i++) {
        completeness.operationIds[i] <== telemetry[i][0];
        completeness.windowIds[i] <== telemetry[i][1];
        completeness.sequences[i] <== telemetry[i][2];
        completeness.timestamps[i] <== telemetry[i][3];
    }

    for (var i = 0; i < 64; i++) {
        leaf[i] = TelemetryLeaf();

        leaf[i].operationId <== telemetry[i][0];
        leaf[i].windowId <== telemetry[i][1];
        leaf[i].sequence <== telemetry[i][2];
        leaf[i].timestamp <== telemetry[i][3];
        leaf[i].sensorId <== telemetry[i][4];
        leaf[i].flowRate <== telemetry[i][5];
        leaf[i].uvIntensity <== telemetry[i][6];
        leaf[i].temperature <== telemetry[i][7];
        leaf[i].salinity <== telemetry[i][8];
        leaf[i].turbidity <== telemetry[i][9];

        leaves[i] <== leaf[i].leafHash;
    }

    component level1[32];
    component level2[16];
    component level3[8];
    component level4[4];
    component level5[2];
    component level6[1];

    for (var i = 0; i < 32; i++) {
        level1[i] = MerkleParent();
        level1[i].left <== leaves[i * 2];
        level1[i].right <== leaves[i * 2 + 1];
    }

    for (var i = 0; i < 16; i++) {
        level2[i] = MerkleParent();
        level2[i].left <== level1[i * 2].parent;
        level2[i].right <== level1[i * 2 + 1].parent;
    }

    for (var i = 0; i < 8; i++) {
        level3[i] = MerkleParent();
        level3[i].left <== level2[i * 2].parent;
        level3[i].right <== level2[i * 2 + 1].parent;
    }

    for (var i = 0; i < 4; i++) {
        level4[i] = MerkleParent();
        level4[i].left <== level3[i * 2].parent;
        level4[i].right <== level3[i * 2 + 1].parent;
    }

    for (var i = 0; i < 2; i++) {
        level5[i] = MerkleParent();
        level5[i].left <== level4[i * 2].parent;
        level5[i].right <== level4[i * 2 + 1].parent;
    }

    level6[0] = MerkleParent();
    level6[0].left <== level5[0].parent;
    level6[0].right <== level5[1].parent;

    level6[0].parent === publicRoot;
}

component main {public [publicRoot]} = TelemetryMerkleRoot64();