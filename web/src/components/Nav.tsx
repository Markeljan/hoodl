import type { Screen } from '../model'
import { hrefForScreen } from '../routes'
import AppLink from './AppLink'
import HoodlMark from './HoodlMark'

interface NavProps {
  screen: Screen
  themeLabel: string
  connectLabel: string
  networkState: 'disconnected' | 'ready' | 'wrong'
  onLogo: () => void
  onDiscover: () => void
  onCreate: () => void
  onPortfolio: () => void
  onCreator: () => void
  onActivity: () => void
  onOperator: () => void
  showCreator: boolean
  showOperator: boolean
  onToggleTheme: () => void
  onConnect: () => void
}

export default function Nav({ screen, themeLabel, connectLabel, networkState, onLogo, onDiscover, onCreate, onPortfolio, onCreator, onActivity, onOperator, showCreator, showOperator, onToggleTheme, onConnect }: NavProps) {
  const items = [
    { key: 'discover', label: 'Discover', href: hrefForScreen('discover'), active: screen === 'discover' || screen === 'detail', onNavigate: onDiscover },
    { key: 'create', label: 'Create', href: hrefForScreen('create'), active: screen === 'create', onNavigate: onCreate },
    { key: 'portfolio', label: 'Portfolio', href: hrefForScreen('portfolio'), active: screen === 'portfolio', onNavigate: onPortfolio },
    ...(showCreator ? [{ key: 'creator', label: 'Manage', href: hrefForScreen('creator'), active: screen === 'creator', onNavigate: onCreator }] : []),
    { key: 'activity', label: 'Activity', href: hrefForScreen('activity'), active: screen === 'activity', onNavigate: onActivity },
    ...(showOperator ? [{ key: 'operator', label: 'Operator', href: hrefForScreen('operator'), active: screen === 'operator', onNavigate: onOperator }] : []),
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
      <AppLink href={hrefForScreen('landing')} onNavigate={onLogo} style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'none' }}>
        <HoodlMark size={34} radius={9} style={{ boxShadow: '0 6px 18px -8px var(--neon)', borderRadius: 9 }} />
        <span style={{ font: "700 20px/1 'Space Grotesk',sans-serif", letterSpacing: '-.02em', color: 'var(--text)' }}>HOODL</span>
      </AppLink>
      <nav className="nav-links">
        {items.map((item) => (
          <AppLink
            key={item.key}
            href={item.href}
            onNavigate={item.onNavigate}
            className="hv-text"
            style={{
              display: 'inline-block',
              background: 'none',
              border: 'none',
              padding: '8px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'Manrope,sans-serif',
              fontSize: 14.5,
              color: item.active ? 'var(--text)' : 'var(--text-3)',
              fontWeight: item.active ? 600 : 500,
              textDecoration: 'none',
            }}
          >
            {item.label}
          </AppLink>
        ))}
      </nav>
      <div className="nav-actions">
        <div className="nav-chain" style={{ border: '1px solid var(--border)', borderRadius: 99, background: 'var(--surface)' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: networkState === 'wrong' ? 'var(--neg)' : networkState === 'ready' ? 'var(--neon)' : 'var(--text-3)',
              animation: networkState === 'ready' ? 'hoodl-pulse 2.4s ease-in-out infinite' : 'none',
            }}
          />
          <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 500 }}>{networkState === 'wrong' ? 'Wrong network' : 'Robinhood Chain'}</span>
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
