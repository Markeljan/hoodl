// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IndexFactory} from "../src/IndexFactory.sol";
import {IndexLens} from "../src/periphery/IndexLens.sol";
import {RHChain} from "../src/libraries/RHChain.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";

/// @title Deploy — HOODL IndexFactory + IndexLens + flagship cross-asset index (Robinhood Chain)
/// @notice Core needs zero external config (no oracle, no DEX). The lens configs below are
///         on-chain-verified (2026-07-11): feed proxies from Chainlink's robinhood directory; the
///         CASHCAT/USDG PoolKey hashes to the live poolId.
///
/// Run (testnet): PRIVATE_KEY=… TREASURY=… forge script script/Deploy.s.sol --rpc-url rh_testnet --broadcast --verify
contract Deploy is Script {
    address constant NVDA_FEED = 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15;
    address constant TSLA_FEED = 0x4A1166a659A55625345e9515b32adECea5547C38;
    uint256 constant FEED_STALENESS = 3 days; // stock feeds are 24/5 — span weekends
    uint16 constant MINT_FEE_BPS = 10; // 0.10% on mint; redemption always free

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address treasury = vm.envOr("TREASURY", deployer);
        vm.startBroadcast(pk);

        // ── core: permissionless issuance, one capped fee ──
        IndexFactory factory = new IndexFactory(deployer, treasury, MINT_FEE_BPS);

        // ── periphery: NAV lens (display + integrations only) ──
        IndexLens lens = new IndexLens(RHChain.STATE_VIEW, RHChain.USDG, deployer);
        lens.setConfig(
            RHChain.NVDA,
            IndexLens.PriceConfig(IndexLens.Source.CHAINLINK, NVDA_FEED, FEED_STALENESS, _emptyKey(), false)
        );
        lens.setConfig(
            RHChain.TSLA,
            IndexLens.PriceConfig(IndexLens.Source.CHAINLINK, TSLA_FEED, FEED_STALENESS, _emptyKey(), false)
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

        // ── flagship: the AI trade across both asset classes, one ERC-20 ──
        // Units are per 1e18 shares, illustrative at 2026-07-11 prices (~$30/share):
        // 0.05 NVDA (~$10.5) + 0.025 TSLA (~$10.2) + 60 CASHCAT (~$9.8).
        address[] memory tokens = new address[](3);
        uint256[] memory units = new uint256[](3);
        tokens[0] = RHChain.NVDA;
        units[0] = 5e16;
        tokens[1] = RHChain.TSLA;
        units[1] = 25e15;
        tokens[2] = RHChain.CASHCAT;
        units[2] = 60e18;
        address index = factory.createIndex("HOODL AI Index", "hAI", tokens, units);

        vm.stopBroadcast();
        console2.log("IndexFactory:", address(factory));
        console2.log("IndexLens:   ", address(lens));
        console2.log("hAI index:   ", index);
    }

    function _emptyKey() internal pure returns (PoolKey memory) {
        return PoolKey(Currency.wrap(address(0)), Currency.wrap(address(0)), 0, 0, IHooks(address(0)));
    }
}
