// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {BasketFactory} from "../src/BasketFactory.sol";
import {Basket} from "../src/Basket.sol";
import {TokenConfig, GlobalConfig, FeeConfig, PriceSource} from "../src/BasketTypes.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {FixedPoint96} from "v4-core/src/libraries/FixedPoint96.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockAggregator} from "./mocks/MockAggregator.sol";
import {MockPoolManager} from "./mocks/MockPoolManager.sol";

/// @dev End-to-end accounting with a value-preserving mock v4. Single-token NVDA basket keeps the
///      arithmetic exact: 1000 USDG in → 10 fee / 990 net → 990e6 shares.
contract BasketAccountingTest is Test {
    BasketFactory factory;
    Basket basket;
    MockPoolManager pm;
    MockERC20 usdg;
    MockERC20 nvda;
    MockERC20 aapl;
    MockAggregator nvdaFeed;
    MockAggregator aaplFeed;

    address treasury = address(0xCAFE);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    uint256 constant STALE = 3650 days;
    uint64 hodlTill;

    function setUp() public {
        vm.warp(1_000_000);
        usdg = new MockERC20("USDG", "USDG", 6);
        nvda = new MockERC20("NVDA", "NVDA", 18);
        aapl = new MockERC20("AAPL", "AAPL", 18);

        pm = new MockPoolManager();
        pm.setPrice(address(usdg), 1e8, 6); // $1
        pm.setPrice(address(nvda), 200e8, 18); // $200
        pm.setPrice(address(aapl), 300e8, 18); // $300
        nvda.mint(address(pm), 1e30);
        aapl.mint(address(pm), 1e30);
        usdg.mint(address(pm), 1e30);

        nvdaFeed = new MockAggregator(8, 200e8);
        aaplFeed = new MockAggregator(8, 300e8);

        factory = new BasketFactory(address(pm), address(usdg), address(this));
        factory.setToken(
            address(nvda), TokenConfig(PriceSource.CHAINLINK, address(nvdaFeed), STALE, _usdgKey(address(nvda)), true)
        );
        factory.setToken(
            address(aapl), TokenConfig(PriceSource.CHAINLINK, address(aaplFeed), STALE, _usdgKey(address(aapl)), true)
        );
        // StateView lens = the mock itself (getSlot0); sequencer skipped (0) in tests
        factory.setGlobal(GlobalConfig(address(pm), address(0), 3600, treasury));

        address[] memory t = new address[](1);
        uint16[] memory w = new uint16[](1);
        t[0] = address(nvda);
        w[0] = 10000;
        hodlTill = uint64(block.timestamp + 30 days);
        basket = Basket(factory.createBasket(t, w, FeeConfig(100, 100, 8000, 1000, 1000), hodlTill, address(this)));

        usdg.mint(alice, 1_000e6);
        usdg.mint(bob, 1_000e6);
        vm.prank(alice);
        usdg.approve(address(basket), type(uint256).max);
        vm.prank(bob);
        usdg.approve(address(basket), type(uint256).max);
    }

    function _usdgKey(address token) internal view returns (PoolKey memory) {
        return PoolKey(Currency.wrap(token), Currency.wrap(address(usdg)), 3000, 60, IHooks(address(0)));
    }

    // ─────────────────────────────── tests ───────────────────────────────

    function test_deposit_mintsSharesByNav() public {
        vm.prank(alice);
        uint256 s = basket.deposit(1_000e6, 0);
        assertEq(s, 990e6, "shares = net USDG value");
        assertEq(basket.shares(alice), 990e6);
        assertEq(basket.totalShares(), 990e6);
        assertApproxEqAbs(basket.nav(), 990e6, 2, "nav = 990 USDG");
    }

    function test_fee_splitsToCreatorAndProtocol() public {
        // first deposit: holder cut has no existing holders → routed to treasury; creator → admin(this)
        uint256 adminBefore = usdg.balanceOf(address(this));
        uint256 treasBefore = usdg.balanceOf(treasury);
        vm.prank(alice);
        basket.deposit(1_000e6, 0);
        // fee = 10 USDG → creator 1, protocol 1, holder 8 (→treasury as no holders yet)
        assertEq(usdg.balanceOf(address(this)) - adminBefore, 1e6, "creator 10%");
        assertEq(usdg.balanceOf(treasury) - treasBefore, 9e6, "protocol 10% + orphaned holder 80%");
    }

    function test_secondDepositor_feeRewardsFirstHolder() public {
        vm.prank(alice);
        basket.deposit(1_000e6, 0);
        vm.prank(bob);
        basket.deposit(1_000e6, 0);

        assertEq(basket.shares(bob), 990e6);
        assertEq(basket.totalShares(), 1980e6);
        // bob's 10 USDG entry fee: holder cut 8 → alice (only holder at distribution)
        assertApproxEqAbs(basket.pendingRewards(alice), 8e6, 1e3, "alice earns bob's entry fee");
        assertEq(basket.pendingRewards(bob), 0, "bob earns nothing yet");
    }

    function test_claim_revertsBeforeHodlTill() public {
        vm.prank(alice);
        basket.deposit(1_000e6, 0);
        vm.prank(bob);
        basket.deposit(1_000e6, 0);
        vm.prank(alice);
        vm.expectRevert(Basket.Locked.selector);
        basket.claimRewards();
    }

    function test_earlyExit_paysFeeAndForfeitsReward() public {
        vm.prank(alice);
        basket.deposit(1_000e6, 0);
        vm.prank(bob);
        basket.deposit(1_000e6, 0);

        // alice bails early: gross 990, exit fee 1% = 9.9 → out 980.1; forfeits her ~8 reward
        uint256 aliceBefore = usdg.balanceOf(alice);
        vm.prank(alice);
        uint256 out = basket.withdraw(990e6, 0);
        assertApproxEqAbs(out, 9801e5, 5, "gross 990 - 1% exit");
        assertEq(usdg.balanceOf(alice) - aliceBefore, out);
        assertEq(basket.shares(alice), 0);
        assertEq(basket.pendingRewards(alice), 0, "reward forfeited");

        // bob (diamond hands) inherits alice's exit fee holder-cut (7.92) + her forfeited reward (~8)
        assertApproxEqAbs(basket.pendingRewards(bob), 7_920_000 + 8e6, 1e4, "bob gets fee + forfeit");
    }

    function test_diamondHands_claimsAfterDate() public {
        vm.prank(alice);
        basket.deposit(1_000e6, 0);
        vm.prank(bob);
        basket.deposit(1_000e6, 0);
        vm.prank(alice);
        basket.withdraw(990e6, 0); // alice bails early

        vm.warp(hodlTill + 1);
        uint256 bobBefore = usdg.balanceOf(bob);
        vm.prank(bob);
        uint256 claimed = basket.claimRewards();
        assertApproxEqAbs(claimed, 7_920_000 + 8e6, 1e4, "bob claims fee + forfeit");
        assertEq(usdg.balanceOf(bob) - bobBefore, claimed);
        assertEq(basket.pendingRewards(bob), 0);
    }

    function test_lateWithdraw_noExitFeeNoForfeit() public {
        vm.prank(alice);
        basket.deposit(1_000e6, 0);
        vm.warp(hodlTill + 1);

        uint256 before = usdg.balanceOf(alice);
        vm.prank(alice);
        uint256 out = basket.withdraw(990e6, 0);
        // sole holder, after date: full gross value back, no exit fee
        assertApproxEqAbs(out, 990e6, 5, "no exit fee after date");
        assertEq(usdg.balanceOf(alice) - before, out);
    }

    function test_withdraw_slippageGuardReverts() public {
        vm.prank(alice);
        basket.deposit(1_000e6, 0);
        vm.prank(alice);
        vm.expectRevert(Basket.Slippage.selector);
        basket.withdraw(990e6, 2_000e6); // demand more USDG than possible
    }

    function test_rebalance_movesBetweenTokens() public {
        // 50/50 NVDA/AAPL basket
        address[] memory t = new address[](2);
        uint16[] memory w = new uint16[](2);
        t[0] = address(nvda);
        t[1] = address(aapl);
        w[0] = 5000;
        w[1] = 5000;
        Basket b2 = Basket(factory.createBasket(t, w, FeeConfig(100, 100, 8000, 1000, 1000), hodlTill, address(this)));

        vm.prank(alice);
        usdg.approve(address(b2), type(uint256).max);
        vm.prank(alice);
        b2.deposit(1_000e6, 0);

        uint256 nvdaBefore = nvda.balanceOf(address(b2));
        uint256 aaplBefore = aapl.balanceOf(address(b2));
        uint256 navBefore = b2.nav();

        // admin (this) sells 1 NVDA → WETH → AAPL
        uint256 bought = b2.rebalance(address(nvda), 1e18, address(aapl), 0);

        assertEq(nvda.balanceOf(address(b2)), nvdaBefore - 1e18, "NVDA down by 1");
        assertEq(aapl.balanceOf(address(b2)), aaplBefore + bought, "AAPL up by bought");
        // value-preserving swap ⇒ NAV unchanged (±rounding)
        assertApproxEqAbs(b2.nav(), navBefore, 2, "rebalance preserves NAV");
        // $200 of NVDA → 200/300 AAPL @ $300 (±two-hop rounding)
        assertApproxEqAbs(bought, uint256(1e18) * 200 / 300, 1e12, "~0.667 AAPL out");
    }

    function test_rebalance_onlyAdmin() public {
        vm.prank(alice);
        vm.expectRevert(Basket.NotAdmin.selector);
        basket.rebalance(address(nvda), 1e18, address(nvda), 0);
    }

    function test_nav_poolPricedMemecoin() public {
        // POOL_USDG token valued from its token/USDG pool slot0 (mock doubles as StateView)
        MockERC20 meme = new MockERC20("MEME", "MEME", 18);
        bool memeIsC0 = address(meme) < address(usdg);
        PoolKey memory key = memeIsC0
            ? PoolKey(Currency.wrap(address(meme)), Currency.wrap(address(usdg)), 3000, 60, IHooks(address(0)))
            : PoolKey(Currency.wrap(address(usdg)), Currency.wrap(address(meme)), 3000, 60, IHooks(address(0)));
        factory.setToken(address(meme), TokenConfig(PriceSource.POOL_USDG, address(0), 0, key, memeIsC0));

        address[] memory t = new address[](1);
        uint16[] memory w = new uint16[](1);
        t[0] = address(meme);
        w[0] = 10000;
        Basket b = Basket(factory.createBasket(t, w, FeeConfig(100, 100, 8000, 1000, 1000), hodlTill, address(this)));

        meme.mint(address(b), 1000e18);
        bytes32 poolId = PoolId.unwrap(PoolIdLibrary.toId(key));

        // ratio 1 (sqrtP = Q96) ⇒ nav = raw balance
        pm.setSlot0(poolId, uint160(FixedPoint96.Q96));
        assertEq(b.nav(), 1000e18, "ratio 1");

        // ratio 4 (sqrtP = 2·Q96) ⇒ ×4 if token=currency0, ×0.25 if currency1
        pm.setSlot0(poolId, uint160(2 * FixedPoint96.Q96));
        assertEq(b.nav(), memeIsC0 ? 4000e18 : 250e18, "ratio 4 / 0.25");
    }
}
