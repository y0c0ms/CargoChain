// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ConsignmentNFT — one ERC-721 token = one physical container/consignment
/// @notice Tokenises cargo for cross-carrier custody & provenance. Metadata URI
///         (IPFS) encodes HBL, weight, route, commodity class, allowed temp range.
/// @dev Concept-map nodes: NFT · ERC-721 · Token Standards · Tokenisation · Smart Contract.
contract ConsignmentNFT is ERC721URIStorage, Ownable {
    uint256 private _nextId;

    struct Manifest {
        string hbl;             // House Bill of Lading reference
        string originCode;      // UN/LOCODE origin (e.g. PTLIS)
        string destCode;        // UN/LOCODE destination (e.g. AOLAD)
        uint32 weightKg;
        string commodity;       // e.g. "PHARMACEUTICAL_VACCINE_CLASS_2"
        int16 tempMinTenthsC;   // e.g. 20 = 2.0 °C
        int16 tempMaxTenthsC;   // e.g. 80 = 8.0 °C
        uint64 mintedAt;
    }

    mapping(uint256 => Manifest) public manifests;

    event ConsignmentMinted(
        uint256 indexed tokenId,
        address indexed shipper,
        string hbl,
        string originCode,
        string destCode
    );

    constructor() ERC721("Cargo Consignment", "CCON") Ownable(msg.sender) {}

    function mint(
        address shipper,
        string calldata metadataURI,
        Manifest calldata m
    ) external onlyOwner returns (uint256 tokenId) {
        tokenId = ++_nextId;
        _safeMint(shipper, tokenId);
        _setTokenURI(tokenId, metadataURI);
        Manifest memory saved = m;
        saved.mintedAt = uint64(block.timestamp);
        manifests[tokenId] = saved;
        emit ConsignmentMinted(tokenId, shipper, m.hbl, m.originCode, m.destCode);
    }

    function getManifest(uint256 tokenId) external view returns (Manifest memory) {
        _requireOwned(tokenId);
        return manifests[tokenId];
    }
}
