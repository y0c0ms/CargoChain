// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ============================================================================
// BENCHMARK ONLY — this contract is NOT part of the deployed CargoChain system
// and is never deployed by scripts/deploy.ts. It exists purely to quantify the
// gas cost of the naive "store every IoT reading on-chain" approach, so we can
// compare it against MerkleIoT (which anchors only a 32-byte Merkle root per
// batch). See test/GasBenchmark.test.ts and docs for the resulting numbers.
// ============================================================================
contract NaiveIoT {
    // Same fields MerkleIoT's leaves commit to:
    //   leaf = keccak256(abi.encodePacked(ts, tempTenthsC, gpsHash))
    // Here we keep the *full* reading in contract storage instead of a root.
    struct Reading {
        uint64  ts;           // unix seconds
        int32   tempTenthsC;  // temperature in 0.1 °C (e.g. 45 = 4.5 °C)
        bytes32 gpsHash;      // hash of the GPS fix
    }

    // tokenId => every reading ever stored for that package.
    mapping(uint256 => Reading[]) private _readings;

    event ReadingStored(uint256 indexed tokenId, uint64 ts);

    // The realistic IoT pattern: each sensor sample is its own transaction.
    // Pays the 21k tx base + full SSTORE cost on every single reading.
    function storeReading(
        uint256 tokenId,
        uint64  ts,
        int32   tempTenthsC,
        bytes32 gpsHash
    ) external {
        _readings[tokenId].push(Reading(ts, tempTenthsC, gpsHash));
        emit ReadingStored(tokenId, ts);
    }

    // Best case for the naive approach: all readings written in ONE transaction.
    // Amortizes the 21k tx base, but still pays full on-chain storage for every
    // reading — this is what eventually blows past the block gas limit.
    function storeReadings(
        uint256 tokenId,
        uint64[]  calldata ts,
        int32[]   calldata tempTenthsC,
        bytes32[] calldata gpsHash
    ) external {
        uint256 n = ts.length;
        for (uint256 i = 0; i < n; i++) {
            _readings[tokenId].push(Reading(ts[i], tempTenthsC[i], gpsHash[i]));
        }
    }

    function count(uint256 tokenId) external view returns (uint256) {
        return _readings[tokenId].length;
    }
}
