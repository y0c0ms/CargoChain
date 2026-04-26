// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IZKVerifier.sol";

/// @title MockZKVerifier — stand-in until the real Groth16 verifier is generated
/// @notice Accepts any proof whose public input array starts with a non-zero
///         `merkleRoot`. Replace with the auto-generated ZKVerifier.sol produced
///         by `snarkjs zkey export solidityverifier` before final demo.
contract MockZKVerifier is IZKVerifier {
    function verifyProof(
        uint[2] calldata,
        uint[2][2] calldata,
        uint[2] calldata,
        uint[] calldata input
    ) external pure override returns (bool) {
        return input.length >= 3 && input[2] != 0;
    }
}
