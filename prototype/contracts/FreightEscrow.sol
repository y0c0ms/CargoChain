// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./IZKVerifier.sol";
import "./MerkleIoT.sol";

/// @title FreightEscrow — ERC-20 payment locked to a consignment; released on
///        (a) delivery (NFT now owned by receiverDID) AND
///        (b) ZK proof of cold-chain compliance accepted by the verifier.
/// @dev Concept-map nodes: Smart Contract Escrow · ERC-20 · Atomic Settlement ·
///      ZKP · Selective Disclosure · Privacy-preserving Compliance.
contract FreightEscrow {
    using SafeERC20 for IERC20;

    IERC20  public immutable freightToken; // e.g. stable-coin or custom "FRT"
    IERC721 public immutable consignment;  // the NFT contract
    IZKVerifier public immutable zkVerifier;
    MerkleIoT  public immutable merkleIoT;

    struct Escrow {
        address shipper;
        address carrier;
        address receiver;
        uint256 amount;
        uint256 tokenId;
        bool released;
        bool refunded;
    }

    mapping(uint256 => Escrow) public escrows; // tokenId ⇒ escrow

    event EscrowFunded(uint256 indexed tokenId, address indexed shipper, uint256 amount);
    event EscrowReleased(uint256 indexed tokenId, address indexed carrier, uint256 amount);
    event EscrowRefunded(uint256 indexed tokenId, address indexed shipper);

    error AlreadyFunded();
    error NotFunded();
    error AlreadySettled();
    error NotReceiverYet();
    error ZKProofInvalid();
    error BatchNotForThisShipment();
    error ProofNotBoundToBatch();
    error CarrierAlreadyHasCustody();

    constructor(IERC20 _token, IERC721 _consignment, IZKVerifier _zk, MerkleIoT _merkle) {
        freightToken = _token;
        consignment = _consignment;
        zkVerifier = _zk;
        merkleIoT = _merkle;
    }

    function fund(
        uint256 tokenId,
        address carrier,
        address receiver,
        uint256 amount
    ) external {
        if (escrows[tokenId].amount != 0) revert AlreadyFunded();
        escrows[tokenId] = Escrow({
            shipper: msg.sender,
            carrier: carrier,
            receiver: receiver,
            amount: amount,
            tokenId: tokenId,
            released: false,
            refunded: false
        });
        freightToken.safeTransferFrom(msg.sender, address(this), amount);
        emit EscrowFunded(tokenId, msg.sender, amount);
    }

    /// @notice Release payment on valid cold-chain ZK-proof + delivery.
    /// @param tokenId   the consignment NFT id
    /// @param batchId   the MerkleIoT batch the proof was generated against
    /// @param a,b,c     Groth16 proof points
    /// @param publicIn  public inputs: [lowerBound, upperBound, merkleRootAsUint, ...]
    /// @dev The proof MUST be bound to the (tokenId, batchId) pair. Without
    ///      that binding (audit finding H-3), an attacker could replay an old
    ///      valid proof against a different shipment.
    function releaseWithProof(
        uint256 tokenId,
        uint256 batchId,
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[] calldata publicIn
    ) external {
        Escrow storage e = escrows[tokenId];
        if (e.amount == 0) revert NotFunded();
        if (e.released || e.refunded) revert AlreadySettled();
        if (consignment.ownerOf(tokenId) != e.receiver) revert NotReceiverYet();

        // bind proof to this shipment's batch
        (bytes32 batchRoot, uint256 batchToken) = merkleIoT.rootOf(batchId);
        if (batchToken != tokenId) revert BatchNotForThisShipment();
        if (publicIn.length < 3 || publicIn[2] != uint256(batchRoot))
            revert ProofNotBoundToBatch();

        if (!zkVerifier.verifyProof(a, b, c, publicIn)) revert ZKProofInvalid();

        e.released = true;
        freightToken.safeTransfer(e.carrier, e.amount);
        emit EscrowReleased(tokenId, e.carrier, e.amount);
    }

    /// @notice Refund the shipper. Only valid while the shipper still owns the
    ///         NFT — i.e. before any carrier has taken custody. Otherwise a
    ///         shipper could rug-pull the carrier mid-shipment. (Audit finding M-2.)
    function refund(uint256 tokenId) external {
        Escrow storage e = escrows[tokenId];
        if (e.amount == 0) revert NotFunded();
        if (e.released || e.refunded) revert AlreadySettled();
        require(msg.sender == e.shipper, "only shipper can refund");
        if (consignment.ownerOf(tokenId) != e.shipper) revert CarrierAlreadyHasCustody();
        e.refunded = true;
        freightToken.safeTransfer(e.shipper, e.amount);
        emit EscrowRefunded(tokenId, e.shipper);
    }
}
