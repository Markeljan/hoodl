// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Minimal Uniswap v4 StateView lens interface (read a pool's current price).
interface IStateView {
    function getSlot0(bytes32 poolId)
        external
        view
        returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee);
}
