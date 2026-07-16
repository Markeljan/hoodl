interface IndexSafetyNoticeProps {
  containsStockTokens: boolean
}

export default function IndexSafetyNotice({ containsStockTokens }: IndexSafetyNoticeProps) {
  return (
    <div style={{ marginBottom: 16, padding: '12px 13px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-2)' }}>
      <strong style={{ color: 'var(--text)' }}>Experimental and unaudited.</strong>{' '}
      {containsStockTokens
        ? 'This index contains Stock Tokens. Confirm that you are legally eligible to hold every component before transacting. '
        : 'Component tokens and their markets may be highly speculative. '}
      <a href="/safety">Review safety and eligibility</a>
    </div>
  )
}
