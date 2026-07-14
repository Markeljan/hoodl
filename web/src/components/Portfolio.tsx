import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { getAddress } from 'viem'
import { amountLabel, mulDivFloor, parseAmount, shortAddress, usdRawLabel } from '../model'
import type { IndexView, Tab } from '../model'

interface PortfolioProps {
  connected: boolean
  accountLabel: string
  onConnect: () => void
  indexes: IndexView[]
  balances: Record<string, bigint>
  usdgBalanceLabel: string
  walletError: string | null
  walletDataReady: boolean
  onTrade: (index: IndexView, tab: Tab) => void
  onTransfer: (index: IndexView, recipient: `0x${string}`, amount: bigint) => void
  pendingAction: string | null
  lastTxUrl: string | null
}

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '12px 13px',
  border: '1px solid var(--border-strong)',
  borderRadius: 10,
  background: 'var(--surface-2)',
  color: 'var(--text)',
  outline: 'none',
  font: "500 13px 'JetBrains Mono',monospace",
}

export default function Portfolio(p: PortfolioProps) {
  const [transferIndexId, setTransferIndexId] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const holdings = useMemo(() => p.indexes.filter((index) => (p.balances[index.id] ?? 0n) > 0n), [p.balances, p.indexes])
  const transferIndex = holdings.find((index) => index.id === transferIndexId) ?? holdings[0] ?? null
  const totalRaw = holdings.reduce((total, index) => {
    const balance = p.balances[index.id] ?? 0n
    return index.navRaw == null ? total : total + mulDivFloor(balance, index.navRaw, 10n ** 18n)
  }, 0n)
  const unpriced = holdings.filter((index) => index.navRaw == null).length

  if (!p.connected) {
    return (
      <main className="page">
        <h1 style={{ margin: '0 0 4px', font: "700 34px 'Space Grotesk',sans-serif" }}>Your portfolio</h1>
        <p style={{ margin: '0 0 26px', fontSize: 15, color: 'var(--text-2)' }}>Balances are read directly from the connected wallet.</p>
        <div style={{ maxWidth: 620, padding: 30, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18 }}><h2 style={{ margin: 0, font: "600 20px 'Space Grotesk',sans-serif" }}>Connect a wallet to continue</h2><p style={{ margin: '10px 0 20px', color: 'var(--text-2)', lineHeight: 1.55 }}>HOODL reads every registered index balance plus USDG. Only live wallet state is shown.</p><button onClick={p.onConnect} className="primary-button">Connect wallet</button></div>
      </main>
    )
  }

  return (
    <main className="page">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 26 }}><div><h1 style={{ margin: '0 0 4px', font: "700 34px 'Space Grotesk',sans-serif" }}>Your portfolio</h1><p style={{ margin: 0, fontSize: 15, color: 'var(--text-2)' }}>All registered index balances for {p.accountLabel}.</p></div><button onClick={p.onConnect} className="secondary-button">Disconnect</button></div>
      {p.pendingAction && <div style={{ marginBottom: 18, padding: '12px 14px', borderRadius: 10, background: 'var(--neon-dim)', border: '1px solid var(--neon-line)', fontSize: 13 }}><span style={{ color: 'var(--neon)' }}>●</span> {p.pendingAction}</div>}
      {p.walletError && <div style={{ marginBottom: 18, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', color: 'var(--neg)', fontSize: 13 }}>Wallet balances unavailable: {p.walletError}</div>}
      {p.lastTxUrl && !p.pendingAction && <a href={p.lastTxUrl} target="_blank" rel="noreferrer" style={{ display: 'block', margin: '-8px 0 18px', fontSize: 13 }}>View latest transaction on Blockscout ↗</a>}

      <div className="summary-grid">
        <div><span>Priced index value</span><strong>{usdRawLabel(totalRaw)}</strong><small>{unpriced > 0 ? `${unpriced} holding${unpriced === 1 ? '' : 's'} excluded without NAV` : 'Every holding has live NAV'}</small></div>
        <div><span>USDG buying power</span><strong>{p.usdgBalanceLabel}</strong><small>Connected wallet balance</small></div>
        <div><span>Index positions</span><strong>{holdings.length}</strong><small>{p.indexes.length} registered indexes checked</small></div>
      </div>

      <h2 style={{ margin: '26px 0 12px', font: "600 13px 'JetBrains Mono',monospace", letterSpacing: '.06em', color: 'var(--text-3)', textTransform: 'uppercase' }}>Index holdings</h2>
      <div style={{ display: 'grid', gap: 14 }}>
        {holdings.length === 0 && <div style={{ padding: 22, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, color: 'var(--text-3)' }}>{p.walletDataReady ? 'No registered index balances found.' : 'Reading every registered index balance…'}</div>}
        {holdings.map((index) => {
          const balance = p.balances[index.id] ?? 0n
          const value = index.navRaw == null ? null : mulDivFloor(balance, index.navRaw, 10n ** 18n)
          return (
            <section key={index.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 17, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                {index.imageURI ? <img src={index.imageURI} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 11, background: 'var(--surface-2)' }} /> : <span style={{ display: 'grid', placeItems: 'center', minWidth: 52, height: 36, borderRadius: 9, background: 'var(--surface-3)', font: "700 15px 'Space Grotesk',sans-serif" }}>{index.symbol}</span>}
                <div style={{ flex: 1, minWidth: 180 }}><strong>{index.name}</strong><div style={{ marginTop: 4, font: "500 12px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>{amountLabel(balance, 18)} {index.symbol} · {index.navLabel} / share</div></div>
                <strong style={{ font: "600 18px 'Space Grotesk',sans-serif" }}>{usdRawLabel(value)}</strong>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}><button onClick={() => p.onTrade(index, 'buy')} disabled={!index.canZapMint || !index.canValue} className="primary-button">Buy</button><button onClick={() => p.onTrade(index, 'mint')} className="secondary-button">Mint in-kind</button><button onClick={() => p.onTrade(index, 'redeem')} className="secondary-button">Redeem basket</button><button onClick={() => p.onTrade(index, 'sell')} disabled={!index.canZapRedeem} className="secondary-button">Sell to USDG</button></div>
              <details style={{ marginTop: 15 }}><summary style={{ cursor: 'pointer', color: 'var(--text-2)', fontSize: 13 }}>Look through this holding</summary><div style={{ display: 'grid', gap: 7, marginTop: 12 }}>{index.rows.map((row) => <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}><span>{row.name}</span><span style={{ fontFamily: "'JetBrains Mono',monospace", color: 'var(--text-3)' }}>{amountLabel(mulDivFloor(row.unitsRaw, balance, 10n ** 18n), row.decimals)} {row.sym}</span></div>)}</div></details>
            </section>
          )
        })}
      </div>

      {transferIndex && <section style={{ marginTop: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 17, padding: 20 }}><h2 style={{ margin: '0 0 5px', font: "600 17px 'Space Grotesk',sans-serif" }}>Transfer an index</h2><p style={{ margin: '0 0 14px', color: 'var(--text-3)', fontSize: 12.5 }}>Calls the selected IndexToken’s standard ERC-20 transfer function.</p><div className="component-grid"><select value={transferIndex.id} onChange={(event) => setTransferIndexId(event.target.value)} style={fieldStyle}>{holdings.map((index) => <option value={index.id} key={index.id}>{index.symbol} · {shortAddress(index.address)}</option>)}</select><input value={transferTo} onChange={(event) => setTransferTo(event.target.value)} placeholder="0x recipient" style={fieldStyle} /><input value={transferAmount} onChange={(event) => setTransferAmount(event.target.value)} placeholder="Amount" style={fieldStyle} /></div>{error && <div style={{ marginTop: 10, color: 'var(--neg)', fontSize: 13 }}>{error}</div>}<button disabled={p.pendingAction != null} onClick={() => { try { const recipient = getAddress(transferTo.trim()); const amount = parseAmount(transferAmount, 18); setError(null); p.onTransfer(transferIndex, recipient, amount) } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Check the transfer.') } }} className="secondary-button" style={{ marginTop: 12 }}>Transfer {transferIndex.symbol}</button></section>}
    </main>
  )
}
