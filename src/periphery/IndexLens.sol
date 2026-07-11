// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IStateView} from "../interfaces/IStateView.sol";
import {IIndexToken} from "../interfaces/IIndexToken.sol";
import {PriceLib} from "../libraries/PriceLib.sol";

/// @title IndexLens — onchain NAV for index tokens, in USDG (6-dec)
/// @notice PERIPHERY. Indexes mint/redeem without any price; this lens exists so wallets, frontends,
///         and integrators (lending markets pricing index collateral) can read a verifiable NAV
///         onchain: Chainlink for stock tokens, token/USDG v4 pool spot for pool-quoted tokens.
/// @dev Owner-curated price configs are a display-layer concern — they have zero effect on custody,
///      minting, or redemption. Pool-spot values are manipulable within a block; integrators gating
///      value transfer on this lens should add their own TWAP/deviation guards.
contract IndexLens is Ownable {
    using PoolIdLibrary for PoolKey;

    enum Source {
        NONE,
        CHAINLINK, // stock tokens: per-asset USD feed
        POOL_USDG // pool-quoted tokens: spot from their token/USDG v4 pool
    }

    struct PriceConfig {
        Source source;
        address feed; // CHAINLINK only
        uint256 maxStaleness; // CHAINLINK only (seconds; stock feeds are 24/5 — span weekends)
        PoolKey poolKey; // POOL_USDG only: the token/USDG pool
        bool tokenIsCurrency0; // is the token currency0 in poolKey
    }

    IStateView public immutable stateView;
    address public immutable usdg;
    address public sequencerFeed; // optional L2 sequencer-uptime feed (0 = skip)
    uint256 public sequencerGracePeriod;

    mapping(address => PriceConfig) internal _configs;

    event ConfigSet(address indexed token, Source source);
    event SequencerSet(address feed, uint256 gracePeriod);

    error NotConfigured(address token);
    error BadConfig();

    constructor(address stateView_, address usdg_, address owner_) Ownable(owner_) {
        stateView = IStateView(stateView_);
        usdg = usdg_;
    }

    // ─────────────────────────────── config ───────────────────────────────

    function setConfig(address token, PriceConfig calldata cfg) external onlyOwner {
        if (cfg.source == Source.NONE) revert BadConfig();
        if (cfg.source == Source.CHAINLINK) {
            if (cfg.feed == address(0)) revert BadConfig();
        } else {
            // poolKey must be the token/USDG pool, consistent with tokenIsCurrency0
            address c0 = Currency.unwrap(cfg.poolKey.currency0);
            address c1 = Currency.unwrap(cfg.poolKey.currency1);
            if (cfg.tokenIsCurrency0) {
                if (c0 != token || c1 != usdg) revert BadConfig();
            } else {
                if (c0 != usdg || c1 != token) revert BadConfig();
            }
        }
        _configs[token] = cfg;
        emit ConfigSet(token, cfg.source);
    }

    function setSequencer(address feed, uint256 gracePeriod) external onlyOwner {
        sequencerFeed = feed;
        sequencerGracePeriod = gracePeriod;
        emit SequencerSet(feed, gracePeriod);
    }

    function configOf(address token) external view returns (PriceConfig memory) {
        return _configs[token];
    }

    // ─────────────────────────────── valuation ───────────────────────────────

    /// @notice Value `amount` raw units of `token` in USDG (6-dec).
    function valueOf(address token, uint256 amount) public view returns (uint256) {
        if (token == usdg) return amount; // USDG is the quote unit (a cash leg values 1:1)
        PriceConfig memory cfg = _configs[token];
        if (cfg.source == Source.NONE) revert NotConfigured(token);
        PriceLib.checkSequencer(sequencerFeed, sequencerGracePeriod);
        if (cfg.source == Source.CHAINLINK) {
            (uint256 price, uint8 feedDec) = PriceLib.readFeed(cfg.feed, cfg.maxStaleness);
            return PriceLib.valueUsdg(amount, price, feedDec, IERC20Metadata(token).decimals());
        } else {
            (uint160 sqrtPriceX96,,,) = stateView.getSlot0(PoolId.unwrap(cfg.poolKey.toId()));
            return PriceLib.poolValueUsdg(amount, sqrtPriceX96, cfg.tokenIsCurrency0);
        }
    }

    /// @notice NAV of one whole share (1e18) of `index`, in USDG (6-dec).
    function navPerShare(address index) public view returns (uint256 nav) {
        (address[] memory tokens, uint256[] memory units) = IIndexToken(index).components();
        for (uint256 i; i < tokens.length; ++i) {
            nav += valueOf(tokens[i], units[i]);
        }
    }

    /// @notice NAV of `shares` of `index`, in USDG (6-dec).
    function navOf(address index, uint256 shares) external view returns (uint256) {
        return Math.mulDiv(navPerShare(index), shares, 1e18);
    }
}
