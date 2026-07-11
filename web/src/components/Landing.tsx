interface LandingProps {
  buyNow: () => void
  exploreNow: () => void
}

const highlightCards = [
  {
    title: 'Cross-asset by construction',
    body: 'NVDA + TSLA + a memecoin in a single ERC-20. No fund wrapper, no allowlist — issuance is one permissionless call.',
  },
  {
    title: 'The index is money',
    body: 'A standard ERC-20 with on-chain-verifiable holdings. Transfer it, LP it, or post it as collateral anywhere.',
  },
  {
    title: 'Redemption always works',
    body: 'Burn your shares for the exact basket back — deterministic, ungateable, and needs zero DEX liquidity to exit.',
  },
  {
    title: 'Live NAV, on-chain',
    body: 'Priced by a display-layer lens: Chainlink feeds for stocks, Uniswap v4 spot for memecoins. Never in the mint path.',
  },
]

const waysIn = [
  {
    tag: '01 · DEX',
    tagColor: 'var(--text-3)',
    title: 'Swap on the pool',
    body: 'USDG → hAI on the seeded Uniswap v4 pool. One click, price pinned to NAV by arbitrage.',
  },
  {
    tag: '02 · ZAP',
    tagColor: 'var(--neon)',
    title: 'Buy with plain USDG',
    body: 'One transaction buys every component and mints in-kind to you. Unspent USDG refunded.',
  },
  {
    tag: '03 · IN-KIND',
    tagColor: 'var(--text-3)',
    title: 'Deposit the basket',
    body: 'Bring the exact tokens, mint the share. Deterministic — no price, no slippage, no MEV. You are the AP.',
  },
]

const heroRows = [
  { color: '#76b900', name: 'NVIDIA', kind: 'Stock', units: '0.05 NVDA', value: '$16.12', pct: '49.4%' },
  { color: '#e82127', name: 'Tesla', kind: 'Stock', units: '0.025 TSLA', value: '$7.10', pct: '21.8%' },
  { color: '#f5a623', name: 'Cash Cat', kind: 'Memecoin', units: '60 CASHCAT', value: '$9.40', pct: '28.8%' },
]

export default function Landing({ buyNow, exploreNow }: LandingProps) {
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
            Permissionless index tokens
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
            <span
              style={{
                background: 'var(--neon)',
                color: 'var(--on-neon)',
                padding: '0 10px',
                borderRadius: 8,
                boxDecorationBreak: 'clone',
                WebkitBoxDecorationBreak: 'clone',
              }}
            >
              one token
            </span>
            .
          </h1>
          <p style={{ margin: '22px 0 0', maxWidth: '34ch', fontSize: 18.5, lineHeight: 1.55, color: 'var(--text-2)', textWrap: 'pretty' }}>
            HOODL wraps any basket of tokenized stocks and crypto into a single ERC-20 — minted and redeemed{' '}
            <em style={{ fontStyle: 'normal', color: 'var(--text)' }}>in-kind</em>. No manager, no oracle in the core, nothing to trust.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 30 }}>
            <button
              onClick={buyNow}
              className="hv-lift"
              style={{
                padding: '15px 24px',
                border: 'none',
                borderRadius: 12,
                background: 'var(--neon)',
                color: 'var(--on-neon)',
                cursor: 'pointer',
                font: "600 15.5px 'Space Grotesk',sans-serif",
                boxShadow: '0 14px 34px -14px var(--neon)',
                transition: 'transform .12s ease',
              }}
            >
              Buy hAI with USDG →
            </button>
            <button
              onClick={exploreNow}
              className="hv-ghost"
              style={{
                padding: '15px 24px',
                border: '1px solid var(--border-strong)',
                borderRadius: 12,
                background: 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
                font: "600 15px 'Space Grotesk',sans-serif",
              }}
            >
              Explore indexes
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 30, marginTop: 40, paddingTop: 30, borderTop: '1px solid var(--border)' }}>
            {[
              ['$32.62', 'NAV / hAI · live'],
              ['0.50%', 'all-in, once — not per year'],
              ['3 assets', 'stocks + crypto, 1 ticker'],
            ].map(([v, l]) => (
              <div key={l}>
                <div style={{ font: "600 26px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{v}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        {/* composition card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <span style={{ font: "500 12px 'JetBrains Mono',monospace", letterSpacing: '.05em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
              Inside 1 hAI
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--neon)', animation: 'hoodl-pulse 2.4s ease-in-out infinite' }} />
              redeemable in-kind
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {heroRows.map((r, i) => (
              <div
                key={r.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 13,
                  padding: '14px 4px',
                  borderBottom: i < heroRows.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <span style={{ width: 11, height: 11, borderRadius: 99, background: r.color, flex: 'none' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {r.name} <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>· {r.kind}</span>
                  </div>
                  <div style={{ font: "500 12px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>{r.units}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ font: "600 15px 'Space Grotesk',sans-serif" }}>{r.value}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{r.pct}</div>
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 16,
              padding: 16,
              borderRadius: 13,
              background: 'var(--neon-dim)',
              border: '1px solid var(--neon-line)',
            }}
          >
            <span style={{ font: "600 14px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>= 1 hAI</span>
            <span style={{ font: "700 22px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>$32.62</span>
          </div>
          <p style={{ margin: '14px 2px 0', fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
            No vehicle on earth holds NVDA and a memecoin in one ticker. Here it’s one call.
          </p>
        </div>
      </section>

      {/* highlights */}
      <section style={{ marginTop: 74 }}>
        <h2 style={{ font: "600 13px 'JetBrains Mono',monospace", letterSpacing: '.08em', color: 'var(--text-3)', textTransform: 'uppercase', margin: '0 0 22px' }}>
          Why it’s different
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(240px,100%),1fr))', gap: 16 }}>
          {highlightCards.map((c) => (
            <div key={c.title} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
              <div style={{ width: 30, height: 4, borderRadius: 99, background: 'var(--neon)', marginBottom: 16 }} />
              <h3 style={{ margin: '0 0 8px', font: "600 17px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{c.title}</h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)' }}>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* how to get in */}
      <section style={{ marginTop: 56 }}>
        <h2 style={{ font: "600 13px 'JetBrains Mono',monospace", letterSpacing: '.08em', color: 'var(--text-3)', textTransform: 'uppercase', margin: '0 0 22px' }}>
          Three ways in — same token out
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(260px,100%),1fr))', gap: 16 }}>
          {waysIn.map((c) => (
            <div key={c.tag} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
              <span style={{ font: "600 13px 'JetBrains Mono',monospace", color: c.tagColor }}>{c.tag}</span>
              <h3 style={{ margin: '10px 0 7px', font: "600 16px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{c.title}</h3>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-2)' }}>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* cta band */}
      <section
        className="cta-band"
        style={{
          marginTop: 56,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
        }}
      >
        <div>
          <div style={{ font: "700 24px 'Space Grotesk',sans-serif", color: 'var(--text)', letterSpacing: '-.01em' }}>
            0.50% once. Not 3–95 bps every year.
          </div>
          <div style={{ marginTop: 6, fontSize: 14.5, color: 'var(--text-2)' }}>
            Fees are taken in fully-backed shares — zero dilution. Redemption is always free.
          </div>
        </div>
        <button
          onClick={buyNow}
          className="hv-lift"
          style={{
            padding: '15px 26px',
            border: 'none',
            borderRadius: 12,
            background: 'var(--neon)',
            color: 'var(--on-neon)',
            cursor: 'pointer',
            font: "600 15px 'Space Grotesk',sans-serif",
            boxShadow: '0 14px 34px -14px var(--neon)',
          }}
        >
          Open the AI Index →
        </button>
      </section>
    </main>
  )
}
