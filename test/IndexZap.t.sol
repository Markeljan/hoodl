// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IndexFactory} from "../src/IndexFactory.sol";
import {IndexToken} from "../src/IndexToken.sol";
import {IndexZap} from "../src/periphery/IndexZap.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockPoolManager} from "./mocks/MockPoolManager.sol";

/// @dev Mock pools are value-preserving (no fee/slippage), so every zap amount asserts exactly.
///      Index: 0.05 NVDA ($200) + 60 CAT ($0.20) + 10 USDG cash leg per share = $32/share.
contract IndexZapTest is Test {
    IndexFactory factory;
    IndexToken idx;
    IndexZap zap;
    MockPoolManager pm;
    MockERC20 usdg; // 6-dec quote
    MockERC20 nvda; // 18-dec
    MockERC20 cat; // 18-dec
    address treasury = address(0xCAFE);
    address alice = address(0xA11CE);

    uint256 constant SHARE_COST_USDG = 32e6; // $10 NVDA + $12 CAT + $10 cash

    function setUp() public {
        usdg = new MockERC20("USDG", "USDG", 6);
        nvda = new MockERC20("NVDA", "NVDA", 18);
        cat = new MockERC20("CASHCAT", "CAT", 18);

        pm = new MockPoolManager();
        pm.setPrice(address(usdg), 1e8, 6); // $1
        pm.setPrice(address(nvda), 200e8, 18); // $200
        pm.setPrice(address(cat), 2e7, 18); // $0.20
        nvda.mint(address(pm), 1e30);
        cat.mint(address(pm), 1e30);
        usdg.mint(address(pm), 1e30);

        factory = new IndexFactory(address(this), treasury, 10); // 10 bps
        address[] memory t = new address[](3);
        uint256[] memory u = new uint256[](3);
        t[0] = address(nvda);
        u[0] = 5e16; // 0.05 NVDA
        t[1] = address(cat);
        u[1] = 60e18; // 60 CAT
        t[2] = address(usdg);
        u[2] = 10e6; // 10 USDG cash leg
        idx = IndexToken(factory.createIndex("AI", "hAI", t, u));

        zap = new IndexZap(IPoolManager(address(pm)), address(usdg), address(this));
        zap.setPool(address(nvda), _key(address(nvda)));
        zap.setPool(address(cat), _key(address(cat)));

        usdg.mint(alice, 1_000e6);
        vm.startPrank(alice);
        usdg.approve(address(zap), type(uint256).max);
        idx.approve(address(zap), type(uint256).max);
        vm.stopPrank();
    }

    function _key(address token) internal view returns (PoolKey memory) {
        (address c0, address c1) = token < address(usdg) ? (token, address(usdg)) : (address(usdg), token);
        return PoolKey(Currency.wrap(c0), Currency.wrap(c1), 3000, 60, IHooks(address(0)));
    }

    // ── setPool ──

    function test_setPool_rejectsForeignKey() public {
        PoolKey memory bad =
            PoolKey(Currency.wrap(address(nvda)), Currency.wrap(address(cat)), 3000, 60, IHooks(address(0)));
        vm.expectRevert(IndexZap.BadPool.selector);
        zap.setPool(address(nvda), bad); // not a token/USDG pool
    }

    function test_setPool_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        zap.setPool(address(nvda), _key(address(nvda)));
    }

    // ── zapMint ──

    function test_zapMint_exactSpendAndRefund() public {
        vm.prank(alice);
        (uint256 sharesOut, uint256 spent) = zap.zapMint(idx, 10e18, 400e6);

        assertEq(spent, 10 * SHARE_COST_USDG, "$320 for 10 shares");
        assertEq(usdg.balanceOf(alice), 1_000e6 - 320e6, "unspent budget refunded");
        assertEq(sharesOut, 999e16, "10 shares minus 10bps");
        assertEq(idx.balanceOf(alice), 999e16);
        assertEq(idx.balanceOf(treasury), 1e16);
        // index vault holds the exact basket, including the USDG cash leg
        assertEq(nvda.balanceOf(address(idx)), 5e17);
        assertEq(cat.balanceOf(address(idx)), 600e18);
        assertEq(usdg.balanceOf(address(idx)), 100e6);
        // zap retains nothing
        assertEq(usdg.balanceOf(address(zap)), 0);
        assertEq(nvda.balanceOf(address(zap)), 0);
        assertEq(cat.balanceOf(address(zap)), 0);
    }

    function test_zapMint_slippageReverts() public {
        vm.prank(alice);
        vm.expectRevert(IndexZap.Slippage.selector);
        zap.zapMint(idx, 10e18, 300e6); // needs $320
    }

    function test_zapMint_unroutedComponentReverts() public {
        // index over a token the zap has no pool for
        MockERC20 rogue = new MockERC20("R", "R", 18);
        pm.setPrice(address(rogue), 1e8, 18);
        address[] memory t = new address[](1);
        uint256[] memory u = new uint256[](1);
        t[0] = address(rogue);
        u[0] = 1e18;
        IndexToken idx2 = IndexToken(factory.createIndex("R", "R", t, u));
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IndexZap.NoPool.selector, address(rogue)));
        zap.zapMint(idx2, 1e18, 100e6);
    }

    function test_zapMint_zeroSharesReverts() public {
        vm.prank(alice);
        vm.expectRevert(IndexZap.ZeroShares.selector);
        zap.zapMint(idx, 0, 100e6);
    }

    // ── zapRedeem ──

    function test_zapRedeem_exactOut() public {
        vm.prank(alice);
        (uint256 sharesOut,) = zap.zapMint(idx, 10e18, 400e6);

        uint256 usdgBefore = usdg.balanceOf(alice);
        vm.prank(alice);
        uint256 out = zap.zapRedeem(idx, sharesOut, 0);

        // 9.99 shares x $32, value-preserving pools => exact
        assertEq(out, 9990 * SHARE_COST_USDG / 1000, "$319.68");
        assertEq(usdg.balanceOf(alice) - usdgBefore, out);
        assertEq(idx.balanceOf(alice), 0);
        // zap retains nothing
        assertEq(usdg.balanceOf(address(zap)), 0);
        assertEq(nvda.balanceOf(address(zap)), 0);
        assertEq(cat.balanceOf(address(zap)), 0);
    }

    function test_zapRedeem_minOutReverts() public {
        vm.prank(alice);
        (uint256 sharesOut,) = zap.zapMint(idx, 10e18, 400e6);
        vm.prank(alice);
        vm.expectRevert(IndexZap.Slippage.selector);
        zap.zapRedeem(idx, sharesOut, 400e6); // worth ~$319.68
    }

    // ── full round trip conservation ──

    function test_roundTrip_feeOnlyLoss() public {
        // with value-preserving pools the ONLY loss is the index mint fee (10bps)
        vm.startPrank(alice);
        (uint256 sharesOut,) = zap.zapMint(idx, 10e18, 400e6);
        zap.zapRedeem(idx, sharesOut, 0);
        vm.stopPrank();

        // spent $320, got back 99.9% of it: lost exactly $0.32 (the treasury's 0.01 shares)
        assertEq(usdg.balanceOf(alice), 1_000e6 - 32e4);
    }
}
