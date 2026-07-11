import type { IndexView } from '../model'

interface DiscoverProps {
  indexes: IndexView[]
  openDetail: (id: string) => void
}

export default function Discover({ indexes, openDetail }: DiscoverProps) {
  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '44px 24px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, font: "700 34px 'Space Grotesk',sans-serif", letterSpacing: '-.02em', color: 'var(--text)' }}>Discover indexes</h1>
          <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--text-2)' }}>
            Every index is a permissionless ERC-20 read live from the factory registry.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace" }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--neon)' }} />
          {indexes.length} indexes live
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 18 }}>
        {indexes.map((ix) => (
          <button
            key={ix.id}
            onClick={() => openDetail(ix.id)}
            className="hv-card"
            style={{
              textAlign: 'left',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 18,
              padding: 20,
              cursor: 'pointer',
              transition: 'transform .12s ease,border-color .12s ease',
              fontFamily: 'Manrope,sans-serif',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    minWidth: 44,
                    height: 30,
                    padding: '0 9px',
                    borderRadius: 8,
                    background: 'var(--surface-3)',
                    font: "600 14px 'Space Grotesk',sans-serif",
                    color: 'var(--text)',
                  }}
                >
                  {ix.symbol}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 99, padding: '3px 9px' }}>
                  {ix.kindSummary}
                </span>
              </div>
              {ix.flagship && (
                <span
                  style={{
                    font: "600 10.5px 'JetBrains Mono',monospace",
                    letterSpacing: '.05em',
                    color: 'var(--on-neon)',
                    background: 'var(--neon)',
                    padding: '3px 8px',
                    borderRadius: 6,
                  }}
                >
                  FLAGSHIP
                </span>
              )}
            </div>
            <div style={{ font: "600 17px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{ix.name}</div>
            <p style={{ margin: '7px 0 16px', fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)', minHeight: 39 }}>{ix.tagline}</p>
            <div style={{ display: 'flex', height: 7, borderRadius: 99, overflow: 'hidden', gap: 2, marginBottom: 16 }}>
              {ix.segments.map((sg, i) => (
                <span key={i} style={{ height: '100%', borderRadius: 2, width: sg.width, background: sg.color }} />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div style={{ font: "700 22px 'Space Grotesk',sans-serif", color: 'var(--text)' }}>{ix.navLabel}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>NAV / share</div>
              </div>
              <div style={{ font: "600 14px 'Space Grotesk',sans-serif", color: ix.chgColor }}>{ix.changeLabel}</div>
            </div>
          </button>
        ))}
      </div>
    </main>
  )
}
