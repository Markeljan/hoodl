import type { IndexView } from '../model'

interface LandingProps {
  hai: IndexView | null
  loading: boolean
  buyNow: () => void
  exploreNow: () => void
}

const highlightCards = [
  {
    title: 'Cross-asset by construction',
    body: 'Tokenized stocks and crypto in a single ERC-20. The composition and units are read directly from the deployed index.',
  },
  {
    title: 'The index is money',
    body: 'A standard ERC-20 with on-chain-verifiable holdings. Transfer it, LP it, or integrate it anywhere ERC-20s are supported.',
  },
  {
    title: 'Market-independent redemption',
    body: 'Redeem shares for the exact component basket without relying on DEX liquidity or a privileged market maker.',
  },
  {
    title: 'Live NAV, on-chain',
    body: 'The deployed lens reads Chainlink feeds for stock tokens and the configured Uniswap v4 pool for CASHCAT.',
  },
]

const protocolPaths = [
  {
    tag: '01 · ZAP',
    tagColor: 'var(--neon)',
    title: 'Buy with USDG',
    body: 'Approve USDG, then the deployed zap buys every component and mints the index. Unspent USDG is refunded by the contract.',
  },
  {
    tag: '02 · IN-KIND',
    tagColor: 'var(--text-3)',
    title: 'Deposit the basket',
    body: 'Approve each exact component amount and mint directly. The deposit quote comes from IndexToken.previewMint.',
  },
  {
    tag: '03 · REDEEM',
    tagColor: 'var(--text-3)',
    title: 'Exit to components',
    body: 'Call redeem on the index and receive the previewed component amounts in your wallet, net of the immutable share fee.',
  },
]

export default function Landing({ hai, loading, buyNow, exploreNow }: LandingProps) {
  const navLabel = hai?.navLabel ?? (loading ? 'Loading…' : 'Unavailable')
  const symbol = hai?.symbol ?? 'hAI'
  return (
    <main className="page page--landing">
      <section className="hero-grid">
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              border: '1px solid var(--border)',
              borderRadius: 99,
              background: 'var(--surface)',
              font: "500 11.5px 'JetBrains Mono',monospace",
              letterSpacing: '.06em',
              color: 'var(--text-2)',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--neon)' }} />
            Live on Robinhood Chain
          </div>
          <h1
            style={{
              margin: '22px 0 0',
              font: "700 clamp(40px,4.6vw,58px)/1.02 'Space Grotesk',sans-serif",
              letterSpacing: '-.03em',
              color: 'var(--text)',
              textWrap: 'balance',
            }}
          >
            Own the whole thesis in{' '}
            <span style={{ background: 'var(--neon)', color: 'var(--on-neon)', padding: '0 10px', borderRadius: 8, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>
              one token
            </span>
            .
          </h1>
          <p style={{ margin: '22px 0 0', maxWidth: '34ch', fontSize: 18.5, lineHeight: 1.55, color: 'var(--text-2)', textWrap: 'pretty' }}>
            HOODL wraps a fixed basket of tokenized stocks and crypto into a single ERC-20, minted and redeemed <em style={{ fontStyle: 'normal', color: 'var(--text)' }}>in-kind</em> on-chain.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 30 }}>
            <button onClick={buyNow} className="hv-lift" style={{ padding: '15px 24px', border: 'none', borderRadius: 12, background: 'var(--neon)', color: 'var(--on-neon)', cursor: 'pointer', font: "600 15.5px 'Space Grotesk',sans-serif", boxShadow: '0 14px 34px -14px var(--neon)', transition: 'transform .12s ease' }}>
              Buy {symbol} with USDG →
            </button>
            <button onClick={exploreNow} className="hv-ghost" style={{ padding: '15px 24px', border: '1px solid var(--border-strong)', borderRadius: 12, background: 'transparent', color: 'var(--text)', cursor: 'pointer', font: "600 15px 'Space Grotesk',sans-serif" }}>
              Explore deployed indexes
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 30, marginTop: 40, paddingTop: 30, borderTop: '1px solid var(--border)' }}>
            {[
              [navLabel, `NAV / ${symbol} · live`],
              [hai?.fMintLabel ?? '—', 'total mint fee'],
              [hai ? `${hai.rows.length} assets` : '—', 'composition from chain'],
            ].map(([value, label]) => (
              <div key={label}>
                <div style={{ font: "600 26px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{value}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <span style={{ font: "500 12px 'JetBrains Mono',monospace", letterSpacing: '.05em', color: 'var(--text-3)', textTransform: 'uppercase' }}>Inside 1 {symbol}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--neon)', animation: 'hoodl-pulse 2.4s ease-in-out infinite' }} />
              read on-chain
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(hai?.rows ?? []).map((row, index) => (
              <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 4px', borderBottom: index < (hai?.rows.length ?? 0) - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ width: 11, height: 11, borderRadius: 99, background: row.color, flex: 'none' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {row.name} <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>· {row.kind}</span>
                  </div>
                  <div style={{ font: "500 12px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>{row.unitsLabel} {row.sym}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ font: "600 15px 'Space Grotesk',sans-serif" }}>{row.valueLabel}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{row.weightLabel}</div>
                </div>
              </div>
            ))}
            {!hai && <div style={{ padding: '30px 4px', color: 'var(--text-3)' }}>{loading ? 'Reading the deployed index…' : 'Index data unavailable.'}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: 16, borderRadius: 13, background: 'var(--neon-dim)', border: '1px solid var(--neon-line)' }}>
            <span style={{ font: "600 14px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>= 1 {symbol}</span>
            <span style={{ font: "700 22px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{navLabel}</span>
          </div>
          <p style={{ margin: '14px 2px 0', fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5 }}>Values come from the deployed IndexLens and refresh against the public Robinhood Chain RPC.</p>
        </div>
      </section>

      <section style={{ marginTop: 74 }}>
        <h2 style={{ font: "600 13px 'JetBrains Mono',monospace", letterSpacing: '.08em', color: 'var(--text-3)', textTransform: 'uppercase', margin: '0 0 22px' }}>Why it’s different</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(240px,100%),1fr))', gap: 16 }}>
          {highlightCards.map((card) => (
            <div key={card.title} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
              <div style={{ width: 30, height: 4, borderRadius: 99, background: 'var(--neon)', marginBottom: 16 }} />
              <h3 style={{ margin: '0 0 8px', font: "600 17px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{card.title}</h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 56 }}>
        <h2 style={{ font: "600 13px 'JetBrains Mono',monospace", letterSpacing: '.08em', color: 'var(--text-3)', textTransform: 'uppercase', margin: '0 0 22px' }}>Actual contract paths</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(260px,100%),1fr))', gap: 16 }}>
          {protocolPaths.map((card) => (
            <div key={card.tag} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
              <span style={{ font: "600 13px 'JetBrains Mono',monospace", color: card.tagColor }}>{card.tag}</span>
              <h3 style={{ margin: '10px 0 7px', font: "600 16px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{card.title}</h3>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-2)' }}>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-band" style={{ marginTop: 56, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20 }}>
        <div>
          <div style={{ font: "700 24px 'Space Grotesk',sans-serif", color: 'var(--text)', letterSpacing: '-.01em' }}>{hai?.fMintLabel ?? '—'} to mint · {hai?.fRedeemLabel ?? '—'} to redeem</div>
          <div style={{ marginTop: 6, fontSize: 14.5, color: 'var(--text-2)' }}>Immutable fee rates read from the deployed hAI contract.</div>
        </div>
        <button onClick={buyNow} className="hv-lift" style={{ padding: '15px 26px', border: 'none', borderRadius: 12, background: 'var(--neon)', color: 'var(--on-neon)', cursor: 'pointer', font: "600 15px 'Space Grotesk',sans-serif", boxShadow: '0 14px 34px -14px var(--neon)' }}>
          Open the deployed index →
        </button>
      </section>
    </main>
  )
}
