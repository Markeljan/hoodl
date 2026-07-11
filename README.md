# HOODL — permissionless index tokens on Robinhood Chain

One ERC-20 that **is** a basket of tokenized stocks + crypto. Anyone creates an index; anyone mints it by depositing the exact basket **in-kind**; anyone redeems it back to the underlying, always, with no market required. No manager, no keeper, no oracle, no rebalancing — and the share is a standard ERC-20 you can transfer, LP, or post as collateral.

Built with Foundry for Robinhood Chain (mainnet 4663 / testnet 46630) — the only chain where tokenized equities (NVDA, TSLA, …) and memecoins coexist as composable ERC-20s.

## The three unlocks

1. **Permissionless issuance** — `createIndex(name, symbol, tokens[], units[])`. No fund wrapper, no AP status, no allowlist. Cross-asset by construction: no legal vehicle anywhere holds NVDA and a memecoin in one ticker.
2. **Self-maintaining** — units per share are fixed and composition is immutable, so USD weights float exactly like a held portfolio (cap-weight behavior): there is *nothing to manage*. Peg to NAV is held by open arbitrage — anyone can mint/redeem in-kind, so everyone is the authorized participant. Corporate actions are a no-op: ERC-8056 stock tokens keep raw balances constant through splits, and Chainlink feeds are multiplier-adjusted.
3. **The index is money** — a standard ERC-20 with onchain-verifiable holdings. Redemption is exact, deterministic, and needs zero DEX liquidity (thin stock pools are irrelevant to solvency).

## Architecture

```
src/
  IndexFactory.sol        permissionless issuance + the protocol's single fee knob
  IndexToken.sol          the index: ERC-20 + in-kind mint/redeem (no oracle, no DEX, no admin)
  periphery/IndexLens.sol NAV in USDG for UIs/integrators (Chainlink stocks, v4 pool spot memecoins)
  libraries/PriceLib.sol  decimals-agnostic valuation + feed staleness/sequencer guards (lens-only)
  libraries/RHChain.sol   verified Robinhood Chain addresses (checksummed at compile)
test/                     41 offline unit/fuzz tests + gated mainnet-fork lifecycle test
script/Deploy.s.sol       factory + lens + flagship "HOODL AI Index" (NVDA + TSLA + CASHCAT)
```

**Fee:** 0.10% on mint, paid in index shares to the treasury — fully backed by the minter's deposit (zero dilution), hard-capped at 0.5%, snapshotted per index at creation so existing indexes can never be repriced. **Redemption is always free.**

**Rounding invariant:** deposits round up, redemptions round down ⇒ `balanceOf(component) ≥ units·totalSupply/1e18` always (fuzz-tested).

## Usage

```shell
forge build          # solc 0.8.26
forge test           # 41 offline tests (fork test auto-skips)
RH_FORK=1 forge test --match-path test/IndexFork.t.sol -vv   # live mainnet-fork lifecycle
PRIVATE_KEY=… TREASURY=… forge script script/Deploy.s.sol --rpc-url rh_testnet --broadcast --verify
```

The fork test mints the AI Index from real NVDA + TSLA + CASHCAT fully in-kind (zero DEX interaction), transfers it, redeems it exactly, and reads a live NAV (**$32.62/share** at 2026-07-11 prices) from real Chainlink feeds + the real CASHCAT/USDG v4 pool.

## Verified addresses (mainnet 4663)

Full list in [`src/libraries/RHChain.sol`](src/libraries/RHChain.sol): USDG `0x5fc5…d168`, StateView `0xF333…673b`, NVDA/USD feed `0x379E…9F15`, TSLA/USD feed `0x4A11…7C38`, CASHCAT/USDG v4 pool (fee 5000, spacing 100, hookless — poolId hash-verified).

## Status

Contracts implemented and green: 41/41 offline tests + mainnet-fork lifecycle validated. Broadcast pending (needs a funded key).
