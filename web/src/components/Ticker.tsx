interface TickerItem {
  sym: string
  priceLabel: string
  detail: string
  color: string
}

interface TickerProps {
  items: TickerItem[]
  blockNumber: bigint | null
  loading: boolean
}

export default function Ticker({ items, blockNumber, loading }: TickerProps) {
  const liveItems = items.length > 0 ? items : [{ sym: 'HOODL', priceLabel: loading ? 'Loading chain…' : 'No indexed assets', detail: '', color: 'var(--neon)' }]
  const base = [
    ...liveItems,
    {
      sym: 'RH CHAIN',
      priceLabel: blockNumber == null ? 'Connecting…' : `#${blockNumber.toLocaleString('en-US')}`,
      detail: 'latest block',
      color: 'var(--neon)',
    },
  ]
  const tickerItems = base.concat(base)
  return (
    <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      <div
        className="hv-ticker"
        style={{
          display: 'inline-flex',
          gap: 30,
          padding: '9px 15px',
          whiteSpace: 'nowrap',
          animation: 'hoodl-ticker 46s linear infinite',
          willChange: 'transform',
        }}
      >
        {tickerItems.map((item, index) => (
          <span key={`${item.sym}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: item.color }} />
            <span style={{ font: "500 12.5px 'JetBrains Mono',monospace", color: 'var(--text-2)', letterSpacing: '.02em' }}>{item.sym}</span>
            <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 12.5 }}>{item.priceLabel}</span>
            {item.detail && <span style={{ color: 'var(--text-3)', fontWeight: 500, fontSize: 11.5 }}>{item.detail}</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
