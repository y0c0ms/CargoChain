// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Package.sol";

// Spawns one Package contract per shipment via EIP-1167 minimal proxies.
// Replaces the single-mapping registry pattern with address-level isolation.
contract PackageFactory {
    // The Package logic contract that every clone delegatecalls into.
    address public immutable implementation;

    // Incrementing id used by the frontend / other contracts to refer to a package.
    uint256 public nextId = 1;
    // id -> clone address.
    mapping(uint256 => address) public packageOf;
    // Reverse lookup so a contract can check "is this address really one of ours?".
    mapping(address => uint256) public idOf;

    event PackageCreated(
        uint256 indexed id,
        address indexed package,
        address indexed shipper,
        bytes32 docsHash,
        string  docsURI
    );

    error NotAFactoryPackage();

    // Deploy the implementation once; clones will delegate to it.
    constructor() {
        implementation = address(new Package());
    }

    // Deploy a new Package clone for the caller and register it.
    function create(
        bytes32 docsHash,
        string calldata docsURI
    ) external returns (uint256 id, address pkg) {
        id  = nextId++;
        // EIP-1167: ~45k gas; emits the minimal proxy bytecode pointing at `implementation`.
        pkg = Clones.clone(implementation);
        // Atomic: clone + initialize in the same tx so the clone can't be hijacked.
        Package(pkg).initialize(address(this), msg.sender, docsHash, docsURI);

        packageOf[id] = pkg;
        idOf[pkg]     = id;

        emit PackageCreated(id, pkg, msg.sender, docsHash, docsURI);
    }

    // Used by downstream contracts (Escrow, MerkleIoT) to refuse forged addresses.
    function requirePackage(uint256 id) external view returns (address) {
        address pkg = packageOf[id];
        if (pkg == address(0)) revert NotAFactoryPackage();
        return pkg;
    }
}
