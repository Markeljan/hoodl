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
        factory = new IndexFactory(address(this), treasury, 10, 5);
    }

    function _components() internal view returns (address[] memory t, uint256[] memory u) {
        t = new address[](2);
        u = new uint256[](2);
        t[0] = address(tokenA);
        u[0] = 1e18;
        t[1] = address(tokenB);
        u[1] = 2e18;
    }

    function _create() internal returns (IndexToken) {
        (address[] memory t, uint256[] memory u) = _components();
        return IndexToken(factory.createIndex("Idx", "IDX", t, u));
    }

    function _createFull(uint16 cMint, uint16 cRedeem) internal returns (IndexToken) {
        (address[] memory t, uint256[] memory u) = _components();
        return IndexToken(
            factory.createIndex(
                IndexFactory.IndexParams({
                    name: "Idx",
                    symbol: "IDX",
                    tokens: t,
                    units: u,
                    creatorMintFeeBps: cMint,
                    creatorRedeemFeeBps: cRedeem,
                    description: "two-token test index",
                    imageURI: "ipfs://img"
                })
            )
        );
    }

    // ── constructor ──

    function test_constructor_validations() public {
        vm.expectRevert(IndexFactory.ZeroAddress.selector);
        new IndexFactory(address(this), address(0), 10, 0);
        vm.expectRevert(IndexFactory.FeeTooHigh.selector);
        new IndexFactory(address(this), treasury, 101, 0);
        vm.expectRevert(IndexFactory.FeeTooHigh.selector);
        new IndexFactory(address(this), treasury, 0, 101);
    }

    // ── admin ──

    function test_setProtocolFees_capAndAuth() public {
        factory.setProtocolFees(100, 100); // at cap: ok
        assertEq(factory.mintFeeBps(), 100);
        assertEq(factory.redeemFeeBps(), 100);
        vm.expectRevert(IndexFactory.FeeTooHigh.selector);
        factory.setProtocolFees(101, 0);
        vm.expectRevert(IndexFactory.FeeTooHigh.selector);
        factory.setProtocolFees(0, 101);
        vm.prank(alice);
        vm.expectRevert();
        factory.setProtocolFees(5, 5);
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
        IndexToken a = _create(); // snapshots 10/5
        factory.setProtocolFees(25, 15);
        IndexToken b = _create(); // snapshots 25/15
        assertEq(a.protocolMintFeeBps(), 10, "existing index keeps its fees forever");
        assertEq(a.protocolRedeemFeeBps(), 5);
        assertEq(b.protocolMintFeeBps(), 25, "new index gets the new fees");
        assertEq(b.protocolRedeemFeeBps(), 15);
    }

    // ── creator fees + metadata plumb through createIndex ──

    function test_createIndex_fullParams() public {
        vm.prank(alice);
        IndexToken idx = _createFull(30, 20);
        assertEq(idx.creator(), alice, "caller becomes creator");
        assertEq(idx.creatorMintFeeBps(), 30);
        assertEq(idx.creatorRedeemFeeBps(), 20);
        assertEq(idx.protocolMintFeeBps(), 10);
        assertEq(idx.protocolRedeemFeeBps(), 5);
        assertEq(idx.description(), "two-token test index");
        assertEq(idx.imageURI(), "ipfs://img");
    }

    function test_createIndex_creatorFeeCap() public {
        (address[] memory t, uint256[] memory u) = _components();
        IndexFactory.IndexParams memory p = IndexFactory.IndexParams({
            name: "Idx",
            symbol: "IDX",
            tokens: t,
            units: u,
            creatorMintFeeBps: 101,
            creatorRedeemFeeBps: 0,
            description: "",
            imageURI: ""
        });
        vm.expectRevert(IndexFactory.FeeTooHigh.selector);
        factory.createIndex(p);
        p.creatorMintFeeBps = 0;
        p.creatorRedeemFeeBps = 101;
        vm.expectRevert(IndexFactory.FeeTooHigh.selector);
        factory.createIndex(p);
        p.creatorRedeemFeeBps = 100; // at cap: ok
        assertTrue(factory.createIndex(p) != address(0));
    }

    function test_createIndex_legacyForm_zeroCreatorFees() public {
        vm.prank(alice);
        IndexToken idx = _create();
        assertEq(idx.creator(), alice);
        assertEq(idx.creatorMintFeeBps(), 0);
        assertEq(idx.creatorRedeemFeeBps(), 0);
        assertEq(idx.description(), "");
        assertEq(idx.imageURI(), "");
    }

    // ── treasury is read live at mint time ──

    function test_treasuryLiveRead() public {
        factory.setProtocolFees(10, 0); // isolate: mint fee only for exact assertions
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
