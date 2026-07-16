import HoodlMark from './HoodlMark'
import { addresses, explorerUrl } from '../contracts'

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', marginTop: 20 }}>
      <div className="footer-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <HoodlMark size={30} radius={8} style={{ borderRadius: 8 }} />
          <div>
            <div style={{ font: "700 16px 'Space Grotesk',sans-serif", color: 'var(--text)', letterSpacing: '-.01em' }}>
              HOODL <span style={{ font: "500 12px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>.finance</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Permissionless index tokens on Robinhood Chain</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 22, fontSize: 13.5 }}>
          {[
            ['Chain docs', 'https://docs.robinhood.com/chain/'],
            ['Contracts', `${explorerUrl}/address/${addresses.factory}`],
            ['Safety', '/safety'],
            ['GitHub', 'https://github.com/Markeljan/hoodl'],
          ].map(([label, href]) => (
            <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} className="hv-text" style={{ color: 'var(--text-2)' }}>
              {label}
            </a>
          ))}
        </div>
        <div style={{ font: "500 11.5px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>
          Robinhood Chain 4663 · live contracts · not investment advice
        </div>
      </div>
    </footer>
  )
}
