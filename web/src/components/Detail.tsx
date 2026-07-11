import type { CSSProperties } from 'react'
import type { IndexView, Tab } from '../model'

export interface BasketLine {
  sym: string
  color: string
  amountLabel: string
  valueLabel?: string
}

interface DetailProps {
  sel: IndexView
  goDiscover: () => void
  tab: Tab
  setTab: (t: Tab) => void
  usdgIn: string
  onUsdgIn: (v: string) => void
  buySharesLabel: string
  buyRoute: BasketLine[]
  buyFeeLabel: string
  buyMaxLabel: string
  onBuy: () => void
  mintShares: string
  onMintShares: (v: string) => void
  mintBasket: BasketLine[]
  mintNetLabel: string
  onMint: () => void
  redeemShares: string
  onRedeemShares: (v: string) => void
  redeemBasket: BasketLine[]
  redeemFeeLabel: string
  onRedeem: () => void
  onMoney: () => void
}

const inputRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginTop: 7,
  background: 'var(--surface-2)',
  border: '1px solid var(--border-strong)',
  borderRadius: 12,
  padding: '12px 14px',
}

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: 'var(--text)',
  font: "600 22px 'Space Grotesk',sans-serif",
}

const labelStyle: CSSProperties = { fontSize: 12.5, color: 'var(--text-3)', fontWeight: 500 }

const boxStyle: CSSProperties = { marginTop: 15, padding: 14, border: '1px solid var(--border)', borderRadius: 12 }

const boxHeadStyle: CSSProperties = {
  fontSize: 11.5,
  color: 'var(--text-3)',
  marginBottom: 9,
  fontFamily: "'JetBrains Mono',monospace",
  textTransform: 'uppercase',
  letterSpacing: '.04em',
}

const receiveBoxStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 8,
  marginTop: 7,
  padding: '12px 14px',
  background: 'var(--neon-dim)',
  border: '1px solid var(--neon-line)',
  borderRadius: 12,
}

const feeRowStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-3)', marginTop: 12 }

const primaryBtnStyle: CSSProperties = {
  width: '100%',
  marginTop: 16,
  padding: 15,
  border: 'none',
  borderRadius: 12,
  background: 'var(--neon)',
  color: 'var(--on-neon)',
  cursor: 'pointer',
  font: "600 15.5px 'Space Grotesk',sans-serif",
  boxShadow: '0 14px 30px -14px var(--neon)',
}

const symbolChipStyle: CSSProperties = {
  font: "600 13px 'Space Grotesk',sans-serif",
  color: 'var(--text-2)',
  background: 'var(--surface-3)',
  borderRadius: 99,
  padding: '6px 11px',
}

function MoneyButton({ title, sub, onClick }: { title: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="hv-border"
      style={{ textAlign: 'left', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, cursor: 'pointer' }}
    >
      <div style={{ font: "600 14px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.4 }}>{sub}</div>
    </button>
  )
}

export default function Detail(p: DetailProps) {
  const { sel, tab } = p
  const tabs: Tab[] = ['buy', 'mint', 'redeem']
  return (
    <main className="page page--detail">
      <button
        onClick={p.goDiscover}
        className="hv-text"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-3)',
          fontFamily: 'Manrope,sans-serif',
          fontSize: 13.5,
          padding: '6px 0',
          marginBottom: 18,
        }}
      >
        ← Discover
      </button>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                minWidth: 56,
                height: 38,
                padding: '0 12px',
                borderRadius: 10,
                background: 'var(--surface-3)',
                font: "700 17px 'Space Grotesk',sans-serif",
                color: 'var(--text)',
              }}
            >
              {sel.symbol}
            </span>
            <h1 style={{ margin: 0, font: "700 30px 'Space Grotesk',sans-serif", letterSpacing: '-.02em', color: 'var(--text)' }}>{sel.name}</h1>
          </div>
          <p style={{ margin: '12px 0 0', maxWidth: '52ch', fontSize: 15, lineHeight: 1.55, color: 'var(--text-2)' }}>{sel.tagline}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 15 }}>
            {[sel.kindSummary, `Creator ${sel.creator}`, `${sel.supplyLabel} shares`].map((chip) => (
              <span key={chip} style={{ fontSize: 12.5, color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 99, padding: '4px 11px' }}>
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="detail-price">
          <div style={{ font: "700 40px 'Space Grotesk',sans-serif", letterSpacing: '-.02em', color: 'var(--text)' }}>{sel.navLabel}</div>
          <div className="detail-price-row">
            <span style={{ font: "600 15px 'Space Grotesk',sans-serif", color: sel.chgColor }}>{sel.changeLabel}</span>
            <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>24h</span>
          </div>
          <div className="detail-price-pills">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11.5,
                color: 'var(--text-2)',
                border: '1px solid var(--border)',
                borderRadius: 99,
                padding: '4px 10px',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--neon)' }} />
              Live NAV
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 99, padding: '4px 10px' }}>
              Chainlink · Uniswap v4
            </span>
          </div>
        </div>
      </div>

      {/* chart */}
      <div style={{ marginTop: 22, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '18px 18px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ font: "500 12px 'JetBrains Mono',monospace", color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            NAV / share
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ fontSize: 11.5, color: 'var(--on-neon)', background: 'var(--neon)', borderRadius: 6, padding: '3px 9px', fontWeight: 600 }}>7D</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-3)', padding: '3px 9px' }}>1M</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-3)', padding: '3px 9px' }}>ALL</span>
          </div>
        </div>
        <svg
          viewBox="0 0 600 140"
          preserveAspectRatio="none"
          style={{ width: '100%', height: 150, display: 'block', '--chart': sel.chartStroke } as CSSProperties}
        >
          <defs>
            <linearGradient id="hoodl-cg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart)" stopOpacity="0.24" />
              <stop offset="100%" stopColor="var(--chart)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={sel.chartArea} fill="url(#hoodl-cg)" />
          <polyline points={sel.chartLine} fill="none" stroke="var(--chart)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>

      {/* two column */}
      <div className="detail-grid" style={{ marginTop: 22 }}>
        {/* composition */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <h2 style={{ margin: 0, font: "600 17px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>Composition</h2>
            <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>fixed units · immutable</span>
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{sel.unitsNote}</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              gap: '2px 16px',
              font: "500 11px 'JetBrains Mono',monospace",
              color: 'var(--text-3)',
              textTransform: 'uppercase',
              letterSpacing: '.04em',
              padding: '0 2px 10px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span>Asset</span>
            <span className="comp-price" style={{ textAlign: 'right' }}>
              Price
            </span>
            <span style={{ textAlign: 'right' }}>Value / share</span>
          </div>
          {sel.rows.map((r) => (
            <div key={r.key} style={{ padding: '14px 2px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <span style={{ width: 11, height: 11, borderRadius: 99, flex: 'none', background: r.color }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--text)' }}>
                      {r.name} <span style={{ color: 'var(--text-3)', fontWeight: 500, fontSize: 12.5 }}>· {r.kind}</span>
                    </div>
                    <div style={{ font: "500 12px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>
                      {r.unitsLabel} {r.sym}
                    </div>
                  </div>
                </div>
                <div className="comp-price" style={{ textAlign: 'right', font: "600 14px 'Space Grotesk',sans-serif", color: 'var(--text-2)' }}>{r.priceLabel}</div>
                <div style={{ textAlign: 'right', font: "600 14.5px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{r.valueLabel}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 9 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', borderRadius: 99, width: r.barWidth, background: r.color }} />
                </div>
                <span style={{ font: "500 12px 'JetBrains Mono',monospace", color: 'var(--text-3)', minWidth: 44, textAlign: 'right' }}>{r.weightLabel}</span>
              </div>
            </div>
          ))}
          {/* money strip */}
          <div style={{ marginTop: 20 }}>
            <h3 style={{ margin: '0 0 10px', font: "600 13px 'JetBrains Mono',monospace", letterSpacing: '.05em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
              The share is money
            </h3>
            <div className="money-grid">
              <MoneyButton title="Transfer" sub="Send like any ERC-20" onClick={p.onMoney} />
              <MoneyButton title="Provide liquidity" sub="LP the v4 pool" onClick={p.onMoney} />
              <MoneyButton title="Collateralize" sub="Post in lending markets" onClick={p.onMoney} />
            </div>
          </div>
        </div>

        {/* trade panel */}
        <div
          className="trade-panel"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 18,
            padding: 20,
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ display: 'flex', gap: 3, padding: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 18 }}>
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => p.setTab(t)}
                style={{
                  flex: 1,
                  padding: 10,
                  border: 'none',
                  borderRadius: 9,
                  cursor: 'pointer',
                  font: "600 14px 'Space Grotesk',sans-serif",
                  background: tab === t ? 'var(--neon-dim)' : 'transparent',
                  color: tab === t ? 'var(--text)' : 'var(--text-3)',
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {tab === 'buy' && (
            <div>
              <label style={labelStyle}>You pay</label>
              <div style={inputRowStyle}>
                <input type="text" inputMode="decimal" value={p.usdgIn} onChange={(e) => p.onUsdgIn(e.target.value)} style={inputStyle} />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...symbolChipStyle }}>
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--neon)' }} />
                  USDG
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '12px 0' }}>
                <span style={{ color: 'var(--text-3)', fontSize: 16 }}>↓</span>
              </div>
              <label style={labelStyle}>You receive (≈)</label>
              <div style={receiveBoxStyle}>
                <span style={{ font: "700 26px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{p.buySharesLabel}</span>
                <span style={{ font: "600 14px 'Space Grotesk',sans-serif", color: 'var(--text-2)' }}>{sel.symbol}</span>
              </div>
              <div style={boxStyle}>
                <div style={boxHeadStyle}>Zap buys &amp; mints in-kind</div>
                {p.buyRoute.map((br) => (
                  <div key={br.sym} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: br.color }} />
                      {br.sym}
                    </span>
                    <span style={{ font: "500 12.5px 'JetBrains Mono',monospace", color: 'var(--text)' }}>{br.amountLabel}</span>
                  </div>
                ))}
              </div>
              <div style={feeRowStyle}>
                <span>Mint fee</span>
                <span style={{ color: 'var(--text-2)' }}>{p.buyFeeLabel}</span>
              </div>
              <div style={{ ...feeRowStyle, marginTop: 6 }}>
                <span>Max spend</span>
                <span style={{ color: 'var(--text-2)' }}>{p.buyMaxLabel}</span>
              </div>
              <button onClick={p.onBuy} className="hv-lift-sm" style={primaryBtnStyle}>
                Buy {sel.symbol}
              </button>
              <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
                <span style={{ color: 'var(--neon)' }}>●</span> Price pinned to NAV by open mint/redeem arbitrage.
              </p>
            </div>
          )}

          {tab === 'mint' && (
            <div>
              <label style={labelStyle}>Shares to mint</label>
              <div style={inputRowStyle}>
                <input type="text" inputMode="decimal" value={p.mintShares} onChange={(e) => p.onMintShares(e.target.value)} style={inputStyle} />
                <span style={symbolChipStyle}>{sel.symbol}</span>
              </div>
              <div style={boxStyle}>
                <div style={boxHeadStyle}>Deposit exactly</div>
                {p.mintBasket.map((mb) => (
                  <div key={mb.sym} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: mb.color }} />
                      {mb.amountLabel} {mb.sym}
                    </span>
                    <span style={{ font: "500 12px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>{mb.valueLabel}</span>
                  </div>
                ))}
              </div>
              <label style={{ ...labelStyle, display: 'block', marginTop: 15 }}>You receive</label>
              <div style={receiveBoxStyle}>
                <span style={{ font: "700 24px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{p.mintNetLabel}</span>
                <span style={{ font: "600 14px 'Space Grotesk',sans-serif", color: 'var(--text-2)' }}>{sel.symbol}</span>
              </div>
              <div style={feeRowStyle}>
                <span>Mint fee</span>
                <span style={{ color: 'var(--text-2)' }}>{sel.fMintLabel}</span>
              </div>
              <button onClick={p.onMint} className="hv-lift-sm" style={primaryBtnStyle}>
                Deposit basket &amp; mint
              </button>
              <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
                <span style={{ color: 'var(--neon)' }}>●</span> Deterministic — no price, no slippage, no MEV surface.
              </p>
            </div>
          )}

          {tab === 'redeem' && (
            <div>
              <label style={labelStyle}>Shares to redeem</label>
              <div style={inputRowStyle}>
                <input type="text" inputMode="decimal" value={p.redeemShares} onChange={(e) => p.onRedeemShares(e.target.value)} style={inputStyle} />
                <span style={symbolChipStyle}>{sel.symbol}</span>
              </div>
              <div style={boxStyle}>
                <div style={boxHeadStyle}>You receive back</div>
                {p.redeemBasket.map((rb) => (
                  <div key={rb.sym} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: rb.color }} />
                      {rb.amountLabel} {rb.sym}
                    </span>
                    <span style={{ font: "500 12px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>{rb.valueLabel}</span>
                  </div>
                ))}
              </div>
              <div style={feeRowStyle}>
                <span>Redeem fee (in shares)</span>
                <span style={{ color: 'var(--text-2)' }}>{p.redeemFeeLabel}</span>
              </div>
              <button
                onClick={p.onRedeem}
                className="hv-ghost"
                style={{
                  width: '100%',
                  marginTop: 16,
                  padding: 15,
                  border: '1px solid var(--border-strong)',
                  borderRadius: 12,
                  background: 'transparent',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  font: "600 15.5px 'Space Grotesk',sans-serif",
                }}
              >
                Redeem to basket
              </button>
              <div style={{ marginTop: 12, padding: '11px 13px', borderRadius: 10, background: 'var(--neon-dim)', border: '1px solid var(--neon-line)' }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
                  <strong style={{ fontWeight: 600 }}>Ungateable.</strong> Redemption needs zero DEX liquidity and can never be paused.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
