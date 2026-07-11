// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Settable stand-in for Uniswap v4's StateView lens (getSlot0 only).
contract MockStateView {
    mapping(bytes32 => uint160) public sqrtPrice;

    function setSlot0(bytes32 poolId, uint160 sqrtPriceX96) external {
        sqrtPrice[poolId] = sqrtPriceX96;
    }

    function getSlot0(bytes32 poolId) external view returns (uint160, int24, uint24, uint24) {
        return (sqrtPrice[poolId], int24(0), uint24(0), uint24(0));
    }
}
