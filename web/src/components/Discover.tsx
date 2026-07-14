import type { IndexView } from '../model'

interface DiscoverProps {
  indexes: IndexView[]
  loading: boolean
  error: string | null
  retry: () => void
  openDetail: (id: string) => void
}

export default function Discover({ indexes, loading, error, retry, openDetail }: DiscoverProps) {
  return (
    <main className="page">
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
      {loading && indexes.length === 0 && (
        <div style={{ padding: 28, border: '1px solid var(--border)', borderRadius: 16, background: 'var(--surface)', color: 'var(--text-2)' }}>
          Reading the factory registry and index state from Robinhood Chain…
        </div>
      )}
      {error && indexes.length === 0 && (
        <div style={{ padding: 28, border: '1px solid var(--border)', borderRadius: 16, background: 'var(--surface)' }}>
          <div style={{ color: 'var(--neg)', fontWeight: 600 }}>Could not read the deployed contracts</div>
          <div style={{ color: 'var(--text-2)', fontSize: 13.5, marginTop: 7 }}>{error}</div>
          <button onClick={retry} className="hv-ghost" style={{ marginTop: 16, padding: '10px 14px', border: '1px solid var(--border-strong)', borderRadius: 9, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(280px,100%),1fr))', gap: 18 }}>
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
                {ix.imageURI ? <img src={ix.imageURI} alt="" style={{ width: 44, height: 34, objectFit: 'cover', borderRadius: 8, background: 'var(--surface-3)' }} /> : <span
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
                </span>}
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
            <div style={{ margin: '-7px 0 14px', font: "500 10.5px 'JetBrains Mono',monospace", color: ix.canZapMint ? 'var(--neon)' : 'var(--text-3)' }}>{ix.capabilitySummary}</div>
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
              <div style={{ textAlign: 'right' }}>
                <div style={{ font: "600 14px 'Space Grotesk',sans-serif", color: 'var(--text-2)' }}>{ix.supplyLabel}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>total supply</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </main>
  )
}
