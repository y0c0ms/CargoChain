// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

// Anchors batches of off-chain IoT readings as Merkle roots. Saves ~99% of gas
// vs writing every reading on-chain; readings are proved later via a Merkle path.
contract MerkleIoT is Ownable2Step {
    struct Batch {
        uint256 tokenId;
        bytes32 merkleRoot;
        uint32  readingCount;
        uint64  firstTs;
        uint64  lastTs;
        // Which approved oracle submitted this batch (forensic trail).
        address submitter;
    }

    uint256 public nextBatchId = 1;
    mapping(uint256 => Batch) public batches;
    // Index of batches for each package, so we can list them later.
    mapping(uint256 => uint256[]) private _batchesByToken;
    // Allowlist of oracles that can call anchorBatch().
    mapping(address => bool) public approvedOracle;

    event BatchAnchored(
        uint256 indexed batchId,
        uint256 indexed tokenId,
        bytes32 merkleRoot,
        uint32 readingCount,
        uint64 firstTs,
        uint64 lastTs
    );
    event OracleApproved(address indexed oracle, bool approved);

    error NotOracle();

    // Ownable(msg.sender): deployer is the initial owner; ownership changes need
    // an explicit acceptOwnership() call from the new owner (Ownable2Step).
    constructor() Ownable(msg.sender) {}

    // Owner-gated allowlist. Without this, anyone could spam fake readings.
    function setApprovedOracle(address oracle, bool approved) external onlyOwner {
        approvedOracle[oracle] = approved;
        emit OracleApproved(oracle, approved);
    }

    // Called by approved oracles once per N readings (e.g. every 8 samples).
    function anchorBatch(
        uint256 tokenId,
        bytes32 merkleRoot,
        uint32 readingCount,
        uint64 firstTs,
        uint64 lastTs
    ) external returns (uint256 batchId) {
        if (!approvedOracle[msg.sender]) revert NotOracle();
        batchId = nextBatchId++;
        batches[batchId] = Batch(tokenId, merkleRoot, readingCount, firstTs, lastTs, msg.sender);
        _batchesByToken[tokenId].push(batchId);
        emit BatchAnchored(batchId, tokenId, merkleRoot, readingCount, firstTs, lastTs);
    }

    // Read helper: returns the anchored root + tokenId for a batch (auditors/UI).
    function rootOf(uint256 batchId) external view returns (bytes32, uint256) {
        Batch storage b = batches[batchId];
        return (b.merkleRoot, b.tokenId);
    }

    // Delegates to OZ MerkleProof — sorted-pair convention, audited.
    // leaf = keccak256(abi.encodePacked(ts, tempTenthsC, gpsHash))
    function verifyReading(
        uint256 batchId,
        bytes32 leaf,
        bytes32[] calldata proof
    ) external view returns (bool) {
        bytes32 root = batches[batchId].merkleRoot;
        if (root == bytes32(0)) return false;
        return MerkleProof.verifyCalldata(proof, root, leaf);
    }

    function batchesOf(uint256 tokenId) external view returns (uint256[] memory) {
        return _batchesByToken[tokenId];
    }
}
