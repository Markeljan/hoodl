# Product Canvas — HOODL

**Team Name:** HOODL

**One line: What You're Building**
investment clubs on Robinhood Chain — like an ETF, but run by your group chat: one token buys a portfolio of tokenized stocks and memecoins, and trader fees reward hodlers

**Alternatives and Gaps**
Robindex ships immutable stock-only index tokens behind a 25k-token stake gate; HoodFunds ships solo memecoin portfolios. neither has group clubs, an active manager, stocks + memes in one portfolio, or a holder fee share. Enzyme and dHEDGE have manager vaults but aren't on Robinhood Chain, hold no Robinhood stock tokens, and target pro managers — not a group chat of retail friends

**Who is This For**
Robinhood Chain traders who want to invest as a group, and creators — from friend-group organizers to finfluencers — who earn fees for running clubs others buy into

**What They Do Today**
swap stock tokens and memecoins one at a time, coordinate group buys over Telegram with no shared custody, and rebalance by hand

**Why Onchain, Why Robinhood Chain**
group money needs trustless custody — a contract, not a group-chat treasurer. the club manager trades the portfolio but can never withdraw it: there is no rug function. Robinhood Chain co-locates 95 stock tokens as freely composable ERC-20s, live Uniswap liquidity, and the funnel from ~28M funded Robinhood accounts — the memestock crowd is here, not on Ondo

**The Wedge**
clubs with one-token buy-in and sell-out. the manager trades within a protocol-curated allowlist — rebalancing, adjusting allocations, adding or removing assets — under onchain rate limits, and can never withdraw. because custody is untouchable, a club can even hand the manager seat to an AI agent: same allowlist, same rate limits, same missing rug function. the contract, not the prompt, is the guardrail

**Business Model**
a fee on buy-in and sell-out (creator-set, 0.25–2%, default 1%), split 50% manager / 40% club / 10% protocol — the club's cut stays in the vault without minting shares, so traders mechanically pay hodlers; in-kind exits pay the fee in shares, 40% burned to boost every remaining hodler. when a club enables the protocol-run AI manager, the manager share routes to the protocol: revenue = TVL × flow × fee × (0.10 + 0.50 × agent share). at 20% monthly flow, agent adoption alone scales the protocol take from 0.24% to 1.44% of TVL per year — and users never pay more. roadmap: capped streaming management fee (≤2%/yr, immutable per club), performance fees crystallized against Chainlink equity feeds, manager comp vested in club shares

**Go-To-Market**
wedge 1: finfluencer managers — your audience becomes your club, and every manager is a distribution channel with a fee incentive to grow it. wedge 2: invite-only clubs for friend groups — the decades-old investment-club model, onchain. the funnel: the memestock community and ~28M funded Robinhood accounts arriving on Robinhood Chain

**Why Now**
Robinhood Chain mainnet launched July 1, 2026 — $570M day-one DEX volume, TVL past $240M in week one, and tokenized stocks finally composable by contracts. the products live today are passive and solo; the group + manager + safe-agent layer is unclaimed

**First 5-10 Users**
friends who trade Robinhood and memestocks, crypto trader mutuals, one or two finfluencer mutuals to seed the creator flywheel

**Milestones** *(every prize here is 50% milestone-gated — these are ours)*
M1 (6 weeks): mainnet launch with externally reviewed contracts, 10 genesis clubs with named managers · M2 (3 months): 50 active clubs / $250K TVL, invite-only clubs productized, manager dashboard · M3 (5 months): agent GA — permissionless agent registry with staked operators, per-club risk policies, onchain action log · M4 (8 months): performance-based vested-share manager comp, compliance structure for public clubs

**Ship This Weekend**
one flagship mixed club on Robinhood Chain testnet — stock tokens + a memecoin behind one club token, with self-seeded DEX liquidity. golden-path demo: create club → a friend buys in with one token → the human manager rebalances → the club flips on its AI manager, which executes a bounded rebalance from a plain-English strategy → the money shot: a bad agent trade and a manager withdrawal both revert onchain, live. same bytecode deployed to mainnet as an existence proof. stretch: invite-only clubs

---
*Footer: Arbitrum · Open House London · 2026 — deployed on Robinhood Chain (testnet 46630, mainnet 4663) · targeting Champions, Founder-in-Residence, Innovation Award, Best Agentic*
