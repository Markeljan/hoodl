import { explorerUrl } from '../contracts'
import { shortAddress } from '../model'
import type { ActivityItem } from '../model'

interface ActivityProps {
  activity: ActivityItem[]
  error: string | null
}

const kindLabel: Record<ActivityItem['kind'], string> = {
  created: 'CREATE',
  minted: 'MINT',
  redeemed: 'REDEEM',
  'zap-mint': 'ZAP IN',
  'zap-redeem': 'ZAP OUT',
  creator: 'CREATOR',
  metadata: 'METADATA',
}

export default function Activity({ activity, error }: ActivityProps) {
  return (
    <main className="page">
      <h1 style={{ margin: '0 0 5px', font: "700 34px 'Space Grotesk',sans-serif" }}>Protocol activity</h1>
      <p style={{ margin: 0, color: 'var(--text-2)' }}>Factory, index, and Zap events read from the deployment block onward.</p>
      {error && <div style={{ marginTop: 18, color: 'var(--neg)', padding: 14, border: '1px solid var(--border)', borderRadius: 12 }}>{error}</div>}
      <div style={{ marginTop: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
        {activity.length === 0 && !error && <div style={{ padding: 24, color: 'var(--text-3)' }}>No indexed activity was returned by the public RPC.</div>}
        {activity.map((item) => (
          <a key={item.id} href={`${explorerUrl}/tx/${item.transactionHash}`} target="_blank" rel="noreferrer" className="activity-row">
            <span className="activity-kind">{kindLabel[item.kind]}</span>
            <span style={{ minWidth: 0, flex: 1 }}><strong style={{ display: 'block', color: 'var(--text)', fontSize: 14 }}>{item.title}</strong><small style={{ display: 'block', color: 'var(--text-3)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.detail}</small></span>
            <span style={{ textAlign: 'right', color: 'var(--text-3)', font: "500 11px 'JetBrains Mono',monospace" }}>#{item.blockNumber.toString()}<br />{item.actor ? shortAddress(item.actor) : 'on-chain'} ↗</span>
          </a>
        ))}
      </div>
    </main>
  )
}
