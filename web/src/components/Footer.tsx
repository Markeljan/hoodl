export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', marginTop: 20 }}>
      <div className="footer-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'var(--neon)',
              color: 'var(--on-neon)',
              font: "700 17px 'Space Grotesk',sans-serif",
            }}
          >
            H
          </span>
          <div>
            <div style={{ font: "700 16px 'Space Grotesk',sans-serif", color: 'var(--text)', letterSpacing: '-.01em' }}>
              HOODL <span style={{ font: "500 12px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>.finance</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Permissionless index tokens on Robinhood Chain</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 22, fontSize: 13.5 }}>
          {['Docs', 'Contracts', 'GitHub', 'X'].map((l) => (
            <a key={l} href="#" className="hv-text" style={{ color: 'var(--text-2)' }}>
              {l}
            </a>
          ))}
        </div>
        <div style={{ font: "500 11.5px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>
          Chain 4663 · testnet 46630 · demo UI — not investment advice
        </div>
      </div>
    </footer>
  )
}
