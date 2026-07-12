# HOODL — Master Document

*The single source of truth for product, positioning, pitch, landing page, and AI context.*
*Last updated: 2026-07-12 (morning of pitch day, Arbitrum Open House London).*
*Supersedes PRODUCT_CANVAS.md, CANVAS_SHORT.md, and BUILD_BRIEF.md where they conflict — notably the fee model (now protocol + creator fees, not "10 bps mint only") and deployment status (now live on mainnet).*

---

## 0. Fact card (never contradict these)

| Fact | Value |
|---|---|
| Name | **HOODL** (product), **hoodl.finance** (domain/team name) |
| What it is | Permissionless index tokens on Robinhood Chain — one ERC-20 wraps a fixed basket of tokenized stocks + crypto, minted and redeemed in-kind |
| Chain | Robinhood Chain mainnet, chain ID **4663** (Arbitrum stack, launched 2026-07-01) |
| Status | **Live on mainnet since 2026-07-12** (block 7711193), all contracts Blockscout-verified |
| IndexFactory | `0x9C1746bB146E1713DaD64aFC0c8becA5Ee5B9882` |
| IndexLens | `0x6F379d544597EBA7A19e13B5b589E832975b5EF4` |
| IndexZap | `0x717500F9BA2BFF85C047fEaCb3F98F7a667BfdE2` |
| hAI (flagship) | `0x9f5e540829A647C6BFC02066888Ee6f9E43708FD` — "HOODL AI Index" |
| hAI composition | **0.05 NVDA + 0.025 TSLA + 60 CASHCAT per share** (immutable; NAV ≈ $31–32, live — $31.18 at last check 2026-07-12) |
| Fees (hAI, all-in) | **0.50% to mint, 0.20% to redeem** — protocol 30/10 bps + creator 20/10 bps. No management fee, ever. |
| Fee rules | Four rates (protocol mint/redeem, creator mint/redeem), each hard-capped at 100 bps, **snapshotted immutably per index at creation**. Creators keep 100% of their fee. Fees paid in fully-backed shares — zero dilution, redemption never skims the basket. |
| Explorer / RPC | robinhoodchain.blockscout.com · rpc.mainnet.chain.robinhood.com |
| Repo | github.com/Markeljan/hoodl |
| Event | Arbitrum Open House London, July 10–12 2026 · pitch = **3 min + live demo, today** |
| Brand | Neon `#CCFF00` on dark, Space Grotesk / Manrope / JetBrains Mono, dark + light themes |

---

## 1. Positioning — the story we tell

### The one-liner (anchor)

> **HOODL is the simplest way into DeFi for the Robinhood generation: indexes anyone can create, share, and buy in one tap — no manager, no rebalancing, always redeemable for exactly what's inside.**

**Short variants:**
- "Indexes for the Robinhood generation." (tagline)
- "Wrap stocks or crypto into simple index tokens anyone can create, share, and buy." (canvas one-line, matches §2)
- "Your first DeFi product shouldn't feel like DeFi." (hook line)

**25-word boilerplate:**
> HOODL turns baskets of tokenized stocks and crypto into simple index tokens on Robinhood Chain — anyone can create one, anyone can buy one, in one tap.

**100-word boilerplate:**
> Robinhood Chain put real stocks onchain as ERC-20s, next to deep memecoin liquidity — and put millions of non-crypto-native users one click away from DeFi. HOODL gives them the first product they already understand: the index. Anyone can wrap a fixed basket of tokenized stocks and crypto into a single ERC-20 and share it; anyone can buy it with USDG in one transaction. There's no manager, no rebalancing, and no creator who can gate your exit — every token is redeemable in-kind for exactly the assets inside it. Live on Robinhood Chain mainnet: hoodl.finance.

### The narrative arc (use this spine everywhere: pitch, landing, tweets)

1. **The moment (why now).** Robinhood Chain launched July 1. Stocks are ERC-20s now, sitting next to memecoin liquidity, with $500M+ of DEX volume in the first weeks. Millions of Robinhood users — mostly *not* crypto-native — are suddenly one click from DeFi.
2. **The gap (the problem).** Their first step into DeFi today looks like slippage settings, LP pools, and products where a "creator" can pause your exit. The one product they already understand from their brokerage — an index — doesn't exist here in a form they can trust. Onchain "ETFs" so far are whitelist-gated, stocks-only, and charge management fees.
3. **The product (what we built).** HOODL is indexes, the way they already work in your head. Pick a basket → it becomes a token → share it → anyone buys it with USDG in one tap. Under the hood it's a better index than TradFi can offer: no manager, nothing to rebalance, and every share redeems in-kind for exactly the assets inside — even if every market is closed.
4. **The proof (the demo).** It's live on Robinhood Chain mainnet today. hAI — the AI trade in one token: NVDA + TSLA + the AI memecoin — no vehicle on earth can hold these three in one ticker. Buy it with USDG, watch your look-through portfolio, redeem it into real NVDA your wallet never bought on an exchange.
5. **The future (where it goes).** Start with the simplest primitive, then climb: indexes of indexes and index-tokens-as-collateral (composability), AI portfolio management, opt-in rebalancing strategies. HOODL becomes the on-ramp *and* the portfolio layer for the Robinhood generation.

### Framing rules

- **Lead with the buyer, not the builder.** The headline user is the crypto-curious Robinhood retail user making their first onchain purchase. Creators (anyone launching an index) are the supply-side flywheel — mention them second.
- **Simplicity is the promise; trustlessness is the proof.** "No manager, no rebalancing, can't be paused" is *why it's safe to be simple* — it supports the consumer story, it is not the headline.
- **Familiar vocabulary first.** Say "index," "basket," "buy," "own," "cash out." Introduce "mint/redeem in-kind," "NAV," "ERC-20" only as the explanation underneath.
- **Never overclaim.** Everything we say maps to a deployed contract, a verified address, or a passing test (see §11).

---

## 2. Product Canvas (Offchain Labs framework, realigned)

*Format follows the Open House "Product Framing" deck: concrete answers a mentor can react to.*

**Team:** HOODL.finance
**One line:** Wrap stocks or crypto into simple index tokens anyone can create, share, and buy.

**Who is this for (ICP, in order):**
1. **Crypto-curious Robinhood retail** — arriving on Robinhood Chain with USDG, wanting diversified exposure in one tap without learning DeFi. (In practice this is Robinhood's non-US/EU app users — the cohort that can legally hold stock tokens; see §11.1.)
2. **Index creators** — traders/influencers who bundle a thesis ("the AI trade") into one shareable ticker and earn creator fees.
3. **Protocols/integrators** — anyone needing a redeemable, unruggable basket token as collateral or a building block.

**Painful current workflow (what they do today):**
Buy every leg separately across thin pools, or hold single volatile tokens, or stay on the sidelines entirely. The diversified one-click product they know from their brokerage doesn't exist here in trustworthy form.

**Alternatives and gaps:**
- **Buying legs by hand:** multiple approvals/swaps, slippage on thin stock-token pools, no shareable artifact.
- **HoodETF (live):** creation gated by a stocks-only whitelist; entry ≤3%, exit ≤1%, **management fee ≤3%/yr**; whitelisted SPY/QQQ legs have ~$0 DEX depth so its zap can't actually fill them.
- **HoodFunds (frontend only):** memecoin "metas," not deployed ("drafts stay local" per their own docs), swap-based custody, and **creator-controlled redemption** — the creator can pause your exit.
- **TradFi ETFs:** can't hold memecoins, can't be created by users, weeks of paperwork and an issuer.
- **Doing nothing:** the default — which is exactly the on-ramp problem.

**The wedge:**
One-tap index buying for Robinhood Chain's first wave of users, powered by the only primitive that makes indexes safe *without* a manager: fixed-units baskets, immutable composition, in-kind mint/redeem, price pegged to NAV by open arbitrage (everyone is the authorized participant). No rebalancing needed — fixed units drift like a held portfolio, which is the honest default.

**Why now:**
Robinhood Chain launched **eleven days ago**. Stocks live as ERC-20s next to memecoin liquidity for the first time anywhere; $500M+ DEX volume; a huge non-crypto-native user base one click away. The category ("index layer for tokenized stocks + crypto") is being claimed *this month* — two competitor frontends already exist: one has no contracts and lets the creator gate your exit; the other gates creation behind a stocks-only whitelist and charges up to 3%/yr management.

**Why onchain, why Arbitrum / Robinhood Chain:**
An index here needs no fund wrapper: **the contract is the custodian**, anyone is the authorized participant, and in-kind redemption keeps the token worth exactly its contents with zero counterparty. Only Robinhood Chain has tokenized equities and crypto side by side as composable ERC-20s (with Chainlink equity feeds + Uniswap v4 for pricing display). Without onchain: you need an issuer, an AP agreement, a custodian, and a prospectus. With it: one transaction.

**Smallest credible product surface (shipped):**
One flagship index (hAI), one core action (buy with USDG in one tx), one proof point (redeem in-kind into real NVDA on mainnet). Factory + token + lens + zap + wired web app — nothing speculative on stage.

**First 5–10 users:**
Friends who trade on Robinhood and hold or are curious about crypto; crypto degens who want Robinhood Chain memecoin+stock exposure in one ticker; Mark's autonomous agent Sokoclaw as the first non-human index creator; hackathon mentors/builders this weekend.

**Business model:**
Protocol fee 30 bps mint / 10 bps redeem (hard cap 100 each, snapshotted per index — existing indexes can never be repriced). Creators add their own mint/redeem fee (≤100 bps each) and **keep 100% of it** — a creator economy where launching an index is launching a revenue stream (the creator-fee recipient is even rotatable/sellable). Zero management fee ever — TradFi ETFs charge 3–95 bps *per year*; HoodETF charges up to 3%/yr; we charge once, at the door. Revenue scales with issuance volume, not custody.

---

## 3. What exists today (product truth, 2026-07-12)

**Contracts — live on Robinhood Chain mainnet, Blockscout-verified (see §0 for addresses):**
- **IndexFactory** — `createIndex(name, symbol, tokens[], units[])` (+ optional creator fees, description, imageURI). Fully permissionless, no allowlist, 1–16 components, any ERC-20. Each index is its own contract; a bad component can only break its own index.
- **IndexToken** — the index itself. **No admin functions over custody, composition, or fee rates.** Composition, units, and all four fee rates immutable at creation; the creator's only powers are rotating their fee recipient and editing display strings — neither touches funds. `mint(shares, to)` pulls the exact basket in-kind (rounds up); `redeem(shares, to)` pays the exact basket out (rounds down); fuzz-tested solvency invariant (vault can never owe more than it holds). Redemption needs zero DEX liquidity and **can never be paused at the HOODL layer** — no pause or gate exists anywhere in our contracts (issuer-level stock-token freezes are the same risk as holding the components directly; see §11.2). Fully on-chain metadata (base64 tokenURI/contractURI).
- **IndexLens** (periphery, display-only) — NAV in USDG: Chainlink feeds for stock tokens (staleness-guarded, 24/5-aware), Uniswap v4 spot for memecoins. Zero effect on custody.
- **IndexZap** (periphery, optional) — one-transaction USDG ↔ index. Buy: exact-output v4 swaps per component → in-kind mint → refund unspent USDG. Sell: redeem in-kind → sell components for USDG. No oracle; user bounds are the price guard; unrouted tokens can always still mint/redeem directly.

**Flagship index — hAI ("HOODL AI Index"):** 0.05 NVDA + 0.025 TSLA + 60 CASHCAT per share, NAV ≈ $31–32 (live — check before stage). The AI thesis in one ticker: the chipmaker, the robotaxi bet, and the chain's deepest memecoin ($8.18M pool). Created through the public factory like any user index. *Supply is currently 0 — the first mainnet mint can happen live on stage.*

**Web app (`web/`, hoodl.finance)** — Vite + React, dark/light, mobile-responsive, **fully wired to mainnet — zero mock data**:
- **Landing:** live NAV, live composition read from chain, fee strip read from the contract.
- **Discover:** every index enumerated live from the factory registry (any index created by anyone appears automatically).
- **Detail:** live NAV + composition + Buy (USDG zap) / Mint (in-kind) / Redeem tabs — all real transactions with simulate-first safety and Blockscout links.
- **Portfolio:** real wallet balances, look-through to underlying assets, on-chain transfer.
- Injected-wallet connect with automatic add/switch to Robinhood Chain.

**Validation:** 60/60 unit + fuzz tests; 3/3 mainnet-fork tests — (1) full in-kind lifecycle at NAV $32.62/share with a third party redeeming into real NVDA, (2) zap round trip ≈ 0.8% total cost on real pools, (3) full seed loop: pool bootstrapped at NAV, retail buys with USDG, redeems in-kind.

**Known gaps (be honest, don't demo):**
- No "create index" UI yet — creation is contract-direct for now (roadmap item #1).
- Portfolio screen tracks hAI only; other index balances fetched but not displayed.
- hAI/USDG DEX pool not yet seeded on mainnet (script exists, fork-validated) — buying works via zap regardless.
- Injected wallets only (no WalletConnect); no audit yet.

---

## 4. How it works (mechanics reference — for AI context and Q&A)

**Core loop:** An index = one ERC-20 whose every share is backed by fixed `units[i]` of each component per 1e18 shares.
- **Mint:** deposit the exact basket → receive shares (fee taken in shares, minted to treasury/creator — fully backed by your own deposit, so zero dilution of other holders).
- **Redeem:** burn shares → receive the exact basket (fee taken by transferring shares, never by skimming the basket — so redemption stays exact and ungateable).
- **Peg:** if the token trades above NAV, anyone mints and sells; below NAV, anyone buys and redeems. **Everyone is the authorized participant.** No oracle in the custody path; the mint/redeem math never reads a price.
- **"No rebalancing" is a feature:** fixed units mean weights drift exactly like a held portfolio (winners grow). Nothing to manage, nothing to trust, no keeper to fail. Want new weights? Redeem and mint a successor index — migration tooling is roadmap.
- **Composability:** an IndexToken is a standard ERC-20 — transfer it, LP it, collateralize it, and **use it as a component of another index**. Nothing in the factory or mint/redeem path prevents it (reentrancy guards are per-contract), so meta-indexes / index-of-indexes are possible by design — but this path has no test yet, so say "the design supports index-of-indexes" rather than "works today" until one exists. Neither competitor's model can do this at all.

**Judge Q&A crib (updated):**
- *"How is this different from HoodETF?"* — "They gate creation behind a stocks-only whitelist and charge up to 3%/yr management. We're permissionless, cross-asset, all-in 0.50%/0.20% once, and creators keep 100% of their fee."
- *"And HoodFunds?"* — "A frontend — their docs say drafts stay local until contracts are connected. And their model lets the creator pause redemption. Ours can't be paused by anyone, including us. They could run on our factory."
- *"What if the memecoin pool is manipulated?"* — "Core doesn't care — no price gates minting or redemption; they're exact in-kind. The lens is display-layer; collateral integrators would add TWAPs."
- *"Who can rug it?"* — "Nobody at our layer. No admin functions over custody, composition, or fee rates — the creator can only rotate their fee recipient and edit display strings. The factory owner's only powers are the protocol fee on *future* indexes (capped at 1%) and the treasury address."
- *"Can't Robinhood freeze the stock tokens?"* — "At the token layer, yes — the issuer retains that power, and it's the identical risk to holding NVDA-token directly. Our layer adds zero pause surface on top of it."
- *"Isn't your headline user American — and Americans can't hold stock tokens?"* — "Robinhood's stock tokens serve Robinhood's non-US app users (EU first) — 'the Robinhood generation' is that global cohort. A production front end geofences per Reg S, exactly like Robinhood's own app does."
- *"What about Robindex?"* — (verify status before stage — it appears in 7/10 research but was dropped from the 7/11 competitor review; if live, the answer per BUILD_BRIEF: "stake-gated, stock-only, keeper-rebalanced, no in-kind exit — we're permissionless, cross-asset, self-maintaining, and redemption never needs a market.")
- *"Rebalancing?"* — "Fixed units behave like a held portfolio. Opt-in strategies and reconstitution tooling are roadmap — as separate, explicit products, never a silent change to a token you already hold."
- *"Regulation?"* — "The protocol never custodies for anyone — minting is self-service against your own tokens; Reg S enforcement lives at the stock-token layer. No pooled discretionary management exists to regulate."
- *"Why will normies use this?"* — "Because it's the one DeFi product they don't have to learn. They already know what an index is; we removed everything else."

---

## 5. Competitive positioning

| | **HOODL** | HoodETF (live) | HoodFunds (frontend) | TradFi ETF |
|---|---|---|---|---|
| Creation | Permissionless, any ERC-20 | Whitelist, stocks-only | Creator drafts, not deployed | Issuer-only |
| Assets | Stocks + crypto in one ticker | Stocks only | Memes only | No crypto |
| Redemption | In-kind, ungateable, needs no market | In-kind | **Creator-controlled** | AP-only |
| Management fee | **None, ever** | ≤3%/yr | — | 3–95 bps/yr |
| All-in cost (flagship) | 0.50% in / 0.20% out, once | 0.30–2.00% + streaming | 0–1% creator | annual drag |
| Creator economics | ≤1%/1% fee, **keeps 100%**, sellable | 90/10 split w/ protocol | 0–1% | n/a |
| Meta-indexes | ✅ by design (untested — see §4) | ❌ | ❌ | ❌ |

**Five stated edges (from COMPETITORS.md):** (1) only truly permissionless issuance — nobody else can put NVDA and a memecoin in one ticker; (2) cheapest fees — the Vanguard of onchain indexes; (3) deterministic oracle-free core — no price in the mint path, no pause anywhere, solvency fuzz-tested; (4) routing rigor — pool depth probed with V4Quoter, found the one-sided NVDA 1% pool others would trap funds in; (5) index-of-indexes.
**Positioning line:** *HOODL is the issuance layer the other frontends need.*

---

## 6. Roadmap (the "start simple, then climb" story)

**Now (shipped):** the primitive — permissionless indexes, one-tap buy, in-kind exit, live on mainnet.
**Next (weeks):** create-index UI ("launch your index from your phone"), multi-index portfolio, seeded hAI/USDG pool at NAV, WalletConnect, more flagship indexes (meta-index demo), audit.
**Then (months):** composability — index tokens as lending collateral, LP strategies, index-of-indexes products; creator tooling and discovery/social layer (share links, leaderboards).
**Horizon:** **AI portfolio management** — agents that design, monitor, and propose indexes (Sokoclaw as first agent creator); opt-in rebalancing/reconstitution strategy vaults built *on top of* the immutable primitive (strategies are explicit new products, never silent changes to tokens you hold).

*Rule: the base layer stays immutable and trustless; everything smart happens a layer above.*

---

## 7. The 3-minute pitch (today)

**Format: ~3 min talk + live demo on mainnet, video backup.**

| Time | Beat | Say / show |
|---|---|---|
| 0:00–0:20 | **Hook** | "Robinhood Chain launched eleven days ago. Stocks are ERC-20s now, and millions of Robinhood users are one click from DeFi — except everything here still feels like DeFi. We built the one product they already understand: the index." |
| 0:20–0:45 | **Problem → product** | "Today their options are buying every leg across thin pools, or 'ETF' products that are whitelist-gated, stocks-only, charge management fees — or let the creator pause your exit. HOODL: anyone creates an index, anyone buys it in one tap, and nobody — not even us — can touch what's inside." |
| 0:45–1:50 | **Live demo (mainnet)** | Open hoodl.finance → Discover (live from factory) → hAI detail: "The AI trade in one ticker — NVDA, TSLA, and the chain's biggest memecoin. No vehicle on earth can hold these three." → **Buy with USDG, one transaction** (zap buys components + mints in-kind; show Blockscout tx) — "we just minted hAI shares live on mainnet" (upgrade to "the *first* hAI shares that exist" only if totalSupply() = 0 was verified minutes before going up — the address is public and anyone can front-run the claim) → Portfolio look-through → **Redeem in-kind**: "this wallet now holds real NVDA it never bought on any exchange. That exit can never be paused — it doesn't even need a market to exist." |
| 1:50–2:20 | **Trust story** | "Why is it safe to be this simple? No manager, no admin key, no oracle in custody, no rebalancing — fixed units drift like a held portfolio. Price stays pinned to NAV because anyone can mint or redeem at par: everyone is the authorized participant. 60 tests, fuzz-proven solvency, verified contracts." |
| 2:20–2:45 | **Business + moat** | "0.50% in, 0.20% out, all-in — zero management fee, ever, versus up to 3% a year from the live competitor. Creators set their own fee and keep 100% of it: launching an index is launching a revenue stream." |
| 2:45–3:00 | **Vision close** | "Next: create-your-index from your phone, index tokens as collateral, AI portfolio managers proposing baskets. HOODL is how the Robinhood generation gets into DeFi — starting with a product they don't have to learn. Live now at hoodl.finance." |

**Demo logistics:**
- Pre-fund demo wallet with USDG (+ ETH for gas). ⚠️ Reg S: the wallet that mints/redeems will hold stock tokens — use a non-US person's wallet (see §11).
- Rehearse the exact click path twice **on a local fork** (`anvil --fork-url https://rpc.mainnet.chain.robinhood.com`), not against mainnet — a mainnet rehearsal would itself mint hAI and burn the "first shares" line. Record the full happy path as video backup; pre-screenshot Blockscout txs.
- Check hAI `totalSupply()` on Blockscout minutes before the pitch; if nonzero, drop the word "first."
- Fallbacks in order: live → video → screenshots. RPC hiccup ≠ contract failure; say "chain, not contracts" and switch to video.
- If time allows in Q&A: transfer hAI to a second wallet to land "the index is money."

---

## 8. Landing page realignment (web/src/components/Landing.tsx)

**Keep (already strong):** live on-chain data everywhere (NAV, composition, fees read from contracts — this is credibility no competitor has), the basket card, "Actual contract paths" section, footer links, ticker.

**Change — reorder the story from builder-first to buyer-first:**

| Element | Current | Recommended |
|---|---|---|
| Hero H1 | "Own the whole thesis in one token." | **"A whole portfolio in one token."** (alt: "Indexes for the Robinhood generation.") |
| Hero sub | "HOODL wraps a fixed basket of tokenized stocks and crypto into a single ERC-20, minted and redeemed in-kind on-chain." | **"HOODL turns baskets of tokenized stocks and crypto into simple index tokens — anyone can create one, anyone can buy one in one tap, and every token is always redeemable for exactly what's inside."** |
| Badge | "Live on Robinhood Chain" | Keep. |
| CTAs | "Buy hAI with USDG →" / "Explore deployed indexes" | Keep primary. Secondary → **"Explore indexes"** (drop "deployed" — builder word). |
| "Why it's different" cards | Cross-asset / index-is-money / market-independent redemption / live NAV | Reframe titles buyer-first: **"Stocks + crypto, one token" · "Buy it in one tap" · "Cash out anytime — no market needed" · "Nothing hidden — live NAV from chain"**. Keep technical detail in card bodies. |
| New section | — | **"Create your own"** teaser: "Any basket you can imagine becomes a token anyone can buy. Creator fees are yours — 100%." (CTA can be waitlist/docs until create UI ships.) |
| CTA band | "0.50% to mint · 0.20% to redeem" | Keep, add: **"No management fee. Ever."** |

**Copy vocabulary:** buy, own, cash out, basket, index — not zap, mint path, periphery. Keep "mint/redeem in-kind" only where the mechanic is being explained.

---

## 9. Messaging kit (for decks, tweets, AI-generated content)

**Voice:** confident, plain-spoken, slightly playful; numbers over adjectives; never hype ("revolutionary", "disrupting" banned). Robinhood-native metaphors welcome ("the index aisle of Robinhood Chain").

**Lines that work (tested in canvas/docs):**
- "Stocks are ERC-20s now. So why does making an index still take a fund, a manager, and a keeper?"
- "No vehicle on earth can hold NVDA and a memecoin in one ticker. Now anything can."
- "Everyone is the authorized participant."
- "The index is money: transfer it, LP it, collateralize it."
- "Redemption needs zero liquidity and can never be paused."
- "This wallet holds real NVDA it never bought on an exchange."
- "ETFs charge you every year. We charge once, at the door."
- "The contract is the custodian; arbitrage is the workforce."
- "Your first DeFi product shouldn't feel like DeFi."

**Term rules:** "Robinhood Chain" (never "RH chain" publicly) · "tokenized stocks" or "stock tokens" (they're debt instruments giving economic exposure — never claim "own real shares"; "holds real NVDA" refers to the NVDA *token*) · "index token" not "fund" (avoid fund/CIS framing) · USDG is the money leg · HOODL in caps, hoodl.finance lowercase.

---

## 10. Alignment with the Offchain "Product Framing" deck (why our approach is a deliberate remix)

The deck (Daniel Lumi, Offchain Labs) preaches: find a narrow wedge, one ICP, one painful workflow, smallest credible surface, why-now trigger, onchain-necessary-not-decorative, business ≠ token.

**Where we comply fully:** trigger event (chain launched 11 days ago) · smallest credible surface (one index, one action, one proof, shipped) · onchain-necessary (custody without a custodian is the product) · real alternatives named honestly · business model without a token · already pivoted twice when facts said so (swap-custody game → in-kind indexes), which is the deck's "don't marry a solution" in action.

**Where we consciously diverge:** the deck would pick one narrow ICP; our wedge user (crypto-curious Robinhood retail) is a *broad consumer segment* — but it's concrete, newly reachable (deck's own "customer segment becoming newly reachable" trigger), and validated by the cheapest possible test: friends who trade on Robinhood buying hAI this week. The narrow-wedge discipline lives in the **product surface** (one flagship index, one buy button) rather than the audience. If mentors push, the fallback narrow ICP is: *"Robinhood Chain early adopters who want the AI trade in one tap."*

---

## 11. Constraints & honesty rules (do not violate in any material)

1. **Reg S:** Stock Tokens may not be offered/sold/delivered to US persons (also UK/CA/CH/UAE). Deploying contracts is fine; **acquiring stock tokens is not (for US persons)** — the live demo mint/redeem wallet must belong to a non-US person, and a production front end needs geofencing + counsel. Never market to US persons.
2. **Stock tokens are debt instruments** (issuer: Robinhood Assets Jersey) giving economic exposure + issuer credit risk — no shareholder rights. The issuer retains pause/freeze powers at the *token* layer (out of our control; our layer adds none).
3. **The lens is display-only** and pool-spot legs are manipulable within a block — never claim oracle-grade pricing; custody never reads a price.
4. **Liquidity reality:** stock-token pools are thin (~$15–41k for the top names; SPY/QQQ ≈ $0); CASHCAT is deep ($8M+). Zap works because it bounds and refunds — don't promise big-size zaps.
5. **hAI supply is 0** until the first mainnet mint; the seeded DEX pool exists only in fork tests so far. Say "live contracts," not "trading volume."
6. **No audit yet.** Say "fuzz-tested, verified source" — never "audited."
7. **Not investment advice; hAI is a demo flagship, not a recommendation.** Keep the footer disclaimer.
8. **The "$500M+ DEX volume" figure has no source on file** — it appears only in the canvas/pitch. Pin a source (GeckoTerminal / Blockscout stats) before saying it on stage, or soften to "hundreds of millions in DEX volume in its first weeks."

---

*Build artifacts: contracts `src/`, tests `test/`, deploy manifest `deployments/robinhood-mainnet.json`, UI `web/`, competitor research `COMPETITORS.md`, this doc supersedes `PRODUCT_CANVAS.md` / `CANVAS_SHORT.md` / `BUILD_BRIEF.md` on conflicts.*
