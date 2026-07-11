# HOODL — In-Kind Index Tokens: Smart-Contract Spec (as built)

*Robinhood Chain (mainnet 4663 / testnet 46630) · Foundry · branch `index-pivot`. Describes the shipped contracts in `src/`, verified by 60 unit/fuzz tests + 3 live mainnet-fork lifecycle tests. Supersedes the swap-based "HODL basket" design preserved on `hoodl-pvp-game`.*

## 0. Product in one paragraph

An **IndexFactory** lets anyone deploy an **IndexToken**: an ERC-20 whose every share (1e18) is a fixed basket — `units[i]` raw units of `components[i]`, forever. Mint by depositing the exact basket **in-kind**; redeem by burning shares for the exact basket back. That's the entire core: no swaps, no oracle, no manager, no keeper, no rebalancing, no admin over funds or composition. Revenue is small capped fees **in fully-backed shares** on both sides — protocol (30 bps mint / 10 bps redeem at deploy) plus an optional per-index **creator fee** (chosen at creation, immutable, 100 bps cap per side) so creators earn from their index's usage. Redeem fees are charged in shares, never from the basket: **redemption itself can never be gated**. Each index carries on-chain display metadata (description + image, served as a base64 `tokenURI()`). A periphery **IndexLens** reports NAV in USDG for UIs and integrators.

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
  ├─ createIndex(IndexParams{name, symbol, tokens[], units[], creatorMint/RedeemFeeBps,
  │              description, imageURI}) → new IndexToken            (open to anyone)
  │   └─ legacy 4-arg overload: zero creator fees, empty metadata
  ├─ mintFeeBps / redeemFeeBps (deploy: 30/10, HARD CAP 100 each) — snapshotted per index
  ├─ MAX_CREATOR_FEE_BPS = 100 per side (creator fees also snapshotted, chosen by creator)
  ├─ treasury (protocol fee recipient, read live by indexes at charge time)
  └─ registry: allIndexes[], isIndex

IndexToken (ERC20 + ReentrancyGuard)                ── core, zero admin over funds/composition
  ├─ immutable: components[], units[] (raw per 1e18 shares), factory,
  │             protocolMint/RedeemFeeBps, creatorMint/RedeemFeeBps (all snapshotted)
  ├─ creator (fee recipient; rotatable via setCreator — RATES stay immutable)
  ├─ mint(shares, to)    — pull ceil(units·shares/1e18) of each component; mint shares−fees to `to`,
  │                        protocol fee shares → factory.treasury(), creator fee shares → creator
  ├─ redeem(shares, to)  — fee shares TRANSFERRED to treasury/creator (never from the basket),
  │                        burn net, pay floor(units·net/1e18) of each component. Never gated.
  ├─ metadata: description, imageURI (setMetadata onlyCreator, display-only) +
  │            tokenURI()/contractURI() → on-chain base64 JSON {name, symbol, description, image}
  └─ views: components(), previewMint, previewRedeem, feeBps()

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

- Mint pulls `ceil(units_i · shares / 1e18)`; redeem pays `floor(units_i · netShares / 1e18)`.
- ⇒ **Solvency invariant**: `balanceOf(component_i) ≥ units_i · totalSupply / 1e18` at all times (fuzz-tested across mint/transfer/partial-redeem storms, incl. all four fees at their 1% caps). Rounding dust accrues to the vault, marginally over-collateralizing remaining holders.
- Mint is **deterministic** — no price, no slippage params, no deadline, no MEV surface.
- Decimals-agnostic: units are raw amounts, so 6-dec and 18-dec components mix freely (tested).
- Mint fees: `protocolFee = shares·protocolMintFeeBps/1e4` minted to treasury, `creatorFee = shares·creatorMintFeeBps/1e4` minted to creator, remainder to the minter — all backed by the same deposit ⇒ **zero dilution** of existing holders (unlike streaming fees).
- Redeem fees: same formula with the redeem rates, but taken by **transferring shares** from the redeemer to treasury/creator; only `netShares` are burned and paid out. The basket is never skimmed, so redemption stays market-free and ungateable; fee recipients hold ordinary fully-backed shares.

## 5. Contract APIs

```solidity
// IndexFactory
constructor(address owner, address treasury, uint16 mintFeeBps, uint16 redeemFeeBps); // each ≤ 100 bps
struct IndexParams { string name; string symbol; address[] tokens; uint256[] units;
    uint16 creatorMintFeeBps; uint16 creatorRedeemFeeBps;              // each ≤ 100 bps, immutable
    string description; string imageURI; }
function createIndex(IndexParams p) public returns (address);          // permissionless; msg.sender = creator
function createIndex(string name, string symbol, address[] tokens, uint256[] units)
    external returns (address);                                        // convenience: no creator fees/metadata
function setProtocolFees(uint16 mintBps, uint16 redeemBps) external onlyOwner; // future indexes only
function setTreasury(address) external onlyOwner;

// IndexToken — no admin over funds or composition; creator controls only metadata + fee recipient
function mint(uint256 shares, address to) external returns (uint256 sharesOut);
function redeem(uint256 shares, address to) external returns (uint256[] memory amounts);
function setCreator(address) external onlyCreator;                     // rotate fee recipient (rates fixed)
function setMetadata(string description, string imageURI) external onlyCreator; // display only
function components() external view returns (address[] memory, uint256[] memory);
function previewMint(uint256) external view returns (uint256[] memory, uint256);
function previewRedeem(uint256) external view returns (uint256[] memory); // net of redeem fees
function feeBps() external view returns (uint16, uint16, uint16, uint16); // pMint, pRedeem, cMint, cRedeem
function tokenURI() external view returns (string memory);             // EIP-1046-style base64 JSON
function contractURI() external view returns (string memory);          // same document
// constraints: 1–16 unique components, nonzero units, name/symbol free-form

// IndexLens
function setConfig(address token, PriceConfig) external onlyOwner;     // display-layer curation
function valueOf(address token, uint256 amount) public view returns (uint256 usdg6);
function navPerShare(address index) public view returns (uint256 usdg6);
```

## 6. Status & test coverage

`forge test` → **60 offline tests, 0 failures** (+3 gated fork tests):
- `IndexToken.t.sol` (20) — creation validation (dupes/empty/zero/16-cap), exact deterministic mint/redeem, ceil/floor rounding, four-way fee splits (protocol+creator × mint+redeem, exact), redeem fees taken in shares not basket, creator recipient rotation, metadata + escaped `tokenURI` JSON, transfer→third-party redeem, mixed 18/18/6-dec basket, **fuzz solvency invariant + no-free-lunch round trip (incl. all fees at 1% caps)**.
- `IndexFactory.t.sol` (9) — protocol + creator fee caps, **fee snapshot** (existing indexes keep their fees after a change), full-params + legacy creation, treasury rotation, registry, auth.
- `IndexLens.t.sol` (8) — Chainlink 18-dec + 6-dec valuation, pool-spot valuation, USDG identity, staleness revert, config validation, exact NAV summation.
- `IndexZap.t.sol` (9) — exact spend/refund vs a both-directions mock v4, cash-leg handling, slippage + unrouted-component reverts, **round trip loses exactly the mint fee** (suite runs 10 bps mint / 0 redeem) when pools are fee-less.
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

`script/Deploy.s.sol`: IndexFactory (protocol 30 bps mint / 10 bps redeem, treasury from env) + IndexLens (verified feed/pool configs) + IndexZap (routing configs) + flagship **"HOODL AI Index" (hAI)** = 0.05 NVDA + 0.025 TSLA + 60 CASHCAT per share (≈$32 at 2026-07-11 prices), with creator fees 20/10 bps, an on-chain SVG logo (base64 data URI) and description served via `tokenURI()`. Total flagship cost: 0.50% in / 0.20% out — still a fraction of HoodETF's 0.3–2% entry + up to 3%/yr management. `script/Seed.s.sol` then mints supply and bootstraps the hAI/USDG v4 pool at lens NAV with full-range liquidity (run from a wallet holding the components).

```
PRIVATE_KEY=… TREASURY=… forge script script/Deploy.s.sol --rpc-url rh_testnet --broadcast --verify
PRIVATE_KEY=… INDEX=… LENS=… forge script script/Seed.s.sol --rpc-url rh_testnet --broadcast
```

---
*Addresses: [`src/libraries/RHChain.sol`](src/libraries/RHChain.sol) · config: [`foundry.toml`](foundry.toml) (solc 0.8.26) · prior design: branch `hoodl-pvp-game`.*
