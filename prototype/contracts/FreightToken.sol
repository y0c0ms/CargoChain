// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title FreightToken (FRT) — ERC-20 stable-coin stand-in for escrow payments.
/// @dev Concept-map nodes: ERC-20 · Token Standards · Tokenisation.
contract FreightToken is ERC20, Ownable {
    constructor() ERC20("Freight Token", "FRT") Ownable(msg.sender) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
