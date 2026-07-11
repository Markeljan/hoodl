// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title RHChain — verified Robinhood Chain mainnet (chainId 4663) addresses
/// @notice Constants only. Chainlink price-feed addresses are intentionally NOT here — they are
///         configured per-token in the periphery IndexLens (pull them live from
///         https://docs.chain.link/data-feeds/price-feeds/addresses?network=robinhood).
/// @dev    Every address below is EIP-55 checksummed; `forge build` fails on a bad checksum,
///         so compiling this file is itself a validation pass. Sources: docs.robinhood.com/chain/contracts,
///         Blockscout (robinhoodchain.blockscout.com), Uniswap v4 deployments.
///         Liquidity tiers measured via GeckoTerminal 2026-07-10 — thin & volatile, treat as indicative.
library RHChain {
    // ── Uniswap v4 core (all confirmed on Blockscout except UniversalRouter) ──
    address internal constant POOL_MANAGER = 0x8366a39CC670B4001A1121B8F6A443A643e40951;
    address internal constant POSITION_MANAGER = 0x58daec3116aae6D93017bAAea7749052E8a04fA7;
    address internal constant STATE_VIEW = 0xF3334192D15450CdD385c8B70e03f9A6bD9E673b;
    address internal constant V4_QUOTER = 0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94;
    // ⚠️ UniversalRouter: from Uniswap deployments table only; verify on-chain (PoolManager() getter) before use.
    address internal constant UNIVERSAL_ROUTER = 0x8876789976dEcBfCbBbe364623C63652db8C0904;
    address internal constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    // ── Quote / base assets ──
    address internal constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168; // Global Dollar, 6 dec
    address internal constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73; // L2 WETH, 18 dec
    uint8 internal constant USDG_DECIMALS = 6;
    uint8 internal constant WETH_DECIMALS = 18;

    // ── Stock tokens (standard ERC-20, 18 dec, ERC-8056 UI multiplier, Chainlink-priced) ──
    // DEMO-VIABLE tier (~$15–41k on-chain liquidity — only these 4 are marginally swappable):
    address internal constant TSLA = 0x322F0929c4625eD5bAd873c95208D54E1c003b2d; // ~$41k
    address internal constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC; // ~$24k
    address internal constant AAPL = 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9; // ~$24k
    address internal constant GOOGL = 0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3; // ~$15k
    // THIN / DUST tier (<$3k — priced fine via Chainlink, but not realistically swappable on v4 yet):
    address internal constant META = 0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35; // ~$2.6k
    address internal constant PLTR = 0x894E1EC2D74FFE5AEF8Dc8A9e84686acCB964F2A; // ~$0.8k
    address internal constant MSFT = 0xe93237C50D904957Cf27E7B1133b510C669c2e74; // ~$0.4k
    address internal constant AMZN = 0x12f190a9F9d7D37a250758b26824B97CE941bF54; // ~$0.2k
    address internal constant COIN = 0x6330D8C3178a418788dF01a47479c0ce7CCF450b; // ~$0.1k
    address internal constant CRCL = 0xdF0992E440dD0be65BD8439b609d6D4366bf1CB5; // Circle
    address internal constant AMD = 0x86923f96303D656E4aa86D9d42D1e57ad2023fdC;
    address internal constant INTC = 0xc72b96e0E48ecd4DC75E1e45396e26300BC39681;
    address internal constant ORCL = 0xb0992820E760d836549ba69BC7598b4af75dEE03;
    address internal constant BABA = 0xad25Ac6C84D497db898fa1E8387bf6Af3532a1c4;
    address internal constant MU = 0xfF080c8ce2E5feadaCa0Da81314Ae59D232d4afD;
    address internal constant CRWV = 0x5f10A1C971B69e47e059e1dC91901B59b3fB49C3; // CoreWeave
    address internal constant SNDK = 0xB90A19fF0Af67f7779afF50A882A9CfF42446400; // SanDisk
    address internal constant SPCX = 0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa;
    address internal constant USAR = 0xd917B029C761D264c6A312BBbcDA868658eF86a6;
    address internal constant BE = 0x822CC93fFD030293E9842c30BBD678F530701867; // Bloom Energy

    // ── Tokenized ETFs (ERC-20, 18 dec, Chainlink-priced) — natural basket ingredients,
    //    but on-chain liquidity is ~$0–500, effectively unswappable → in-kind / 0x RFQ only. ──
    address internal constant SPY = 0x117cc2133c37B721F49dE2A7a74833232B3B4C0C; // S&P 500, ~$0.5k
    address internal constant QQQ = 0xD5f3879160bc7c32ebb4dC785F8a4F505888de68; // Nasdaq 100, ~$0.5k
    address internal constant SLV = 0x411eFb0E7f985935DAec3D4C3ebaEa0d0AD7D89f; // Silver, ~$0
    address internal constant SGOV = 0x92FD66527192E3e61d4DDd13322Aa222DE86F9B5; // T-Bills
    address internal constant CUSO = 0xa30FA36Db767ad9eD3f7a60fC79526fB4d56D344;

    // ── Memecoins (standard ERC-20, 18 dec, NO Chainlink feed → pool-derived price) ──
    address internal constant CASHCAT = 0x020bfC650A365f8BB26819deAAbF3E21291018b4; // ~$8.18M (v3 WETH) — deepest on chain
}
