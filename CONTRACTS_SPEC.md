# HOODL — Basket Factory: Smart-Contract Spec (as built)

*Robinhood Chain (mainnet 4663 / testnet 46630) · Foundry · Uniswap v4 · Chainlink. This describes the **shipped** contracts (`src/`), verified by 37 unit tests + a live mainnet-fork test.*

## 0. Product in one paragraph

A **factory** deploys **baskets**. A creator picks a mix of tokens (Robinhood stock tokens + whitelisted memecoins) with target weights and a **hodl-till date**. Anyone buys in with **USDG** at any time; the basket swaps USDG into the underlying per weights and mints (non-transferable) **shares**. Buy-in and early exit charge a fee (default **1% each way**, configurable). **Most of every fee is paid to the participants still in the basket** — accrued as a USDG reward that is **only claimable after the hodl-till date**. Quit before the date and you **forfeit** your accrued reward *and* pay the exit fee — both redistribute to the diamond-hands who stay. Small cuts go to the basket creator and the protocol. It's a HODL game wrapped around a real on-chain portfolio.

## 1. Locked decisions

| Decision | Choice |
|---|---|
| Settlement asset | **USDG buy-in + swaps** (users pay USDG; vault swaps into the basket) |
| Assets in v1 | **Both** stock tokens *and* memecoins |
| Basket shape | **Multi-token** baskets with target weights (Σ = 10 000 bps) |
| Fee | Entry + exit, default **100 bps** each, configurable per basket (≤ 10%) |
| Fee split (default) | **holders 80% / creator 10% / protocol 10%** (holders must stay ≥ 50%) |
| Reward claim | Locked until `hodlTill`; **forfeited pro-rata on early exit** |
| Rebalance | **Admin-triggered**, manual (sell → USDG → buy) |
| Shares | **Non-transferable internal ledger** (no ERC-20 in v1) |

## 2. On-chain reality that shaped the design (verified 2026-07-11 via `cast`)

1. **Routing is USDG-direct, not WETH.** Every WETH-paired v4 pool is empty, and stock tokens have **no WETH pool at all** — they pair against **USDG** directly. The liquid pools are all **token/USDG, hookless**: CASHCAT/USDG 0.5% (L≈3.8e18), NVDA/USDG 1% (L≈5.2e15), TSLA/USDG 0.3% (L≈1.3e16). Each constructed PoolKey **hashes to its live poolId** (fee, tickSpacing, `hooks=0` all confirmed). → route **USDG↔token in one hop**; no WETH intermediary, no ETH/USD feed.
2. **The two asset classes price differently.** Stock tokens have a **Chainlink** feed (8-dec, already ×ERC-8056 UI-multiplier — use **raw** `balanceOf`). Memecoins have **no feed** → price them straight from the **token/USDG pool spot** (`StateView.getSlot0`). Feeds found in Chainlink's `robinhood-mainnet` directory: NVDA `0x379EC4f7…9F15`, TSLA `0x4A1166a6…7C38`.
3. **Installed `v4-core` is the `v4.0.0` tag**, where `SwapParams` is **nested in `IPoolManager`** (not `types/PoolOperation.sol` as on `main`). All code targets the v4.0.0 API.

## 3. Architecture

```
BasketFactory  (singleton, protocol-owned; is Ownable)
  ├─ token registry:  token → TokenConfig { source, chainlinkFeed, maxStaleness, usdgPoolKey, tokenIsCurrency0 }
  ├─ global config:   GlobalConfig { stateView, sequencerFeed, sequencerGracePeriod, treasury }
  └─ createBasket(tokens, weightsBps, FeeConfig, hodlTill, admin) → deploys a Basket

Basket  (one per basket; is SafeCallback + ReentrancyGuard)
  ├─ holds the underlying tokens
  ├─ deposit/withdraw  → v4 swaps USDG↔token DIRECTLY inside one unlock() callback
  ├─ NAV               → Chainlink (stocks) + token/USDG pool spot via StateView (memes)
  ├─ fee split + accRewardPerShare (USDG reward pool, MasterChef-style; claim-locked to hodlTill)
  └─ rebalance         → admin-only (sell → USDG → buy)

External deps (addresses in src/libraries/RHChain.sol):
  Uniswap v4 PoolManager  0x8366a39C…40951  (swap execution + flash accounting)
  Uniswap v4 StateView    0xF3334192…673b   (read pool sqrtPriceX96 for memecoin NAV)
  Chainlink AggregatorV3                     (stock-token USD price; 8-dec)
  USDG (Global Dollar)    0x5fc5360D…d168    (6-dec quote asset)
```

**Swap execution: direct `PoolManager` + own `unlockCallback`.** Chosen over the UniversalRouter because the vault already custodies its tokens (no Permit2 dance), it's self-contained, and the direct token/USDG pools are the liquid venue. Trade-off: v4-only misses the deep **v3** CASHCAT pool, and stock pools are thin → **keep demo sizes small; UniversalRouter (v3+v4 routing) and 0x RFQ (stocks) are post-MVP upgrades.**

## 4. Pricing model (NAV in USDG, 6-dec)

`NAV = Σ_i value_i`, everything in **USDG's 6 decimals**. All basket tokens are **18-dec** (enforced at registration).

- **Stock token (CHAINLINK):** `value = rawBalance · price / 10^(18 + feedDec − 6)` where `price = chainlinkFeed.latestRoundData()` (8-dec, already ×UI-multiplier). Enforce **staleness** (`updatedAt` vs `maxStaleness`) and, when set, the **L2 sequencer-uptime** feed.
- **Memecoin (POOL_USDG):** `value = poolValueUsdg(rawBalance, sqrtPriceX96, tokenIsCurrency0)` where `sqrtPriceX96 = StateView.getSlot0(usdgPoolKey.toId())`. The raw sqrtPrice ratio is USDG-raw per token-raw, so it yields USDG **directly** — the 18-vs-6 decimal gap is baked in (overflow-safe `FullMath.mulDiv`). ⚠️ This is **spot** and thus manipulable — see §8.
- **USDG:** treated as \$1 (stablecoin).

Decimal reality handled in `PriceLib`: **USDG 6 · tokens 18 · Chainlink 8 · sqrtPriceX96 Q96**.

## 5. Contract APIs (as implemented)

### 5.1 Types (`src/BasketTypes.sol`)
```solidity
enum PriceSource { NONE, CHAINLINK, POOL_USDG }

struct TokenConfig {
    PriceSource source;
    address chainlinkFeed;   // CHAINLINK only
    uint256 maxStaleness;    // per-feed heartbeat (seconds)
    PoolKey usdgPoolKey;     // token/USDG v4 pool (routing for all; pricing for POOL_USDG)
    bool tokenIsCurrency0;   // is `token` currency0 in usdgPoolKey (USDG is the other side)
}
struct GlobalConfig { address stateView; address sequencerFeed; uint256 sequencerGracePeriod; address treasury; }
struct FeeConfig { uint16 entryFeeBps; uint16 exitFeeBps; uint16 holderBps; uint16 creatorBps; uint16 protocolBps; }
```

### 5.2 `BasketFactory` (`src/BasketFactory.sol`)
```solidity
constructor(address poolManager, address usdg, address owner);
function setToken(address token, TokenConfig cfg) external onlyOwner;   // requires 18-dec; validates usdgPoolKey ↔ token/USDG
function setGlobal(GlobalConfig cfg) external onlyOwner;                // requires stateView != 0, treasury != 0
function createBasket(
    address[] tokens, uint16[] weightsBps,   // Σ = 10_000, unique, all registered
    FeeConfig fees,                          // entry/exit ≤ 1000 bps; split Σ = 10_000; holderBps ≥ 5000
    uint64 hodlTill, address admin
) external returns (address basket);
function tokenConfig(address) external view returns (TokenConfig);
function globalConfig() external view returns (GlobalConfig);
```

### 5.3 `Basket` (`src/Basket.sol`)
```solidity
// state
address[] tokens; uint16[] weightsBps;                       // target
uint16 entryFeeBps, exitFeeBps, holderBps, creatorBps, protocolBps;
uint64 hodlTill; address admin;
mapping(address => uint256) shares; uint256 totalShares;     // non-transferable
uint256 accRewardPerShare;                                   // USDG, ACC_PRECISION (1e18)-scaled
mapping(address => uint256) rewardDebt; mapping(address => uint256) rewardAccrued; // banked, unlock at hodlTill

// actions
function deposit(uint256 usdgIn, uint256 minShares) external returns (uint256 sharesOut);
function withdraw(uint256 sharesIn, uint256 minUsdgOut) external returns (uint256 usdgOut);
function claimRewards() external returns (uint256 usdgOut);                 // require now ≥ hodlTill
function rebalance(address sellToken, uint256 sellAmount, address buyToken, uint256 minBuyOut) external onlyAdmin;
function nav() public view returns (uint256 usdg);
function pendingRewards(address user) external view returns (uint256);
```

## 6. Flows & math

**`deposit(usdgIn)`**
1. Pull `usdgIn`. `fee = usdgIn·entryFeeBps/1e4`; `net = usdgIn − fee`.
2. `navBefore = nav()`.
3. `unlock`: for each token, swap its weight-share of `net` **USDG → token** directly; take each token; settle total USDG. (Deltas net to zero via flash accounting.)
4. `navAdded = nav() − navBefore`; `sharesOut = totalShares==0 ? navAdded : navAdded·totalShares/navBefore`; require `≥ minShares`.
5. Split `fee`: `holderCut → accRewardPerShare += holderCut·PREC/totalShares` (**pre-mint** supply; if first depositor, holderCut → treasury); `creatorCut → admin`; `protocolCut → treasury`.
6. `_settle(msg.sender)` then mint shares, reset `rewardDebt`.

**`withdraw(sharesIn)`** — pro-rata slice `amount_i = balance_i·sharesIn/totalShares`
1. `_settle(msg.sender)` (bank pending onto `rewardAccrued`).
2. `unlock`: swap each `amount_i` **token → USDG** directly; take total USDG ⇒ `gross`.
3. If `now < hodlTill` (**early**): `exitFee = gross·exitFeeBps/1e4` (split like entry, to remaining holders); **forfeit** `rewardAccrued·sharesIn/had` → `accRewardPerShare += forfeited·PREC/(totalShares − sharesIn)` (if last holder → treasury). `usdgOut = gross − exitFee`.
   Else: `usdgOut = gross`; `rewardAccrued` stays claimable.
4. Burn shares; reset `rewardDebt`; transfer `usdgOut` (require `≥ minUsdgOut`).

**`claimRewards()`** — `require(now ≥ hodlTill)`; `_settle`; pay `rewardAccrued[u]`; zero it.

**`rebalance(sellToken, sellAmount, buyToken, minBuyOut)`** — admin-only; `unlock` swaps `sellToken → USDG → buyToken` (USDG nets to zero); require output `≥ minBuyOut`.

`_settle(u)`: `pending = shares[u]·acc/PREC − rewardDebt[u]; rewardAccrued[u] += pending; rewardDebt[u] = shares[u]·acc/PREC;`

## 7. Status & test coverage

**Implemented, formatted, and green.** `forge test` → **37 offline tests**, 0 failures:
- `PriceLib.t.sol` (13) — decimal math, sqrtPrice valuation, feed staleness/validity, sequencer guard.
- `BasketFactory.t.sol` (13) — registration + `createBasket` validation (weights, fees, duplicates, decimals, pool-key consistency).
- `BasketAccounting.t.sol` (11) — full diamond-hands flow against a mock v4 that reproduces flash-accounting: deposit-by-NAV, fee split, holder reward accrual, claim-lock, early-exit fee **+ pro-rata forfeit → redistribution**, rebalance, memecoin pool-pricing.

**`BasketFork.t.sol`** (gated: `RH_FORK=1 forge test --match-path test/BasketFork.t.sol`) — a **real** mainnet-fork deposit/withdraw: $100 USDG → 582.7 CASHCAT through the live v4 pool via the unlock callback, priced by the real StateView, round-tripped to ~$97 (1% entry + 1% exit + ~1% pool fees). The v4 integration is proven on-chain.

## 8. Known risks / explicit MVP cuts

- **Memecoin NAV uses spot price** → flash-loan share-mint manipulation risk. v1 posture: CASHCAT’s pool is deep and share-minting uses the *measured NAV delta*; v2 guards: per-tx deposit cap, spot-vs-oracle sanity, TWAP/oracle-hook pool.
- **Thin stock-token liquidity** → real slippage; demo with small sizes. v2: 0x RFQ / UniversalRouter (v3+v4).
- **Sequencer uptime + staleness** checks: staleness always on; sequencer optional (`address(0)` skips) — **set it before mainnet**.
- **Cut for v1:** ERC-20/transferable shares, clone-proxy factory, streaming/performance fees, keeper/auto rebalance, non-USDG deposits, v3 legs, AI/managed strategies.

## 9. Deploy

`script/Deploy.s.sol` is wired with on-chain-verified feeds + pools (NVDA/TSLA feeds, StateView, three hookless token/USDG PoolKeys, flagship 50% CASHCAT / 25% NVDA / 25% TSLA). Broadcast:
```
PRIVATE_KEY=… TREASURY=… forge script script/Deploy.s.sol --rpc-url rh_testnet --broadcast --verify
```
Set `SEQUENCER_FEED` before a mainnet run.

---
*Addresses: [`src/libraries/RHChain.sol`](src/libraries/RHChain.sol). Config: [`foundry.toml`](foundry.toml) (solc 0.8.26, evm cancun).*
