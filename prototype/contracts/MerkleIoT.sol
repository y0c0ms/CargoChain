// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MerkleIoT — on-chain anchor for batches of off-chain IoT sensor readings
/// @notice Each batch commits a Merkle root; anyone can later submit a reading +
///         proof path to demonstrate it was part of the batch. Saves ~99 % of gas
///         compared with writing every reading on-chain.
/// @dev Concept-map nodes: Merkle Tree · Hash Function · Oracle · Scaling (batching) ·
///      Data Integrity.
contract MerkleIoT {
    struct Batch {
        uint256 tokenId;
        bytes32 merkleRoot;
        uint32  readingCount;
        uint64  firstTs;
        uint64  lastTs;
        address submitter;
    }

    uint256 public nextBatchId = 1;
    address public immutable owner;
    mapping(uint256 => Batch) public batches;
    mapping(uint256 => uint256[]) private _batchesByToken;
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
    error NotOwner();

    constructor() {
        owner = msg.sender;
    }

    /// @notice Restrict who can anchor IoT batches. Without this, anyone could
    ///         spam fake readings against any consignment. (Audit finding H-2.)
    function setApprovedOracle(address oracle, bool approved) external {
        if (msg.sender != owner) revert NotOwner();
        approvedOracle[oracle] = approved;
        emit OracleApproved(oracle, approved);
    }

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

    /// @notice Read-only helper used by FreightEscrow to bind a ZK proof to a
    ///         specific batch. Returns (root, tokenId).
    function rootOf(uint256 batchId) external view returns (bytes32, uint256) {
        Batch storage b = batches[batchId];
        return (b.merkleRoot, b.tokenId);
    }

    /// @notice Verify that `leaf` is part of the batch whose root is stored.
    /// @dev leaf = keccak256(abi.encodePacked(ts, tempTenthsC, gpsHash))
    function verifyReading(
        uint256 batchId,
        bytes32 leaf,
        bytes32[] calldata proof
    ) external view returns (bool) {
        bytes32 root = batches[batchId].merkleRoot;
        if (root == bytes32(0)) return false;

        bytes32 computed = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 sibling = proof[i];
            computed = computed < sibling
                ? keccak256(abi.encodePacked(computed, sibling))
                : keccak256(abi.encodePacked(sibling, computed));
        }
        return computed == root;
    }

    function batchesOf(uint256 tokenId) external view returns (uint256[] memory) {
        return _batchesByToken[tokenId];
    }
}
