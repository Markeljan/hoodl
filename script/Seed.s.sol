// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {LiquidityAmounts} from "v4-periphery/src/libraries/LiquidityAmounts.sol";
import {Actions} from "v4-periphery/src/libraries/Actions.sol";
import {IndexToken} from "../src/IndexToken.sol";
import {IndexLens} from "../src/periphery/IndexLens.sol";
import {RHChain} from "../src/libraries/RHChain.sol";

interface IPositionManagerMinimal {
    function initializePool(PoolKey calldata key, uint160 sqrtPriceX96) external payable returns (int24);
    function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable;
}

interface IPermit2Minimal {
    function approve(address token, address spender, uint160 amount, uint48 expiration) external;
}

/// @title Seed — mint index supply and bootstrap the index/USDG Uniswap v4 pool
/// @notice Run AFTER Deploy.s.sol, from a wallet that already holds the index components (testnet:
///         faucet tokens; mainnet: a non-US holder per Reg S) plus USDG for the LP side.
///         Steps: (1) mint MINT_SHARES in-kind → (2) initialize the index/USDG v4 pool at the lens
///         NAV → (3) add full-range liquidity (LP_SHARES + NAV-equivalent USDG) via PositionManager.
///         After this, retail buys the index with plain USDG on the DEX, and open mint/redeem
///         arbitrage keeps that price pinned to NAV.
///
/// Env: PRIVATE_KEY, INDEX, LENS, [MINT_SHARES=100e18], [LP_SHARES=50e18]
/// Run: forge script script/Seed.s.sol --rpc-url rh_mainnet --broadcast
contract Seed is Script {
    uint24 constant POOL_FEE = 3000; // 0.3%
    int24 constant TICK_SPACING = 60;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address me = vm.addr(pk);
        IndexToken index = IndexToken(vm.envAddress("INDEX"));
        IndexLens lens = IndexLens(vm.envAddress("LENS"));

        vm.startBroadcast(pk);
        _mintSupply(index, vm.envOr("MINT_SHARES", uint256(100e18)), me);
        _seedPool(index, lens, vm.envOr("LP_SHARES", uint256(50e18)), me);
        vm.stopBroadcast();
    }

    /// @dev 1 ── mint supply in-kind (wallet must hold the components)
    function _mintSupply(IndexToken index, uint256 mintShares, address me) internal {
        (address[] memory tokens,) = index.components();
        (uint256[] memory amountsIn,) = index.previewMint(mintShares);
        for (uint256 i; i < tokens.length; ++i) {
            IERC20(tokens[i]).approve(address(index), amountsIn[i]);
        }
        console2.log("minted shares:", index.mint(mintShares, me));
    }

    /// @dev 2+3 ── initialize the index/USDG pool at lens NAV, add full-range liquidity
    function _seedPool(IndexToken index, IndexLens lens, uint256 lpShares, address me) internal {
        uint256 nav = lens.navPerShare(address(index)); // USDG(6dp) per 1e18 shares
        (PoolKey memory key, bool indexIsC0) = _poolKey(address(index));
        uint160 sqrtPriceX96 = _sqrtPriceAtNav(nav, indexIsC0);
        IPositionManagerMinimal(RHChain.POSITION_MANAGER).initializePool(key, sqrtPriceX96);
        uint256 lpUsdg = Math.mulDiv(nav, lpShares, 1e18);
        _addFullRangeLiquidity(key, indexIsC0, sqrtPriceX96, lpShares, lpUsdg, me);
        console2.log("pool seeded at navPerShare (USDG 6dp):", nav);
        console2.log("LP: index shares", lpShares);
        console2.log("LP: usdg        ", lpUsdg);
    }

    // ── helpers ──

    function _poolKey(address index) internal pure returns (PoolKey memory key, bool indexIsC0) {
        indexIsC0 = index < RHChain.USDG;
        (address c0, address c1) = indexIsC0 ? (index, RHChain.USDG) : (RHChain.USDG, index);
        key = PoolKey(Currency.wrap(c0), Currency.wrap(c1), POOL_FEE, TICK_SPACING, IHooks(address(0)));
    }

    /// @dev sqrtPriceX96 encodes raw-c1 per raw-c0. nav is USDG-raw per 1e18 index-raw.
    function _sqrtPriceAtNav(uint256 nav, bool indexIsC0) internal pure returns (uint160) {
        // indexIsC0: ratio = nav/1e18 ⇒ sqrtP = sqrt(nav · 2^192 / 1e18)
        // usdgIsC0:  ratio = 1e18/nav ⇒ sqrtP = sqrt(1e18 · 2^192 / nav)
        uint256 ratioX192 = indexIsC0 ? Math.mulDiv(nav, 2 ** 192, 1e18) : Math.mulDiv(1e18, 2 ** 192, nav);
        return uint160(Math.sqrt(ratioX192));
    }

    function _addFullRangeLiquidity(
        PoolKey memory key,
        bool indexIsC0,
        uint160 sqrtPriceX96,
        uint256 indexAmount,
        uint256 usdgAmount,
        address recipient
    ) internal {
        (uint256 amount0, uint256 amount1) = indexIsC0 ? (indexAmount, usdgAmount) : (usdgAmount, indexAmount);
        int24 tickLower = TickMath.minUsableTick(TICK_SPACING);
        int24 tickUpper = TickMath.maxUsableTick(TICK_SPACING);
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            TickMath.getSqrtPriceAtTick(tickLower),
            TickMath.getSqrtPriceAtTick(tickUpper),
            amount0,
            amount1
        );

        // Permit2 two-step approvals for both sides
        _permit2Approve(Currency.unwrap(key.currency0));
        _permit2Approve(Currency.unwrap(key.currency1));

        bytes memory actions = abi.encodePacked(uint8(Actions.MINT_POSITION), uint8(Actions.SETTLE_PAIR));
        bytes[] memory params = new bytes[](2);
        params[0] = abi.encode(
            key,
            tickLower,
            tickUpper,
            liquidity,
            uint128(amount0 + amount0 / 100 + 1), // 1% max buffer for rounding
            uint128(amount1 + amount1 / 100 + 1),
            recipient,
            bytes("")
        );
        params[1] = abi.encode(key.currency0, key.currency1);
        IPositionManagerMinimal(RHChain.POSITION_MANAGER)
            .modifyLiquidities(abi.encode(actions, params), block.timestamp + 3600);
    }

    function _permit2Approve(address token) internal {
        IERC20(token).approve(RHChain.PERMIT2, type(uint256).max);
        IPermit2Minimal(RHChain.PERMIT2)
            .approve(token, RHChain.POSITION_MANAGER, type(uint160).max, uint48(block.timestamp + 30 days));
    }
}
