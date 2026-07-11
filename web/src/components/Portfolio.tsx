export interface LookthroughLine {
  sym: string
  name: string
  color: string
  amountLabel: string
  valueLabel: string
}

interface PortfolioProps {
  totalLabel: string
  haiChgLabel: string
  haiChgColor: string
  hBalLabel: string
  haiNavLabel: string
  holdValueLabel: string
  lookthrough: LookthroughLine[]
  buyMore: () => void
  redeemHold: () => void
  transferHold: () => void
}

export default function Portfolio(p: PortfolioProps) {
  return (
    <main className="page">
      <h1 style={{ margin: '0 0 4px', font: "700 34px 'Space Grotesk',sans-serif", letterSpacing: '-.02em', color: 'var(--text)' }}>Your portfolio</h1>
      <p style={{ margin: '0 0 26px', fontSize: 15, color: 'var(--text-2)' }}>Everything here is redeemable in-kind, anytime — no market required.</p>

      <div className="portfolio-grid">
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, marginBottom: 18 }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>Total value</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
              <span style={{ font: "700 42px 'Space Grotesk',sans-serif", letterSpacing: '-.02em', color: 'var(--text)' }}>{p.totalLabel}</span>
              <span style={{ font: "600 15px 'Space Grotesk',sans-serif", color: p.haiChgColor }}>{p.haiChgLabel} 24h</span>
            </div>
          </div>

          <h2 style={{ margin: '0 0 12px', font: "600 13px 'JetBrains Mono',monospace", letterSpacing: '.06em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
            Holdings
          </h2>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  minWidth: 52,
                  height: 36,
                  padding: '0 11px',
                  borderRadius: 9,
                  background: 'var(--surface-3)',
                  font: "700 15px 'Space Grotesk',sans-serif",
                  color: 'var(--text)',
                }}
              >
                hAI
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15.5, color: 'var(--text)' }}>HOODL AI Index</div>
                <div style={{ font: "500 12.5px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>
                  {p.hBalLabel} hAI · {p.haiNavLabel} / share
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ font: "600 17px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{p.holdValueLabel}</div>
                <div style={{ fontSize: 12.5, color: p.haiChgColor }}>{p.haiChgLabel}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
              <button
                onClick={p.buyMore}
                className="hv-lift-sm"
                style={{
                  flex: 1,
                  padding: 11,
                  border: 'none',
                  borderRadius: 10,
                  background: 'var(--neon)',
                  color: 'var(--on-neon)',
                  cursor: 'pointer',
                  font: "600 13.5px 'Space Grotesk',sans-serif",
                }}
              >
                Buy more
              </button>
              <button
                onClick={p.redeemHold}
                className="hv-ghost"
                style={{
                  flex: 1,
                  padding: 11,
                  border: '1px solid var(--border-strong)',
                  borderRadius: 10,
                  background: 'transparent',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  font: "600 13.5px 'Space Grotesk',sans-serif",
                }}
              >
                Redeem
              </button>
              <button
                onClick={p.transferHold}
                className="hv-ghost"
                style={{
                  flex: 1,
                  padding: 11,
                  border: '1px solid var(--border-strong)',
                  borderRadius: 10,
                  background: 'transparent',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  font: "600 13.5px 'Space Grotesk',sans-serif",
                }}
              >
                Transfer
              </button>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 22 }}>
          <h2 style={{ margin: '0 0 4px', font: "600 16px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>What you actually own</h2>
          <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
            Look-through to the underlying basket your {p.hBalLabel} hAI represents.
          </p>
          {p.lookthrough.map((lt) => (
            <div key={lt.sym} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ width: 11, height: 11, borderRadius: 99, flex: 'none', background: lt.color }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{lt.name}</div>
                <div style={{ font: "500 12px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>
                  {lt.amountLabel} {lt.sym}
                </div>
              </div>
              <div style={{ font: "600 14px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{lt.valueLabel}</div>
            </div>
          ))}
          <p style={{ margin: '16px 0 0', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
            <span style={{ color: 'var(--neon)' }}>●</span> Redeem returns these exact tokens to your wallet.
          </p>
        </div>
      </div>
    </main>
  )
}
