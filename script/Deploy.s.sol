// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {BasketFactory} from "../src/BasketFactory.sol";
import {RHChain} from "../src/libraries/RHChain.sol";
import {TokenConfig, GlobalConfig, FeeConfig, PriceSource} from "../src/BasketTypes.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";

/// @title Deploy — HOODL BasketFactory + flagship basket on Robinhood Chain (mainnet 4663)
/// @notice All addresses/pools below are VERIFIED on-chain (2026-07-11): the PoolKeys hash exactly to
///         the live poolIds, and the feed proxies come from Chainlink's robinhood feed directory.
///         Every liquid v4 pool on this chain is token/USDG direct + hookless.
///   • NVDA/USD feed  0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15
///   • TSLA/USD feed  0x4A1166a659A55625345e9515b32adECea5547C38
///   • CASHCAT/USDG   poolId 0xee0d95…4423 (fee 5000, ts 100)   token=currency0
///   • NVDA/USDG      poolId 0x5e86db9a…b8ac (fee 10000, ts 200) token=currency1
///   • TSLA/USDG      poolId 0x8517f807…d32e (fee 3000, ts 60)   token=currency0
///   TODO before prod: set the L2 sequencer-uptime feed (left 0 = check skipped).
///
/// Run (testnet): forge script script/Deploy.s.sol --rpc-url rh_testnet --broadcast --verify
contract Deploy is Script {
    address constant NVDA_FEED = 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15;
    address constant TSLA_FEED = 0x4A1166a659A55625345e9515b32adECea5547C38;
    address constant SEQUENCER_FEED = address(0); // TODO: set on mainnet
    uint256 constant FEED_STALENESS = 3 days; // stock feeds are 24/5 — span weekends

    function _key(address c0, address c1, uint24 fee, int24 ts) internal pure returns (PoolKey memory) {
        return PoolKey(Currency.wrap(c0), Currency.wrap(c1), fee, ts, IHooks(address(0)));
    }

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envOr("TREASURY", vm.addr(pk));
        vm.startBroadcast(pk);

        BasketFactory factory = new BasketFactory(RHChain.POOL_MANAGER, RHChain.USDG, vm.addr(pk));

        // CASHCAT: memecoin, priced from its USDG pool. token=currency0.
        factory.setToken(
            RHChain.CASHCAT,
            TokenConfig(PriceSource.POOL_USDG, address(0), 0, _key(RHChain.CASHCAT, RHChain.USDG, 5000, 100), true)
        );
        // NVDA: Chainlink-priced. In its pool USDG=currency0, so token is currency1.
        factory.setToken(
            RHChain.NVDA,
            TokenConfig(
                PriceSource.CHAINLINK, NVDA_FEED, FEED_STALENESS, _key(RHChain.USDG, RHChain.NVDA, 10000, 200), false
            )
        );
        // TSLA: Chainlink-priced. token=currency0.
        factory.setToken(
            RHChain.TSLA,
            TokenConfig(
                PriceSource.CHAINLINK, TSLA_FEED, FEED_STALENESS, _key(RHChain.TSLA, RHChain.USDG, 3000, 60), true
            )
        );

        factory.setGlobal(GlobalConfig(RHChain.STATE_VIEW, SEQUENCER_FEED, 3600, treasury));

        // Flagship basket: 50% CASHCAT (deepest liquidity) / 25% NVDA / 25% TSLA.
        address[] memory tokens = new address[](3);
        uint16[] memory weights = new uint16[](3);
        tokens[0] = RHChain.CASHCAT;
        tokens[1] = RHChain.NVDA;
        tokens[2] = RHChain.TSLA;
        weights[0] = 5000;
        weights[1] = 2500;
        weights[2] = 2500;

        address basket = factory.createBasket(
            tokens, weights, FeeConfig(100, 100, 8000, 1000, 1000), uint64(block.timestamp + 30 days), vm.addr(pk)
        );

        vm.stopBroadcast();
        console2.log("BasketFactory:", address(factory));
        console2.log("Flagship basket:", basket);
    }
}
