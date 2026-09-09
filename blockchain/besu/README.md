# Permissioned Blockchain Architecture — Hyperledger Besu (QBFT)

## Overview

The BWMS ZKP compliance verification pipeline records audit attestations on a permissioned, Byzantine Fault Tolerant (QBFT) EVM-compatible blockchain.

## Consensus & Validator Nodes

- **Consensus Protocol**: QBFT (Istanbul/QBFT BFT consensus, fault tolerant up to $F = \lfloor (N-1)/3 \rfloor = 1$ malicious node out of 4).
- **Block Time**: 2 seconds deterministic finality.
- **Validators**:
  1. `node1`: `0xfe3b557e8fb62b89f4916b721be55ceb828dbd73` (RPC: `http://localhost:8545`)
  2. `node2`: `0x627306090abab3a6e1400e9345bc60c78a8bef57` (RPC: `http://localhost:8546`)
  3. `node3`: `0xf17f52151eb6d4743e6930fe361a4918e19c99bc` (RPC: `http://localhost:8547`)
  4. `node4`: `0x8401eb5ff34cc943f096a32ef3d5113fe070f193` (RPC: `http://localhost:8548`)

## Setup & Execution

### 1. Launching Local Besu QBFT Cluster
```bash
cd blockchain/besu
docker-compose up -d
```

### 2. Deploying `BWMSAttestation` Smart Contract
```bash
pnpm --filter @bwms/blockchain build
pnpm --filter @bwms/blockchain deploy:local
```

## Attestation Data Schema (On-Chain)

The smart contract `BWMSAttestation.sol` stores:
- `operationId` (`string`): Voyage operation ID (e.g. `OP-000001`)
- `windowId` (`string`): Treatment window ID (e.g. `WIN-000001`)
- `merkleRoot` (`uint256`): Poseidon 64-record Merkle tree root commitment
- `ruleSetId` (`string`): Compliance predicate identifier (`BWMS-DEMO-V1`)
- `compliant` (`bool`): Cryptographic compliance status (`true` / `false`)
- `verificationTimestamp` (`uint256`): Verification epoch timestamp
- `proofHash` (`bytes32`): Hash reference of the Groth16 zero-knowledge proof
- `verifier` (`address`): Ethereum address of the remote verifier node

> **PRIVACY SPECIFICATION**: Zero raw telemetry is written to or readable from the blockchain.
