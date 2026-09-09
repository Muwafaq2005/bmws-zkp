# Google Antigravity Master Prompt

You are taking over the engineering phase of the BWMS ZKP project.

Repository:

`bwms-zkp`

Your responsibility is to extend and integrate the validated cryptographic proof-of-concept.

DO NOT redesign the cryptographic core casually.

Before modifying the core circuits, read:

- `docs/crypto-spec.md`
- `docs/IMPLEMENTATION_HANDOFF.md`

Treat those documents as the current engineering baseline.

---

# PROJECT OBJECTIVE

Build an end-to-end prototype demonstrating:

BWMS telemetry
→ complete treatment window
→ cryptographic commitment
→ zero-knowledge compliance proof
→ compact verification package
→ remote verification
→ optional blockchain attestation
→ constrained maritime communication simulation
→ operator/verifier applications
→ measurements and final demonstration

The central technical concept is privacy-preserving compliance verification of committed BWMS telemetry without transmitting raw telemetry to the remote verifier.

---

# CURRENT VALIDATED STATE

The following components already work and must be preserved.

## Telemetry

Package:

`@bwms/telemetry`

The deterministic generator creates a 64-record V1 telemetry window.

Schema:

- operation_id
- window_id
- sequence
- timestamp
- sensor_id
- flow_rate
- uv_intensity
- temperature
- salinity
- turbidity

---

## Merkle

Package:

`@bwms/merkle`

Construction:

- Poseidon
- binary Merkle tree
- 64 leaves
- left/right ordering preserved
- no pair sorting

Reference valid root:

`6970415870308143595245657767980609725526508915566442276217999217898140544513`

Do not alter the canonicalization or Merkle construction without a documented reason and regenerated compatibility tests.

---

## Completeness

The circuit requires:

- exactly 64 records
- sequence 1..64
- correct order
- strictly increasing timestamps
- same operation_id
- same window_id

---

## Compliance

Current prototype predicate:

flow_rate >= 800

uv_intensity >= 40

20 <= temperature <= 30

25 <= salinity <= 35

turbidity <= 5

These are DEMONSTRATION rules.

They are NOT to be represented as the complete IMO D-2 regulatory requirements.

---

## ZKP

Stack:

- Circom
- circomlib
- snarkjs
- Groth16
- BN128/BN254

Main circuit:

`circuits/telemetry_merkle_root.circom`

Current public input:

`publicRoot`

Telemetry is private witness data.

---

# TESTS ALREADY COMPLETED

Existing tests cover:

- valid proof
- non-compliant data
- recomputed roots
- sequence gaps
- duplicate sequence
- reordered records
- equal timestamps
- decreasing timestamps
- operation mismatch
- window mismatch
- compliant mutation with recomputed root
- invalid public root

Preserve these tests.

Do not weaken them merely to make integration easier.

---

# CURRENT VERIFICATION PACKAGE

Package:

`build/zk/verification_package.json`

Contains:

- version
- circuit_id
- operation_id
- window_id
- Merkle root
- public inputs
- rule-set ID
- Groth16 proof
- generated timestamp

It intentionally contains NO raw telemetry.

Maintain that property.

---

# IMPORTANT CRYPTOGRAPHIC LIMITATIONS

The current proof does NOT prove:

1. physical sensor truth
2. sensor hardware authenticity
3. complete IMO D-2 compliance unless the implemented predicate is formally mapped to those requirements
4. that no telemetry existed outside the selected 64-record window
5. that rule_set_id is independently cryptographically committed

Do not write documentation that implies otherwise.

---

# DEVELOPMENT ORDER

Implement the remaining work in this order.

## Phase 1 — Security hardening

Add tests for:

- proof mutation
- root mutation
- metadata mutation
- package mismatch
- replay
- malformed JSON
- unsupported version
- unsupported circuit
- unsupported rule-set ID
- proof/public-input mismatch
- stale package
- duplicate attestation

Every security test must explain what attack it represents.

---

## Phase 2 — Blockchain attestation

Implement a minimal smart contract.

Suggested attestation fields:

- operation ID
- window ID
- Merkle root
- rule-set identifier
- compliance result
- verification timestamp
- proof hash/reference

Do not store raw telemetry.

Initially use Hardhat/local EVM if that accelerates development.

Then evaluate the permissioned Besu/QBFT deployment.

---

## Phase 3 — Permissioned blockchain

Implement a reproducible local Besu/QBFT environment.

Document:

- validator nodes
- identities
- consensus
- RPC endpoints
- deployment process
- contract address
- transaction flow

---

## Phase 4 — VSAT simulation

Build a simulator.

Inputs:

- payload
- bandwidth
- latency
- packet loss

Measure actual:

- payload bytes
- transmission time
- retries
- end-to-end latency

Compare:

A. raw telemetry transmission

against

B. verification-package transmission

Do not invent or assume savings.

---

## Phase 5 — Applications

Build a minimal ship-side application.

Responsibilities:

- generate/acquire telemetry
- validate window
- generate Merkle root
- generate proof
- create verification package
- transmit package

Build a remote verifier.

Responsibilities:

- receive package
- validate schema
- verify proof
- return PASS/REJECT
- optionally create blockchain attestation

---

## Phase 6 — Dashboard

Show:

- operation
- window
- verification status
- Merkle root
- rule-set
- timestamp
- blockchain attestation
- communication metrics

The dashboard should clearly distinguish:

"cryptographically verified against the implemented prototype predicate"

from

"regulatory compliance"

unless authoritative regulatory mapping has been implemented.

---

## Phase 7 — Benchmarking

Collect real measurements:

- circuit constraints
- proof generation time
- proof verification time
- proof package size
- raw telemetry size
- communication latency
- blockchain latency
- memory/CPU requirements

Save reproducible results.

---

# ENGINEERING REQUIREMENTS

Use:

- TypeScript
- Node.js
- pnpm
- Circom
- snarkjs
- Solidity
- Hardhat
- Docker where useful
- Vitest

Maintain the existing monorepo structure.

Prefer small, testable packages.

Avoid unnecessary dependencies.

---

# GIT RULES

Do not commit:

`build/`

or generated proving artifacts unless explicitly required for reproducibility.

Keep source specifications and scripts under version control.

Use focused commits.

Recommended style:

`feat: ...`

`test: ...`

`fix: ...`

`docs: ...`

`chore: ...`

---

# CRYPTOGRAPHIC CHANGE POLICY

If you believe the current circuit needs modification:

1. Explain why.
2. Identify the security/correctness problem.
3. Show which existing test demonstrates the limitation.
4. Propose the smallest change.
5. Update `docs/crypto-spec.md`.
6. Add compatibility tests.
7. Re-run the complete existing ZKP test suite.
8. Document the effect on the patent architecture.

Do not silently change:

- hash function
- field encoding
- field order
- Merkle structure
- window definition
- public inputs
- private inputs
- compliance semantics

---

# DEFINITION OF DONE

The project is complete when a reproducible demo can perform:

1. Generate BWMS telemetry.
2. Form a valid 64-record treatment window.
3. Canonicalize the records.
4. Generate the Merkle root.
5. Generate a Groth16 proof.
6. Produce a verification package containing no raw telemetry.
7. Send the package through the communication simulator.
8. Verify it remotely.
9. Record the verification result on the blockchain.
10. Display the result in the dashboard.
11. Demonstrate rejection of tampered/non-compliant data.
12. Report actual payload and performance measurements.
13. Document limitations honestly.

The same proof package should be traceable through the demonstration from ship-side generation to remote verification and blockchain attestation.

---

# FIRST ACTION

Before writing code:

1. Inspect the repository.
2. Read `docs/crypto-spec.md`.
3. Read `docs/IMPLEMENTATION_HANDOFF.md`.
4. Run the existing tests.
5. Verify the current proof package.
6. Report the current state.
7. Then begin security hardening.

Do not immediately rewrite existing components.

Preserve the validated core and build outward from it.