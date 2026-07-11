// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {PriceLib} from "../src/libraries/PriceLib.sol";
import {FixedPoint96} from "v4-core/src/libraries/FixedPoint96.sol";
import {MockAggregator} from "./mocks/MockAggregator.sol";

/// @dev External wrappers so library reverts surface as external calls (vm.expectRevert-catchable).
contract PriceLibHarness {
    function valueUsdg(uint256 b, uint256 p, uint8 feedDec, uint8 tokenDec) external pure returns (uint256) {
        return PriceLib.valueUsdg(b, p, feedDec, tokenDec);
    }

    function poolValueUsdg(uint256 b, uint160 sp, bool c0) external pure returns (uint256) {
        return PriceLib.poolValueUsdg(b, sp, c0);
    }

    function readFeed(address f, uint256 m) external view returns (uint256, uint8) {
        return PriceLib.readFeed(f, m);
    }

    function checkSequencer(address f, uint256 g) external view {
        PriceLib.checkSequencer(f, g);
    }
}

contract PriceLibTest is Test {
    PriceLibHarness h;
    uint160 constant Q96 = uint160(FixedPoint96.Q96); // 2^96 = price 1.0

    function setUp() public {
        h = new PriceLibHarness();
        vm.warp(1_000_000);
    }

    // ── valueUsdg: raw token × 8-dec feed → 6-dec USDG, decimals-agnostic ──
    function test_valueUsdg_oneTokenAt200() public view {
        // 1.0 of an 18-dec token @ $200 (feed 8-dec) → 200 USDG (6-dec)
        assertEq(h.valueUsdg(1e18, 200e8, 8, 18), 200e6);
    }

    function test_valueUsdg_fractional() public view {
        // 0.5 of an 18-dec token @ $100 → 50 USDG
        assertEq(h.valueUsdg(5e17, 100e8, 8, 18), 50e6);
    }

    function test_valueUsdg_sixDecimalToken() public view {
        // 3.0 of a 6-dec token @ $2 → 6 USDG
        assertEq(h.valueUsdg(3e6, 2e8, 8, 6), 6e6);
    }

    function test_valueUsdg_zeroBalance() public view {
        assertEq(h.valueUsdg(0, 200e8, 8, 18), 0);
    }

    // ── poolValueUsdg: raw×(currency1/currency0) ratio math from sqrtPriceX96 ──
    function test_poolValue_priceOne() public view {
        assertEq(h.poolValueUsdg(1e18, Q96, true), 1e18); // ratio 1, token=c0
        assertEq(h.poolValueUsdg(1e18, Q96, false), 1e18); // ratio 1, token=c1 (symmetric)
    }

    function test_poolValue_priceFour() public view {
        uint160 sp = 2 * Q96; // sqrtPrice 2 ⇒ ratio (currency1/currency0) = 4
        assertEq(h.poolValueUsdg(1e18, sp, true), 4e18); // token=c0: ×4
        assertEq(h.poolValueUsdg(1e18, sp, false), 25e16); // token=c1: ×0.25
    }

    function test_poolValue_zeroSqrtReverts() public {
        vm.expectRevert(PriceLib.ZeroSqrtPrice.selector);
        h.poolValueUsdg(1e18, 0, true);
    }

    // ── readFeed staleness / validity ──
    function test_readFeed_fresh() public {
        MockAggregator f = new MockAggregator(8, 200e8);
        f.set(200e8, block.timestamp);
        (uint256 p, uint8 d) = h.readFeed(address(f), 3600);
        assertEq(p, 200e8);
        assertEq(d, 8);
    }

    function test_readFeed_staleReverts() public {
        MockAggregator f = new MockAggregator(8, 200e8);
        f.set(200e8, block.timestamp - 7200); // 2h old
        vm.expectRevert(PriceLib.StalePrice.selector);
        h.readFeed(address(f), 3600); // 1h max
    }

    function test_readFeed_badPriceReverts() public {
        MockAggregator f = new MockAggregator(8, 0);
        f.set(0, block.timestamp);
        vm.expectRevert(PriceLib.BadPrice.selector);
        h.readFeed(address(f), 3600);
    }

    // ── sequencer uptime ──
    function test_sequencer_zeroAddressNoOp() public view {
        h.checkSequencer(address(0), 3600); // no revert
    }

    function test_sequencer_up_afterGrace() public {
        MockAggregator s = new MockAggregator(0, 0); // 0 = up
        s.setStarted(block.timestamp - 7200); // grace long over
        h.checkSequencer(address(s), 3600); // ok
    }

    function test_sequencer_downReverts() public {
        MockAggregator s = new MockAggregator(0, 1); // 1 = down
        vm.expectRevert(PriceLib.SequencerDown.selector);
        h.checkSequencer(address(s), 3600);
    }

    function test_sequencer_graceNotOverReverts() public {
        MockAggregator s = new MockAggregator(0, 0);
        s.setStarted(block.timestamp - 100); // only 100s ago
        vm.expectRevert(PriceLib.GracePeriodNotOver.selector);
        h.checkSequencer(address(s), 3600);
    }
}
