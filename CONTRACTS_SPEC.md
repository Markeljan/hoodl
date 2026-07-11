# HOODL — In-Kind Index Tokens: Smart-Contract Spec (as built)

*Robinhood Chain (mainnet 4663 / testnet 46630) · Foundry · branch `index-pivot`. Describes the shipped contracts in `src/`, verified by 41 unit/fuzz tests + a live mainnet-fork lifecycle test. Supersedes the swap-based "HODL basket" design preserved on `hoodl-pvp-game`.*

## 0. Product in one paragraph

An **IndexFactory** lets anyone deploy an **IndexToken**: an ERC-20 whose every share (1e18) is a fixed basket — `units[i]` raw units of `components[i]`, forever. Mint by depositing the exact basket **in-kind**; redeem by burning shares for the exact basket back. That's the entire core: no swaps, no oracle, no manager, no keeper, no rebalancing, no admin functions. A one-time **0.10% mint fee** (in fully-backed shares) is the protocol's only revenue; **redemption is always free**. A periphery **IndexLens** reports NAV in USDG for UIs and integrators.

## 1. The three unlocks (why this and not "an ETF onchain")

1. **Permissionless issuance.** `createIndex` is open — no fund wrapper, no AP status, no allowlist. The killer instance is **cross-asset**: no vehicle on earth holds NVDA and a memecoin in one ticker; here it's one call.
2. **Self-maintaining.** Fixed units = cap-weight behavior: USD weights float exactly like a held portfolio, so there is *nothing to manage* — rebalancing was a design choice, not a necessity. The peg to NAV is maintained by **open in-kind create/redeem arbitrage** (everyone is the AP). Composition is immutable: stronger than "no rug" — there is no composition risk at all.
3. **The index is money.** Shares are a standard ERC-20 with onchain-verifiable holdings: transferable, LP-able, collateralizable. Redemption needs **zero DEX liquidity** — the thin stock pools that killed swap-based designs are irrelevant to solvency here.

## 2. Design facts that shaped it (verified on-chain, 2026-07-11)

- **Stock-token DEX liquidity is thin** (~$15–41k for the top 4; SPY/QQQ ≈ $0) → any swap-dependent basket eats slippage and can strand redemptions. In-kind sidesteps it entirely.
- **ERC-8056 corporate actions are a no-op for raw-unit accounting**: splits change `uiMultiplier`, never raw `balanceOf`; Chainlink feeds return the multiplier-adjusted price per raw token. Fixed raw units are split-proof.
- **Non-standard ERC-20s** (fee-on-transfer, rebasing) are unsupported: an index containing one is broken *in isolation* — each index is its own contract, so nothing else is affected. Curation is a display-layer (lens/frontend) concern, mirroring Uniswap's permissionless-pool posture.
- Lens data: NVDA/USD `0x379EC4f7…9F15`, TSLA/USD `0x4A1166a6…7C38` (Chainlink robinhood directory); CASHCAT/USDG v4 pool (fee 5000, tickSpacing 100, hookless) — PoolKey hash-verified against the live poolId.
- Zap routing (V4Quoter-probed): NVDA buys must route the **0.3%** NVDA/USDG pool — the nominally-deeper 1% pool is **one-sided** and cannot sell NVDA at any size. TSLA 0.3%, CASHCAT 0.5%. Real depth, not reported liquidity, decides routing.

## 3. Architecture

```
IndexFactory (Ownable)                              ── core, permissionless
  ├─ createIndex(name, symbol, tokens[], units[]) → new IndexToken   (open to anyone)
  ├─ mintFeeBps (default 10, HARD CAP 50) — snapshotted into each index at creation
  ├─ treasury (fee recipient, read live by indexes at mint time)
  └─ registry: allIndexes[], isIndex

IndexToken (ERC20 + ReentrancyGuard)                ── core, zero admin surface
  ├─ immutable: components[], units[] (raw per 1e18 shares), mintFeeBps, factory
  ├─ mint(shares, to)    — pull ceil(units·shares/1e18) of each component; mint shares−fee to `to`,
  │                        fee shares to factory.treasury()
  ├─ redeem(shares, to)  — burn, pay floor(units·shares/1e18) of each component. Always. Free.
  └─ views: components(), previewMint, previewRedeem

IndexLens (Ownable)                                 ── periphery, display/integration only
  ├─ per-token PriceConfig: CHAINLINK (feed + staleness) | POOL_USDG (token/USDG v4 pool spot)
  ├─ valueOf(token, amount) → USDG 6-dec   (USDG itself values 1:1, no config)
  └─ navPerShare(index) / navOf(index, shares)

IndexZap (Ownable + SafeCallback)                   ── periphery, pure UX convenience
  ├─ owner-set token → token/USDG PoolKey routing (orientation derived from the key)
  ├─ zapMint(index, grossShares, maxUsdgIn): EXACT-OUTPUT v4 buys of each component → in-kind
  │    mint to user → refund unspent USDG. Partial fill reverts (InsufficientLiquidity).
  ├─ zapRedeem(index, shares, minUsdgOut): in-kind redeem → exact-input sales → USDG to user
  └─ no oracle: the user's max/min bounds are the only price guard; USDG cash legs skip swaps

Core deps: OpenZeppelin only (ERC20, SafeERC20, Math, ReentrancyGuard, Ownable).
Periphery deps: + v4-core (PoolKey/PoolManager), StateView 0xF3334192…673b, Chainlink feeds, PriceLib.
```

## 4. Math & rounding (the whole risk surface)

- Mint pulls `ceil(units_i · shares / 1e18)`; redeem pays `floor(units_i · shares / 1e18)`.
- ⇒ **Solvency invariant**: `balanceOf(component_i) ≥ units_i · totalSupply / 1e18` at all times (fuzz-tested across mint/transfer/partial-redeem storms). Rounding dust accrues to the vault, marginally over-collateralizing remaining holders.
- Mint is **deterministic** — no price, no slippage params, no deadline, no MEV surface.
- Decimals-agnostic: units are raw amounts, so 6-dec and 18-dec components mix freely (tested).
- Fee: `feeShares = shares · mintFeeBps / 10000` minted to treasury, `shares − feeShares` to the minter — both backed by the same deposit ⇒ **zero dilution** of existing holders (unlike streaming fees).

## 5. Contract APIs

```solidity
// IndexFactory
constructor(address owner, address treasury, uint16 mintFeeBps);       // fee ≤ 50 bps
function createIndex(string name, string symbol, address[] tokens, uint256[] units)
    external returns (address);                                        // permissionless
function setMintFeeBps(uint16) external onlyOwner;                     // future indexes only
function setTreasury(address) external onlyOwner;

// IndexToken — no admin functions exist
function mint(uint256 shares, address to) external returns (uint256 sharesOut);
function redeem(uint256 shares, address to) external returns (uint256[] memory amounts);
function components() external view returns (address[] memory, uint256[] memory);
function previewMint(uint256) external view returns (uint256[] memory, uint256);
function previewRedeem(uint256) external view returns (uint256[] memory);
// constraints: 1–16 unique components, nonzero units, name/symbol free-form

// IndexLens
function setConfig(address token, PriceConfig) external onlyOwner;     // display-layer curation
function valueOf(address token, uint256 amount) public view returns (uint256 usdg6);
function navPerShare(address index) public view returns (uint256 usdg6);
```

## 6. Status & test coverage

`forge test` → **50 offline tests, 0 failures** (+3 gated fork tests):
- `IndexToken.t.sol` (13) — creation validation (dupes/empty/zero/16-cap), exact deterministic mint/redeem, ceil/floor rounding, fee split, transfer→third-party redeem, mixed 18/18/6-dec basket, **fuzz solvency invariant + no-free-lunch round trip**.
- `IndexFactory.t.sol` (7) — fee cap, **fee snapshot** (existing indexes keep their fee after a change), treasury rotation, registry, auth.
- `IndexLens.t.sol` (8) — Chainlink 18-dec + 6-dec valuation, pool-spot valuation, USDG identity, staleness revert, config validation, exact NAV summation.
- `IndexZap.t.sol` (9) — exact spend/refund vs a both-directions mock v4, cash-leg handling, slippage + unrouted-component reverts, **round trip loses exactly the 10bps fee** when pools are fee-less.
- `PriceLib.t.sol` (14) — decimal math (incl. 6-dec tokens), sqrtPrice conversion, feed/sequencer guards.
- `IndexFork.t.sol` (**RH_FORK=1**) — mints the AI Index from **real NVDA + TSLA + CASHCAT fully in-kind (zero DEX interaction)**, exact pulls (0.5 / 0.25 / 600), transfer + third-party exact redemption, live NAV **$32.62/share** from real Chainlink + the real v4 pool.
- `ZapSeedFork.t.sol` (**RH_FORK=1**) — (A) zap on real pools: 1 hAI bought with plain USDG for **$32.25**, round trip back at ~0.8% total cost; (B) the full retail loop: seed a fresh hAI/USDG pool at NAV via the **real PositionManager + Permit2**, a retail wallet buys 1.504 hAI with USDG on it, then redeems in-kind — ending with real NVDA it never bought directly.

## 7. Known limits / explicit cuts (v1)

- **Composition is immutable** — reconstitution = redeem→mint into a successor index (migration tooling is roadmap M3). This is a feature, not a gap: nothing to govern, nothing to rug.
- **Lens pool-spot is manipulable within a block** — it gates nothing in the core; integrators pricing collateral off the lens must add TWAP/deviation guards (documented in natspec).
- **Fee-on-transfer/rebasing components unsupported** (isolated breakage, documented).
- **Zap depth-bounded**: `zapMint` needs live pool depth for every component and reverts loudly when a leg can't fill — in-kind mint/redeem always works regardless.
- Airdrops/donations to an index are unrecoverable surplus (no sweep function — smaller attack surface).

## 8. Deploy

`script/Deploy.s.sol`: IndexFactory (10 bps, treasury from env) + IndexLens (verified feed/pool configs) + IndexZap (routing configs) + flagship **"HOODL AI Index" (hAI)** = 0.05 NVDA + 0.025 TSLA + 60 CASHCAT per share (≈$32 at 2026-07-11 prices). `script/Seed.s.sol` then mints supply and bootstraps the hAI/USDG v4 pool at lens NAV with full-range liquidity (run from a wallet holding the components).

```
PRIVATE_KEY=… TREASURY=… forge script script/Deploy.s.sol --rpc-url rh_testnet --broadcast --verify
PRIVATE_KEY=… INDEX=… LENS=… forge script script/Seed.s.sol --rpc-url rh_testnet --broadcast
```

---
*Addresses: [`src/libraries/RHChain.sol`](src/libraries/RHChain.sol) · config: [`foundry.toml`](foundry.toml) (solc 0.8.26) · prior design: branch `hoodl-pvp-game`.*
