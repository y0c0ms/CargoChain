// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IZKVerifier — interface matching the snarkjs-generated Groth16 verifier
/// @notice Replace with auto-generated `ZKVerifier.sol` from
///         `snarkjs zkey export solidityverifier`. The interface is intentionally
///         narrow so `FreightEscrow` can depend on it before the circuit is done.
/// @dev Concept-map nodes: ZKP · zk-SNARKs · Non-interactive · Groth16 verification.
interface IZKVerifier {
    function verifyProof(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[] calldata input
    ) external view returns (bool);
}
