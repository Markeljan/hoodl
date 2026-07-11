// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {BasketFactory} from "../src/BasketFactory.sol";
import {Basket} from "../src/Basket.sol";
import {RHChain} from "../src/libraries/RHChain.sol";
import {TokenConfig, GlobalConfig, FeeConfig, PriceSource} from "../src/BasketTypes.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice REAL integration test against Robinhood Chain mainnet (chainId 4663) — deploys the factory,
///         registers the verified CASHCAT/USDG v4 pool, and does a real deposit→withdraw that swaps
///         against live liquidity. CASHCAT is POOL_USDG-priced, so this path never touches Chainlink
///         (independent of stock-feed market hours).
/// @dev    Requires network: run explicitly with `forge test --match-path test/BasketFork.t.sol`.
///         Not part of the default suite (the mock tests cover logic deterministically).
contract BasketForkTest is Test {
    Basket basket;
    BasketFactory factory;
    address alice = address(0xA11CE);
    bool forkOk;

    function setUp() public {
        // Gated: default `forge test` stays offline. Run with `RH_FORK=1 forge test --match-path test/BasketFork.t.sol`.
        if (vm.envOr("RH_FORK", uint256(0)) == 0) return;
        forkOk = true;
        vm.createSelectFork("rh_mainnet");

        factory = new BasketFactory(RHChain.POOL_MANAGER, RHChain.USDG, address(this));
        // CASHCAT/USDG 0.5% pool — verified poolId 0xee0d95…4423, token=currency0, hookless
        PoolKey memory key =
            PoolKey(Currency.wrap(RHChain.CASHCAT), Currency.wrap(RHChain.USDG), 5000, 100, IHooks(address(0)));
        factory.setToken(RHChain.CASHCAT, TokenConfig(PriceSource.POOL_USDG, address(0), 0, key, true));
        factory.setGlobal(GlobalConfig(RHChain.STATE_VIEW, address(0), 3600, address(this)));

        address[] memory t = new address[](1);
        uint16[] memory w = new uint16[](1);
        t[0] = RHChain.CASHCAT;
        w[0] = 10000;
        basket = Basket(
            factory.createBasket(
                t, w, FeeConfig(100, 100, 8000, 1000, 1000), uint64(block.timestamp + 30 days), address(this)
            )
        );
    }

    function test_realDepositAndWithdraw() public {
        if (!forkOk) {
            vm.skip(true);
            return;
        }
        deal(RHChain.USDG, alice, 1_000e6);

        vm.startPrank(alice);
        IERC20(RHChain.USDG).approve(address(basket), type(uint256).max);
        uint256 shares = basket.deposit(100e6, 0); // buy $100 of CASHCAT via the live pool
        vm.stopPrank();

        console2.log("shares minted:", shares);
        console2.log("nav (USDG 6dp):", basket.nav());
        console2.log("CASHCAT held:", IERC20(RHChain.CASHCAT).balanceOf(address(basket)));
        assertGt(shares, 0, "deposit minted shares");
        assertGt(basket.nav(), 0, "basket holds value");
        assertGt(IERC20(RHChain.CASHCAT).balanceOf(address(basket)), 0, "real CASHCAT acquired");

        // round-trip back out (early exit → pays 1% fee)
        uint256 before = IERC20(RHChain.USDG).balanceOf(alice);
        vm.prank(alice);
        uint256 out = basket.withdraw(shares, 0);
        console2.log("USDG returned:", out);
        assertGt(out, 0, "withdraw returned USDG");
        assertEq(IERC20(RHChain.USDG).balanceOf(alice) - before, out);
        // ~2% pool fees (0.5% each way) + 1% exit fee + slippage on ~$100 into a deep pool
        assertGt(out, 90e6, "round-trip within sane bounds");
    }
}
