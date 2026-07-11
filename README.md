# HOODL — a HODL basket game on Robinhood Chain

Create a **basket** of tokenized stocks + memecoins with target weights and a **hodl-till date**. Anyone buys in with **USDG**; the basket swaps into the underlying and mints shares. Buy-in and early exit charge a small fee — and **most of every fee goes to the participants who keep holding**, claimable only after the hodl-till date. Bail early and you **forfeit** your accrued reward *and* pay the exit fee, both redistributed to the diamond-hands who stay. It's a HODL game wrapped around a real on-chain portfolio.

Built for Robinhood Chain (mainnet 4663 / testnet 46630) with Foundry, Uniswap v4, and Chainlink.

## How it works

- **`BasketFactory`** (singleton) — a protocol-owned registry of allowed tokens (each with its price source + token/USDG pool) that deploys baskets.
- **`Basket`** (one per basket) — custodies the tokens, swaps **USDG↔token directly on Uniswap v4** (one hop; the liquid pools on this chain are token/USDG), prices holdings via **Chainlink** (stocks) or **token/USDG pool spot** (memecoins), and runs a MasterChef-style **USDG reward pool** that pays holders the fee flow and locks claims until `hodlTill`.

Default economics: **1% entry / 1% exit**, split **80% holders / 10% creator / 10% protocol**. Rebalancing is admin-triggered. Shares are a non-transferable internal ledger.

See [`CONTRACTS_SPEC.md`](CONTRACTS_SPEC.md) for the full spec, flows, and math.

## Layout

```
src/
  BasketFactory.sol      registry + createBasket
  Basket.sol             the vault (deposit/withdraw/claim/rebalance + v4 unlock callback)
  BasketTypes.sol        PriceSource / TokenConfig / GlobalConfig / FeeConfig
  libraries/
    PriceLib.sol         USDG valuation, Chainlink staleness + sequencer guard
    RHChain.sol          verified Robinhood Chain addresses (checksum-validated at compile)
  interfaces/            IAggregatorV3, IStateView, IBasketFactory
test/
  PriceLib.t.sol, BasketFactory.t.sol, BasketAccounting.t.sol   37 offline unit tests
  BasketFork.t.sol       live mainnet-fork integration test (gated)
  mocks/                 MockERC20, MockAggregator, MockPoolManager (reproduces v4 flash accounting)
script/Deploy.s.sol      deploys the factory + flagship basket (verified feeds + pools)
```

## Usage

```shell
forge build          # compile (solc 0.8.26, evm cancun — v4 needs transient storage)
forge test           # 37 offline unit tests (fork test auto-skips)
forge fmt            # format
```

### Live mainnet-fork test

Exercises a real deposit→withdraw against live Uniswap v4 liquidity on Robinhood Chain:

```shell
RH_FORK=1 forge test --match-path test/BasketFork.t.sol -vv
```

### Deploy

```shell
PRIVATE_KEY=… TREASURY=… forge script script/Deploy.s.sol --rpc-url rh_testnet --broadcast --verify
```

RPC aliases (`rh_mainnet` / `rh_testnet`) are in [`foundry.toml`](foundry.toml). Set `SEQUENCER_FEED` in the script before a mainnet run.

## Verified addresses (mainnet 4663)

Full list in [`src/libraries/RHChain.sol`](src/libraries/RHChain.sol). Key ones:

| | Address |
|---|---|
| Uniswap v4 PoolManager | `0x8366a39CC670B4001A1121B8F6A443A643e40951` |
| Uniswap v4 StateView | `0xF3334192D15450CdD385c8B70e03f9A6bD9E673b` |
| USDG (Global Dollar, 6-dec) | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` |
| NVDA / USD feed | `0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15` |
| TSLA / USD feed | `0x4A1166a659A55625345e9515b32adECea5547C38` |

Liquid token/USDG v4 pools (all hookless, PoolKeys hash to live poolIds): CASHCAT/USDG 0.5%, NVDA/USDG 1%, TSLA/USDG 0.3%.

## Status

Contracts implemented, unit-tested (37/37), and validated against live mainnet via the fork test. Deploy script ready; testnet broadcast pending.
