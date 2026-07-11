// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IIndexFactory} from "./interfaces/IIndexFactory.sol";
import {IndexToken} from "./IndexToken.sol";

/// @title IndexFactory — permissionless issuance of in-kind index tokens
/// @notice Anyone can create an index over any ERC-20s — no allowlist, no curation, no gate. Bad or
///         non-standard components only break that one index (each index is its own contract);
///         curation is a display-layer concern (the lens/frontend), not a protocol one.
/// @dev The protocol's single fee lives here: `mintFeeBps` (capped at 50 bps, default 10) is
///      SNAPSHOTTED into each index at creation — existing indexes can never be repriced. The owner
///      controls only the fee for *future* indexes and the treasury address that receives fees.
contract IndexFactory is IIndexFactory, Ownable {
    uint16 public constant MAX_MINT_FEE_BPS = 50; // hard cap: 0.5%

    uint16 public mintFeeBps;
    address public treasury;

    address[] public allIndexes;
    mapping(address => bool) public isIndex;

    event IndexCreated(
        address indexed index,
        address indexed creator,
        string name,
        string symbol,
        address[] tokens,
        uint256[] units,
        uint16 mintFeeBps
    );
    event MintFeeSet(uint16 bps);
    event TreasurySet(address treasury);

    error FeeTooHigh();
    error ZeroAddress();

    constructor(address owner_, address treasury_, uint16 mintFeeBps_) Ownable(owner_) {
        if (treasury_ == address(0)) revert ZeroAddress();
        if (mintFeeBps_ > MAX_MINT_FEE_BPS) revert FeeTooHigh();
        treasury = treasury_;
        mintFeeBps = mintFeeBps_;
    }

    /// @notice Fee for indexes created from now on (existing indexes keep their snapshot).
    function setMintFeeBps(uint16 bps) external onlyOwner {
        if (bps > MAX_MINT_FEE_BPS) revert FeeTooHigh();
        mintFeeBps = bps;
        emit MintFeeSet(bps);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    /// @notice Create an index: `units[i]` raw units of `tokens[i]` back each 1e18 shares, forever.
    function createIndex(
        string calldata name,
        string calldata symbol,
        address[] calldata tokens,
        uint256[] calldata units
    ) external returns (address index) {
        index = address(new IndexToken(name, symbol, tokens, units, mintFeeBps, IIndexFactory(address(this))));
        allIndexes.push(index);
        isIndex[index] = true;
        emit IndexCreated(index, msg.sender, name, symbol, tokens, units, mintFeeBps);
    }

    function indexesCount() external view returns (uint256) {
        return allIndexes.length;
    }
}
