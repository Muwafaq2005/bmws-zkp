pragma circom 2.2.0;

include "circomlib/circuits/comparators.circom";

template Compliance64() {
    signal input flowRate[64];
    signal input uvIntensity[64];
    signal input temperature[64];
    signal input salinity[64];
    signal input turbidity[64];

    component flowMin[64];
    component uvMin[64];
    component tempMin[64];
    component tempMax[64];
    component salinityMin[64];
    component salinityMax[64];
    component turbidityMax[64];

    for (var i = 0; i < 64; i++) {
        // flow_rate >= 800
        flowMin[i] = GreaterEqThan(64);
        flowMin[i].in[0] <== flowRate[i];
        flowMin[i].in[1] <== 8000;
        flowMin[i].out === 1;

        // uv_intensity >= 40
        uvMin[i] = GreaterEqThan(64);
        uvMin[i].in[0] <== uvIntensity[i];
        uvMin[i].in[1] <== 400;
        uvMin[i].out === 1;

        // temperature >= 20
        tempMin[i] = GreaterEqThan(64);
        tempMin[i].in[0] <== temperature[i];
        tempMin[i].in[1] <== 200;
        tempMin[i].out === 1;

        // temperature <= 30
        tempMax[i] = LessEqThan(64);
        tempMax[i].in[0] <== temperature[i];
        tempMax[i].in[1] <== 300;
        tempMax[i].out === 1;

        // salinity >= 25
        salinityMin[i] = GreaterEqThan(64);
        salinityMin[i].in[0] <== salinity[i];
        salinityMin[i].in[1] <== 250;
        salinityMin[i].out === 1;

        // salinity <= 35
        salinityMax[i] = LessEqThan(64);
        salinityMax[i].in[0] <== salinity[i];
        salinityMax[i].in[1] <== 350;
        salinityMax[i].out === 1;

        // turbidity <= 5
        turbidityMax[i] = LessEqThan(64);
        turbidityMax[i].in[0] <== turbidity[i];
        turbidityMax[i].in[1] <== 50;
        turbidityMax[i].out === 1;
    }
}