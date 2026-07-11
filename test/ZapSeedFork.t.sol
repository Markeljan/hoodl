// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {PoolSwapTest} from "v4-core/src/test/PoolSwapTest.sol";
import {LiquidityAmounts} from "v4-periphery/src/libraries/LiquidityAmounts.sol";
import {Actions} from "v4-periphery/src/libraries/Actions.sol";
import {IndexFactory} from "../src/IndexFactory.sol";
import {IndexToken} from "../src/IndexToken.sol";
import {IndexLens} from "../src/periphery/IndexLens.sol";
import {IndexZap} from "../src/periphery/IndexZap.sol";
import {RHChain} from "../src/libraries/RHChain.sol";

interface IPositionManagerMinimal {
    function initializePool(PoolKey calldata key, uint160 sqrtPriceX96) external payable returns (int24);
    function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable;
}

interface IPermit2Minimal {
    function approve(address token, address spender, uint160 amount, uint48 expiration) external;
}

/// @notice The COMPLETE product loop on live Robinhood Chain mainnet state:
///         (A) zap: plain USDG → index shares → back to USDG, routed through the real v4 pools.
///         (B) seed + retail: mint supply in-kind, bootstrap a brand-new hAI/USDG v4 pool at NAV via
///             the real PositionManager + Permit2, have a retail wallet BUY hAI with USDG on that
///             pool, then redeem it in-kind — ending the test holding real NVDA/TSLA/CASHCAT it
///             never bought directly.
/// @dev Gated: RH_FORK=1 forge test --match-path test/ZapSeedFork.t.sol -vv
contract ZapSeedForkTest is Test {
    address constant NVDA_FEED = 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15;
    address constant TSLA_FEED = 0x4A1166a659A55625345e9515b32adECea5547C38;
    uint24 constant POOL_FEE = 3000;
    int24 constant TICK_SPACING = 60;

    bool forkOk;
    IndexFactory factory;
    IndexToken index;
    IndexLens lens;
    IndexZap zap;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        if (vm.envOr("RH_FORK", uint256(0)) == 0) return;
        forkOk = true;
        vm.createSelectFork("rh_mainnet");

        factory = new IndexFactory(address(this), address(this), 10, 0);
        address[] memory t = new address[](3);
        uint256[] memory u = new uint256[](3);
        t[0] = RHChain.NVDA;
        u[0] = 5e16;
        t[1] = RHChain.TSLA;
        u[1] = 25e15;
        t[2] = RHChain.CASHCAT;
        u[2] = 60e18;
        index = IndexToken(factory.createIndex("HOODL AI Index", "hAI", t, u));

        lens = new IndexLens(RHChain.STATE_VIEW, RHChain.USDG, address(this));
        PoolKey memory emptyKey =
            PoolKey(Currency.wrap(address(0)), Currency.wrap(address(0)), 0, 0, IHooks(address(0)));
        lens.setConfig(
            RHChain.NVDA, IndexLens.PriceConfig(IndexLens.Source.CHAINLINK, NVDA_FEED, 7 days, emptyKey, false)
        );
        lens.setConfig(
            RHChain.TSLA, IndexLens.PriceConfig(IndexLens.Source.CHAINLINK, TSLA_FEED, 7 days, emptyKey, false)
        );
        lens.setConfig(
            RHChain.CASHCAT, IndexLens.PriceConfig(IndexLens.Source.POOL_USDG, address(0), 0, _cashcatKey(), true)
        );

        zap = new IndexZap(IPoolManager(RHChain.POOL_MANAGER), RHChain.USDG, address(this));
        // verified live pools (V4Quoter-probed 2026-07-11): NVDA/USDG 0.3% (USDG=c0) — the 1% pool is
        // one-sided and cannot sell NVDA; TSLA/USDG 0.3% (TSLA=c0); CASHCAT/USDG 0.5% (CASHCAT=c0)
        zap.setPool(
            RHChain.NVDA,
            PoolKey(Currency.wrap(RHChain.USDG), Currency.wrap(RHChain.NVDA), 3000, 60, IHooks(address(0)))
        );
        zap.setPool(
            RHChain.TSLA,
            PoolKey(Currency.wrap(RHChain.TSLA), Currency.wrap(RHChain.USDG), 3000, 60, IHooks(address(0)))
        );
        zap.setPool(RHChain.CASHCAT, _cashcatKey());
    }

    function _cashcatKey() internal pure returns (PoolKey memory) {
        return PoolKey(Currency.wrap(RHChain.CASHCAT), Currency.wrap(RHChain.USDG), 5000, 100, IHooks(address(0)));
    }

    // ─────────────────────────── (A) zap against real pools ───────────────────────────

    function test_zap_realPools_roundTrip() public {
        if (!forkOk) {
            vm.skip(true);
            return;
        }
        deal(RHChain.USDG, alice, 1_000e6);
        vm.startPrank(alice);
        IERC20(RHChain.USDG).approve(address(zap), type(uint256).max);

        // one share ≈ $32.6 NAV + real pool fees/slippage (NVDA leg pays 1%)
        (uint256 sharesOut, uint256 spent) = zap.zapMint(index, 1e18, 60e6);
        assertEq(sharesOut, 999e15, "1 share minus 10bps");
        assertGt(spent, 25e6, "spent sane lower bound");
        assertLt(spent, 45e6, "spent sane upper bound");
        assertEq(IERC20(RHChain.USDG).balanceOf(alice), 1_000e6 - spent, "exact refund");
        console2.log("zapMint spent (USDG 6dp):", spent);

        index.approve(address(zap), type(uint256).max);
        uint256 out = zap.zapRedeem(index, sharesOut, 25e6);
        console2.log("zapRedeem out  (USDG 6dp):", out);
        assertGt(out, 25e6);
        assertLt(out, uint256(spent), "round trip pays real pool fees");
        vm.stopPrank();

        // zap retains nothing
        assertEq(IERC20(RHChain.USDG).balanceOf(address(zap)), 0);
        assertEq(IERC20(RHChain.NVDA).balanceOf(address(zap)), 0);
    }

    // ─────────────────── (B) seed a real pool, retail buys, redeems in-kind ───────────────────

    function test_seedPool_retailBuys_thenRedeemsInKind() public {
        if (!forkOk) {
            vm.skip(true);
            return;
        }
        // 1 ── seed supply: mint 100 shares in-kind
        deal(RHChain.NVDA, address(this), 5e18);
        deal(RHChain.TSLA, address(this), 25e17);
        deal(RHChain.CASHCAT, address(this), 6_000e18);
        IERC20(RHChain.NVDA).approve(address(index), type(uint256).max);
        IERC20(RHChain.TSLA).approve(address(index), type(uint256).max);
        IERC20(RHChain.CASHCAT).approve(address(index), type(uint256).max);
        index.mint(100e18, address(this)); // treasury == this → holds all 100

        // 2 ── bootstrap the hAI/USDG pool at NAV with 50 hAI + matching USDG
        uint256 nav = lens.navPerShare(address(index));
        console2.log("seeding pool at navPerShare (USDG 6dp):", nav);
        (PoolKey memory key, bool indexIsC0) = _haiKey();
        uint160 sqrtP = _sqrtPriceAtNav(nav, indexIsC0);
        IPositionManagerMinimal(RHChain.POSITION_MANAGER).initializePool(key, sqrtP);

        uint256 lpUsdg = Math.mulDiv(nav, 50e18, 1e18);
        deal(RHChain.USDG, address(this), lpUsdg);
        _addFullRangeLiquidity(key, indexIsC0, sqrtP, 50e18, lpUsdg);

        // 3 ── retail: bob has ONLY USDG and buys hAI on the new pool
        deal(RHChain.USDG, bob, 100e6);
        PoolSwapTest router = new PoolSwapTest(IPoolManager(RHChain.POOL_MANAGER));
        vm.startPrank(bob);
        IERC20(RHChain.USDG).approve(address(router), type(uint256).max);
        bool zeroForOne = !indexIsC0; // selling USDG for hAI
        router.swap(
            key,
            IPoolManager.SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -int256(50e6), // spend 50 USDG
                sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
            }),
            PoolSwapTest.TestSettings(false, false),
            ""
        );
        vm.stopPrank();

        uint256 bobShares = index.balanceOf(bob);
        uint256 expected = Math.mulDiv(50e6, 1e18, nav);
        console2.log("bob bought hAI:", bobShares);
        assertApproxEqRel(bobShares, expected, 0.1e18, "DEX price ~= NAV (fee + slippage)");

        // 4 ── bob redeems in-kind: started with plain USDG, ends holding real stocks + memecoin
        uint256[] memory preview = index.previewRedeem(bobShares);
        vm.prank(bob);
        index.redeem(bobShares, bob);
        assertEq(IERC20(RHChain.NVDA).balanceOf(bob), preview[0], "exact NVDA out");
        assertEq(IERC20(RHChain.TSLA).balanceOf(bob), preview[1], "exact TSLA out");
        assertEq(IERC20(RHChain.CASHCAT).balanceOf(bob), preview[2], "exact CASHCAT out");
        assertGt(preview[0], 0);
        console2.log("bob now holds real NVDA:", preview[0]);
    }

    // ── seed helpers (mirror script/Seed.s.sol) ──

    function _haiKey() internal view returns (PoolKey memory key, bool indexIsC0) {
        indexIsC0 = address(index) < RHChain.USDG;
        (address c0, address c1) = indexIsC0 ? (address(index), RHChain.USDG) : (RHChain.USDG, address(index));
        key = PoolKey(Currency.wrap(c0), Currency.wrap(c1), POOL_FEE, TICK_SPACING, IHooks(address(0)));
    }

    function _sqrtPriceAtNav(uint256 nav, bool indexIsC0) internal pure returns (uint160) {
        uint256 ratioX192 = indexIsC0 ? Math.mulDiv(nav, 2 ** 192, 1e18) : Math.mulDiv(1e18, 2 ** 192, nav);
        return uint160(Math.sqrt(ratioX192));
    }

    function _addFullRangeLiquidity(
        PoolKey memory key,
        bool indexIsC0,
        uint160 sqrtP,
        uint256 indexAmount,
        uint256 usdgAmount
    ) internal {
        (uint256 amount0, uint256 amount1) = indexIsC0 ? (indexAmount, usdgAmount) : (usdgAmount, indexAmount);
        int24 tickLower = TickMath.minUsableTick(TICK_SPACING);
        int24 tickUpper = TickMath.maxUsableTick(TICK_SPACING);
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtP, TickMath.getSqrtPriceAtTick(tickLower), TickMath.getSqrtPriceAtTick(tickUpper), amount0, amount1
        );

        _permit2Approve(Currency.unwrap(key.currency0));
        _permit2Approve(Currency.unwrap(key.currency1));

        bytes memory actions = abi.encodePacked(uint8(Actions.MINT_POSITION), uint8(Actions.SETTLE_PAIR));
        bytes[] memory params = new bytes[](2);
        params[0] = abi.encode(
            key,
            tickLower,
            tickUpper,
            liquidity,
            uint128(amount0 + amount0 / 100 + 1),
            uint128(amount1 + amount1 / 100 + 1),
            address(this),
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
