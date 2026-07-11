// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {IndexFactory} from "../src/IndexFactory.sol";
import {IndexToken} from "../src/IndexToken.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract IndexFactoryTest is Test {
    IndexFactory factory;
    MockERC20 tokenA;
    MockERC20 tokenB;
    address treasury = address(0xCAFE);
    address treasury2 = address(0xD00D);
    address alice = address(0xA11CE);

    function setUp() public {
        tokenA = new MockERC20("A", "A", 18);
        tokenB = new MockERC20("B", "B", 18);
        factory = new IndexFactory(address(this), treasury, 10);
    }

    function _create() internal returns (IndexToken) {
        address[] memory t = new address[](2);
        uint256[] memory u = new uint256[](2);
        t[0] = address(tokenA);
        u[0] = 1e18;
        t[1] = address(tokenB);
        u[1] = 2e18;
        return IndexToken(factory.createIndex("Idx", "IDX", t, u));
    }

    // ── constructor ──

    function test_constructor_validations() public {
        vm.expectRevert(IndexFactory.ZeroAddress.selector);
        new IndexFactory(address(this), address(0), 10);
        vm.expectRevert(IndexFactory.FeeTooHigh.selector);
        new IndexFactory(address(this), treasury, 51);
    }

    // ── admin ──

    function test_setMintFee_capAndAuth() public {
        factory.setMintFeeBps(50); // at cap: ok
        assertEq(factory.mintFeeBps(), 50);
        vm.expectRevert(IndexFactory.FeeTooHigh.selector);
        factory.setMintFeeBps(51);
        vm.prank(alice);
        vm.expectRevert();
        factory.setMintFeeBps(5);
    }

    function test_setTreasury_auth() public {
        vm.expectRevert(IndexFactory.ZeroAddress.selector);
        factory.setTreasury(address(0));
        vm.prank(alice);
        vm.expectRevert();
        factory.setTreasury(treasury2);
        factory.setTreasury(treasury2);
        assertEq(factory.treasury(), treasury2);
    }

    // ── fee snapshot: existing indexes can never be repriced ──

    function test_feeSnapshotPerIndex() public {
        IndexToken a = _create(); // snapshots 10
        factory.setMintFeeBps(25);
        IndexToken b = _create(); // snapshots 25
        assertEq(a.mintFeeBps(), 10, "existing index keeps its fee forever");
        assertEq(b.mintFeeBps(), 25, "new index gets the new fee");
    }

    // ── treasury is read live at mint time ──

    function test_treasuryLiveRead() public {
        IndexToken idx = _create();
        tokenA.mint(alice, 1e30);
        tokenB.mint(alice, 1e30);
        vm.startPrank(alice);
        tokenA.approve(address(idx), type(uint256).max);
        tokenB.approve(address(idx), type(uint256).max);
        idx.mint(100e18, alice);
        vm.stopPrank();
        assertEq(idx.balanceOf(treasury), 1e17, "fee to current treasury");

        factory.setTreasury(treasury2);
        vm.prank(alice);
        idx.mint(100e18, alice);
        assertEq(idx.balanceOf(treasury2), 1e17, "rotated treasury receives future fees");
        assertEq(idx.balanceOf(treasury), 1e17, "old treasury balance untouched");
    }

    // ── registry ──

    function test_registry() public {
        IndexToken idx = _create();
        assertEq(factory.indexesCount(), 1);
        assertTrue(factory.isIndex(address(idx)));
        assertEq(factory.allIndexes(0), address(idx));
        assertFalse(factory.isIndex(address(0xBAD)));
    }
}
