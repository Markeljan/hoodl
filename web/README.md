# HOODL web app

The Vite/React frontend reads and writes the deployed Robinhood Chain contracts recorded in
[`../deployments/robinhood-mainnet.json`](../deployments/robinhood-mainnet.json). Contract ABIs are
imported from [`../deployments/abis/`](../deployments/abis/); addresses are not duplicated in the
web source.

## Run locally

```shell
bun install
bun run dev
```

The app uses the public Robinhood Chain RPC for read-only state. To transact, open it in a browser
with an injected EVM wallet. Connecting requests Robinhood Chain mainnet (chain ID `4663`) and adds
the network when the wallet reports that it is unknown.

## Implemented contract flows

- Discover indexes from `IndexFactory.indexesCount` and `allIndexes`.
- Detect per-component Lens valuation and Zap routing support before exposing optional actions.
- Create indexes with the factory's full parameters: composition, units, creator fees, description, and image URI.
- Read index metadata, immutable fee splits, total supply, components, token/contract metadata, and live NAV provenance.
- Read connected-wallet balances for every registered index plus USDG.
- Buy with USDG through `IndexZap.zapMint`, including approval and a 3% maximum-spend buffer.
- Sell to USDG through `IndexZap.zapRedeem`, using per-pool V4Quoter output and an enforced minimum.
- Mint in-kind using `previewMint`, exact component approvals, and `IndexToken.mint`.
- Redeem directly to the component basket with `IndexToken.redeem`.
- Send direct mint/redeem output to an optional recipient.
- Transfer any held index with the ERC-20 `transfer` function.
- Manage creator metadata and rotate the creator-fee recipient.
- Read factory, index, and Zap events into a protocol activity and creator analytics feed.
- Use a separately owner-gated operator console for factory economics, treasury, Lens/sequencer configuration, Zap pools, and ownership.

Every write is simulated before it is sent, then tracked until its Robinhood Chain receipt is
confirmed. Transaction links point to Blockscout.

## Discovery and analytics

The production HTML publishes canonical, Open Graph, Twitter Card, and JSON-LD metadata for
`https://hoodl.finance/`. Supporting files in `public/` provide the social preview, app icons,
web manifest, robots policy, and sitemap.

Vercel Web Analytics and Speed Insights are mounted at the application root. Custom events cover
screen navigation, wallet lifecycle, and protocol-action outcomes without including wallet
addresses, transaction hashes, entered amounts, or error messages. The corresponding features
must be enabled for the project in Vercel for production data to appear in its dashboards.

## Checks

```shell
bun run test
bun run lint
bun run build
```
