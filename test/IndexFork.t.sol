// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IndexFactory} from "../src/IndexFactory.sol";
import {IndexToken} from "../src/IndexToken.sol";
import {IndexLens} from "../src/periphery/IndexLens.sol";
import {RHChain} from "../src/libraries/RHChain.sol";

/// @notice REAL integration test on Robinhood Chain mainnet: mint a cross-asset index (NVDA + TSLA +
///         CASHCAT) fully in-kind — needing ZERO DEX liquidity (that's the thesis) — transfer it like
///         any ERC-20, redeem it back to the exact underlying, and read a live NAV via the lens
///         (real Chainlink feeds + the real CASHCAT/USDG v4 pool).
/// @dev Gated: RH_FORK=1 forge test --match-path test/IndexFork.t.sol -vv
contract IndexForkTest is Test {
    address constant NVDA_FEED = 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15;
    address constant TSLA_FEED = 0x4A1166a659A55625345e9515b32adECea5547C38;

    bool forkOk;
    IndexFactory factory;
    IndexToken index;
    IndexLens lens;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        if (vm.envOr("RH_FORK", uint256(0)) == 0) return;
        forkOk = true;
        vm.createSelectFork("rh_mainnet");

        factory = new IndexFactory(address(this), address(this), 10); // treasury = this

        address[] memory t = new address[](3);
        uint256[] memory u = new uint256[](3);
        t[0] = RHChain.NVDA;
        u[0] = 5e16; // 0.05 NVDA / share
        t[1] = RHChain.TSLA;
        u[1] = 25e15; // 0.025 TSLA / share
        t[2] = RHChain.CASHCAT;
        u[2] = 60e18; // 60 CASHCAT / share
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
            RHChain.CASHCAT,
            IndexLens.PriceConfig(
                IndexLens.Source.POOL_USDG,
                address(0),
                0,
                PoolKey(Currency.wrap(RHChain.CASHCAT), Currency.wrap(RHChain.USDG), 5000, 100, IHooks(address(0))),
                true
            )
        );
    }

    function test_realInKindLifecycle() public {
        if (!forkOk) {
            vm.skip(true);
            return;
        }
        // real stock tokens + real memecoin in one wallet
        deal(RHChain.NVDA, alice, 1e18);
        deal(RHChain.TSLA, alice, 1e18);
        deal(RHChain.CASHCAT, alice, 1_000e18);

        vm.startPrank(alice);
        IERC20(RHChain.NVDA).approve(address(index), type(uint256).max);
        IERC20(RHChain.TSLA).approve(address(index), type(uint256).max);
        IERC20(RHChain.CASHCAT).approve(address(index), type(uint256).max);
        uint256 out = index.mint(10e18, alice); // 10 gross shares, fully in-kind — no DEX touched
        vm.stopPrank();

        // exact, deterministic pulls
        assertEq(IERC20(RHChain.NVDA).balanceOf(address(index)), 5e17, "0.5 NVDA");
        assertEq(IERC20(RHChain.TSLA).balanceOf(address(index)), 25e16, "0.25 TSLA");
        assertEq(IERC20(RHChain.CASHCAT).balanceOf(address(index)), 600e18, "600 CASHCAT");
        assertEq(out, 999e16, "10 shares minus 10bps");
        assertEq(index.balanceOf(address(this)), 1e16, "fee shares to treasury");

        // the share is money: transfer it; a third party redeems in-kind
        vm.prank(alice);
        index.transfer(bob, 1e18);
        vm.prank(bob);
        uint256[] memory outs = index.redeem(1e18, bob);
        assertEq(outs[0], 5e16);
        assertEq(outs[1], 25e15);
        assertEq(outs[2], 60e18);
        assertEq(IERC20(RHChain.NVDA).balanceOf(bob), 5e16, "bob holds real NVDA he never bought");

        // live NAV: real Chainlink (stocks) + real v4 pool spot (CASHCAT)
        uint256 nav = lens.navPerShare(address(index));
        console2.log("hAI navPerShare (USDG 6dp):", nav);
        assertGt(nav, 5e6, "NAV sane lower bound");
        assertLt(nav, 500e6, "NAV sane upper bound"); // ~$30 expected at 2026-07-11 prices
    }
}
