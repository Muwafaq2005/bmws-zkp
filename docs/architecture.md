# BWMS Privacy-Preserving Compliance Verification

## Version

V1.0

## Objective

Demonstrate a software-only prototype in which a defined BWMS
telemetry treatment window is cryptographically committed using a
Merkle tree and used to generate a Zero-Knowledge Proof demonstrating
compliance with a configurable prototype rule set without exposing
the underlying telemetry to the remote verifier.

## Initial Parameters

- Treatment window: 64 records
- Telemetry parameters:
  - flow_rate
  - uv_intensity
  - temperature
  - salinity
  - turbidity
- ZKP: Groth16
- Circuit language: Circom
- Circuit hash: Poseidon
- Initial blockchain: local EVM
- Raw telemetry: retained on ship-side environment
- Remote verifier receives:
  - proof
  - Merkle root
  - operation ID
  - window ID
  - rule-set identifier

## Important Scope Limitation

The prototype compliance rules are demonstration predicates.
They must not be represented as complete IMO D-2 regulatory compliance
requirements unless separately validated against authoritative
regulatory requirements.