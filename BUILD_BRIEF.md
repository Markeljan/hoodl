# HOODL — Build Brief v3 (Arbitrum Open House London, July 10–12, 2026)

*Supersedes v2 (clubs/AI-manager, preserved on `hoodl-pvp-game`). The product is now the **in-kind index primitive** — see CONTRACTS_SPEC.md for the as-built design. Contracts are done and fork-validated; what remains is deploy + UI + pitch.*

## Why we pivoted (one paragraph)

The clubs/manager design was a managed fund — heavy regulatory shape, heavy build (managers, allowlists, agent guardrails), and its swap-based custody died on a verified fact: stock-token DEX liquidity is ~$15–41k (SPY/QQQ ≈ $0). The in-kind index keeps everything only-onchain about the idea and deletes everything else: **no swaps (thin pools irrelevant), no oracle in core, no manager (nothing to trust), permissionless issuance, and the share is a composable ERC-20.** One mechanism, three unlocks.

## Locked decisions

| Decision | Choice |
|---|---|
| Primitive | **Index tokens**: fixed raw units per 1e18 shares, immutable composition, in-kind mint/redeem |
| Issuance | Fully **permissionless** — no allowlist; bad components break only their own index |
| Fee | **10 bps on mint**, in fully-backed shares (zero dilution), **cap 50 bps**, snapshotted per index; **redemption always free** |
| Oracle | **None in core.** Periphery lens only: Chainlink (stocks) + token/USDG v4 spot (memecoins) |
| Rebalancing | **Doesn't exist.** Fixed units = cap-weight drift = a held portfolio. Reconstitution = successor index (roadmap) |
| Admin surface | IndexToken has **zero admin functions**; factory owner controls only future-index fee + treasury |
| Flagship | **"HOODL AI Index" (hAI)**: 0.05 NVDA + 0.025 TSLA + 60 CASHCAT ≈ $32/share |

## Chain facts (verified)

| | Mainnet | Testnet |
|---|---|---|
| Chain ID | 4663 | 46630 |
| RPC | rpc.mainnet.chain.robinhood.com | rpc.testnet.chain.robinhood.com |
| Explorer | robinhoodchain.blockscout.com | explorer.testnet.chain.robinhood.com |
| Faucet | — | dispenses ETH **and test stock tokens** |

- Stock tokens: standard ERC-20, 18-dec, ERC-8056 (raw balances split-proof; feeds multiplier-adjusted). **Reg S: US persons may not HOLD** — mainnet existence proof = contracts only; test with faucet tokens on testnet, `deal()` on forks.
- Key addresses in `src/libraries/RHChain.sol` (all verified): USDG, StateView, NVDA/TSLA feeds, CASHCAT/USDG pool (PoolKey hash-checked).
- Live competitors to name in pitch: Robindex (immutable, stake-gated, keeper), HoodFunds (solo memecoin portfolios). Neither is permissionless, in-kind, or cross-asset.

## Demo script (3 min)

| Time | Beat |
|---|---|
| 0:00–0:25 | Hook: "Stocks are ERC-20s now. So why does making an index of them still take a fund, a manager, and a keeper? HOODL: anyone mints an index token — and it's just money." |
| 0:25–1:00 | Create the AI Index live (`createIndex`, one tx). Composition on screen: NVDA + TSLA + CASHCAT — "no vehicle on earth can hold these three in one ticker." |
| 1:00–1:45 | **Mint in-kind**: deposit 0.5 NVDA + 0.25 TSLA + 600 CASHCAT → receive hAI shares. Point at the trace: *zero swaps, zero slippage, zero oracle.* NAV lens reads $32.62 live from Chainlink + v4. |
| 1:45–2:20 | **The share is money**: transfer hAI to a second wallet; *that* wallet redeems and receives real NVDA it never bought. "Anyone is the authorized participant — this is how the peg holds itself." |
| 2:20–2:40 | Trust story: "There is no manager, no admin function, no upgrade path. Composition is immutable. The only thing the protocol can ever change is the fee on *future* indexes — capped at 0.5%." |
| 2:40–3:00 | Business close: 10 bps once at mint vs 3–95 bps/yr for ETFs; revenue = issuance volume; milestones. |

Reliability kit: pre-funded burner wallets ×2, faucet stock tokens acquired hour 0, Alchemy RPC, fork rehearsal (already green), pre-screenshotted explorer txs, recording backup.

## Judge Q&A crib sheet

- **"How is this different from Robindex?"** — "Stake-gated, stock-only, keeper-rebalanced, no in-kind exit. We're permissionless, cross-asset, self-maintaining, and redemption never needs a market."
- **"What if the memecoin pool is manipulated?"** — "Core doesn't care — no price gates minting or redemption; they're exact in-kind. The lens is display-layer; collateral integrators add TWAPs."
- **"Who can rug it?"** — "Nobody. The index has zero admin functions and immutable composition. The factory owner's only power is the fee on future indexes, hard-capped at 0.5%."
- **"Rebalancing?"** — "Fixed units behave like a held portfolio — cap-weight drift. If you want new weights, redeem-mint into a successor index; migration tooling is roadmap."
- **"Regulation?"** — "The protocol never custodies for anyone — minting is self-service against your own tokens, and Reg S enforcement lives at the stock-token layer, not ours. No pooled discretionary management exists to regulate."
- **"Fee-on-transfer tokens?"** — "Unsupported and isolated: a broken component breaks only its own index — same posture as a scam-token Uniswap pool."

## Sequencing

- **Day 1**: ~~contracts + tests~~ ✅ done (41 unit/fuzz + mainnet-fork lifecycle green). Testnet deploy + faucet stock tokens + create hAI.
- **Day 2**: minimal UI (index page: composition, NAV via lens, mint/redeem forms, transfer), mainnet existence deploy (~1h), canvas final.
- **Day 3**: two full rehearsals, recording backup, pitch drill.
- **Descope ladder**: UI polish → lens sequencer wiring → nothing else to cut; the core is already minimal.
