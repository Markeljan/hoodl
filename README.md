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
  periphery/IndexZap.sol  one-tx USDG ↔ index router (exact-output v4 buys + in-kind mint)
  libraries/PriceLib.sol  decimals-agnostic valuation + feed staleness/sequencer guards (lens-only)
  libraries/RHChain.sol   verified Robinhood Chain addresses (checksummed at compile)
test/                     50 offline unit/fuzz tests + 3 gated mainnet-fork tests
script/Deploy.s.sol       factory + lens + zap + flagship "HOODL AI Index" (NVDA + TSLA + CASHCAT)
script/Seed.s.sol         mint supply + bootstrap the hAI/USDG v4 pool at NAV (PositionManager LP)
```

**Flagship fee:** hAI charges 0.50% on mint (0.30% protocol + 0.20% creator) and 0.20% on redeem (0.10% protocol + 0.10% creator). Fees are paid in fully backed index shares, hard-capped at 1% per fee leg, and snapshotted at index creation so existing indexes can never be repriced. The redemption path itself remains permissionless and market-independent.

**Rounding invariant:** deposits round up, redemptions round down ⇒ `balanceOf(component) ≥ units·totalSupply/1e18` always (fuzz-tested).

## Usage

```shell
forge build          # solc 0.8.26
forge test           # 50 offline tests (fork tests auto-skip)
RH_FORK=1 forge test --match-path "test/*Fork*" -vv          # live mainnet-fork validation
PRIVATE_KEY="$DEPLOYER_PRIVATE_KEY" TREASURY=… forge script script/Deploy.s.sol --rpc-url rh_testnet --broadcast --verify
PRIVATE_KEY=… INDEX=… LENS=… forge script script/Seed.s.sol --rpc-url rh_testnet --broadcast
```

The fork tests prove the whole loop on live mainnet state: in-kind mint of real NVDA + TSLA + CASHCAT with zero DEX dependency (NAV **$32.62/share** from real Chainlink + v4); **zapMint** buying 1 hAI with plain USDG for **$32.25** and round-tripping back at ~0.8% total cost; and the **seed loop** — bootstrap a fresh hAI/USDG pool at NAV via the real PositionManager, retail buys hAI with USDG on it, then redeems in-kind and walks away holding real NVDA.

### How people buy in

1. **DEX (retail):** swap USDG → hAI on the seeded v4 pool — one click, price pinned to NAV by arbitrage.
2. **Zap (one tx):** `zapMint(index, shares, maxUsdgIn)` buys the components and mints in-kind.
3. **In-kind (arbitrageurs/APs):** deposit the exact basket via `mint()` — the peg mechanism itself.

## Verified addresses (mainnet 4663)

Full list in [`src/libraries/RHChain.sol`](src/libraries/RHChain.sol): USDG `0x5fc5…d168`, StateView `0xF333…673b`, NVDA/USD feed `0x379E…9F15`, TSLA/USD feed `0x4A11…7C38`, CASHCAT/USDG v4 pool (fee 5000, spacing 100, hookless — poolId hash-verified).

## Mainnet deployment

Deployed on Robinhood Chain mainnet (chain ID 4663) in block `7711193`:

- IndexFactory: `0x9C1746bB146E1713DaD64aFC0c8becA5Ee5B9882`
- IndexLens: `0x6F379d544597EBA7A19e13B5b589E832975b5EF4`
- IndexZap: `0x717500F9BA2BFF85C047fEaCb3F98F7a667BfdE2`
- hAI: `0x9f5e540829A647C6BFC02066888Ee6f9E43708FD`

Frontend-ready addresses, ABIs, configuration, and transaction records are in
[`deployments/robinhood-mainnet.json`](deployments/robinhood-mainnet.json).

## Status

Contracts deployed after 60/60 offline tests and 3/3 live mainnet-fork lifecycle tests passed.
