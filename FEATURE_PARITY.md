# HOODL contract feature parity

Last updated: 2026-07-14

This document is the durable implementation and handoff tracker for bringing the web app to important feature parity with the deployed HOODL contracts. Update the status table and handoff notes whenever a slice is completed or blocked.

## Status legend

- `DONE`: implemented and verified.
- `IN PROGRESS`: actively being implemented.
- `TODO`: scoped but not started.
- `BLOCKED`: cannot proceed without a documented dependency or decision.
- `OUT OF RETAIL`: supported in a separate owner-gated operator surface, not the normal user app.

## Implementation order

| # | Priority | Feature | Status | Acceptance criteria |
|---|---|---|---|---|
| 1 | P0 | Per-index capability detection | DONE | Read Lens and Zap configuration per component; derive valuation, zap-in, and zap-out availability; gate actions with a reason while preserving in-kind paths. |
| 2 | P0 | Full create-index wizard | DONE | Submit full `IndexParams`; validate 1-16 unique nonzero components and fee caps; convert display units to raw units; preview protocol and creator fees; refresh/open the created index. |
| 3 | P0 | Multi-index portfolio | DONE | Render every connected-wallet index balance with NAV, look-through, and generic buy/mint/redeem/transfer actions. |
| 4 | P0 | Zap redemption to USDG | DONE | Approve index shares, provide a route-aware quote and minimum output, call `zapRedeem`, and show the confirmed USDG result. |
| 5 | P1 | Creator dashboard | DONE | List indexes controlled by the connected creator; support `setMetadata` and `setCreator`; show current creator balance, generated fee analytics, and immutable fee split. |
| 6 | P1 | Metadata, fee, and NAV provenance | DONE | Render `imageURI`; expose on-chain metadata links; show protocol versus creator fees and each component's Lens source/configuration. |
| 7 | P2 | Advanced mint/redeem recipients | DONE | Default to the connected wallet and allow an optional valid recipient for direct in-kind mint and redeem. |
| 8 | P2 | Event-backed activity and analytics | DONE | Read creation, mint, redeem, zap, creator, and metadata events; show recent activity and creator-relevant usage totals. |
| 9 | P3 | Owner-gated operator console | DONE | Separate owner-only UI for future protocol fees, treasury, Lens config/sequencer, Zap pool routing, and ownership transfer/renunciation. |

## Already implemented at audit start

- Factory registry discovery through `indexesCount` and `allIndexes`.
- Index name, symbol, creator, description, supply, composition, units, and fee reads.
- Component valuation and index NAV through IndexLens.
- USDG zap mint with approval, maximum input, simulation, confirmation, and refund semantics.
- Direct in-kind mint with exact component preview and approvals.
- Direct in-kind redemption with exact basket preview.
- Injected-wallet connection and Robinhood Chain add/switch flow.
- Simulate-first writes, receipt tracking, refresh, and Blockscout links.

## Required verification

Run after each coherent slice and before handoff:

```shell
cd web
bun run lint
bun run build

cd ..
forge test
```

Final verification requires browser checks at desktop and mobile widths for public screens. Creator and Operator connected states and wallet-only writes should be verified with funded role wallets when available; otherwise verify their disconnected/permission gating, TypeScript build, simulate-first wiring, and the underlying contract suites without broadcasting privileged transactions.

## Important implementation constraints

- A factory-created index is always core-compatible only if its components behave as standard ERC-20s. Lens valuation and Zap routing are optional periphery capabilities.
- USDG components need neither a Lens config nor a Zap pool because both contracts treat USDG as the quote/cash leg.
- Never imply that lack of Zap routing blocks direct in-kind redemption.
- Do not use Lens NAV alone as the `zapRedeem` slippage bound: Lens sources can differ from executable Zap pools.
- Creator fee shares are delivered automatically; there is no claim transaction.
- Operator writes must be role-gated and visually separated from retail and creator flows.
- Preserve the immutable-composition and immutable-per-index-fee model; do not add controls the contracts do not support.

## Handoff notes

- Contract and app audit completed on 2026-07-14.
- Baseline verification: 60 contract tests passed, 0 failed, 3 fork tests skipped; web lint and build passed.
- Deployed registry contained one index at the start of implementation.
- No unresolved blockers at implementation start.
- All nine audited feature slices were implemented in the web app on 2026-07-14.
- `bun run lint` and `bun run build` pass after the final implementation.
- `forge test` passes 60 tests with 0 failures; the 3 environment-gated fork tests remain skipped by default.
- Browser verification covered Landing, Create, Discover, Detail, Sell quote, Portfolio disconnected state, Activity, desktop layout, and a 390px mobile layout. No browser console warnings/errors or horizontal overflow were observed.
- Live read verification produced a route-aware V4Quoter zap-out estimate for 1 hAI and loaded the deployed event history from the public RPC.
- Wallet-only writes were not broadcast during verification. They use the same simulate-first and receipt-tracked path as the previously shipped writes; contract permissions and behavior remain covered by the Foundry suites.
- No known implementation blockers remain. Future work should begin from product feedback or integration testing with funded role wallets, not from an unfinished parity item in this tracker.
