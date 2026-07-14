# Hood's Most Wanted (`hMEME`)

Five chain-born outlaws. One fully backed bag.

`hMEME` is a fixed, equal-value-at-launch basket of the five established Robinhood Chain memecoins that passed the launch screen on July 14, 2026: CASHCAT, ARROW, HOODRAT, WISHBONE, and HOODIE. One share is backed by roughly $1 of each token at the recorded snapshot, for a launch NAV of approximately $5.

## Live deployment

- Contract: [`0x1Da8FbeB89e7b4517E426d2BDbE811BF4CEbB7f5`](https://robinhoodchain.blockscout.com/address/0x1Da8FbeB89e7b4517E426d2BDbE811BF4CEbB7f5)
- Creation transaction: [`0x4f985b…80ab5e`](https://robinhoodchain.blockscout.com/tx/0x4f985be7a2b97c1b50a0f43d37fd3e43a8fd6c17feb0fc1d14e5f13d4380ab5e)
- Block: `9811376` at `2026-07-14T20:18:38Z`
- Creator fees: maximum `100 bps` on mint and `100 bps` on redeem
- Metadata image: [`https://hoodl.finance/tokens/hmeme.png`](https://hoodl.finance/tokens/hmeme.png)
- Source: verified on Robinhood Chain Blockscout

The contract starts with zero supply. The first holder mints shares by approving and depositing the exact five-token basket; the contract does not pre-mint unbacked shares.

## Thesis

Robinhood Chain's earliest product-market fit is culture. Memecoins dominate the chain's open liquidity and activity while the RWA market is still forming. `hMEME` turns that fragmented attention into one composable ERC-20 without pretending the memes are less speculative than they are.

- Equal-value launch units avoid letting CASHCAT's much larger market cap consume the whole basket on day one.
- Units never rebalance. Winners run, losers shrink, and holders can verify the exact backing on-chain.
- Mint and redemption are in-kind. No DEX liquidity, manager, oracle, or privileged market maker is required at the HOODL layer.
- The creator receives the maximum immutable fee allowed by the deployed factory: 1% of gross shares on mint and 1% of redeemed shares. The intended use is meme bounties, community contests, raids, art, and distribution.
- Protocol plus creator fees total 1.30% on mint and 1.10% on redeem.

## Launch basket

| Rank | Token | Contract | Units per `hMEME` | Snapshot market cap | Primary-pool liquidity | 24h volume |
| ---: | --- | --- | ---: | ---: | ---: | ---: |
| 1 | CASHCAT | `0x020bfC650A365f8BB26819deAAbF3E21291018b4` | 6.333122229259024699 | $156.65M | $9.72M | $31.66M |
| 2 | ARROW | `0xf2915d1e3C1B0c769d0c756Ec43F1c1f6c99cD03` | 0.719424460431654676 | $13.94M | $291.82K | $1.22M |
| 3 | HOODRAT | `0x8e62F281f282686fCa6dCB39288069a93fC23F1c` | 120.845921450151057401 | $8.28M | $341.57K | $3.07M |
| 4 | WISHBONE | `0x77581054581B9c525E7dd7a0155DE43867532d03` | 144.029958231312112919 | $6.62M | $389.65K | $3.67M |
| 5 | HOODIE | `0xC72c01AAB5f5678dc1d6f5C6d2B417d91D402Ba3` | 73,583.517292126563649742 | $1.36M | $425.25K | $476.66K |

The snapshot was captured at `2026-07-14T20:05:39.601Z`. Market data changes continuously. Full raw units, pool URLs, and validation fields live in [`deployments/robinhood-meme-index.json`](deployments/robinhood-meme-index.json).

## Selection and safety screen

The screen ranked established, Robinhood-native memecoins by current canonical-token market cap. It excluded utility tokens, duplicate tickers, spoof pools, and pools below $1,000 liquidity or $100 daily volume. Each selected address was then checked directly on Robinhood Chain for ERC-20 metadata and live contract code.

Ticker matching alone is unsafe on a permissionless chain. Several duplicate CASHCAT, DIH, HOODRAT, ARROW, and WISHBONE contracts advertised millions in liquidity but had effectively no trading. The selected addresses above are the active contracts, not the highest-looking duplicate pool.

ARROW and HOODRAT currently report zero buy and sell tax. HOODIE's launch balance limit is disabled. CASHCAT and WISHBONE use launch-token wallet limits, but their current per-wallet limits are far above the launch basket requirements. These are point-in-time checks, not guarantees; memecoin contracts and markets carry extreme liquidity, tax, concentration, and smart-contract risk.

## Brand and metadata

- Name: `Hood's Most Wanted`
- Symbol: `hMEME`
- Image: `https://hoodl.finance/tokens/hmeme.png`
- Meme line: `5 OUTLAWS · 1 BAG`
- Independence: not affiliated with or endorsed by Robinhood Markets, Inc.

## Reproducible launch

The Bun signer defaults to simulation and reads the ignored root `.env`:

```sh
cd web
bun run launch:hmeme
```

Broadcast only after the simulation succeeds:

```sh
cd web
BROADCAST=true bun run launch:hmeme
```

The script rejects any key that does not derive to the recorded project deployer and exits without a transaction when an index with the same name and symbol is already in the factory registry.

Re-run the complete on-chain, receipt, source, metadata, and hosted-image validation with:

```sh
cd web
bun run verify:hmeme
```

## Sources

- [DexScreener Robinhood Chain pools](https://dexscreener.com/robinhood)
- [GeckoTerminal Robinhood pools](https://www.geckoterminal.com/robinhood/pools)
- [Robinhood Chain Blockscout](https://robinhoodchain.blockscout.com/)
- [DEXTools on early Robinhood Chain pool activity](https://www.dextools.io/news/robinhood-chain-one-week-onchain-memecoins-tokenized-stocks-reality-july-2026)
- [CoinDesk on CASHCAT and Robinhood Chain memecoin activity](https://www.coindesk.com/tech/2026/07/13/robinhood-built-a-blockchain-for-tokenized-stocks-memecoins-took-over)
- [OpenSea's Robinhood Chain launch](https://opensea.io/blog/articles/robinhood-chain-is-live-on-opensea)

This is a highly speculative memecoin index, not investment advice. The composition and units are immutable after creation.
