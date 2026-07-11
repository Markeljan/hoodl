// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {IndexFactory} from "../src/IndexFactory.sol";
import {IndexToken} from "../src/IndexToken.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

/// @dev Everything here is DETERMINISTIC — in-kind mint/redeem involves no price, so amounts assert
///      exactly. Mixed decimals (18/18/6) prove the core is decimals-agnostic.
contract IndexTokenTest is Test {
    IndexFactory factory;
    MockERC20 nvda; // 18-dec
    MockERC20 cat; // 18-dec
    MockERC20 usd6; // 6-dec component
    address treasury = address(0xCAFE);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address carol = address(0xCA401); // index creator in creator-fee tests

    function setUp() public {
        nvda = new MockERC20("NVDA", "NVDA", 18);
        cat = new MockERC20("CASHCAT", "CAT", 18);
        usd6 = new MockERC20("USD6", "USD6", 6);
        factory = new IndexFactory(address(this), treasury, 10, 0); // 10 bps mint, free redeem
    }

    // ── helpers ──

    function _componentArrays() internal view returns (address[] memory t, uint256[] memory u) {
        t = new address[](3);
        u = new uint256[](3);
        t[0] = address(nvda);
        u[0] = 5e16; // 0.05 NVDA per share
        t[1] = address(cat);
        u[1] = 60e18; // 60 CAT per share
        t[2] = address(usd6);
        u[2] = 10e6; // 10.0 USD6 per share (6-dec)
    }

    function _mixedIndex() internal returns (IndexToken idx) {
        (address[] memory t, uint256[] memory u) = _componentArrays();
        idx = IndexToken(factory.createIndex("Mixed", "MIX", t, u));
    }

    /// @dev All four fee rates live: protocol 30/10 bps, creator (carol) 20/10 bps.
    function _fullIndex() internal returns (IndexToken idx) {
        factory.setProtocolFees(30, 10);
        (address[] memory t, uint256[] memory u) = _componentArrays();
        vm.prank(carol);
        idx = IndexToken(
            factory.createIndex(
                IndexFactory.IndexParams({
                    name: "HOODL AI Index",
                    symbol: "hAI",
                    tokens: t,
                    units: u,
                    creatorMintFeeBps: 20,
                    creatorRedeemFeeBps: 10,
                    description: "AI across both asset classes",
                    imageURI: "ipfs://hai.png"
                })
            )
        );
    }

    function _fundAndApprove(address user, IndexToken idx) internal {
        nvda.mint(user, 1e30);
        cat.mint(user, 1e30);
        usd6.mint(user, 1e30);
        vm.startPrank(user);
        nvda.approve(address(idx), type(uint256).max);
        cat.approve(address(idx), type(uint256).max);
        usd6.approve(address(idx), type(uint256).max);
        vm.stopPrank();
    }

    function _assertSolvent(IndexToken idx) internal view {
        (address[] memory t, uint256[] memory u) = idx.components();
        uint256 supply = idx.totalSupply();
        for (uint256 i; i < t.length; ++i) {
            assertGe(MockERC20(t[i]).balanceOf(address(idx)), Math.mulDiv(u[i], supply, 1e18), "solvency invariant");
        }
    }

    // ── creation validation ──

    function test_create_rejectsEmpty() public {
        address[] memory t = new address[](0);
        uint256[] memory u = new uint256[](0);
        vm.expectRevert(IndexToken.BadComponents.selector);
        factory.createIndex("X", "X", t, u);
    }

    function test_create_rejectsLengthMismatch() public {
        address[] memory t = new address[](2);
        uint256[] memory u = new uint256[](1);
        t[0] = address(nvda);
        t[1] = address(cat);
        u[0] = 1e18;
        vm.expectRevert(IndexToken.BadComponents.selector);
        factory.createIndex("X", "X", t, u);
    }

    function test_create_rejectsDuplicate() public {
        address[] memory t = new address[](2);
        uint256[] memory u = new uint256[](2);
        t[0] = address(nvda);
        t[1] = address(nvda);
        u[0] = 1;
        u[1] = 1;
        vm.expectRevert(IndexToken.BadComponents.selector);
        factory.createIndex("X", "X", t, u);
    }

    function test_create_rejectsZeroTokenAndZeroUnits() public {
        address[] memory t = new address[](1);
        uint256[] memory u = new uint256[](1);
        t[0] = address(0);
        u[0] = 1;
        vm.expectRevert(IndexToken.BadComponents.selector);
        factory.createIndex("X", "X", t, u);

        t[0] = address(nvda);
        u[0] = 0;
        vm.expectRevert(IndexToken.BadComponents.selector);
        factory.createIndex("X", "X", t, u);
    }

    function test_create_componentCap() public {
        // 17 components revert; 16 succeed (constructor never calls the tokens, so bare addresses work)
        address[] memory t17 = new address[](17);
        uint256[] memory u17 = new uint256[](17);
        for (uint256 i; i < 17; ++i) {
            t17[i] = address(uint160(i + 1));
            u17[i] = 1;
        }
        vm.expectRevert(IndexToken.BadComponents.selector);
        factory.createIndex("X", "X", t17, u17);

        address[] memory t16 = new address[](16);
        uint256[] memory u16 = new uint256[](16);
        for (uint256 i; i < 16; ++i) {
            t16[i] = address(uint160(i + 1));
            u16[i] = 1;
        }
        assertTrue(factory.createIndex("X", "X", t16, u16) != address(0));
    }

    // ── mint ──

    function test_mint_exactAmountsAndFee() public {
        IndexToken idx = _mixedIndex();
        _fundAndApprove(alice, idx);
        vm.prank(alice);
        uint256 out = idx.mint(100e18, alice);

        assertEq(nvda.balanceOf(address(idx)), 5e18, "0.05 x 100 NVDA");
        assertEq(cat.balanceOf(address(idx)), 6000e18, "60 x 100 CAT");
        assertEq(usd6.balanceOf(address(idx)), 1000e6, "10 x 100 USD6");
        assertEq(out, 999e17, "100 shares minus 10bps");
        assertEq(idx.balanceOf(alice), 999e17);
        assertEq(idx.balanceOf(treasury), 1e17, "fee shares to treasury");
        assertEq(idx.totalSupply(), 100e18, "fee is carved out, not inflated");
    }

    function test_mint_toOtherRecipient() public {
        IndexToken idx = _mixedIndex();
        _fundAndApprove(alice, idx);
        vm.prank(alice);
        idx.mint(1e18, bob);
        assertEq(idx.balanceOf(bob), 1e18 - 1e15);
        assertEq(idx.balanceOf(alice), 0);
    }

    function test_mint_roundsUp_redeem_roundsDown() public {
        factory.setProtocolFees(0, 0); // isolate rounding from fees
        address[] memory t = new address[](1);
        uint256[] memory u = new uint256[](1);
        t[0] = address(nvda);
        u[0] = 3; // 3 wei per 1e18 shares
        IndexToken idx = IndexToken(factory.createIndex("R", "R", t, u));
        _fundAndApprove(alice, idx);

        vm.startPrank(alice);
        idx.mint(5e17, alice); // needs 1.5 wei -> pulls 2 (ceil)
        assertEq(nvda.balanceOf(address(idx)), 2, "deposit rounds up");
        uint256[] memory outs = idx.redeem(5e17, alice); // floor(1.5) = 1
        vm.stopPrank();

        assertEq(outs[0], 1, "redemption rounds down");
        assertEq(idx.totalSupply(), 0);
        assertEq(nvda.balanceOf(address(idx)), 1, "dust stays in vault (over-collateralizes)");
    }

    // ── redeem + composability ──

    function test_transferThenThirdPartyRedeems() public {
        IndexToken idx = _mixedIndex();
        _fundAndApprove(alice, idx);
        vm.prank(alice);
        idx.mint(10e18, alice);

        vm.prank(alice);
        idx.transfer(bob, 4e18); // plain ERC-20 transfer — the share IS the product

        vm.prank(bob);
        uint256[] memory outs = idx.redeem(4e18, bob); // bob never deposited anything
        assertEq(outs[0], 2e17, "0.05 x 4 NVDA");
        assertEq(outs[1], 240e18, "60 x 4 CAT");
        assertEq(outs[2], 40e6, "10 x 4 USD6");
        assertEq(nvda.balanceOf(bob), 2e17);
        _assertSolvent(idx);
    }

    function test_previewsMatchActuals() public {
        IndexToken idx = _mixedIndex();
        _fundAndApprove(alice, idx);

        (uint256[] memory ins, uint256 expectedOut) = idx.previewMint(7e18);
        uint256 nvdaBefore = nvda.balanceOf(alice);
        vm.prank(alice);
        uint256 out = idx.mint(7e18, alice);
        assertEq(out, expectedOut);
        assertEq(nvdaBefore - nvda.balanceOf(alice), ins[0]);

        uint256[] memory pre = idx.previewRedeem(out);
        vm.prank(alice);
        uint256[] memory got = idx.redeem(out, alice);
        for (uint256 i; i < got.length; ++i) {
            assertEq(got[i], pre[i]);
        }
    }

    // ── all four fees live: exact splits ──

    function test_allFees_mintSplit() public {
        IndexToken idx = _fullIndex();
        _fundAndApprove(alice, idx);
        vm.prank(alice);
        uint256 out = idx.mint(100e18, alice);

        assertEq(out, 995e17, "100 minus 30bps protocol minus 20bps creator");
        assertEq(idx.balanceOf(alice), 995e17);
        assertEq(idx.balanceOf(treasury), 3e17, "protocol mint fee");
        assertEq(idx.balanceOf(carol), 2e17, "creator mint fee");
        assertEq(idx.totalSupply(), 100e18, "fees carved out, not inflated");
        _assertSolvent(idx);
    }

    function test_allFees_redeemSplit_feesInSharesNotBasket() public {
        IndexToken idx = _fullIndex();
        _fundAndApprove(alice, idx);
        vm.prank(alice);
        idx.mint(100e18, alice); // alice: 99.5, treasury: 0.3, carol: 0.2

        vm.prank(alice);
        uint256[] memory outs = idx.redeem(50e18, alice);

        // 10bps protocol + 10bps creator on 50 shares = 0.05 + 0.05 in SHARES; 49.9 burned
        assertEq(idx.balanceOf(alice), 495e17, "alice spent 50 shares");
        assertEq(idx.balanceOf(treasury), 3e17 + 5e16, "redeem fee shares to treasury");
        assertEq(idx.balanceOf(carol), 2e17 + 5e16, "redeem fee shares to creator");
        assertEq(idx.totalSupply(), 100e18 - 499e17, "only net shares burned");

        // basket paid for exactly the 49.9 net shares
        assertEq(outs[0], 2495e15, "0.05 x 49.9 NVDA");
        assertEq(outs[1], 2994e18, "60 x 49.9 CAT");
        assertEq(outs[2], 499e6, "10 x 49.9 USD6");
        _assertSolvent(idx);

        // fee recipients hold real, fully-backed shares — treasury can redeem them in-kind
        vm.prank(treasury);
        idx.redeem(35e16, treasury);
        _assertSolvent(idx);
    }

    function test_allFees_previewsMatchActuals() public {
        IndexToken idx = _fullIndex();
        _fundAndApprove(alice, idx);

        (, uint256 expectedOut) = idx.previewMint(7e18);
        vm.prank(alice);
        uint256 out = idx.mint(7e18, alice);
        assertEq(out, expectedOut);

        uint256[] memory pre = idx.previewRedeem(out);
        vm.prank(alice);
        uint256[] memory got = idx.redeem(out, alice);
        for (uint256 i; i < got.length; ++i) {
            assertEq(got[i], pre[i]);
        }
    }

    // ── creator surface: recipient rotation + metadata (never funds) ──

    function test_setCreator_rotatesFeeRecipient() public {
        IndexToken idx = _fullIndex();

        vm.prank(alice);
        vm.expectRevert(IndexToken.NotCreator.selector);
        idx.setCreator(alice);
        vm.prank(carol);
        vm.expectRevert(IndexToken.BadCreator.selector);
        idx.setCreator(address(0));

        vm.prank(carol);
        idx.setCreator(bob);
        assertEq(idx.creator(), bob);

        _fundAndApprove(alice, idx);
        vm.prank(alice);
        idx.mint(100e18, alice);
        assertEq(idx.balanceOf(bob), 2e17, "creator fee follows the new recipient");
        assertEq(idx.balanceOf(carol), 0);
        assertEq(idx.creatorMintFeeBps(), 20, "fee RATE is immutable through rotation");
    }

    function test_setMetadata_onlyCreator() public {
        IndexToken idx = _fullIndex();
        vm.prank(alice);
        vm.expectRevert(IndexToken.NotCreator.selector);
        idx.setMetadata("x", "y");

        vm.prank(carol);
        idx.setMetadata("new thesis", "ipfs://v2.png");
        assertEq(idx.description(), "new thesis");
        assertEq(idx.imageURI(), "ipfs://v2.png");
    }

    // ── on-chain metadata document ──

    function test_tokenURI_escapesAndEncodes() public {
        factory.setProtocolFees(0, 0);
        (address[] memory t, uint256[] memory u) = _componentArrays();
        // description exercises every escape class: quote, backslash, control char
        string memory desc = string.concat('He said "hi" \\', "\n", "done");
        IndexToken idx = IndexToken(
            factory.createIndex(
                IndexFactory.IndexParams({
                    name: "X",
                    symbol: "X",
                    tokens: t,
                    units: u,
                    creatorMintFeeBps: 0,
                    creatorRedeemFeeBps: 0,
                    description: desc,
                    imageURI: ""
                })
            )
        );

        string memory expectedJson =
            "{\"name\":\"X\",\"symbol\":\"X\",\"description\":\"He said \\\"hi\\\" \\\\ done\",\"image\":\"\"}";
        string memory expected = string.concat("data:application/json;base64,", Base64.encode(bytes(expectedJson)));
        assertEq(idx.tokenURI(), expected, "valid escaped JSON data-URI");
        assertEq(idx.contractURI(), expected, "contractURI serves the same document");
    }

    // ── guards ──

    function test_zeroSharesReverts() public {
        IndexToken idx = _mixedIndex();
        vm.expectRevert(IndexToken.ZeroShares.selector);
        idx.mint(0, alice);
        vm.expectRevert(IndexToken.ZeroShares.selector);
        idx.redeem(0, alice);
    }

    function test_redeemMoreThanBalanceReverts() public {
        IndexToken idx = _mixedIndex();
        _fundAndApprove(alice, idx);
        vm.prank(alice);
        idx.mint(1e18, alice);
        vm.prank(alice);
        vm.expectRevert(); // ERC20InsufficientBalance
        idx.redeem(2e18, alice);
    }

    // ── fuzz: solvency + no-free-lunch ──

    function testFuzz_solvencyInvariant(uint96 s1, uint96 s2, uint96 rSeed) public {
        uint256 shares1 = bound(uint256(s1), 1, 1e24);
        uint256 shares2 = bound(uint256(s2), 1, 1e24);
        IndexToken idx = _mixedIndex();
        _fundAndApprove(alice, idx);
        _fundAndApprove(bob, idx);

        uint256 aliceNvdaBefore = nvda.balanceOf(alice);

        vm.prank(alice);
        idx.mint(shares1, alice);
        vm.prank(bob);
        idx.mint(shares2, bob);
        _assertSolvent(idx);

        // alice partial then full redeem
        uint256 aliceShares = idx.balanceOf(alice);
        uint256 r = bound(uint256(rSeed), 1, aliceShares);
        vm.prank(alice);
        idx.redeem(r, alice);
        _assertSolvent(idx);
        uint256 rest = aliceShares - r;
        if (rest > 0) {
            vm.prank(alice);
            idx.redeem(rest, alice);
        }

        uint256 bobShares = idx.balanceOf(bob);
        vm.prank(bob);
        idx.redeem(bobShares, bob);
        _assertSolvent(idx); // treasury's fee shares must still be fully backed

        // no free lunch: a full round trip never returns more than deposited
        assertLe(nvda.balanceOf(alice), aliceNvdaBefore, "round trip cannot profit");
    }

    /// @dev Same storm with every fee at its 1% cap on both sides (protocol + creator = 2%/2%).
    function testFuzz_solvencyInvariant_allFeesAtCap(uint96 s1, uint96 s2, uint96 rSeed) public {
        uint256 shares1 = bound(uint256(s1), 1, 1e24);
        uint256 shares2 = bound(uint256(s2), 1, 1e24);
        factory.setProtocolFees(100, 100);
        (address[] memory t, uint256[] memory u) = _componentArrays();
        vm.prank(carol);
        IndexToken idx = IndexToken(
            factory.createIndex(
                IndexFactory.IndexParams({
                    name: "Max",
                    symbol: "MAX",
                    tokens: t,
                    units: u,
                    creatorMintFeeBps: 100,
                    creatorRedeemFeeBps: 100,
                    description: "",
                    imageURI: ""
                })
            )
        );
        _fundAndApprove(alice, idx);
        _fundAndApprove(bob, idx);

        uint256 aliceNvdaBefore = nvda.balanceOf(alice);

        vm.prank(alice);
        idx.mint(shares1, alice);
        vm.prank(bob);
        idx.mint(shares2, bob);
        _assertSolvent(idx);

        uint256 aliceShares = idx.balanceOf(alice);
        uint256 r = bound(uint256(rSeed), 1, aliceShares);
        vm.prank(alice);
        idx.redeem(r, alice);
        _assertSolvent(idx);
        uint256 rest = aliceShares - r;
        if (rest > 0) {
            vm.prank(alice);
            idx.redeem(rest, alice);
        }

        uint256 bobShares = idx.balanceOf(bob);
        vm.prank(bob);
        idx.redeem(bobShares, bob);
        _assertSolvent(idx);

        // every fee recipient's shares stay fully backed after they exit too
        uint256 treasuryShares = idx.balanceOf(treasury);
        if (treasuryShares > 0) {
            vm.prank(treasury);
            idx.redeem(treasuryShares, treasury);
        }
        uint256 carolShares = idx.balanceOf(carol);
        if (carolShares > 0) {
            vm.prank(carol);
            idx.redeem(carolShares, carol);
        }
        _assertSolvent(idx);

        assertLe(nvda.balanceOf(alice), aliceNvdaBefore, "round trip cannot profit");
    }
}
