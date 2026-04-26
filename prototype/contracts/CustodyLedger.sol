// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ConsignmentNFT.sol";
import "./CarrierCredential.sol";
import "./DIDRegistry.sol";

/// @title CustodyLedger — tamper-evident log of custody handovers for a consignment
/// @notice Transfers require: (a) current custodian signs, (b) new custodian holds
///         a valid `LicensedCarrier` VC, (c) consignment NFT is still active.
/// @dev Concept-map nodes: Custody · Immutability · Smart Contracts ·
///      Identity + Smart Contracts · Events (audit trail) · BFT finality (via network).
contract CustodyLedger {
    ConsignmentNFT public immutable nft;
    CarrierCredential public immutable creds;
    DIDRegistry public immutable dids;

    struct Handover {
        address from;
        address to;
        uint64 timestamp;
        string locationUnLocode;     // where the handover happened
        bytes32 proofOfHandshake;    // e.g. hash of a QR-code nonce both parties signed
    }

    mapping(uint256 => Handover[]) private _history; // tokenId ⇒ handovers

    event CustodyTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        string locationUnLocode,
        bytes32 proofOfHandshake
    );

    error NotCurrentCustodian();
    error RecipientNotLicensed();
    error RecipientNotActive();

    constructor(ConsignmentNFT _nft, CarrierCredential _creds, DIDRegistry _dids) {
        nft = _nft;
        creds = _creds;
        dids = _dids;
    }

    function transferCustody(
        uint256 tokenId,
        address to,
        string calldata locationUnLocode,
        bytes32 proofOfHandshake
    ) external {
        if (nft.ownerOf(tokenId) != msg.sender) revert NotCurrentCustodian();
        if (!dids.isActive(to)) revert RecipientNotActive();
        if (!creds.subjectHasActiveVC(to, CarrierCredential.Schema.LicensedCarrier))
            revert RecipientNotLicensed();

        // Actual ownership transfer — ERC-721 handles the invariants
        nft.transferFrom(msg.sender, to, tokenId);

        _history[tokenId].push(Handover({
            from: msg.sender,
            to: to,
            timestamp: uint64(block.timestamp),
            locationUnLocode: locationUnLocode,
            proofOfHandshake: proofOfHandshake
        }));

        emit CustodyTransferred(tokenId, msg.sender, to, locationUnLocode, proofOfHandshake);
    }

    function historyOf(uint256 tokenId) external view returns (Handover[] memory) {
        return _history[tokenId];
    }

    function hopCount(uint256 tokenId) external view returns (uint256) {
        return _history[tokenId].length;
    }
}
