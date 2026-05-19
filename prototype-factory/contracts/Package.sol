// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

// One contract per package. Spawned as an EIP-1167 clone by PackageFactory.
contract Package is Initializable {
    enum Status { Created, InTransit, Delivered, Disputed }

    struct Handover {
        address from;
        address to;
        uint64  timestamp;
        // UN/LOCODE of the handover spot, e.g. "PTLIS" for Lisbon.
        string  locationUnLocode;
        // keccak256 of the QR/nonce both parties signed at handoff.
        bytes32 proofOfHandshake;
    }

    // The Address of the factory that created this clone it is set once in initialize().
    address public factory;
    // The original shipper should never changes after init.
    address public shipper;
    // Whoever has custody right now updated on every transferCustody().
    address public currentHolder;
    Status  public status;
    // keccak256 of the off-chain JSON describing the cargo.
    bytes32 public docsHash;
    // ipfs:// or https:// pointer to that JSON.
    string  public docsURI;
    uint64  public createdAt;

    Handover[] private _history;

    event PackageInitialized(address indexed shipper, bytes32 docsHash, string docsURI);
    event CustodyTransferred(
        address indexed from,
        address indexed to,
        string  locationUnLocode,
        bytes32 proofOfHandshake
    );
    event StatusChanged(Status status);

    error NotCurrentHolder();
    error AlreadyDelivered();
    error InvalidRecipient();

    // Lock the implementation so nobody can call initialize() on it directly.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // Called once by the factory right after Clones.clone(). The `initializer`modifier reverts with InvalidInitialization() on any second call.
    function initialize(
        address _factory,
        address _shipper,
        bytes32 _docsHash,
        string calldata _docsURI
    ) external initializer {
        factory       = _factory;
        shipper       = _shipper;
        currentHolder = _shipper;
        status        = Status.Created;
        docsHash      = _docsHash;
        docsURI       = _docsURI;
        createdAt     = uint64(block.timestamp);
        emit PackageInitialized(_shipper, _docsHash, _docsURI);
    }

    // Hand off custody. Only the current holder of this package can call.
    function transferCustody(
        address to,
        string  calldata locationUnLocode,
        bytes32 proofOfHandshake
    ) external {
        if (msg.sender != currentHolder) revert NotCurrentHolder();
        if (status == Status.Delivered)  revert AlreadyDelivered();
        // Reject burns: address(0) would lock the package forever.
        if (to == address(0))            revert InvalidRecipient();

        address from = currentHolder;
        currentHolder = to;

        // First transfer flips the status; later transfers just append history.
        if (status == Status.Created) {
            status = Status.InTransit;
            emit StatusChanged(Status.InTransit);
        }

        _history.push(Handover({
            from:             from,
            to:               to,
            timestamp:        uint64(block.timestamp),
            locationUnLocode: locationUnLocode,
            proofOfHandshake: proofOfHandshake
        }));

        emit CustodyTransferred(from, to, locationUnLocode, proofOfHandshake);
    }

    // Receiver confirms arrival. Locks the package — no more transfers after this.
    function markDelivered() external {
        if (msg.sender != currentHolder) revert NotCurrentHolder();
        if (status == Status.Delivered)  revert AlreadyDelivered();
        status = Status.Delivered;
        emit StatusChanged(Status.Delivered);
    }

    function historyOf() external view returns (Handover[] memory) {
        return _history;
    }

    function hopCount() external view returns (uint256) {
        return _history.length;
    }
}
