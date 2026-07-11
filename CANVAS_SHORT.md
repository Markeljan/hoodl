# Product Canvas (Short) — HOODL

**Team Name:** HOODL

**One line: What You're Building**
permissionless index tokens on Robinhood Chain — one ERC-20 wraps a fixed basket of tokenized stocks + crypto, minted and redeemed in-kind, with no manager and nothing to trust.

**The Three Unlocks**
1. **Permissionless issuance** — anyone creates an index of any ERC-20s in one tx: no fund wrapper, no authorized-participant status, no allowlist. Cross-asset is the killer instance: no vehicle on earth holds NVDA and a memecoin in one ticker.
2. **Self-maintaining** — units are fixed and composition is immutable: no rebalancing, no keeper, no oracle, no admin. Anyone is the AP — when the token trades away from NAV, in-kind mint/redeem arbitrage pulls it back. Exit never needs a market: redemption works even if every DEX pool is empty.
3. **The index is money** — each index is a standard ERC-20 with verifiable holdings: transfer it, LP it, post it as collateral, build on it.

**Alternatives and Gaps**
Robindex ships immutable stock-only indices behind a stake gate, keeper-rebalanced, no in-kind exit. HoodFunds ships solo memecoin portfolios. ETFs can't hold memecoins; crypto index products can't hold stocks; nobody issues permissionlessly.

**Why Onchain, Why Robinhood Chain**
an index here needs no fund plumbing — the contract is the custodian and arbitrage is the workforce. Robinhood Chain is the only venue where tokenized equities and memecoins coexist as composable ERC-20s, with Chainlink equity feeds and Uniswap v4 for the NAV lens.

**Business Model**
one fee: 0.10% on mint, in fully-backed index shares (zero dilution), snapshotted per index; redemption always free. ETFs charge 3–95 bps yearly — we take 10 bps once.

**Ship This Weekend**
IndexFactory + IndexToken + NAV lens, deployed to testnet with a mainnet existence proof. demo: create the "AI Index" (NVDA + TSLA + CASHCAT), mint in-kind, transfer, redeem back to the underlying, live NAV from Chainlink + v4. already validated on a mainnet fork: exact in-kind lifecycle, NAV $32.62/share.

---
*hoodl.finance · Arbitrum · Open House London · 2026 — deployed on Robinhood Chain*
