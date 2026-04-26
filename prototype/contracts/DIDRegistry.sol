// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DIDRegistry — anchors DID Documents on-chain (W3C DID Core v1)
/// @notice Implements the `did:ethr`-like pattern: a DID is derived from an Ethereum
///         address; its DID Document (JSON-LD) hash is stored here. The full JSON-LD
///         lives off-chain (e.g. IPFS) and is fetched by resolvers.
/// @dev Concept-map nodes exercised: DID · DID Document · DID Architecture ·
///      Verifiable Data Registry · Verification Methods · Decentralization.
contract DIDRegistry {
    struct DIDEntry {
        bytes32 documentHash;   // keccak256 of the JSON-LD DID Document
        string documentURI;     // ipfs://... or https://... for retrieval
        uint64 createdAt;
        uint64 updatedAt;
        bool revoked;
    }

    mapping(address => DIDEntry) private _entries;

    event DIDRegistered(address indexed subject, bytes32 documentHash, string documentURI);
    event DIDUpdated(address indexed subject, bytes32 documentHash, string documentURI);
    event DIDRevoked(address indexed subject);

    error NotRegistered();
    error AlreadyRegistered();
    error Revoked();

    function register(bytes32 documentHash, string calldata documentURI) external {
        if (_entries[msg.sender].createdAt != 0) revert AlreadyRegistered();
        _entries[msg.sender] = DIDEntry({
            documentHash: documentHash,
            documentURI: documentURI,
            createdAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp),
            revoked: false
        });
        emit DIDRegistered(msg.sender, documentHash, documentURI);
    }

    function updateDocument(bytes32 documentHash, string calldata documentURI) external {
        DIDEntry storage e = _entries[msg.sender];
        if (e.createdAt == 0) revert NotRegistered();
        if (e.revoked) revert Revoked();
        e.documentHash = documentHash;
        e.documentURI = documentURI;
        e.updatedAt = uint64(block.timestamp);
        emit DIDUpdated(msg.sender, documentHash, documentURI);
    }

    function revoke() external {
        DIDEntry storage e = _entries[msg.sender];
        if (e.createdAt == 0) revert NotRegistered();
        e.revoked = true;
        emit DIDRevoked(msg.sender);
    }

    function resolve(address subject) external view returns (DIDEntry memory) {
        if (_entries[subject].createdAt == 0) revert NotRegistered();
        return _entries[subject];
    }

    function isActive(address subject) external view returns (bool) {
        DIDEntry storage e = _entries[subject];
        return e.createdAt != 0 && !e.revoked;
    }
}
