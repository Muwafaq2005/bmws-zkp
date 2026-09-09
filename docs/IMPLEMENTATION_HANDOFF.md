# BWMS ZKP Implementation Handoff

## 1. Project

Project: Privacy-Preserving, Completeness-Assured Zero-Knowledge Verification of BWMS Compliance

Repository: `bwms-zkp`

Current stage: Core cryptographic proof-of-concept validated.

The purpose of this document is to hand the validated cryptographic implementation to the next engineering phase without changing the demonstrated core architecture unnecessarily.

---

## 2. Validated Core Architecture

The validated V1 pipeline is:

BWMS telemetry simulator
→ telemetry processing
→ fixed 64-record treatment window
→ completeness validation
→ compliance predicate
→ Poseidon Merkle commitment
→ Groth16 zero-knowledge proof
→ verification package
→ remote verification

The core cryptographic relationship is:

ValidWindow(telemetry)
AND
MerkleRoot(telemetry) == publicRoot
AND
Compliance(telemetry) == true

The verifier receives the proof package and does not require the raw telemetry.

---

## 3. V1 Window Definition

The current circuit operates on exactly 64 records.

A valid window requires:

- exactly 64 records
- sequence numbers 1 through 64
- records presented in sequence order
- strictly increasing timestamps
- identical `operation_id`
- identical `window_id`

This is a V1 implementation constraint.

Do not silently generalize the implementation to arbitrary window sizes without updating the cryptographic specification and tests.

---

## 4. Telemetry Schema

Each record contains:

- `operation_id`
- `window_id`
- `sequence`
- `timestamp`
- `sensor_id`
- `flow_rate`
- `uv_intensity`
- `temperature`
- `salinity`
- `turbidity`

The canonical field order is:

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

---

## 5. Canonical Encoding

ZKP numeric values use fixed-point scale 10.

Examples:

- 820.4 → 8204
- 42.7 → 427
- 24.3 → 243
- 31.2 → 312
- 1.7 → 17

JavaScript floating-point values must not be passed directly into the circuit.

String identifiers are deterministically encoded and hashed into BN254 field elements.

Timestamps are represented as milliseconds since Unix epoch.

See:

`docs/crypto-spec.md`

for the authoritative V1 cryptographic encoding specification.

---

## 6. Merkle Commitment

The V1 Merkle tree is:

- binary
- exactly 64 leaves
- Poseidon-based
- left child first
- right child second
- no unordered-pair sorting

Each telemetry record is canonicalized and hashed with Poseidon(10).

Internal nodes use Poseidon(2).

The resulting root commits to the ordered telemetry window.

Important:

A Merkle root alone does NOT establish completeness.

Completeness is enforced through the V1 window definition and the ZKP circuit.

---

## 7. ZKP Implementation

Technology:

- Circom 2.2.3
- snarkjs 0.7.6
- Groth16
- BN128/BN254
- circomlib Poseidon

Primary circuit:

`circuits/telemetry_merkle_root.circom`

Supporting circuits:

- `telemetry_leaf.circom`
- `merkle.circom`
- `completeness.circom`
- `compliance.circom`

Current circuit exposes one public input:

`publicRoot`

The telemetry remains private witness data.

---

## 8. Compliance Predicate

The current prototype predicate is:

- flow rate >= 800
- UV intensity >= 40
- temperature >= 20 and <= 30
- salinity >= 25 and <= 35
- turbidity <= 5

The corresponding fixed-point values are implemented in the circuit.

Rule-set identifier:

`BWMS-DEMO-V1`

IMPORTANT:

These values are prototype/demo constraints.

They must NOT be presented as a complete or authoritative implementation of IMO D-2 biological compliance.

Any future regulatory rule implementation must be separately researched, documented, versioned, tested, and cryptographically bound where appropriate.

---

## 9. Cryptographic Validation Already Completed

The following has been demonstrated:

### Poseidon compatibility

The TypeScript Poseidon implementation and Circom Poseidon implementation produce matching values.

### Telemetry leaf compatibility

Off-chain telemetry leaf hashing matches the Circom implementation.

### Merkle compatibility

The TypeScript Merkle implementation and circuit produce the same root.

Reference V1 root:

`6970415870308143595245657767980609725526508915566442276217999217898140544513`

### Completeness

The circuit rejects:

- sequence gaps
- duplicate sequences
- reordered records
- operation ID mismatch
- window ID mismatch
- equal timestamps
- decreasing timestamps

### Compliance

The circuit rejects non-compliant telemetry.

### Root binding

A proof generated for the valid root fails when verified against a modified public root.

### Adversarial integrated tests

11 integrated cases have been tested, including:

1. valid telemetry
2. non-compliant telemetry with original root
3. non-compliant telemetry with recomputed root
4. sequence gap
5. duplicate sequence
6. reordered records
7. equal timestamp
8. decreasing timestamp
9. operation mismatch
10. window mismatch
11. compliant mutation with recomputed root

The valid cases are accepted and invalid cases are rejected according to the intended semantics.

---

## 10. Groth16 Setup

A development Powers of Tau and Groth16 setup was performed locally.

The generated artifacts include:

- final zkey
- verification key
- proof
- public inputs

IMPORTANT:

The local setup used development entropy and is suitable only for the prototype.

It must NOT be represented as a production trusted setup.

A production Groth16 deployment would require an appropriate trusted setup ceremony or a proof system whose setup properties meet the deployment requirements.

---

## 11. Verification Package

The V1 package contains:

- package version
- circuit ID
- operation ID
- window ID
- Merkle root
- public inputs
- rule-set identifier
- Groth16 proof
- package generation timestamp

Example structure:

{
  "version": 1,
  "circuit_id": "BWMS-TELEMETRY-64-GROTH16-V1",
  "operation_id": "OP-000001",
  "window_id": "WIN-000001",
  "merkle_root": "...",
  "public_inputs": ["..."],
  "rule_set_id": "BWMS-DEMO-V1",
  "proof": {},
  "generated_at": "..."
}

Raw telemetry is deliberately excluded.

Remote verification has been successfully demonstrated.

---

## 12. Important Current Limitations

The next engineering phase MUST preserve awareness of these limitations.

### Sensor authenticity

The ZKP does not currently prove that physical sensors produced truthful measurements.

Sensor authentication/integrity is outside the V1 ZKP circuit.

### Rule-set binding

`rule_set_id` is currently metadata.

It is not independently exposed as a public ZKP input or cryptographically committed rule hash.

The current circuit implements the V1 predicate directly.

### Operation/window public binding

`operation_id` and `window_id` are part of the private committed telemetry and therefore affect the Merkle root.

They are not currently separate public ZKP inputs.

Do not claim that the current proof independently exposes and authenticates those metadata fields.

### Completeness scope

Completeness currently means the V1 64-record window conditions defined above.

It does not prove that no telemetry existed outside the selected window.

### Physical BWMS compliance

The proof verifies the implemented mathematical predicate.

It does not by itself establish physical regulatory compliance unless the predicate has been formally mapped to the applicable regulatory requirements.

---

## 13. Repository Structure

Current architecture:

bwms-zkp/
├── apps/
│   ├── ship/
│   └── verifier/
├── circuits/
│   ├── main.circom
│   ├── merkle.circom
│   ├── telemetry_leaf.circom
│   ├── completeness.circom
│   ├── compliance.circom
│   └── telemetry_merkle_root.circom
├── packages/
│   ├── telemetry/
│   ├── merkle/
│   ├── compliance/
│   └── zk/
├── blockchain/
├── simulator/
├── datasets/
├── tests/
└── docs/

Some directories are intentionally still skeletal.

---

## 14. Remaining Engineering Work

### Milestone 8 — Security and attack hardening

Add tests for:

- altered proof
- altered public root
- altered package metadata
- package substitution
- replay
- malformed package
- invalid circuit ID
- invalid rule-set ID
- proof/package mismatch
- stale verification packages

Do not remove existing tests.

---

### Milestone 9 — Blockchain attestation

Implement an attestation layer.

The blockchain should record information such as:

- operation ID
- window ID
- Merkle root
- rule-set identifier
- verification result
- verification timestamp
- proof hash/reference

Raw telemetry must not be placed on-chain.

Blockchain is an audit/attestation layer.

It is NOT the cryptographic compliance proof itself.

---

### Milestone 10 — Permissioned blockchain

Evaluate and implement the planned permissioned blockchain architecture, including Hyperledger Besu/QBFT where appropriate.

The implementation must document:

- validator configuration
- consensus assumptions
- identity/access control
- transaction flow
- failure behavior

---

### Milestone 11 — VSAT simulation

Implement a software communication simulator with configurable:

- bandwidth
- latency
- packet loss
- message size

Measure:

1. raw telemetry payload size
2. verification-package size
3. transmission time under different link conditions
4. verification latency
5. retry behavior

Do NOT claim a bandwidth reduction percentage before measuring it.

---

### Milestone 12 — Ship-side application

Build a minimal ship-side service that:

1. receives/generated telemetry
2. forms a valid window
3. generates the commitment
4. generates the proof
5. creates the verification package
6. sends it through the communication simulator

---

### Milestone 13 — Remote verifier

Build the remote verification service that:

1. receives the package
2. validates package structure
3. validates circuit ID
4. validates public inputs
5. verifies the Groth16 proof
6. returns PASS/REJECT
7. records the verification result

---

### Milestone 14 — Dashboard

Provide a simple interface showing:

- operation
- window
- root
- verification result
- timestamp
- rule-set identifier
- blockchain attestation status
- communication metrics

Never display fabricated regulatory claims.

---

### Milestone 15 — End-to-end integration

Integrate:

ship
→ telemetry
→ proof
→ VSAT simulator
→ verifier
→ blockchain
→ dashboard

The complete demonstration should use the same proof artifact throughout.

---

### Milestone 16 — Benchmarking

Measure:

- proof generation time
- proof verification time
- circuit constraints
- proof package size
- raw telemetry size
- communication time
- blockchain transaction latency
- memory/resource usage

Use actual measurements.

---

### Milestone 17 — Final documentation and demonstration

Produce:

- architecture documentation
- protocol documentation
- threat model
- experiment results
- limitations
- reproducibility instructions
- final demonstration script

---

## 15. Non-Negotiable Engineering Rules

1. Do not add raw telemetry to the verification package.
2. Do not put raw telemetry on-chain.
3. Do not claim the Merkle root itself proves completeness.
4. Do not claim the ZKP proves physical sensor truth.
5. Do not present BWMS-DEMO-V1 thresholds as authoritative IMO D-2 requirements.
6. Do not silently change canonical encoding.
7. Do not silently change the Merkle construction.
8. Do not silently change public/private inputs.
9. Preserve the existing adversarial tests.
10. Measure bandwidth and performance instead of estimating them.
11. Keep generated `build/` artifacts out of Git.
12. Document any cryptographic architecture change before implementing it.

---

## 16. Definition of Success

The final system should demonstrate:

A ship-side system can generate a complete authenticated BWMS telemetry window, commit to it cryptographically, generate a zero-knowledge proof that the committed window satisfies the implemented compliance predicate, transmit only a compact verification package, and allow a remote verifier to validate the result without receiving the underlying telemetry.

The blockchain component provides persistent attestation/auditability.

The communication simulator demonstrates the effect of transmitting the verification package rather than the complete telemetry dataset.

The final implementation must distinguish demonstrated behavior from future or assumed capabilities.