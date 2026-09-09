# BWMS ZKP End-to-End System Demonstration Walkthrough

## Overview

This document describes the complete end-to-end prototype demonstration for privacy-preserving, zero-knowledge verification of Ballast Water Management System (BWMS) telemetry compliance.

The system demonstrates:
$$\text{ValidWindow}(\text{telemetry}) \land \text{MerkleRoot}(\text{telemetry}) = \text{publicRoot} \land \text{Compliance}(\text{telemetry}) = \text{true}$$
without transmitting raw sensor readings to the remote verifier or placing raw telemetry on-chain.

---

## Architecture & Monorepo Components

- **`@bwms/telemetry`**: Deterministic 64-record telemetry window generator.
- **`@bwms/merkle`**: Poseidon binary Merkle tree construction (64 leaves, left/right ordering preserved).
- **`@bwms/compliance`**: Fixed-point scale 10 compliance engine (`BWMS-DEMO-V1`).
- **`@bwms/zk`**: Circom / SnarkJS Groth16 proof generator, verification package builder, and security validator engine.
- **`@bwms/blockchain`**: Hardhat workspace with `BWMSAttestation.sol` smart contract for recording compliance attestations.
- **`blockchain/besu`**: Hyperledger Besu QBFT 4-node permissioned local consensus cluster configuration.
- **`@bwms/vsat-simulator`**: Constrained satellite communication link simulator modeling bandwidth, latency, framing overhead, and packet loss retransmissions.
- **`@bwms/ship-app`**: Ship-side telemetry acquisition, Merkle commitment, Groth16 witness generation, verification package construction, and VSAT channel transmission.
- **`@bwms/verifier-app`**: Remote verifier application processing structural validation, Groth16 proof verification, and EVM contract attestation.
- **`@bwms/dashboard`**: Interactive web demonstration platform with live visual pipeline, satellite link controls, and security attack simulations.

---

## Reproduction & Demonstration Steps

### 1. Execute All Workspace Unit & Security Test Suites
```bash
# Run Vitest test suites across packages
pnpm test

# Run ZKP witness integration tests (11 adversarial cases)
node tests/zk/test_integrated_zkp.mjs

# Run Phase 1 security hardening test suite (12 attack vectors)
pnpm --filter @bwms/zk test

# Run Smart Contract unit test suite
pnpm --filter @bwms/blockchain test

# Run VSAT Simulator test suite
pnpm --filter @bwms/vsat-simulator test
```

### 2. Compile & Deploy Attestation Smart Contract
```bash
pnpm --filter @bwms/blockchain build
pnpm --filter @bwms/blockchain exec hardhat run scripts/deploy.cjs
```

### 3. Launch Live Demonstration Dashboard
```bash
pnpm dashboard
```
Open **`http://localhost:3000`** in your browser to interact with the dashboard:
- Click **"Run Valid Telemetry Pipeline"** to trace a valid treatment window from ship to remote verifier and Besu blockchain attestation.
- Select a security attack (e.g. **Proof Mutation**, **Merkle Root Tampering**, **Stale Package Replay**, **Rule-Set Mismatch**) and click **"Test Attack Rejection"** to verify instant rejection.

### 4. Run Automated Benchmarks
```bash
pnpm benchmark
```
Outputs saved to `benchmarks/benchmark_results.json`.

---

## Cryptographic Limitations & Honest Disclaimers

1. **Sensor Authenticity**: Zero-knowledge proofs verify mathematical compliance of committed witness data; they do NOT guarantee physical sensor hardware authenticity or physical truth.
2. **Completeness Scope**: Completeness is enforced for the 64-record window; it does not prove that no telemetry existed outside the selected window.
3. **Prototype Rule-Set**: Predicate thresholds in `BWMS-DEMO-V1` are demonstration rules and MUST NOT be represented as complete or authoritative IMO D-2 biological compliance requirements.
4. **Rule-Set Binding**: `rule_set_id` is currently metadata validated at the application layer; production circuits should commit to a hashed rule-set digest in public inputs.
