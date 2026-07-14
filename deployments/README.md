# Robinhood Chain mainnet deployment

The canonical machine-readable frontend handoff is
[`robinhood-mainnet.json`](./robinhood-mainnet.json). It contains the chain configuration,
contract and dependency addresses, roles, fee settings, hAI composition, lens and zap pool
configuration, transaction hashes, explorer links, and validation results.

Standalone frontend ABIs are in [`abis/`](./abis/):

- `IndexFactory.json` — discover and create indexes; read protocol configuration.
- `IndexToken.json` — ERC-20, component, preview, mint, redeem, fee, and metadata calls.
- `IndexLens.json` — USDG-denominated component values and index NAV.
- `IndexZap.json` — one-transaction USDG mint and redeem routes.

Addresses on Robinhood Chain mainnet (chain ID `4663`):

| Contract | Address |
| --- | --- |
| IndexFactory | `0x9C1746bB146E1713DaD64aFC0c8becA5Ee5B9882` |
| IndexLens | `0x6F379d544597EBA7A19e13B5b589E832975b5EF4` |
| IndexZap | `0x717500F9BA2BFF85C047fEaCb3F98F7a667BfdE2` |
| hAI / IndexToken | `0x9f5e540829A647C6BFC02066888Ee6f9E43708FD` |
| hMEME / IndexToken | `0x1Da8FbeB89e7b4517E426d2BDbE811BF4CEbB7f5` |

Use the manifest as the source of truth instead of duplicating addresses in frontend code. All
token amounts returned by the contracts are raw integer amounts: hAI and its three components use
18 decimals, while USDG and `IndexLens` NAV results use 6 decimals.

The immutable hAI units per `1e18` shares are `0.05 NVDA`, `0.025 TSLA`, and `60 CASHCAT`. Its
total fees are 50 bps on mint and 20 bps on redeem, split between protocol and creator as recorded
in the manifest.

The original Foundry broadcast record is retained under
[`broadcast/Deploy.s.sol/4663/`](../broadcast/Deploy.s.sol/4663/). No private key is stored in the
deployment manifest, ABIs, or broadcast record.

The hMEME research snapshot, immutable basket, maximum creator-fee settings, live transaction,
and verification details are recorded in [`robinhood-meme-index.json`](./robinhood-meme-index.json)
and [`MEME_INDEX.md`](../MEME_INDEX.md).
