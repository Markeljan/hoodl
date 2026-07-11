// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {PoolKey} from "v4-core/src/types/PoolKey.sol";

/// @notice How a token is valued for NAV.
enum PriceSource {
    NONE, // not registered
    CHAINLINK, // stock token: value via `chainlinkFeed`
    POOL_USDG // memecoin: value via spot(token/USDG) from its v4 pool
}

/// @notice Per-token registry entry (set by the factory owner).
/// @dev Robinhood Chain reality (verified on-chain): the liquid v4 pools are token/USDG direct — WETH
///      pools are empty and stocks have no WETH pairing. So `usdgPoolKey` is the token/USDG pool used
///      for BOTH routing (USDG↔token, one hop) AND, for POOL_USDG tokens, price discovery.
///      `tokenIsCurrency0` marks whether `token` is currency0 in that pool (USDG is the other side).
struct TokenConfig {
    PriceSource source;
    address chainlinkFeed; // CHAINLINK only
    uint256 maxStaleness; // per-feed heartbeat (seconds)
    PoolKey usdgPoolKey; // token/USDG v4 pool
    bool tokenIsCurrency0; // is `token` currency0 in usdgPoolKey
}

/// @notice Protocol-wide config shared by all baskets (set by the factory owner).
struct GlobalConfig {
    address stateView; // Uniswap v4 StateView lens (spot-price reads for POOL_USDG tokens)
    address sequencerFeed; // L2 sequencer-uptime feed (0 = skip; mainnet must set)
    uint256 sequencerGracePeriod;
    address treasury; // protocol fee recipient
}

/// @notice Fee schedule for a basket. bps of 10_000. Split sums to 10_000, holderBps ≥ 5_000.
struct FeeConfig {
    uint16 entryFeeBps;
    uint16 exitFeeBps;
    uint16 holderBps; // → remaining holders (reward pool)
    uint16 creatorBps; // → basket admin
    uint16 protocolBps; // → treasury
}
