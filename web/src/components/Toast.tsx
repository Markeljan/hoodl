export default function Toast({ msg }: { msg: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 28,
        zIndex: 90,
        transform: 'translateX(-50%)',
        animation: 'hoodl-pop .22s ease',
        background: 'var(--surface)',
        border: '1px solid var(--neon-line)',
        borderRadius: 12,
        padding: '13px 18px',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        maxWidth: '88vw',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--neon)', flex: 'none' }} />
      <span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 500 }}>{msg}</span>
    </div>
  )
}
