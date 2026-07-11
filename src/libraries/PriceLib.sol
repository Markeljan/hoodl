// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {FullMath} from "v4-core/src/libraries/FullMath.sol";
import {FixedPoint96} from "v4-core/src/libraries/FixedPoint96.sol";
import {IAggregatorV3} from "../interfaces/IAggregatorV3.sol";

/// @title PriceLib — value token holdings in USDG (6-dec) terms
/// @notice PERIPHERY-ONLY (used by IndexLens for display + integrations; the index core needs no
///         prices at all — in-kind mint/redeem is price-free). Two sources:
///   • CHAINLINK  — stock tokens (feed already includes the ERC-8056 corporate-action multiplier).
///   • POOL_USDG  — memecoins with no feed: spot(token/USDG) straight from the v4 pool (USDG quote).
/// @dev  Decimals-agnostic: Chainlink valuation takes the token's decimals explicitly; the sqrtPrice
///       ratio is raw/raw so pool valuation needs no decimal scaling at all. Feeds carry their own
///       `decimals()` (usually 8), read dynamically.
library PriceLib {
    error BadPrice();
    error StalePrice();
    error SequencerDown();
    error GracePeriodNotOver();
    error ZeroSqrtPrice();

    uint256 internal constant USDG_DECIMALS = 6;

    /// @notice Read a Chainlink feed, reverting on non-positive or stale answers.
    /// @param maxStaleness max seconds since `updatedAt` (per-feed heartbeat; stock feeds are 24/5 so
    ///        this must be generous enough to span market-closed periods for stock baskets).
    function readFeed(address feed, uint256 maxStaleness) internal view returns (uint256 price, uint8 feedDecimals) {
        (, int256 answer,, uint256 updatedAt,) = IAggregatorV3(feed).latestRoundData();
        if (answer <= 0) revert BadPrice();
        if (updatedAt == 0 || block.timestamp - updatedAt > maxStaleness) revert StalePrice();
        price = uint256(answer);
        feedDecimals = IAggregatorV3(feed).decimals();
    }

    /// @notice Chainlink L2 sequencer-uptime guard (Arbitrum pattern). No-op if `sequencerFeed==0`
    ///         (testnet convenience — mainnet MUST set it).
    function checkSequencer(address sequencerFeed, uint256 gracePeriod) internal view {
        if (sequencerFeed == address(0)) return;
        (, int256 answer, uint256 startedAt,,) = IAggregatorV3(sequencerFeed).latestRoundData();
        if (answer != 0) revert SequencerDown(); // 0 = up, 1 = down
        if (block.timestamp - startedAt <= gracePeriod) revert GracePeriodNotOver();
    }

    /// @notice Value a raw token balance at `price` (feed-native decimals) in USDG (6-dec).
    /// @dev value = rawBalance · price · 10^USDG / (10^token · 10^feed). Since token+feed−USDG ≥ 0
    ///      for real feeds (8-dec), fold into one divisor and use mulDiv for a 512-bit-safe product.
    function valueUsdg(uint256 rawBalance, uint256 price, uint8 feedDecimals, uint8 tokenDecimals)
        internal
        pure
        returns (uint256)
    {
        uint256 divisor = 10 ** (uint256(tokenDecimals) + feedDecimals - USDG_DECIMALS);
        return FullMath.mulDiv(rawBalance, price, divisor);
    }

    /// @notice Value a raw 18-dec token balance in USDG (6-dec) from its token/USDG pool spot price.
    /// @dev The sqrtPrice ratio is raw-currency1 per raw-currency0, so multiplying a raw token balance
    ///      by (USDG-raw per token-raw) yields USDG raw directly — the 18-vs-6 decimal gap is baked in.
    /// @param tokenIsCurrency0 true if `token` is currency0 (USDG is currency1) in the pool.
    function poolValueUsdg(uint256 rawBalance, uint160 sqrtPriceX96, bool tokenIsCurrency0)
        internal
        pure
        returns (uint256)
    {
        if (sqrtPriceX96 == 0) revert ZeroSqrtPrice();
        // priceX96 = (currency1 / currency0) in Q96, raw units.
        uint256 priceX96 = FullMath.mulDiv(sqrtPriceX96, sqrtPriceX96, FixedPoint96.Q96);
        if (tokenIsCurrency0) {
            // token=currency0, USDG=currency1 ⇒ USDG-raw per token-raw = priceX96 / Q96
            return FullMath.mulDiv(rawBalance, priceX96, FixedPoint96.Q96);
        } else {
            // token=currency1, USDG=currency0 ⇒ USDG-raw per token-raw = Q96 / priceX96
            if (priceX96 == 0) revert ZeroSqrtPrice();
            return FullMath.mulDiv(rawBalance, FixedPoint96.Q96, priceX96);
        }
    }
}
