# BWMS ZKP — Privacy-Preserving Zero-Knowledge Verification of BWMS Compliance

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Circom 2](https://img.shields.io/badge/Circom-2.2.3-FF6600?style=flat-square)](https://docs.circom.io/)
[![SnarkJS](https://img.shields.io/badge/SnarkJS-Groth16%20%2F%20BN254-blueviolet?style=flat-square)](https://github.com/iden3/snarkjs)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?style=flat-square&logo=solidity&logoColor=white)](https://soliditylang.org/)
[![Hyperledger Besu](https://img.shields.io/badge/Hyperledger%20Besu-QBFT%20Consensus-1B67B2?style=flat-square)](https://www.hyperledger.org/projects/besu)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

An end-to-end prototype demonstrating **privacy-preserving verification of a complete, ordered, cryptographically committed BWMS telemetry window without transmitting the underlying telemetry to the remote verifier**.

---

## 📐 Core Cryptographic Architecture

The core relation verified by the zero-knowledge circuit is:

$$\text{ValidWindow}(\text{telemetry}) \;\land\; \text{MerkleRoot}(\text{telemetry}) = \text{publicRoot} \;\land\; \text{Compliance}(\text{telemetry}) = \text{true}$$

```
 ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
 │  BWMS Sensors   │ ────► │ 64-Record V1    │ ────► │ Poseidon Merkle │
 │ (Ship-side)     │       │ Telemetry Window│       │ Tree (64 Leaves)│
 └─────────────────┘       └─────────────────┘       └────────┬────────┘
                                                              │
 ┌─────────────────┐       ┌─────────────────┐                │
 │  Besu QBFT /    │ ◄──── │ Remote Verifier │ ◄──────────────┤
 │  EVM Blockchain │       │ Node (SnarkJS)  │  VSAT Link     ▼
 └─────────────────┘       └─────────────────┘  (1.1 KB ZK) ┌─────────────────┐
                                                            │ Groth16 Prover  │
                                                            │ (BN254 Witness) │
                                                            └─────────────────┘
```

### Key Technical Specifications
- **Zero-Knowledge Stack**: Circom 2.2.3, SnarkJS 0.7.6, Groth16 Proving System over BN254 / BN128 curve.
- **Circuit Complexity**: **158,647 R1CS constraints** (159 template instances, 78,092 nonlinear constraints, 80,555 linear constraints, 640 private inputs, 1 public input).
- **Commitment Scheme**: 64-leaf binary Merkle tree using Poseidon hash functions (`Poseidon(10)` for telemetry leaves, `Poseidon(2)` for internal nodes). Left/right leaf ordering is preserved without unordered pair sorting.
- **Numeric Encoding**: Fixed-point scale 10 ($1\text{ unit} = 0.1$). Floating-point values are converted off-chain prior to canonical field element hashing.
- **Public Inputs**: Single public input (`publicRoot`). Telemetry remains 100% private witness data.
- **Prototype Predicate (`BWMS-DEMO-V1`)**:
  $$\text{flow\_rate} \ge 800 \;\land\; \text{uv\_intensity} \ge 40 \;\land\; 20 \le \text{temperature} \le 30 \;\land\; 25 \le \text{salinity} \le 35 \;\land\; \text{turbidity} \le 5$$

---

## 🛡️ Security Threat Model & Attack Matrix

The verification engine distinguishes Groth16 cryptographic proof verification from application-level package policy enforcement:

| Attack Vector | Expected Result | Technical Protection Mechanism & Layer |
| :--- | :--- | :--- |
| **Proof mutation** | REJECT | Groth16 cryptographic verification (`snarkjs.groth16.verify`) |
| **Public root mutation** | REJECT | Proof / public input binding (`publicInputs[0] === merkle_root`) |
| **Public input mutation** | REJECT | Groth16 cryptographic verification |
| **Telemetry mutation before proof generation** | Different commitment / proof | Poseidon Merkle commitment tree |
| **Sequence gap** | REJECT | Completeness circuit constraints (`sequence == i + 1`) |
| **Duplicate sequence** | REJECT | Completeness circuit constraints |
| **Reordered records** | REJECT | Ordered Poseidon tree commitment + completeness constraints |
| **Timestamp violation** | REJECT | Completeness circuit strictly increasing timestamp constraints |
| **Non-compliant telemetry** | REJECT | Compliance circuit predicate bounds |
| **Operation / window metadata tampering** | REJECT | Application-level package validation policy (*Not a separate ZKP public input in V1*) |
| **Rule-set metadata tampering** | REJECT | Application-level package validation policy (*Not a separate ZKP public input in V1*) |
| **Replay of a valid package** | REJECT | Application freshness policy (`maxAgeMs`) + Blockchain duplicate attestation protection |

---

## 📂 Workspace Directory Structure

```
bwms-zkp/
├── apps/
│   ├── ship/          # Ship-side telemetry acquisition & proof generation service (@bwms/ship-app)
│   ├── verifier/      # Remote verification & blockchain attestation service (@bwms/verifier-app)
│   └── dashboard/     # Live interactive web demonstration dashboard (@bwms/dashboard)
├── blockchain/
│   ├── contracts/     # Solidity smart contract (BWMSAttestation.sol)
│   ├── test/          # Hardhat contract unit test suite
│   ├── scripts/       # Deployment scripts
│   └── besu/          # Hyperledger Besu 4-node QBFT permissioned cluster setup
├── circuits/          # Circom zero-knowledge circuit specifications
│   ├── telemetry_merkle_root.circom
│   ├── telemetry_leaf.circom
│   ├── merkle.circom
│   ├── completeness.circom
│   └── compliance.circom
├── packages/
│   ├── telemetry/     # Deterministic 64-record telemetry generator (@bwms/telemetry)
│   ├── merkle/        # Poseidon binary Merkle tree builder (@bwms/merkle)
│   ├── compliance/    # Prototype predicate compliance evaluator (@bwms/compliance)
│   └── zk/            # Proof package builder & security verifier engine (@bwms/zk)
├── simulator/
│   └── vsat/          # VSAT satellite communication link simulator (@bwms/vsat-simulator)
├── scripts/           # System benchmarking runner (benchmark.ts)
├── benchmarks/        # Saved quantitative measurement results (benchmark_results.json)
└── docs/              # Specifications, handoff docs, and demonstration walkthrough
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v20.0.0 or higher
- **pnpm**: v11.0.0 or higher
- **Docker**: (Optional, for running Hyperledger Besu permissioned cluster)

### 1. Installation & Compilation
```bash
# Clone the repository
git clone https://github.com/Muwafaq2005/bmws-zkp.git
cd bwms-zkp

# Install monorepo workspace dependencies
pnpm install

# Build all TypeScript packages in topological order
pnpm --filter @bwms/telemetry build
pnpm --filter @bwms/merkle build
pnpm --filter @bwms/zk build
pnpm --filter @bwms/vsat-simulator build
pnpm --filter @bwms/ship-app build
pnpm --filter @bwms/verifier-app build
pnpm --filter @bwms/blockchain build
```

---

## 🧪 Testing & Verification

### 1. Run Workspace Unit Test Suites
```bash
pnpm test
```
Runs 49 Vitest unit tests across all workspace packages.

### 2. Run ZKP Circuit Witness Integration Tests
```bash
node tests/zk/test_integrated_zkp.mjs
```
Runs 11 adversarial tests directly against Circom witness generators (`valid`, `noncompliant-data`, `sequence-gap`, `duplicate-sequence`, `reordered-records`, `timestamp-anomalies`, `operation/window-mismatches`).

### 3. Run Phase 1 Security Hardening Attack Suite
```bash
pnpm --filter @bwms/zk test
```
Executes 12 adversarial attack vectors testing proof point mutations, Merkle root tampering, metadata modification, replay attacks, stale package expiration, and rule-set ID mismatches.

### 4. Run Smart Contract Unit Tests
```bash
pnpm --filter @bwms/blockchain test
```

---

## 🖥️ Live Visual Demonstration Dashboard

Launch the interactive web interface:
```bash
pnpm dashboard
```
Open **`http://localhost:3000`** in your browser.

### Features
- **Live Pipeline Visualizer**: Trace telemetry generation $\rightarrow$ Merkle root $\rightarrow$ Groth16 proof $\rightarrow$ VSAT transmission $\rightarrow$ Remote verification $\rightarrow$ Besu blockchain attestation.
- **Separate Verification Badges**: Distinct statuses for `ZKP VERIFIED` (Groth16) vs `CONFIRMED` (Blockchain Attestation).
- **Expandable Package Inspector**: Collapsible JSON inspector showing actual payload fields and explicitly confirming: `Raw Telemetry Transmitted: 0 records`.
- **Interactive Security Attack Simulation**: Test instant rejection of proof mutations, data tampering, stale packages, and rule-set mismatches.

---

## 📊 Empirical Benchmarking Results

Captured via `pnpm benchmark` (Reproducible Measured Results):

| Metric | Raw Telemetry Transmission | ZK Verification Package | Performance Gain / Measured Delta |
| :--- | :--- | :--- | :--- |
| **Payload Size (Uncompressed)** | **14,238 bytes** (~14.2 KB) | **1,102 bytes** (~1.1 KB) | **92.26% Bandwidth Reduction** |
| **Payload Size (Gzip Compressed)** | 887 bytes | 640 bytes | **27.85% Compression Savings** |
| **Packets Sent (512 kbps VSAT)** | 11 TCP Segments | 1 TCP Segment | **90.9% Fewer Packets** |
| **Transmission Latency (650 ms GEO)** | 879 ms | 668 ms | **211 ms Faster (1.32x Speedup)** |
| **Mean Proof Verification** | N/A | **31.55 ms** | Instant Verification |
| **R1CS Constraints** | N/A | **158,647 Constraints** | 64-Leaf Poseidon Tree |
| **On-Chain Storage** | Raw Telemetry Excluded | Root + Proof Hash Only | **Privacy Preserved** |

---

## 🔒 Cryptographic Limitations & Disclaimers

1. **Sensor Authenticity**: The zero-knowledge proof verifies the mathematical compliance of committed telemetry data; it does **not** prove physical sensor hardware authenticity or physical measurement truth.
2. **Completeness Scope**: Completeness is cryptographically enforced for the 64-record window; it does not prove that no unobserved telemetry existed outside the selected window.
3. **Prototype Predicate**: Thresholds in `BWMS-DEMO-V1` are demonstration rules and **must not be represented as an authoritative IMO D-2 biological compliance certification**.
4. **Rule-Set Binding**: `rule_set_id` is validated at the package metadata level; production circuits should commit to a hashed rule-set digest in public inputs.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
