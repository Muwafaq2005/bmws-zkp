const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BWMSAttestation Smart Contract", function () {
  let bwmsAttestation;
  let owner;
  let verifier;

  const sampleOpId = "OP-000001";
  const sampleWinId = "WIN-000001";
  const sampleMerkleRoot = BigInt(
    "6970415870308143595245657767980609725526508915566442276217999217898140544513"
  );
  const sampleRuleSet = "BWMS-DEMO-V1";
  const sampleProofHash = ethers.keccak256(ethers.toUtf8Bytes("sample_groth16_proof_json"));
  const sampleTimestamp = Math.floor(Date.now() / 1000);

  beforeEach(async function () {
    [owner, verifier] = await ethers.getSigners();
    const BWMSAttestationFactory = await ethers.getContractFactory("BWMSAttestation");
    bwmsAttestation = await BWMSAttestationFactory.deploy();
    await bwmsAttestation.waitForDeployment();
  });

  it("1. Should deploy successfully and set initial state", async function () {
    expect(await bwmsAttestation.totalAttestations()).to.equal(0);
    expect(await bwmsAttestation.owner()).to.equal(owner.address);
  });

  it("2. Should record a valid zero-knowledge compliance attestation", async function () {
    const tx = await bwmsAttestation
      .connect(verifier)
      .recordAttestation(
        sampleOpId,
        sampleWinId,
        sampleMerkleRoot,
        sampleRuleSet,
        true,
        sampleTimestamp,
        sampleProofHash
      );

    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);

    expect(await bwmsAttestation.totalAttestations()).to.equal(1);
    expect(await bwmsAttestation.hasAttestation(sampleOpId, sampleWinId)).to.be.true;

    const attestation = await bwmsAttestation.getAttestation(sampleOpId, sampleWinId);
    expect(attestation.operationId).to.equal(sampleOpId);
    expect(attestation.windowId).to.equal(sampleWinId);
    expect(attestation.merkleRoot).to.equal(sampleMerkleRoot);
    expect(attestation.ruleSetId).to.equal(sampleRuleSet);
    expect(attestation.compliant).to.be.true;
    expect(attestation.verificationTimestamp).to.equal(sampleTimestamp);
    expect(attestation.proofHash).to.equal(sampleProofHash);
    expect(attestation.verifier).to.equal(verifier.address);
  });

  it("3. Should emit AttestationRecorded event with accurate payload", async function () {
    const key = await bwmsAttestation.getAttestationKey(sampleOpId, sampleWinId);

    await expect(
      bwmsAttestation
        .connect(verifier)
        .recordAttestation(
          sampleOpId,
          sampleWinId,
          sampleMerkleRoot,
          sampleRuleSet,
          true,
          sampleTimestamp,
          sampleProofHash
        )
    )
      .to.emit(bwmsAttestation, "AttestationRecorded")
      .withArgs(
        key,
        sampleOpId,
        sampleWinId,
        sampleMerkleRoot,
        sampleRuleSet,
        true,
        sampleTimestamp,
        sampleProofHash,
        verifier.address
      );
  });

  it("4. Should reject duplicate attestation for the same operation and window ID", async function () {
    await bwmsAttestation
      .connect(verifier)
      .recordAttestation(
        sampleOpId,
        sampleWinId,
        sampleMerkleRoot,
        sampleRuleSet,
        true,
        sampleTimestamp,
        sampleProofHash
      );

    await expect(
      bwmsAttestation
        .connect(verifier)
        .recordAttestation(
          sampleOpId,
          sampleWinId,
          sampleMerkleRoot,
          sampleRuleSet,
          true,
          sampleTimestamp,
          sampleProofHash
        )
    ).to.be.revertedWith("BWMSAttestation: Duplicate attestation for operation and window");
  });

  it("5. Should reject invalid parameter inputs", async function () {
    await expect(
      bwmsAttestation.recordAttestation("", sampleWinId, sampleMerkleRoot, sampleRuleSet, true, sampleTimestamp, sampleProofHash)
    ).to.be.revertedWith("BWMSAttestation: operationId required");

    await expect(
      bwmsAttestation.recordAttestation(sampleOpId, "", sampleMerkleRoot, sampleRuleSet, true, sampleTimestamp, sampleProofHash)
    ).to.be.revertedWith("BWMSAttestation: windowId required");

    await expect(
      bwmsAttestation.recordAttestation(sampleOpId, sampleWinId, 0, sampleRuleSet, true, sampleTimestamp, sampleProofHash)
    ).to.be.revertedWith("BWMSAttestation: valid merkleRoot required");
  });
});
