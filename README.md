# BWMS-ZKP: Privacy-Preserving Ballast-Water Operational Evidence Verification & Blockchain Attestation

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Circom 2](https://img.shields.io/badge/Circom-2.2.3-FF6600?style=flat-square)](https://docs.circom.io/)
[![SnarkJS](https://img.shields.io/badge/SnarkJS-Groth16%20%2F%20BN254-blueviolet?style=flat-square)](https://github.com/iden3/snarkjs)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?style=flat-square&logo=solidity&logoColor=white)](https://soliditylang.org/)
[![Hyperledger Besu](https://img.shields.io/badge/Hyperledger%20Besu-QBFT%20Consensus-1B67B2?style=flat-square)](https://www.hyperledger.org/projects/besu)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

An end-to-end Blockchain course-project demonstrating **privacy-preserving verification of a complete, ordered, cryptographically committed BWMS operational evidence telemetry window using Zero-Knowledge Proofs (Groth16 / BN254) + Poseidon Merkle tree commitments + VSAT transmission simulation + Hyperledger Besu (QBFT) permissioned blockchain attestation**.

---

## 📌 Core Project Message

> **"The ship proves properties of its private evidence without transmitting the underlying telemetry; the port independently verifies the proof and records the resulting attestation on-chain."**

---

## ⚠️ Important Regulatory Disclaimer

> [!WARNING]
> **EDUCATIONAL PROTOTYPE NOTICE:** `BWMS-DEMO-V1` is an educational prototype rule set demonstrating privacy-preserving verification of ballast-water operational evidence. It does **NOT** constitute IMO D-2 biological discharge certification.
>
> The IMO Ballast Water Management Convention D-2 standard specifies biological discharge performance limits (e.g., $<10$ viable organisms $/ \text{m}^3$). The present operational sensor predicate verifies treatment operational evidence (flow rate, UV intensity, temperature, salinity, turbidity). Real-world regulatory verification involves additional evidence such as applicable certification, Ballast Water Management Plan (BWMP), Ballast Water Record Book, and biological sampling.

---

## 📐 System Architecture & Workflow Pipeline

```
SHIP SIDE
  Sensors / Simulator
       ↓
  64-Record Telemetry Window (Canonicalization & Integrity Checks)
       ↓
  Poseidon Merkle Commitment (64-Leaf Binary Tree Root)
       ↓
  Groth16 Zero-Knowledge Prover (158,647 R1CS Constraints over BN254)
       ↓
  Succinct Verification Package (1.10 KB — 0 Raw Telemetry Records)
       ↓
  VSAT Transmission Simulation (512 kbps GEO Link)

PORT SIDE
  Package Received & Structural JSON Validation
       ↓
  Metadata & Policy Validation (Rule Set, Expiration, Replay)
       ↓
  Merkle Root Commitment Alignment Check
       ↓
  Groth16 Cryptographic Verification (snarkjs groth16.verify)
       ↓
  RECORD ATTESTATION ON-CHAIN (Solidity Smart Contract Transaction)
       ↓
  Hyperledger Besu (QBFT) / Local EVM Permissioned Blockchain Storage
       ↓
  Persistent On-Chain Attestation History & Audit Inspector
```

---

## 🔐 Cryptographic Specifications & Frozen Core

- **Circuit ID**: `BWMS-TELEMETRY-64-GROTH16-V1`
- **Rule Set ID**: `BWMS-DEMO-V1`
- **Proving System**: Groth16 over elliptic curve BN254 (alt_bn128).
- **R1CS Constraints**: **158,647 constraints** (640 private inputs, 1 public input).
- **Public Input**: Single public input — Poseidon Merkle root (`publicRoot`).
- **Telemetry Window**: Exactly 64 ordered records per window.
- **Fixed-Point Scale**: $10$ ($1\text{ unit} = 0.1$).
- **Canonical Leaf Ordering**:
  1. `operation_id`
  2. `window_id`
  3. `sequence` ($1 \dots 64$)
  4. `timestamp` (strictly monotonic increasing)
  5. `sensor_id`
  6. `flow_rate_scaled`
  7. `uv_intensity_scaled`
  8. `temperature_scaled`
  9. `salinity_scaled`
  10. `turbidity_scaled`
- **Merkle Tree**: Poseidon hash function (`Poseidon(10)` for telemetry leaf elements, `Poseidon(2)` for internal nodes).
- **Demo Compliance Predicate (`BWMS-DEMO-V1`)**:
  - $\text{flow\_rate} \ge 800 \text{ m}^3/\text{h}$
  - $\text{uv\_intensity} \ge 40 \text{ mW/cm}^2$
  - $20 \le \text{temperature} \le 30 \text{ }^\circ\text{C}$
  - $25 \le \text{salinity} \le 35 \text{ PSU}$
  - $\text{turbidity} \le 5.0 \text{ NTU}$

---

## 🖥️ Operational Console (4 Major Areas)

The web dashboard is built using a maritime operations & cybersecurity verification aesthetic:

1. **SHIP ZKP CONSOLE**:
   - Vessel metadata & operation identifiers (`M/V PACIFIC PROSPERITY`, `IMO 9876543`, `OP-000001`, `WIN-000001`).
   - **Stateful Sensor Simulator**: Select from 8 operational scenarios (`NORMAL`, `LOW_UV`, `LOW_FLOW`, `HIGH_TURBIDITY`, `TEMPERATURE_EXCURSION`, `SENSOR_DRIFT`, `OUTLIER`, `MISSING_READING`) driven by a reproducible Mulberry32 PRNG.
   - **Incremental Sampling & Live Rolling Table**: Telemetry readings stream step-by-step (`1/64` $\to$ `64/64`) via `/api/ship/step` into a live rolling telemetry table with real-time gauge card updates and compliance highlight badges.
   - **Automatic Window Sealing**: Sealed automatically at record 64 into a canonical Poseidon Merkle tree commitment.
   - **Fail-Closed ZK Prover**: Non-compliant telemetry or incomplete/corrupted windows immediately block ZK proof generation (`READY TO GENERATE PROOF` vs `NON-COMPLIANT (PROOF BLOCKED)`).
   - Poseidon Merkle root commitment display with copy button.
   - Groth16 proof status & proof size display with privacy warning (*"Underlying telemetry remains local to vessel"*).
   - Primary Actions: `START OPERATION`, `GENERATE ZK PROOF`, `TRANSMIT TO PORT`.

2. **PORT VERIFICATION CONSOLE**:
   - Received package info & rule-set identifier.
   - **Raw Data Privacy Panel**: Visually contrasts **RAW TELEMETRY NOT RECEIVED** (0 records) vs **VERIFIER RECEIVED** (commitment, proof, metadata).
   - **IMO BWM / D-2 Regulatory Context Panel**: Explains D-2 biological limits vs operational sensor predicates with explicit prototype disclaimers and SIMULATED D-2 EVIDENCE badges.
   - 6-Stage Verification Pipeline with live transitions (`PENDING` $\to$ `RUNNING` $\to$ `PASSED` / `FAILED`).
   - `RECORD ATTESTATION ON-CHAIN` action triggering real EVM smart contract transactions with live lifecycle stages (`SUBMITTING` $\to$ `BROADCAST` $\to$ `PENDING` $\to$ `CONFIRMED`).
   - Real transaction details display (Tx hash, Block number, Contract address, Verifier address, Event name).

3. **BLOCKCHAIN HISTORY SCREEN**:
   - Direct connection summary to Hyperledger Besu (QBFT) / local EVM node.
   - On-chain attestation table queried directly from smart contract getters (`totalAttestations()`, `getAttestation()`, events).
   - **Distinguishes between on-chain attestations and verification attempts** (failed verification attempts are rejected onboard and never recorded as on-chain attestations).
   - Clickable row opening full attestation detail modal with copy buttons for hashes.

4. **SECURITY / ATTACK LAB**:
   - Interactive classroom lab covering 11 attack vectors:
     - Merkle root mutation
     - Groth16 proof forgery
     - Rule set mismatch
     - Stale package replay (>24h old)
     - Duplicate attestation replay
     - Operation ID mismatch
     - Window ID mismatch
     - Telemetry reordering
     - Missing record
     - Sequence gap
     - Non-monotonic timestamp
   - Detailed Security Mitigation Report card showing Attack Input, Expected Security Property, Actual Pipeline Result (`REJECT`), Mitigation Mechanism, and Rejection Reason.

---

## 🛠️ Setup & Run Instructions

### Environment Variables
Configure via `.env` or system environment variables (defaults provided for local development):

```bash
BESU_RPC_URL="http://127.0.0.1:8545"
CHAIN_ID=1337
ATTESTATION_CONTRACT_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"
VERIFIER_PRIVATE_KEY="0xc87ecb10b6601ad372c27102a24d3dd819974eb447b9319a28bf2c246f663675"
PORT=3000
```

### 1. Install Workspace Dependencies & Build Packages
```bash
# Clone the repository
git clone https://github.com/Muwafaq2005/bmws-zkp.git
cd bwms-zkp

# Install workspace dependencies
pnpm install

# Build all workspace packages
pnpm --filter @bwms/telemetry build
pnpm --filter @bwms/merkle build
pnpm --filter @bwms/zk build
pnpm --filter @bwms/vsat-simulator build
pnpm --filter @bwms/ship-app build
pnpm --filter @bwms/verifier-app build
pnpm --filter @bwms/blockchain build
```

### 2. Launch Besu Blockchain & Deploy Smart Contract
To run the Hyperledger Besu 4-node QBFT cluster via Docker Compose:
```bash
cd blockchain/besu
docker-compose up -d
cd ../..
```
Alternatively, for standalone local development without Docker, Hardhat node can be started:
```bash
pnpm --filter @bwms/blockchain node
```

Deploy the `BWMSAttestation.sol` contract:
```bash
pnpm --filter @bwms/blockchain deploy:local
```

### 3. Start the Live Operational Console Application
```bash
pnpm dashboard
```
Open **`http://localhost:3000`** in your web browser.

---

## 🧪 Testing Suite Execution

Run all workspace unit tests:
```bash
pnpm test
```

Run smart contract tests:
```bash
pnpm --filter @bwms/blockchain test
```

Run security attack vector suite:
```bash
pnpm --filter @bwms/zk test
```

Run Circom witness integration tests:
```bash
node tests/zk/test_integrated_zkp.mjs
```

---

## 🔒 Limitations

1. **Sensor Authenticity**: The ZKP proves mathematical properties of committed evidence; it does **not** prove physical sensor hardware tamper-resistance or biological truth.
2. **Blockchain Attestation vs Verifier**: The smart contract acts as an immutable attestation registry; it does **not** execute the Groth16 pairing check on-chain in this V1 architecture (verification occurs at the port verifier node prior to recording).
3. **Demo Predicate Scope**: Thresholds in `BWMS-DEMO-V1` demonstrate operational evidence verification and do **not** constitute authoritative IMO D-2 compliance certification.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
