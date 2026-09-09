// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title BWMSAttestation
 * @notice Stores cryptographic zero-knowledge compliance attestations for Ballast Water Management System treatment windows.
 * @dev Intentionally records NO raw telemetry on-chain. Only cryptographic commitments, verification metadata, and compliance status are stored.
 */
contract BWMSAttestation {
    struct Attestation {
        string operationId;
        string windowId;
        uint256 merkleRoot;
        string ruleSetId;
        bool compliant;
        uint256 verificationTimestamp;
        bytes32 proofHash;
        address verifier;
        uint256 blockTimestamp;
    }

    // Mapping from operationId + ":" + windowId => Attestation
    mapping(bytes32 => Attestation) private _attestations;
    // Mapping to check existence
    mapping(bytes32 => bool) private _exists;
    // Array of attestation keys for enumeration
    bytes32[] private _attestationKeys;

    address public owner;

    event AttestationRecorded(
        bytes32 indexed attestationKey,
        string operationId,
        string windowId,
        uint256 merkleRoot,
        string ruleSetId,
        bool compliant,
        uint256 verificationTimestamp,
        bytes32 proofHash,
        address indexed verifier
    );

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Helper to generate unique lookup key for an operation and window pair.
     */
    function getAttestationKey(string memory operationId, string memory windowId) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(operationId, ":", windowId));
    }

    /**
     * @notice Record a verified compliance attestation on-chain.
     * @dev Rejects duplicate attestations for the same operationId and windowId.
     */
    function recordAttestation(
        string memory operationId,
        string memory windowId,
        uint256 merkleRoot,
        string memory ruleSetId,
        bool compliant,
        uint256 verificationTimestamp,
        bytes32 proofHash
    ) external returns (bytes32 attestationKey) {
        require(bytes(operationId).length > 0, "BWMSAttestation: operationId required");
        require(bytes(windowId).length > 0, "BWMSAttestation: windowId required");
        require(merkleRoot > 0, "BWMSAttestation: valid merkleRoot required");

        attestationKey = getAttestationKey(operationId, windowId);
        require(!_exists[attestationKey], "BWMSAttestation: Duplicate attestation for operation and window");

        Attestation memory att = Attestation({
            operationId: operationId,
            windowId: windowId,
            merkleRoot: merkleRoot,
            ruleSetId: ruleSetId,
            compliant: compliant,
            verificationTimestamp: verificationTimestamp,
            proofHash: proofHash,
            verifier: msg.sender,
            blockTimestamp: block.timestamp
        });

        _attestations[attestationKey] = att;
        _exists[attestationKey] = true;
        _attestationKeys.push(attestationKey);

        emit AttestationRecorded(
            attestationKey,
            operationId,
            windowId,
            merkleRoot,
            ruleSetId,
            compliant,
            verificationTimestamp,
            proofHash,
            msg.sender
        );
    }

    /**
     * @notice Query an attestation by operationId and windowId.
     */
    function getAttestation(string memory operationId, string memory windowId)
        external
        view
        returns (Attestation memory)
    {
        bytes32 key = getAttestationKey(operationId, windowId);
        require(_exists[key], "BWMSAttestation: Attestation does not exist");
        return _attestations[key];
    }

    /**
     * @notice Check if an attestation exists for operationId and windowId.
     */
    function hasAttestation(string memory operationId, string memory windowId) external view returns (bool) {
        bytes32 key = getAttestationKey(operationId, windowId);
        return _exists[key];
    }

    /**
     * @notice Get total count of recorded attestations.
     */
    function totalAttestations() external view returns (uint256) {
        return _attestationKeys.length;
    }

    /**
     * @notice Get attestation key by index for enumeration.
     */
    function getAttestationKeyAtIndex(uint256 index) external view returns (bytes32) {
        require(index < _attestationKeys.length, "BWMSAttestation: Index out of bounds");
        return _attestationKeys[index];
    }
}
