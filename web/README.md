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
- Read index metadata, immutable fees, total supply, components, token metadata, and live NAV.
- Read connected-wallet hAI and USDG balances.
- Buy with USDG through `IndexZap.zapMint`, including approval and a 3% maximum-spend buffer.
- Mint in-kind using `previewMint`, exact component approvals, and `IndexToken.mint`.
- Redeem directly to the component basket with `IndexToken.redeem`.
- Transfer hAI with the ERC-20 `transfer` function.

Every write is simulated before it is sent, then tracked until its Robinhood Chain receipt is
confirmed. Transaction links point to Blockscout.

## Checks

```shell
bun run lint
bun run build
```
