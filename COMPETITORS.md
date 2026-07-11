# Competitive landscape (reviewed 2026-07-11)

Two other "Hood*" index projects exist on Robinhood Chain. HoodFunds is adjacent;
HoodETF is nearly our architecture. Notes below are from their live sites/docs as of today.

## 1. HoodFunds — hoodfunds.trade

**What it is:** "A wallet-first ETF layer for Robinhood Chain metas." Creators package
themed **memecoin** baskets (GOAT, ZEREBRO, ARC, FARTCOIN…) into a single index token.
USDG in → protocol **swaps** into components via Uniswap v4 → trader holds one token.

**Mechanics:** creator sets ticker, weights (sum to 100), creator fee (0–1%), max-buy cap
(USDG per tx, protects thin pools). Vault lifecycle: draft → active → paused → redeem-only
→ closed, **creator-controlled** (`"redeemMode": "creator-controlled"`). Exits pay out
underlying assets when redeem mode is open.

**Status: not deployed.** Their own docs: "Until real contracts are connected, the
dashboard keeps drafts local" and "Live trading should wait for final vault contracts,
routing checks, and signer review." It is a polished frontend over local drafts.

**vs. us:**
- Swap-based buy path = the exact design we abandoned (thin-pool slippage, stranded
  redemptions). Viable for their memecoin-only universe; breaks on stock tokens.
- Creator can pause buys and gate redemption → rug/trust surface. Our redeem is
  unpausable and free; IndexToken has zero admin functions.
- Memes only; no tokenized stocks, no cross-asset.
- No contracts vs. our 50 passing tests + mainnet-fork E2E.

**Doing better than us:**
- **Narrative packaging**: "metas" framing, thesis statement per index, browse/discovery
  dashboard. Their marketing surface is the product; ours is the contract.
- **Creator fee (0–1%)** as a creation incentive.
- Honest-metrics positioning ("No fake TVL and no decorative volume") — good copy.

## 2. HoodETF — hoodetf.org (the real competitor)

**What it is:** "Launch on-chain ETFs backed by real stocks." Vault custodies underlying
stock tokens, issues ERC-20 shares. **Live on Robinhood Chain (4663): 6 ETFs, ~$141 AUM**,
app + docs shipped.

**Mechanics — uncomfortably close to ours:**
- Mint/redeem **pro-rata on the vault's real token balances** (not oracle NAV).
- "redeemInKind is permissionless and can never be paused — the vault's solvency guarantee."
- USDG zap in/out through Uniswap v4 (periphery, like our IndexZap).
- On-chain Chainlink NAV, marked stale rather than silently mispriced (≈ our lens).
- No manager, no rebalancing: "constituents and fee schedule are fixed at deploy…
  no admin key that can seize or rug."

**Where they differ:**
- **Whitelist-gated creation**: 2–20 constituents "from the whitelist" (NVDA, TSLA, AAPL,
  GOOGL, AMD, MU, QQQ, SPY). Stocks only; whitelist controller undocumented. NOT
  permissionless in the way ours is.
- **Fee stack**: entry ≤3%, exit ≤1%, **management ≤3%/yr**, split 90% creator / 10%
  protocol. Live examples 0.30%–2.00%.
- SPY/QQQ are whitelisted despite ~$0 DEX depth (our on-chain finding) — their zap cannot
  fill those legs; in-kind still works. Same physics as ours, less routing rigor shown.

**Doing better than us:**
- **Shipped**: live app, live ETFs, public docs site, addresses page. We are
  fork-validated but not publicly deployed.
- **Creator economics**: 90/10 fee split gives creators a reason to launch and shill
  their index. ~~We have no creator incentive at all~~ → CLOSED 7/11: per-index creator
  mint/redeem fee (≤1% each side, immutable at creation, creator keeps 100% of it).
- Named live products (AI-INFRA etc.) — concrete demo objects.

## Our edges (say these out loud in the pitch)

1. **Only truly permissionless issuance.** HoodFunds: no contracts. HoodETF: whitelist.
   Us: any ERC-20, 1–16 components, one call. Nobody else can put **NVDA and a memecoin
   in one ticker** — that's our flagship hAI index, live in the fork test.
2. **Still the cheapest.** Flagship: 0.50% in / 0.20% out all-in, zero streaming fee,
   zero dilution — vs HoodETF's up-to-3% entry + 1% exit + 3%/yr management. Fees are
   taken in fully-backed shares; redeem fees never touch the basket, so exits stay
   ungateable. Vanguard-vs-hedge-fund framing still writes itself.
3. **Deterministic, oracle-free core.** No price in the mint path at all; no pause
   anywhere; solvency invariant fuzz-tested. HoodETF is close here but still carries a
   fee/whitelist admin surface.
4. **Routing rigor**: V4Quoter-probed real depth (the one-sided NVDA 1% pool find) vs
   HoodETF whitelisting SPY/QQQ that can't fill.
5. **Index-of-indexes**: because components are unrestricted ERC-20s, an IndexToken can
   itself be a component. Neither competitor's model allows a meta-index. Cheap, unique
   demo.

## Gaps to close / decisions to make

- [x] **Creator fee split** — DONE 7/11: optional creator mint + redeem fee (≤1% each
      side) set immutably at `createIndex`, paid in fully-backed shares directly to the
      creator (recipient rotatable, rates not). Protocol fee raised to 30/10 bps and now
      applies on both sides. Creators keep 100% of their own fee — a strictly better
      pitch than HoodETF's 90/10 split.
- [ ] **Ship a visible surface** — both competitors lead with a browsable UI; judges see
      frontends. Even a static index-browser reading the factory registry + lens NAV
      beats a Foundry log.
- [ ] **Deploy publicly** (testnet at minimum) so "live" isn't their word vs ours.
- [ ] **Positioning vs. crowding**: three "Hood*" index projects. Ours is the neutral
      primitive — HoodFunds literally has no contracts and could run on our factory.
      "The issuance layer the other frontends need" is a viable pitch angle.
- [ ] Demo the meta-index (index containing hAI) if time permits.
