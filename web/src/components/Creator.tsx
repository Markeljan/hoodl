import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { getAddress } from 'viem'
import type { Address } from 'viem'
import { amountLabel, percentageLabel, shortAddress } from '../model'
import type { ActivityItem, IndexView } from '../model'

interface CreatorProps {
  account: Address | null
  indexes: IndexView[]
  balances: Record<string, bigint>
  activity: ActivityItem[]
  pendingAction: string | null
  onConnect: () => void
  onMetadata: (index: IndexView, description: string, imageURI: string) => void
  onCreator: (index: IndexView, creator: Address) => void
}

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '12px 13px',
  border: '1px solid var(--border-strong)',
  borderRadius: 10,
  background: 'var(--surface-2)',
  color: 'var(--text)',
  outline: 'none',
}

export default function Creator({ account, indexes, balances, activity, pendingAction, onConnect, onMetadata, onCreator }: CreatorProps) {
  const owned = useMemo(() => indexes.filter((index) => account && index.creator.toLowerCase() === account.toLowerCase()), [account, indexes])
  const [selectedId, setSelectedId] = useState('')
  const selected = owned.find((index) => index.id === selectedId) ?? owned[0] ?? null
  const [description, setDescription] = useState('')
  const [imageURI, setImageURI] = useState('')
  const [nextCreator, setNextCreator] = useState('')
  const [error, setError] = useState<string | null>(null)
  const selectedAddress = selected?.creator
  const selectedDescription = selected?.description
  const selectedImageURI = selected?.imageURI
  const activeSelectedId = selected?.id ?? ''

  useEffect(() => {
    if (!activeSelectedId || selectedDescription == null || selectedImageURI == null || !selectedAddress) return
    setDescription(selectedDescription)
    setImageURI(selectedImageURI)
    setNextCreator(selectedAddress)
    setError(null)
  }, [activeSelectedId, selectedAddress, selectedDescription, selectedImageURI])

  if (!account) {
    return (
      <main className="page"><h1 style={{ margin: 0, font: "700 34px 'Space Grotesk',sans-serif" }}>Creator studio</h1><p style={{ color: 'var(--text-2)' }}>Connect the creator wallet to manage metadata and the creator-fee recipient.</p><button onClick={onConnect} className="primary-button">Connect wallet</button></main>
    )
  }

  if (!selected) {
    return (
      <main className="page"><h1 style={{ margin: 0, font: "700 34px 'Space Grotesk',sans-serif" }}>Creator studio</h1><p style={{ color: 'var(--text-2)' }}>{shortAddress(account)} is not the current creator of any registered index.</p><p style={{ color: 'var(--text-3)', fontSize: 13 }}>Create an index or connect the current creator-fee recipient wallet.</p></main>
    )
  }

  const relatedActivity = activity.filter((item) => item.index.toLowerCase() === selected.address.toLowerCase())
  const mintedVolume = relatedActivity.filter((item) => item.kind === 'minted').reduce((total, item) => total + (item.sharesRaw ?? 0n), 0n)
  const redeemedVolume = relatedActivity.filter((item) => item.kind === 'redeemed').reduce((total, item) => total + (item.sharesRaw ?? 0n), 0n)
  const creatorFeesGenerated = (mintedVolume * BigInt(selected.creatorMintFeeBps)) / 10_000n + (redeemedVolume * BigInt(selected.creatorRedeemFeeBps)) / 10_000n
  const holding = balances[selected.id] ?? 0n
  return (
    <main className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 18, flexWrap: 'wrap' }}>
        <div><span style={{ font: "600 11px 'JetBrains Mono',monospace", color: 'var(--neon)', letterSpacing: '.08em' }}>CREATOR ROLE</span><h1 style={{ margin: '8px 0 5px', font: "700 34px 'Space Grotesk',sans-serif" }}>Creator studio</h1><p style={{ margin: 0, color: 'var(--text-2)' }}>Manage display metadata and rotate the fee stream. Composition and fee rates cannot change.</p></div>
        <select value={selected.id} onChange={(event) => setSelectedId(event.target.value)} style={{ ...fieldStyle, width: 'auto', minWidth: 220 }}>
          {owned.map((index) => <option key={index.id} value={index.id}>{index.symbol} · {index.name}</option>)}
        </select>
      </div>

      <div className="summary-grid" style={{ marginTop: 24 }}>
        <div><span>Current creator wallet balance</span><strong>{amountLabel(holding, 18)} {selected.symbol}</strong><small>Includes automatically delivered fees plus any other transfers.</small></div>
        <div><span>Lifetime creator fees generated</span><strong>{amountLabel(creatorFeesGenerated, 18)} {selected.symbol}</strong><small>Across indexed mint and redeem events; recipients may have rotated.</small></div>
        <div><span>Protocol usage</span><strong>{amountLabel(mintedVolume, 18)} in · {amountLabel(redeemedVolume, 18)} out</strong><small>{relatedActivity.length} indexed contract events</small></div>
        <div><span>Immutable creator fees</span><strong>{percentageLabel(selected.creatorMintFeeBps)} in · {percentageLabel(selected.creatorRedeemFeeBps)} out</strong><small>Rates were snapshotted at creation.</small></div>
        <div><span>Current recipient</span><strong style={{ fontSize: 17 }}>{shortAddress(selected.creator, 8, 6)}</strong><small>Rotating this address transfers future creator fees.</small></div>
      </div>

      <div className="two-panel-grid" style={{ marginTop: 20 }}>
        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 22 }}>
          <h2 style={{ margin: '0 0 5px', font: "600 17px 'Space Grotesk',sans-serif" }}>Display metadata</h2>
          <p style={{ margin: '0 0 16px', color: 'var(--text-3)', fontSize: 12.5 }}>Served directly by `tokenURI()` and `contractURI()`.</p>
          {imageURI && <img src={imageURI} alt={`${selected.symbol} index artwork`} style={{ width: 86, height: 86, objectFit: 'cover', borderRadius: 16, background: 'var(--surface-2)', border: '1px solid var(--border)', marginBottom: 14 }} />}
          <label className="form-field"><span>Description</span><textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} style={{ ...fieldStyle, resize: 'vertical' }} /></label>
          <label className="form-field" style={{ marginTop: 13 }}><span>Image URI</span><input value={imageURI} onChange={(event) => setImageURI(event.target.value)} style={fieldStyle} /></label>
          <button disabled={pendingAction != null} onClick={() => onMetadata(selected, description.trim(), imageURI.trim())} className="primary-button" style={{ marginTop: 16 }}>{pendingAction ?? 'Save metadata'}</button>
        </section>

        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 22 }}>
          <h2 style={{ margin: '0 0 5px', font: "600 17px 'Space Grotesk',sans-serif" }}>Creator fee recipient</h2>
          <p style={{ margin: '0 0 16px', color: 'var(--text-3)', fontSize: 12.5, lineHeight: 1.5 }}>This also transfers authority to update metadata and rotate the recipient again. It does not change any fee rate.</p>
          <label className="form-field"><span>New creator address</span><input value={nextCreator} onChange={(event) => setNextCreator(event.target.value)} style={fieldStyle} /></label>
          {error && <div style={{ color: 'var(--neg)', fontSize: 13, marginTop: 10 }}>{error}</div>}
          <button
            disabled={pendingAction != null}
            onClick={() => {
              try {
                const address = getAddress(nextCreator.trim())
                setError(null)
                onCreator(selected, address)
              } catch {
                setError('Enter a valid nonzero creator address.')
              }
            }}
            className="secondary-button"
            style={{ marginTop: 16 }}
          >
            Transfer creator role
          </button>
          <div style={{ marginTop: 18, padding: 13, border: '1px solid var(--border)', borderRadius: 11, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-2)' }}>There is no fee claim transaction. Mint and redeem fees are issued or transferred to the current creator address during protocol use.</div>
        </section>
      </div>
    </main>
  )
}
