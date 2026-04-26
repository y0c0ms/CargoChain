// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./DIDRegistry.sol";

/// @title CarrierCredential — anchors Verifiable Credential hashes on-chain
/// @notice W3C VC Data Model v2 compatible: the full VC JSON-LD is stored off-chain
///         in the holder's wallet; only the content-hash + metadata live here.
/// @dev Concept-map nodes: Verifiable Credentials · VC Lifecycle · On-ledger/Off-ledger ·
///      Identity + Smart Contracts · Selective Disclosure (via off-chain VC).
contract CarrierCredential {
    enum Schema { LicensedCarrier, CustomsOfficer, PharmaGrade, PortOperator, InspectorAuthority }

    struct VC {
        address issuer;         // issuer's Ethereum address (resolvable DID)
        address subject;        // subject's Ethereum address
        Schema schema;
        bytes32 vcHash;         // keccak256 of the canonicalised JSON-LD VC
        uint64 notBefore;
        uint64 expiry;
        bool revoked;
    }

    DIDRegistry public immutable dids;
    address public immutable owner;                      // controls issuer allowlist
    mapping(bytes32 => VC) private _vcs;                 // vcHash ⇒ VC
    mapping(address => bytes32[]) private _byIssuer;     // index
    mapping(address => bytes32[]) private _bySubject;    // index
    mapping(Schema => mapping(address => bool)) public approvedIssuer;

    event VCIssued(
        bytes32 indexed vcHash,
        address indexed issuer,
        address indexed subject,
        Schema schema,
        uint64 notBefore,
        uint64 expiry
    );
    event VCRevoked(bytes32 indexed vcHash, address indexed issuer);
    event IssuerApproved(Schema indexed schema, address indexed issuer, bool approved);

    error IssuerNotActive();
    error IssuerNotApproved();
    error SubjectNotActive();
    error AlreadyIssued();
    error NotIssuer();
    error VCNotFound();
    error NotOwner();

    constructor(DIDRegistry _dids) {
        dids = _dids;
        owner = msg.sender;
    }

    /// @notice Owner curates the set of trusted issuers per credential schema.
    /// @dev Without this, any DID could mint itself a "LicensedCarrier" VC and bypass
    ///      every business rule. (Audit finding H-1.)
    function setApprovedIssuer(Schema schema, address issuer, bool approved) external {
        if (msg.sender != owner) revert NotOwner();
        approvedIssuer[schema][issuer] = approved;
        emit IssuerApproved(schema, issuer, approved);
    }

    function issueVC(
        address subject,
        Schema schema,
        bytes32 vcHash,
        uint64 notBefore,
        uint64 expiry
    ) external {
        if (!dids.isActive(msg.sender)) revert IssuerNotActive();
        if (!approvedIssuer[schema][msg.sender]) revert IssuerNotApproved();
        if (!dids.isActive(subject)) revert SubjectNotActive();
        if (_vcs[vcHash].issuer != address(0)) revert AlreadyIssued();

        _vcs[vcHash] = VC({
            issuer: msg.sender,
            subject: subject,
            schema: schema,
            vcHash: vcHash,
            notBefore: notBefore,
            expiry: expiry,
            revoked: false
        });
        _byIssuer[msg.sender].push(vcHash);
        _bySubject[subject].push(vcHash);

        emit VCIssued(vcHash, msg.sender, subject, schema, notBefore, expiry);
    }

    function revokeVC(bytes32 vcHash) external {
        VC storage vc = _vcs[vcHash];
        if (vc.issuer == address(0)) revert VCNotFound();
        if (vc.issuer != msg.sender) revert NotIssuer();
        vc.revoked = true;
        emit VCRevoked(vcHash, msg.sender);
    }

    function isValid(bytes32 vcHash) public view returns (bool) {
        VC storage vc = _vcs[vcHash];
        if (vc.issuer == address(0)) return false;
        if (vc.revoked) return false;
        if (block.timestamp < vc.notBefore) return false;
        if (vc.expiry != 0 && block.timestamp >= vc.expiry) return false;
        return dids.isActive(vc.issuer);
    }

    function subjectHasActiveVC(address subject, Schema schema) external view returns (bool) {
        bytes32[] storage hashes = _bySubject[subject];
        for (uint256 i = 0; i < hashes.length; i++) {
            VC storage vc = _vcs[hashes[i]];
            if (vc.schema == schema && isValid(vc.vcHash)) return true;
        }
        return false;
    }

    function get(bytes32 vcHash) external view returns (VC memory) {
        if (_vcs[vcHash].issuer == address(0)) revert VCNotFound();
        return _vcs[vcHash];
    }
}
