// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ConsignmentRegistry — single contract for consignment identity + custody
/// @notice Registers each container/consignment as a unique on-chain entity and
///         tracks every custody handover. Stores only **state and hashes**;
///         the full cargo manifest (HBL, route, commodity, temp bounds) lives
///         off-chain at `manifestURI` and is committed here as a keccak256.
///
/// @dev Why this isn't an ERC-721:
///      ERC-721 has `transferFrom`/`approve` semantics designed for token
///      ownership. Physical custody handover is different — every transfer
///      needs business-rule checks that don't fit the standard interface.
///      A plain registry is simpler and cheaper.
///
///      Why custody is in the same contract as the registry:
///      Consignment identity and custody are the same domain concept — every
///      consignment has exactly one current custodian, and a transfer always
///      mutates both the registry entry and the history log.
///
///      Concept-map nodes: Smart Contract · Custody · Immutability ·
///      Events (audit trail) · Hash · Data Integrity · State Machine.
contract ConsignmentRegistry {
    // ─────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────

    enum Status { Created, InTransit, Delivered, Disputed }

    struct Consignment {
        address shipper;            // who created it (immutable)
        address currentCustodian;   // who has it now
        Status  status;
        bytes32 manifestHash;       // keccak256 of off-chain JSON manifest
        string  manifestURI;        // ipfs:// or https:// to fetch the JSON
        uint64  createdAt;
    }

    struct Handover {
        address from;
        address to;
        uint64  timestamp;
        string  locationUnLocode;   // UN/LOCODE, e.g. "PTLIS"
        bytes32 proofOfHandshake;   // hash of QR-code / nonce both parties signed
    }

    // ─────────────────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────────────────

    uint256 public nextId = 1;
    mapping(uint256 => Consignment) public consignments;
    mapping(uint256 => Handover[])  private _history;

    // ─────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────

    event ConsignmentCreated(
        uint256 indexed id,
        address indexed shipper,
        bytes32 manifestHash,
        string  manifestURI
    );
    event CustodyTransferred(
        uint256 indexed id,
        address indexed from,
        address indexed to,
        string  locationUnLocode,
        bytes32 proofOfHandshake
    );
    event StatusChanged(uint256 indexed id, Status status);

    // ─────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────

    error UnknownConsignment();
    error NotCurrentCustodian();
    error AlreadyDelivered();

    // ─────────────────────────────────────────────────────────────────────
    // Mutating functions
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Create a new consignment. Anyone can ship — no allowlist.
    ///         The consignment's first custodian is the shipper themselves.
    /// @param manifestHash  keccak256 of the JSON document at `manifestURI`.
    /// @param manifestURI   IPFS or HTTPS URI of the off-chain manifest JSON.
    function createConsignment(
        bytes32 manifestHash,
        string  calldata manifestURI
    ) external returns (uint256 id) {
        id = nextId++;
        consignments[id] = Consignment({
            shipper:           msg.sender,
            currentCustodian:  msg.sender,
            status:            Status.Created,
            manifestHash:      manifestHash,
            manifestURI:       manifestURI,
            createdAt:         uint64(block.timestamp)
        });
        emit ConsignmentCreated(id, msg.sender, manifestHash, manifestURI);
    }

    /// @notice Transfer custody to a new party.
    ///         Only the current custodian can call this.
    ///
    /// NOTE: In a production deployment, `to` would be validated against a
    ///       DID Registry and required to hold a LicensedCarrier Verifiable
    ///       Credential issued by a trusted authority (e.g. IATA).
    ///       Omitted from this prototype to keep the scope focused on core
    ///       consignment tracking logic.
    ///
    /// @dev Status auto-advances Created -> InTransit on the first transfer.
    function transferCustody(
        uint256 id,
        address to,
        string  calldata locationUnLocode,
        bytes32 proofOfHandshake
    ) external {
        Consignment storage c = consignments[id];
        if (c.shipper == address(0)) revert UnknownConsignment();
        if (c.currentCustodian != msg.sender) revert NotCurrentCustodian();
        if (c.status == Status.Delivered) revert AlreadyDelivered();

        address from = c.currentCustodian;
        c.currentCustodian = to;
        if (c.status == Status.Created) {
            c.status = Status.InTransit;
            emit StatusChanged(id, Status.InTransit);
        }

        _history[id].push(Handover({
            from:              from,
            to:                to,
            timestamp:         uint64(block.timestamp),
            locationUnLocode:  locationUnLocode,
            proofOfHandshake:  proofOfHandshake
        }));

        emit CustodyTransferred(id, from, to, locationUnLocode, proofOfHandshake);
    }

    /// @notice Mark the consignment as delivered. Only the current custodian
    ///         can call this — they're the receiver attesting the cargo arrived.
    function markDelivered(uint256 id) external {
        Consignment storage c = consignments[id];
        if (c.shipper == address(0)) revert UnknownConsignment();
        if (c.currentCustodian != msg.sender) revert NotCurrentCustodian();
        if (c.status == Status.Delivered) revert AlreadyDelivered();
        c.status = Status.Delivered;
        emit StatusChanged(id, Status.Delivered);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Read-only helpers
    // ─────────────────────────────────────────────────────────────────────

    function historyOf(uint256 id) external view returns (Handover[] memory) {
        return _history[id];
    }

    function hopCount(uint256 id) external view returns (uint256) {
        return _history[id].length;
    }

    /// @notice Returns the address holding custody now.
    function custodianOf(uint256 id) external view returns (address) {
        return consignments[id].currentCustodian;
    }
}
