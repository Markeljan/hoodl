import type { Screen } from '../model'
import HoodlMark from './HoodlMark'

interface NavProps {
  screen: Screen
  themeLabel: string
  connectLabel: string
  onLogo: () => void
  onDiscover: () => void
  onPortfolio: () => void
  onToggleTheme: () => void
  onConnect: () => void
}

export default function Nav({ screen, themeLabel, connectLabel, onLogo, onDiscover, onPortfolio, onToggleTheme, onConnect }: NavProps) {
  const items = [
    { key: 'discover', label: 'Discover', active: screen === 'discover' || screen === 'detail', onClick: onDiscover },
    { key: 'portfolio', label: 'Portfolio', active: screen === 'portfolio', onClick: onPortfolio },
  ]
  return (
    <header
      className="site-header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        background: 'color-mix(in srgb,var(--canvas) 84%,transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <button onClick={onLogo} style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
        <HoodlMark size={34} radius={9} style={{ boxShadow: '0 6px 18px -8px var(--neon)', borderRadius: 9 }} />
        <span style={{ font: "700 20px/1 'Space Grotesk',sans-serif", letterSpacing: '-.02em', color: 'var(--text)' }}>HOODL</span>
      </button>
      <nav className="nav-links">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={item.onClick}
            className="hv-text"
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'Manrope,sans-serif',
              fontSize: 14.5,
              color: item.active ? 'var(--text)' : 'var(--text-3)',
              fontWeight: item.active ? 600 : 500,
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="nav-actions">
        <div className="nav-chain" style={{ border: '1px solid var(--border)', borderRadius: 99, background: 'var(--surface)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--neon)', animation: 'hoodl-pulse 2.4s ease-in-out infinite' }} />
          <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 500 }}>Robinhood Chain</span>
          <span style={{ font: "500 11px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>4663</span>
        </div>
        <button
          onClick={onToggleTheme}
          title="Toggle theme"
          className="hv-chip"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            border: '1px solid var(--border)',
            borderRadius: 99,
            background: 'var(--surface)',
            color: 'var(--text-2)',
            cursor: 'pointer',
            fontFamily: 'Manrope,sans-serif',
            fontSize: 12.5,
            fontWeight: 500,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" style={{ display: 'block' }}>
            <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 1.6 A6.4 6.4 0 0 0 8 14.4 Z" fill="currentColor" />
          </svg>
          <span className="nav-theme-label">{themeLabel}</span>
        </button>
        <button
          onClick={onConnect}
          className="hv-connect"
          style={{
            padding: '9px 16px',
            border: '1px solid var(--neon-line)',
            borderRadius: 99,
            background: 'var(--neon-dim)',
            color: 'var(--text)',
            cursor: 'pointer',
            font: "600 13.5px 'Space Grotesk',sans-serif",
          }}
        >
          {connectLabel}
        </button>
      </div>
    </header>
  )
}
