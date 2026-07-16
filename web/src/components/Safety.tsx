import { addresses, explorerUrl } from '../contracts'
import { shortAddress } from '../model'

const cardStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 18,
  padding: 22,
}

export default function Safety() {
  return (
    <main className="page">
      <div style={{ maxWidth: 760 }}>
        <span style={{ font: "600 11px 'JetBrains Mono',monospace", color: 'var(--neon)', letterSpacing: '.08em' }}>VERIFY BEFORE YOU TRANSACT</span>
        <h1 style={{ margin: '9px 0 8px', font: "700 34px 'Space Grotesk',sans-serif", letterSpacing: '-.02em' }}>Safety, eligibility and protocol limits</h1>
        <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.65 }}>
          HOODL is experimental, unaudited software. Its contracts are public and verified, but verified source and test coverage are not substitutes for an independent security audit.
        </p>
      </div>

      <div className="two-panel-grid" style={{ marginTop: 26 }}>
        <section style={cardStyle}>
          <h2 style={{ margin: '0 0 8px', font: "600 18px 'Space Grotesk',sans-serif" }}>What the core guarantees</h2>
          <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-2)', lineHeight: 1.7 }}>
            <li>Every index uses immutable component addresses, units and fee rates.</li>
            <li>Minting deposits the component basket; redemption returns the basket in kind.</li>
            <li>HOODL cannot pause redemption or replace an index component.</li>
            <li>The core mint and redemption path does not use an oracle or DEX price.</li>
          </ul>
        </section>

        <section style={cardStyle}>
          <h2 style={{ margin: '0 0 8px', font: "600 18px 'Space Grotesk',sans-serif" }}>What the core cannot guarantee</h2>
          <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-2)', lineHeight: 1.7 }}>
            <li>Component issuers may retain transfer, pause, freeze or other token-level controls.</li>
            <li>Component tokens, pools and price feeds may fail, become illiquid or be manipulated.</li>
            <li>USDG zaps depend on configured Uniswap v4 routes and user-supplied price bounds.</li>
            <li>Displayed NAV is informational and is not a settlement or collateral-risk oracle.</li>
          </ul>
        </section>
      </div>

      <section style={{ ...cardStyle, marginTop: 18, borderColor: 'var(--neon-line)', background: 'var(--neon-dim)' }}>
        <h2 style={{ margin: '0 0 8px', font: "600 18px 'Space Grotesk',sans-serif" }}>Stock Token eligibility</h2>
        <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.65 }}>
          Some indexes contain Robinhood Stock Tokens. Robinhood states that Stock Tokens are not available to U.S. persons and are restricted in additional jurisdictions. Do not buy, mint or redeem an index containing Stock Tokens unless you are legally eligible to hold every component.
        </p>
        <a href="https://robinhood.com/us/en/chain/" target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 12, fontSize: 13.5 }}>
          Read Robinhood Chain product disclosures ↗
        </a>
      </section>

      <div className="two-panel-grid" style={{ marginTop: 18 }}>
        <section style={cardStyle}>
          <h2 style={{ margin: '0 0 8px', font: "600 18px 'Space Grotesk',sans-serif" }}>Operational controls</h2>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
            Factory ownership can change fees for future indexes and the protocol treasury. Lens and Zap ownership can change display-price sources and swap routes. These controls cannot change existing index composition or fee rates.
          </p>
          <div style={{ marginTop: 14, font: "500 12px 'JetBrains Mono',monospace", color: 'var(--text-3)', lineHeight: 1.8 }}>
            Factory {shortAddress(addresses.factory, 8, 6)}<br />
            Lens {shortAddress(addresses.lens, 8, 6)}<br />
            Zap {shortAddress(addresses.zap, 8, 6)}
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={{ margin: '0 0 8px', font: "600 18px 'Space Grotesk',sans-serif" }}>Independent verification</h2>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>
            Verify token addresses, source code, balances and transactions before signing. Official links are collected here so copied contracts and spoofed tickers are easier to detect.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
            <a href={`${explorerUrl}/address/${addresses.factory}`} target="_blank" rel="noreferrer" className="secondary-button">Verified contracts ↗</a>
            <a href="https://github.com/Markeljan/hoodl" target="_blank" rel="noreferrer" className="secondary-button">Source repository ↗</a>
          </div>
        </section>
      </div>

      <p style={{ margin: '22px 0 0', color: 'var(--text-3)', fontSize: 12.5, lineHeight: 1.6 }}>
        HOODL is independent and is not affiliated with or endorsed by Robinhood Markets, Inc. Nothing on this site is investment, legal or tax advice. Memecoins and tokenized assets can lose some or all of their value.
      </p>
    </main>
  )
}
