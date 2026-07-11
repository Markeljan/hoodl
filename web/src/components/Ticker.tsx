import { TOKENS, usd, fmtChg } from '../model'

export default function Ticker() {
  const base = Object.values(TOKENS).map((t) => ({
    sym: t.sym,
    priceLabel: usd(t.price),
    changeLabel: fmtChg(t.chg),
    color: t.color,
    chgColor: t.chg >= 0 ? 'var(--pos)' : 'var(--neg)',
  }))
  const items = base.concat(base)
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
        {items.map((tk, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: tk.color }} />
            <span style={{ font: "500 12.5px 'JetBrains Mono',monospace", color: 'var(--text-2)', letterSpacing: '.02em' }}>{tk.sym}</span>
            <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 12.5 }}>{tk.priceLabel}</span>
            <span style={{ color: tk.chgColor, fontWeight: 600, fontSize: 12 }}>{tk.changeLabel}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
