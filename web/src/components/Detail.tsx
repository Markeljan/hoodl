import type { CSSProperties } from 'react'
import { shortAddress } from '../model'
import type { IndexView, Tab } from '../model'
import { hrefForIndex, hrefForScreen } from '../routes'
import AppLink from './AppLink'
import MetadataViewer from './MetadataViewer'

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
  blockNumber: bigint | null
  explorerUrl: string
  treasuryLabel: string
  walletReady: boolean
  pendingAction: string | null
  lastTxUrl: string | null
  usdgIn: string
  onUsdgIn: (v: string) => void
  usdgBalanceLabel: string
  buySharesLabel: string
  buyRoute: BasketLine[]
  buyFeeLabel: string
  buyMaxLabel: string
  onBuy: () => void
  mintShares: string
  onMintShares: (v: string) => void
  mintBasket: BasketLine[]
  mintNetLabel: string
  mintRecipient: string
  onMintRecipient: (v: string) => void
  onMint: () => void
  redeemShares: string
  onRedeemShares: (v: string) => void
  redeemBasket: BasketLine[]
  indexBalanceLabel: string
  redeemFeeLabel: string
  redeemRecipient: string
  onRedeemRecipient: (v: string) => void
  onRedeem: () => void
  sellShares: string
  onSellShares: (v: string) => void
  sellQuoteLabel: string
  sellMinLabel: string
  sellSlippage: string
  onSellSlippage: (v: string) => void
  sellQuoting: boolean
  onSellQuote: () => void
  onSell: () => void
  onShare: () => void
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

function Capability({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ textAlign: 'left', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
      <div style={{ font: "600 14px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.4 }}>{sub}</div>
    </div>
  )
}

export default function Detail(p: DetailProps) {
  const { sel, tab } = p
  const tabs: Tab[] = ['buy', 'mint', 'redeem', 'sell']
  return (
    <main className="page page--detail">
      <AppLink
        href={hrefForScreen('discover')}
        onNavigate={p.goDiscover}
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
          textDecoration: 'none',
        }}
      >
        ← Discover
      </AppLink>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {sel.imageURI && <img src={sel.imageURI} alt={`${sel.symbol} artwork`} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }} />}
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
            {[sel.kindSummary, `Creator ${sel.creator}`, `${sel.supplyLabel} shares`, sel.capabilitySummary].map((chip) => (
              <span key={chip} style={{ fontSize: 12.5, color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 99, padding: '4px 11px' }}>
                {chip}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 11 }}>
            <button type="button" onClick={p.onShare} className="hv-chip" style={{ padding: '6px 10px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', font: "600 12px 'Space Grotesk',sans-serif" }}>Copy share link</button>
            {(sel.tokenURI || sel.contractURI) && <MetadataViewer name={sel.name} symbol={sel.symbol} tokenURI={sel.tokenURI} contractURI={sel.contractURI} />}
          </div>
        </div>
        <div className="detail-price">
          <div style={{ font: "700 40px 'Space Grotesk',sans-serif", letterSpacing: '-.02em', color: 'var(--text)' }}>{sel.navLabel}</div>
          <div className="detail-price-row">
            <span style={{ font: "600 13px 'Space Grotesk',sans-serif", color: 'var(--text-2)' }}>Current on-chain NAV</span>
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

      <div className="onchain-grid" style={{ marginTop: 22 }}>
        {[
          ['NAV / share', sel.navLabel],
          ['Total supply', `${sel.supplyLabel} ${sel.symbol}`],
          ['Snapshot block', p.blockNumber == null ? 'Loading…' : `#${p.blockNumber.toLocaleString('en-US')}`],
        ].map(([label, value]) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ font: "500 11px 'JetBrains Mono',monospace", color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
            <div style={{ marginTop: 7, font: "600 18px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{value}</div>
          </div>
        ))}
        <a href={p.explorerUrl} target="_blank" rel="noreferrer" className="hv-border" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', color: 'var(--text)' }}>
          <div style={{ font: "500 11px 'JetBrains Mono',monospace", color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Contract</div>
          <div style={{ marginTop: 7, font: "600 15px 'Space Grotesk',sans-serif" }}>{sel.address.slice(0, 8)}…{sel.address.slice(-6)} ↗</div>
        </a>
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
                    <div style={{ marginTop: 3, fontSize: 11.5, color: 'var(--text-3)' }}>{r.lensSourceLabel} · {r.zapRouted ? 'Zap routed' : 'in-kind only'}</div>
                    {r.lensFeed && <div style={{ marginTop: 2, font: "500 10.5px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>Feed {shortAddress(r.lensFeed)} </div>}
                    {r.lensPool && <div style={{ marginTop: 2, font: "500 10.5px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>Lens pool · {r.lensPool.fee / 10000}% fee · spacing {r.lensPool.tickSpacing}</div>}
                    {r.zapPool && <div style={{ marginTop: 2, font: "500 10.5px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>Zap pool · {r.zapPool.fee / 10000}% fee · spacing {r.zapPool.tickSpacing}</div>}
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
              <Capability title="Transfer" sub="Implemented in Portfolio" />
              <Capability title="ERC-20" sub="Standard balance and allowance surface" />
              <Capability title="Redeem" sub="Exit directly to the component basket" />
            </div>
          </div>
          <div className="summary-grid" style={{ marginTop: 16 }}>
            <div><span>Mint fees</span><strong>{sel.fMintLabel}</strong><small>{sel.protocolMintFeeBps} protocol + {sel.creatorMintFeeBps} creator bps</small></div>
            <div><span>Redeem fees</span><strong>{sel.fRedeemLabel}</strong><small>{sel.protocolRedeemFeeBps} protocol + {sel.creatorRedeemFeeBps} creator bps</small></div>
            <div><span>Protocol treasury</span><strong style={{ fontSize: 15 }}>{p.treasuryLabel}</strong><small>Protocol fee-share recipient</small></div>
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
              <AppLink
                key={t}
                href={hrefForIndex(sel.id, t)}
                onNavigate={() => p.setTab(t)}
                style={{
                  display: 'block',
                  flex: 1,
                  padding: 10,
                  border: 'none',
                  borderRadius: 9,
                  cursor: 'pointer',
                  font: "600 14px 'Space Grotesk',sans-serif",
                  background: tab === t ? 'var(--neon-dim)' : 'transparent',
                  color: tab === t ? 'var(--text)' : 'var(--text-3)',
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </AppLink>
            ))}
          </div>
          {p.pendingAction && (
            <div style={{ marginBottom: 15, padding: '11px 13px', borderRadius: 10, background: 'var(--neon-dim)', border: '1px solid var(--neon-line)', fontSize: 12.5, color: 'var(--text)' }}>
              <span style={{ color: 'var(--neon)' }}>●</span> {p.pendingAction}
            </div>
          )}
          {p.lastTxUrl && !p.pendingAction && (
            <a href={p.lastTxUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginBottom: 15, fontSize: 12.5 }}>
              View latest transaction on Blockscout ↗
            </a>
          )}

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
              <div style={{ marginTop: 6, textAlign: 'right', fontSize: 11.5, color: 'var(--text-3)' }}>Wallet: {p.usdgBalanceLabel} USDG</div>
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
              <button disabled={p.pendingAction != null || !sel.canZapMint || !sel.canValue} onClick={p.onBuy} className="hv-lift-sm" style={{ ...primaryBtnStyle, opacity: p.pendingAction || !sel.canZapMint || !sel.canValue ? 0.55 : 1, cursor: p.pendingAction ? 'wait' : 'pointer' }}>
                {p.pendingAction ?? (p.walletReady ? `Buy ${sel.symbol}` : 'Connect wallet & buy')}
              </button>
              <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
                <span style={{ color: sel.canZapMint && sel.canValue ? 'var(--neon)' : 'var(--neg)' }}>●</span> {sel.canZapMint && sel.canValue ? 'The quote reserves a 3% routing buffer; the zap refunds unspent USDG.' : 'USDG buying is unavailable because NAV or at least one component route is missing. In-kind mint remains available.'}
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
              <label style={{ ...labelStyle, display: 'block', marginTop: 14 }}>Recipient (optional)</label>
              <div style={{ ...inputRowStyle, padding: '9px 12px' }}><input value={p.mintRecipient} onChange={(event) => p.onMintRecipient(event.target.value)} placeholder="Connected wallet" style={{ ...inputStyle, fontSize: 13 }} /></div>
              <button disabled={p.pendingAction != null} onClick={p.onMint} className="hv-lift-sm" style={{ ...primaryBtnStyle, opacity: p.pendingAction ? 0.55 : 1, cursor: p.pendingAction ? 'wait' : 'pointer' }}>
                {p.pendingAction ?? (p.walletReady ? 'Approve basket & mint' : 'Connect wallet & mint')}
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
              <div style={{ marginTop: 6, textAlign: 'right', fontSize: 11.5, color: 'var(--text-3)' }}>Wallet: {p.indexBalanceLabel} {sel.symbol}</div>
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
              <label style={{ ...labelStyle, display: 'block', marginTop: 14 }}>Basket recipient (optional)</label>
              <div style={{ ...inputRowStyle, padding: '9px 12px' }}><input value={p.redeemRecipient} onChange={(event) => p.onRedeemRecipient(event.target.value)} placeholder="Connected wallet" style={{ ...inputStyle, fontSize: 13 }} /></div>
              <button
                disabled={p.pendingAction != null}
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
                  cursor: p.pendingAction ? 'wait' : 'pointer',
                  opacity: p.pendingAction ? 0.55 : 1,
                  font: "600 15.5px 'Space Grotesk',sans-serif",
                }}
              >
                {p.pendingAction ?? (p.walletReady ? 'Redeem to basket' : 'Connect wallet & redeem')}
              </button>
              <div style={{ marginTop: 12, padding: '11px 13px', borderRadius: 10, background: 'var(--neon-dim)', border: '1px solid var(--neon-line)' }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
                  <strong style={{ fontWeight: 600 }}>Ungateable.</strong> Redemption needs zero DEX liquidity and can never be paused.
                </p>
              </div>
            </div>
          )}

          {tab === 'sell' && (
            <div>
              <label style={labelStyle}>Shares to sell</label>
              <div style={inputRowStyle}><input type="text" inputMode="decimal" value={p.sellShares} onChange={(event) => p.onSellShares(event.target.value)} style={inputStyle} /><span style={symbolChipStyle}>{sel.symbol}</span></div>
              <div style={{ marginTop: 6, textAlign: 'right', fontSize: 11.5, color: 'var(--text-3)' }}>Wallet: {p.indexBalanceLabel} {sel.symbol}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'end', marginTop: 14 }}><label className="form-field" style={{ flex: 1 }}><span>Slippage tolerance · %</span><input value={p.sellSlippage} onChange={(event) => p.onSellSlippage(event.target.value)} inputMode="decimal" style={{ ...inputRowStyle, width: '100%' }} /></label><button disabled={p.sellQuoting || !sel.canZapRedeem} onClick={p.onSellQuote} className="secondary-button">{p.sellQuoting ? 'Quoting…' : 'Refresh quote'}</button></div>
              <div style={receiveBoxStyle}><span style={{ font: "700 24px 'Space Grotesk',sans-serif" }}>{p.sellQuoteLabel}</span><span style={{ font: "600 14px 'Space Grotesk',sans-serif", color: 'var(--text-2)' }}>USDG estimated</span></div>
              <div style={feeRowStyle}><span>Minimum received</span><span style={{ color: 'var(--text-2)' }}>{p.sellMinLabel} USDG</span></div>
              <button disabled={p.pendingAction != null || p.sellQuoting || !sel.canZapRedeem || p.sellQuoteLabel === '—'} onClick={p.onSell} className="hv-lift-sm" style={{ ...primaryBtnStyle, opacity: p.pendingAction || !sel.canZapRedeem ? 0.55 : 1 }}>{p.pendingAction ?? (p.walletReady ? `Sell ${sel.symbol} to USDG` : 'Connect wallet & sell')}</button>
              <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}><span style={{ color: sel.canZapRedeem ? 'var(--neon)' : 'var(--neg)' }}>●</span> {sel.canZapRedeem ? 'The quote calls the deployed V4Quoter for every executable component route. The minimum output is enforced by IndexZap.' : 'Zap-out is unavailable because at least one component lacks a USDG pool. Redeem to the basket instead.'}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
