// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IIndexFactory} from "./interfaces/IIndexFactory.sol";
import {IndexToken} from "./IndexToken.sol";

/// @title IndexFactory — permissionless issuance of in-kind index tokens
/// @notice Anyone can create an index over any ERC-20s — no allowlist, no curation, no gate. Bad or
///         non-standard components only break that one index (each index is its own contract);
///         curation is a display-layer concern (the lens/frontend), not a protocol one.
///
///         Fee model (all rates SNAPSHOTTED into each index at creation — existing indexes can
///         never be repriced):
///         • Protocol mint + redeem fee (this contract's `mintFeeBps`/`redeemFeeBps`, each capped
///           at 100 bps) → `treasury`, read live at charge time.
///         • Creator mint + redeem fee (chosen per-index at creation, each capped at 100 bps) →
///           the index creator. Creators earn 100% of their own fee — the protocol takes no cut,
///           and the protocol fee applies identically to every index.
/// @dev The owner controls only the protocol fee for *future* indexes and the treasury address.
contract IndexFactory is IIndexFactory, Ownable {
    uint16 public constant MAX_PROTOCOL_FEE_BPS = 100; // 1% hard cap per side
    uint16 public constant MAX_CREATOR_FEE_BPS = 100; // 1% hard cap per side

    /// @notice Everything a creator chooses about a new index. Creator fees are optional (0 is
    ///         valid); `description`/`imageURI` feed the token's on-chain {IndexToken-tokenURI}.
    struct IndexParams {
        string name;
        string symbol;
        address[] tokens;
        uint256[] units;
        uint16 creatorMintFeeBps;
        uint16 creatorRedeemFeeBps;
        string description;
        string imageURI;
    }

    uint16 public mintFeeBps;
    uint16 public redeemFeeBps;
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
        uint16 protocolMintFeeBps,
        uint16 protocolRedeemFeeBps,
        uint16 creatorMintFeeBps,
        uint16 creatorRedeemFeeBps
    );
    event ProtocolFeesSet(uint16 mintBps, uint16 redeemBps);
    event TreasurySet(address treasury);

    error FeeTooHigh();
    error ZeroAddress();

    constructor(address owner_, address treasury_, uint16 mintFeeBps_, uint16 redeemFeeBps_) Ownable(owner_) {
        if (treasury_ == address(0)) revert ZeroAddress();
        if (mintFeeBps_ > MAX_PROTOCOL_FEE_BPS || redeemFeeBps_ > MAX_PROTOCOL_FEE_BPS) revert FeeTooHigh();
        treasury = treasury_;
        mintFeeBps = mintFeeBps_;
        redeemFeeBps = redeemFeeBps_;
    }

    /// @notice Protocol fees for indexes created from now on (existing indexes keep their snapshot).
    function setProtocolFees(uint16 mintBps, uint16 redeemBps) external onlyOwner {
        if (mintBps > MAX_PROTOCOL_FEE_BPS || redeemBps > MAX_PROTOCOL_FEE_BPS) revert FeeTooHigh();
        mintFeeBps = mintBps;
        redeemFeeBps = redeemBps;
        emit ProtocolFeesSet(mintBps, redeemBps);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    /// @notice Create an index: `units[i]` raw units of `tokens[i]` back each 1e18 shares, forever.
    ///         `msg.sender` becomes the index's creator and receives its creator fees.
    function createIndex(IndexParams memory p) public returns (address index) {
        if (p.creatorMintFeeBps > MAX_CREATOR_FEE_BPS || p.creatorRedeemFeeBps > MAX_CREATOR_FEE_BPS) {
            revert FeeTooHigh();
        }
        index = address(
            new IndexToken(
                IndexToken.TokenParams({
                    name: p.name,
                    symbol: p.symbol,
                    tokens: p.tokens,
                    units: p.units,
                    protocolMintFeeBps: mintFeeBps,
                    protocolRedeemFeeBps: redeemFeeBps,
                    creator: msg.sender,
                    creatorMintFeeBps: p.creatorMintFeeBps,
                    creatorRedeemFeeBps: p.creatorRedeemFeeBps,
                    description: p.description,
                    imageURI: p.imageURI
                }),
                IIndexFactory(address(this))
            )
        );
        allIndexes.push(index);
        isIndex[index] = true;
        emit IndexCreated(
            index,
            msg.sender,
            p.name,
            p.symbol,
            p.tokens,
            p.units,
            mintFeeBps,
            redeemFeeBps,
            p.creatorMintFeeBps,
            p.creatorRedeemFeeBps
        );
    }

    /// @notice Convenience form: no creator fees, no metadata (both can't be added later — fee
    ///         rates and composition are immutable; only metadata display strings are updatable
    ///         via {IndexToken-setMetadata}).
    function createIndex(
        string calldata name,
        string calldata symbol,
        address[] calldata tokens,
        uint256[] calldata units
    ) external returns (address index) {
        return createIndex(
            IndexParams({
                name: name,
                symbol: symbol,
                tokens: tokens,
                units: units,
                creatorMintFeeBps: 0,
                creatorRedeemFeeBps: 0,
                description: "",
                imageURI: ""
            })
        );
    }

    function indexesCount() external view returns (uint256) {
        return allIndexes.length;
    }
}
