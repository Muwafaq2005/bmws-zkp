# BWMS ZKP Cryptographic Specification

## Version

V1

## Field

BN254 scalar field.

## Telemetry Numeric Encoding

Telemetry measurements use fixed-point scale 10.

Examples:

- 820.4 → 8204
- 42.7 → 427
- 24.3 → 243
- 31.2 → 312
- 1.7 → 17

No JavaScript floating-point value is passed directly into the ZKP circuit.

## Record Field Order

Each telemetry record is represented in this order:

1. operation_id
2. window_id
3. sequence
4. timestamp
5. sensor_id
6. flow_rate_scaled
7. uv_intensity_scaled
8. temperature_scaled
9. salinity_scaled
10. turbidity_scaled

## Hash Function

Poseidon from the circomlib ecosystem.

The TypeScript implementation uses circomlibjs.

The Circom implementation will use the corresponding circomlib Poseidon
component.

## Merkle Tree

- Binary tree
- 64 leaves
- Two-input Poseidon hash for internal nodes
- Left child is the first input
- Right child is the second input
- No unordered-pair sorting

## Leaf Commitment

A telemetry record is converted to its canonical field representation
and then hashed into a single field element.

## Root

The final Merkle tree node is the commitment to the complete ordered
64-record treatment window.

## Completeness

For V1, completeness means:

- exactly 64 records
- sequence values 1 through 64
- records occur in sequence order
- timestamps are strictly increasing
- all records share the same operation_id
- all records share the same window_id

The Merkle root alone does not prove completeness. Completeness is
established by the window definition and, later, enforced by the ZKP
circuit.

## Compliance

The prototype compliance predicate is defined separately by the
configured rule set.

The prototype thresholds must not be represented as complete IMO D-2
regulatory requirements.