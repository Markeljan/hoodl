import type { IndexView } from '../model'

export interface LookthroughLine {
  sym: string
  name: string
  color: string
  amountLabel: string
  valueLabel: string
}

interface PortfolioProps {
  connected: boolean
  accountLabel: string
  onConnect: () => void
  hai: IndexView | null
  usdgBalanceLabel: string
  walletError: string | null
  hBalLabel: string
  totalLabel: string
  lookthrough: LookthroughLine[]
  buyMore: () => void
  redeemHold: () => void
  transferTo: string
  onTransferTo: (value: string) => void
  transferAmount: string
  onTransferAmount: (value: string) => void
  onTransfer: () => void
  pendingAction: string | null
  lastTxUrl: string | null
}

const fieldStyle = {
  width: '100%',
  padding: '12px 13px',
  border: '1px solid var(--border-strong)',
  borderRadius: 10,
  background: 'var(--surface-2)',
  color: 'var(--text)',
  outline: 'none',
  font: "500 13px 'JetBrains Mono',monospace",
} as const

export default function Portfolio(p: PortfolioProps) {
  if (!p.connected) {
    return (
      <main className="page">
        <h1 style={{ margin: '0 0 4px', font: "700 34px 'Space Grotesk',sans-serif", letterSpacing: '-.02em', color: 'var(--text)' }}>Your portfolio</h1>
        <p style={{ margin: '0 0 26px', fontSize: 15, color: 'var(--text-2)' }}>Balances are read directly from the connected wallet.</p>
        <div style={{ maxWidth: 620, padding: 30, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18 }}>
          <h2 style={{ margin: 0, font: "600 20px 'Space Grotesk',sans-serif" }}>Connect a wallet to continue</h2>
          <p style={{ margin: '10px 0 20px', color: 'var(--text-2)', lineHeight: 1.55 }}>HOODL will request Robinhood Chain and then read your real hAI and USDG balances. Only live wallet state is shown.</p>
          <button onClick={p.onConnect} className="hv-lift-sm" style={{ padding: '12px 18px', border: 'none', borderRadius: 10, background: 'var(--neon)', color: 'var(--on-neon)', cursor: 'pointer', font: "600 14px 'Space Grotesk',sans-serif" }}>
            Connect wallet
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', font: "700 34px 'Space Grotesk',sans-serif", letterSpacing: '-.02em', color: 'var(--text)' }}>Your portfolio</h1>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--text-2)' }}>Live balances for {p.accountLabel} on Robinhood Chain.</p>
        </div>
        <button onClick={p.onConnect} className="hv-ghost" style={{ padding: '9px 13px', border: '1px solid var(--border)', borderRadius: 9, background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}>Disconnect</button>
      </div>

      {p.pendingAction && (
        <div style={{ marginBottom: 18, padding: '12px 14px', borderRadius: 10, background: 'var(--neon-dim)', border: '1px solid var(--neon-line)', fontSize: 13 }}>
          <span style={{ color: 'var(--neon)' }}>●</span> {p.pendingAction}
        </div>
      )}
      {p.walletError && (
        <div style={{ marginBottom: 18, padding: '12px 14px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--neg)' }}>
          Wallet balances unavailable: {p.walletError}
        </div>
      )}
      {p.lastTxUrl && !p.pendingAction && <a href={p.lastTxUrl} target="_blank" rel="noreferrer" style={{ display: 'block', margin: '-8px 0 18px', fontSize: 13 }}>View latest transaction on Blockscout ↗</a>}

      <div className="portfolio-grid">
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12, marginBottom: 18 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 24 }}>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>hAI position value</div>
              <div style={{ marginTop: 6, font: "700 38px 'Space Grotesk',sans-serif", letterSpacing: '-.02em', color: 'var(--text)' }}>{p.totalLabel}</div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 24 }}>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>USDG buying power</div>
              <div style={{ marginTop: 6, font: "700 38px 'Space Grotesk',sans-serif", letterSpacing: '-.02em', color: 'var(--text)' }}>{p.usdgBalanceLabel}</div>
            </div>
          </div>

          <h2 style={{ margin: '0 0 12px', font: "600 13px 'JetBrains Mono',monospace", letterSpacing: '.06em', color: 'var(--text-3)', textTransform: 'uppercase' }}>Index holdings</h2>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ display: 'grid', placeItems: 'center', minWidth: 52, height: 36, padding: '0 11px', borderRadius: 9, background: 'var(--surface-3)', font: "700 15px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{p.hai?.symbol ?? 'hAI'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15.5, color: 'var(--text)' }}>{p.hai?.name ?? 'Loading deployed index…'}</div>
                <div style={{ font: "500 12.5px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>{p.hBalLabel} {p.hai?.symbol ?? 'hAI'} · {p.hai?.navLabel ?? '—'} / share</div>
              </div>
              <div style={{ textAlign: 'right', font: "600 17px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{p.totalLabel}</div>
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
              <button onClick={p.buyMore} className="hv-lift-sm" style={{ flex: 1, padding: 11, border: 'none', borderRadius: 10, background: 'var(--neon)', color: 'var(--on-neon)', cursor: 'pointer', font: "600 13.5px 'Space Grotesk',sans-serif" }}>Buy more</button>
              <button onClick={p.redeemHold} className="hv-ghost" style={{ flex: 1, padding: 11, border: '1px solid var(--border-strong)', borderRadius: 10, background: 'transparent', color: 'var(--text)', cursor: 'pointer', font: "600 13.5px 'Space Grotesk',sans-serif" }}>Redeem</button>
            </div>
          </div>

          <div style={{ marginTop: 18, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
            <h2 style={{ margin: '0 0 4px', font: "600 16px 'Space Grotesk',sans-serif" }}>Transfer {p.hai?.symbol ?? 'hAI'}</h2>
            <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--text-3)' }}>Calls the deployed IndexToken ERC-20 transfer function.</p>
            <div className="transfer-grid">
              <input aria-label="Transfer recipient" placeholder="0x recipient" value={p.transferTo} onChange={(event) => p.onTransferTo(event.target.value)} style={fieldStyle} />
              <input aria-label="Transfer amount" placeholder="Amount" inputMode="decimal" value={p.transferAmount} onChange={(event) => p.onTransferAmount(event.target.value)} style={fieldStyle} />
            </div>
            <button disabled={p.pendingAction != null} onClick={p.onTransfer} className="hv-ghost" style={{ marginTop: 12, padding: '11px 15px', border: '1px solid var(--border-strong)', borderRadius: 10, background: 'transparent', color: 'var(--text)', cursor: p.pendingAction ? 'wait' : 'pointer', opacity: p.pendingAction ? 0.55 : 1, font: "600 13.5px 'Space Grotesk',sans-serif" }}>
              {p.pendingAction ?? 'Transfer on-chain'}
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 22 }}>
          <h2 style={{ margin: '0 0 4px', font: "600 16px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>What you actually own</h2>
          <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>Look-through to the underlying basket represented by your live hAI balance.</p>
          {p.lookthrough.map((line) => (
            <div key={line.sym} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ width: 11, height: 11, borderRadius: 99, flex: 'none', background: line.color }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{line.name}</div>
                <div style={{ font: "500 12px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>{line.amountLabel} {line.sym}</div>
              </div>
              <div style={{ font: "600 14px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{line.valueLabel}</div>
            </div>
          ))}
          <p style={{ margin: '16px 0 0', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}><span style={{ color: 'var(--neon)' }}>●</span> Redeem returns the previewed component tokens to your wallet.</p>
        </div>
      </div>
    </main>
  )
}
