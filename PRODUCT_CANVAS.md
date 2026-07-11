# Product Canvas — HOODL

**Team Name:** HOODL

**One line: What You're Building**
permissionless index tokens: one ERC-20 wraps tokenized stocks + crypto, minted & redeemed in-kind

**Alternatives and Gaps**
Robindex: immutable stock-only indices, stake-gated, keeper-rebalanced, no in-kind exit. HoodFunds: solo memecoin portfolios. ETFs can't hold memecoins; crypto index funds can't hold NVDA; none issue permissionlessly

**Who is This For**
traders bundling a thesis into one token, creators launching indices, protocols needing redeemable basket collateral

**What They Do Today**
buy every leg separately, rebalance by hand, or settle for ETFs that can't touch crypto

**Why Onchain, Why Robinhood Chain**
no fund wrapper needed: the contract is custodian, anyone is the authorized participant, and in-kind redemption keeps the token worth exactly its contents. only Robinhood Chain has stocks and memecoins side by side as ERC-20s

**The Wedge**
fixed-units indices: composition immutable — no manager, no keeper, no oracle, no rebalancing; weights float like a held portfolio. mint/redeem arbitrage pegs price to NAV. the share is money: transfer it, LP it, collateralize it

**Business Model**
one fee: 0.10% on mint, paid in index shares to the protocol — fully backed by the minter's deposit, zero dilution, capped at 0.5% and snapshotted per index so existing indexes can never be repriced. redemption is always free: exits stay trustless and the peg arb stays tight. no AUM fee — ETFs charge 3–95 bps *per year*; we take 10 bps once at issuance. revenue scales with issuance volume, not custody

**Go-To-Market**
flagship cross-asset indices prove the category (the AI trade: NVDA + TSLA + the AI memecoin, one token); creators launch their own; lending integrations make index tokens working collateral

**Why Now**
Robinhood Chain launched July 1, 2026: 95 stocks as ERC-20s next to live memecoin liquidity. no vehicle on earth wraps both — the primitive is unclaimed

**First 5-10 Users**
friends trading Robinhood + memestocks, crypto index degens, two finfluencer mutuals

**Milestones**
M1 (6w): audited contracts on mainnet, 3 flagship indices · M2 (3mo): $1M minted, first lending market accepts an index as collateral · M3 (5mo): migration tooling + rules-based reconstitution modules · M4 (8mo): branded issuance rails

**Ship This Weekend**
factory + index token + NAV lens + USDG zap on testnet; bytecode existence-proof on mainnet. live demo: create the AI index (NVDA + TSLA + memecoin), buy it with plain USDG in one tx, transfer it, redeem in-kind — DEX pool seeded at NAV, price pinned by mint/redeem arbitrage

---
*Arbitrum · Open House London · 2026 — deployed on Robinhood Chain (testnet 46630, mainnet 4663) · targeting Champions, Founder-in-Residence, Innovation Award*
