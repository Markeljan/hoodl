// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {FixedPoint96} from "v4-core/src/libraries/FixedPoint96.sol";
import {IndexLens} from "../src/periphery/IndexLens.sol";
import {IndexFactory} from "../src/IndexFactory.sol";
import {IndexToken} from "../src/IndexToken.sol";
import {PriceLib} from "../src/libraries/PriceLib.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockAggregator} from "./mocks/MockAggregator.sol";
import {MockStateView} from "./mocks/MockStateView.sol";

contract IndexLensTest is Test {
    using PoolIdLibrary for PoolKey;

    IndexLens lens;
    MockStateView sv;
    MockERC20 usdg; // 6-dec quote
    MockERC20 stock; // 18-dec, Chainlink-priced
    MockERC20 stock6; // 6-dec, Chainlink-priced (decimals-agnostic proof)
    MockERC20 meme; // 18-dec, pool-priced
    MockAggregator stockFeed;
    MockAggregator feed6;

    function setUp() public {
        vm.warp(1_000_000);
        sv = new MockStateView();
        usdg = new MockERC20("USDG", "USDG", 6);
        stock = new MockERC20("STOCK", "STK", 18);
        stock6 = new MockERC20("SIX", "SIX", 6);
        meme = new MockERC20("MEME", "MEME", 18);
        stockFeed = new MockAggregator(8, 200e8); // $200
        feed6 = new MockAggregator(8, 2e8); // $2
        stockFeed.set(200e8, block.timestamp);
        feed6.set(2e8, block.timestamp);
        lens = new IndexLens(address(sv), address(usdg), address(this));
    }

    // ── helpers ──

    function _chainlinkCfg(address feed) internal pure returns (IndexLens.PriceConfig memory) {
        return IndexLens.PriceConfig(
            IndexLens.Source.CHAINLINK,
            feed,
            3600,
            PoolKey(Currency.wrap(address(0)), Currency.wrap(address(0)), 0, 0, IHooks(address(0))),
            false
        );
    }

    function _poolCfg(address token) internal view returns (IndexLens.PriceConfig memory cfg, bytes32 poolId) {
        bool tokenIsC0 = token < address(usdg);
        PoolKey memory key = tokenIsC0
            ? PoolKey(Currency.wrap(token), Currency.wrap(address(usdg)), 3000, 60, IHooks(address(0)))
            : PoolKey(Currency.wrap(address(usdg)), Currency.wrap(token), 3000, 60, IHooks(address(0)));
        cfg = IndexLens.PriceConfig(IndexLens.Source.POOL_USDG, address(0), 0, key, tokenIsC0);
        poolId = PoolId.unwrap(key.toId());
    }

    // ── valueOf ──

    function test_chainlinkValue18Dec() public {
        lens.setConfig(address(stock), _chainlinkCfg(address(stockFeed)));
        assertEq(lens.valueOf(address(stock), 2e18), 400e6, "2 x $200");
    }

    function test_chainlinkValue6DecToken() public {
        lens.setConfig(address(stock6), _chainlinkCfg(address(feed6)));
        assertEq(lens.valueOf(address(stock6), 3e6), 6e6, "3 x $2, 6-dec token");
    }

    function test_poolValue() public {
        (IndexLens.PriceConfig memory cfg, bytes32 poolId) = _poolCfg(address(meme));
        lens.setConfig(address(meme), cfg);
        sv.setSlot0(poolId, uint160(2 * FixedPoint96.Q96)); // ratio (c1/c0) = 4
        uint256 expected = cfg.tokenIsCurrency0 ? 4e18 : 25e16;
        assertEq(lens.valueOf(address(meme), 1e18), expected);
    }

    function test_usdgIdentity() public view {
        // the quote asset needs no config: 7 USDG = 7 USDG
        assertEq(lens.valueOf(address(usdg), 7e6), 7e6);
    }

    function test_unconfiguredReverts() public {
        vm.expectRevert(abi.encodeWithSelector(IndexLens.NotConfigured.selector, address(meme)));
        lens.valueOf(address(meme), 1e18);
    }

    function test_staleFeedReverts() public {
        lens.setConfig(address(stock), _chainlinkCfg(address(stockFeed)));
        vm.warp(block.timestamp + 7200); // past 3600s staleness
        vm.expectRevert(PriceLib.StalePrice.selector);
        lens.valueOf(address(stock), 1e18);
    }

    function test_setConfig_validatesPoolKey() public {
        (IndexLens.PriceConfig memory cfg,) = _poolCfg(address(meme));
        cfg.tokenIsCurrency0 = !cfg.tokenIsCurrency0; // now inconsistent with the key
        vm.expectRevert(IndexLens.BadConfig.selector);
        lens.setConfig(address(meme), cfg);
    }

    // ── NAV over a real index ──

    function test_navPerShare_and_navOf() public {
        lens.setConfig(address(stock), _chainlinkCfg(address(stockFeed)));
        (IndexLens.PriceConfig memory cfg, bytes32 poolId) = _poolCfg(address(meme));
        lens.setConfig(address(meme), cfg);
        // sqrtP = Q96 >> 20  =>  ratio = 2^-40 exactly (power of two keeps assertions exact)
        sv.setSlot0(poolId, uint160(FixedPoint96.Q96 >> 20));

        IndexFactory factory = new IndexFactory(address(this), address(0xCAFE), 10, 0);
        address[] memory t = new address[](2);
        uint256[] memory u = new uint256[](2);
        t[0] = address(stock);
        u[0] = 5e16; // 0.05 x $200 = $10 = 10e6
        t[1] = address(meme);
        u[1] = 60e18;
        address idx = factory.createIndex("AI", "AI", t, u);

        uint256 memeLeg = cfg.tokenIsCurrency0 ? uint256(60e18) >> 40 : uint256(60e18) << 40;
        assertEq(lens.navPerShare(idx), 10e6 + memeLeg);
        assertEq(lens.navOf(idx, 5e17), (10e6 + memeLeg) / 2, "half a share");
    }
}
