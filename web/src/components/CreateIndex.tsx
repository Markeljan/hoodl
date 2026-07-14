import { useState } from 'react'
import type { CSSProperties } from 'react'
import { getAddress, parseUnits } from 'viem'
import type { Address } from 'viem'
import { erc20Abi, publicClient } from '../contracts'
import { percentageLabel } from '../model'
import type { CreateIndexInput, ProtocolState } from '../useHoodl'

interface ComponentDraft {
  id: number
  token: string
  units: string
  decimals: string
  symbol: string
  resolving: boolean
}

interface CreateIndexProps {
  protocol: ProtocolState | null
  pendingAction: string | null
  onCreate: (input: CreateIndexInput) => void
}

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '12px 13px',
  border: '1px solid var(--border-strong)',
  borderRadius: 10,
  background: 'var(--surface-2)',
  color: 'var(--text)',
  outline: 'none',
  font: "500 13px 'JetBrains Mono',monospace",
}

function initialComponent(id: number): ComponentDraft {
  return { id, token: '', units: '', decimals: '18', symbol: '', resolving: false }
}

export default function CreateIndex({ protocol, pendingAction, onCreate }: CreateIndexProps) {
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [description, setDescription] = useState('')
  const [imageURI, setImageURI] = useState('')
  const [creatorMintFee, setCreatorMintFee] = useState('0')
  const [creatorRedeemFee, setCreatorRedeemFee] = useState('0')
  const [components, setComponents] = useState<ComponentDraft[]>([initialComponent(1)])
  const [nextId, setNextId] = useState(2)
  const [error, setError] = useState<string | null>(null)

  const updateComponent = (id: number, patch: Partial<ComponentDraft>) => {
    setComponents((current) => current.map((component) => (component.id === id ? { ...component, ...patch } : component)))
  }

  const resolveToken = async (component: ComponentDraft) => {
    try {
      const token = getAddress(component.token.trim())
      updateComponent(component.id, { resolving: true })
      const [nextSymbol, decimals] = await Promise.all([
        publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'symbol' }),
        publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' }),
      ])
      updateComponent(component.id, { symbol: nextSymbol, decimals: decimals.toString(), resolving: false })
      setError(null)
    } catch {
      updateComponent(component.id, { resolving: false })
      setError('Could not read that token. Check its address and Robinhood Chain deployment.')
    }
  }

  const addComponent = () => {
    if (components.length >= 16) return
    setComponents((current) => [...current, initialComponent(nextId)])
    setNextId((current) => current + 1)
  }

  const submit = () => {
    try {
      const cleanName = name.trim()
      const cleanSymbol = symbol.trim()
      if (!cleanName || !cleanSymbol) throw new Error('Name and symbol are required.')
      if (components.length === 0 || components.length > 16) throw new Error('Choose between 1 and 16 components.')
      const tokens: Address[] = []
      const units: bigint[] = []
      for (const component of components) {
        const token = getAddress(component.token.trim())
        const decimals = Number(component.decimals)
        if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error('Every component needs valid token decimals.')
        const unit = parseUnits(component.units.trim(), decimals)
        if (unit <= 0n) throw new Error('Every component unit must be greater than zero.')
        tokens.push(token)
        units.push(unit)
      }
      if (new Set(tokens.map((token) => token.toLowerCase())).size !== tokens.length) throw new Error('Component token addresses must be unique.')
      const creatorMintFeeBps = Number(creatorMintFee)
      const creatorRedeemFeeBps = Number(creatorRedeemFee)
      if (!Number.isInteger(creatorMintFeeBps) || !Number.isInteger(creatorRedeemFeeBps) || creatorMintFeeBps < 0 || creatorMintFeeBps > 100 || creatorRedeemFeeBps < 0 || creatorRedeemFeeBps > 100) {
        throw new Error('Creator fees must be whole basis points between 0 and 100.')
      }
      setError(null)
      onCreate({
        name: cleanName,
        symbol: cleanSymbol,
        tokens,
        units,
        creatorMintFeeBps,
        creatorRedeemFeeBps,
        description: description.trim(),
        imageURI: imageURI.trim(),
      })
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Check the index parameters.')
    }
  }

  const protocolMint = protocol?.mintFeeBps ?? 0
  const protocolRedeem = protocol?.redeemFeeBps ?? 0
  return (
    <main className="page">
      <div style={{ maxWidth: 820 }}>
        <span style={{ font: "600 11px 'JetBrains Mono',monospace", color: 'var(--neon)', letterSpacing: '.08em' }}>PERMISSIONLESS ISSUANCE</span>
        <h1 style={{ margin: '9px 0 6px', font: "700 34px 'Space Grotesk',sans-serif", letterSpacing: '-.02em' }}>Launch an index</h1>
        <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>Composition, raw units, and all fee rates become immutable when the factory deploys the token. Metadata and the creator fee recipient remain editable.</p>
      </div>

      <div className="form-layout" style={{ marginTop: 26 }}>
        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 22 }}>
          <h2 style={{ margin: '0 0 16px', font: "600 17px 'Space Grotesk',sans-serif" }}>Identity</h2>
          <div className="field-grid">
            <label className="form-field"><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="AI Infrastructure Index" style={fieldStyle} /></label>
            <label className="form-field"><span>Symbol</span><input value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder="hAII" style={fieldStyle} /></label>
          </div>
          <label className="form-field" style={{ marginTop: 14 }}><span>Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What thesis does this index represent?" rows={4} style={{ ...fieldStyle, resize: 'vertical' }} /></label>
          <label className="form-field" style={{ marginTop: 14 }}><span>Image URI</span><input value={imageURI} onChange={(event) => setImageURI(event.target.value)} placeholder="https://… or data:image/…" style={fieldStyle} /></label>
        </section>

        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
            <div><h2 style={{ margin: 0, font: "600 17px 'Space Grotesk',sans-serif" }}>Fixed basket</h2><p style={{ margin: '5px 0 0', fontSize: 12.5, color: 'var(--text-3)' }}>Display units are converted using each token’s on-chain decimals.</p></div>
            <span style={{ font: "500 12px 'JetBrains Mono',monospace", color: 'var(--text-3)' }}>{components.length}/16</span>
          </div>
          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            {components.map((component, position) => (
              <div key={component.id} style={{ padding: 15, border: '1px solid var(--border)', borderRadius: 13, background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><strong style={{ fontSize: 13 }}>Component {position + 1}{component.symbol ? ` · ${component.symbol}` : ''}</strong>{components.length > 1 && <button onClick={() => setComponents((current) => current.filter((item) => item.id !== component.id))} className="text-button">Remove</button>}</div>
                <div className="component-grid">
                  <label className="form-field"><span>Token address</span><input value={component.token} onChange={(event) => updateComponent(component.id, { token: event.target.value, symbol: '' })} placeholder="0x…" style={fieldStyle} /></label>
                  <label className="form-field"><span>Units / share</span><input value={component.units} onChange={(event) => updateComponent(component.id, { units: event.target.value })} placeholder="0.05" inputMode="decimal" style={fieldStyle} /></label>
                  <label className="form-field"><span>Decimals</span><input value={component.decimals} onChange={(event) => updateComponent(component.id, { decimals: event.target.value })} inputMode="numeric" style={fieldStyle} /></label>
                </div>
                <button onClick={() => void resolveToken(component)} disabled={component.resolving || !component.token.trim()} className="secondary-button" style={{ marginTop: 10 }}>{component.resolving ? 'Reading token…' : 'Read symbol + decimals'}</button>
              </div>
            ))}
          </div>
          <button onClick={addComponent} disabled={components.length >= 16} className="secondary-button" style={{ marginTop: 13 }}>+ Add component</button>
        </section>

        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 22 }}>
          <h2 style={{ margin: '0 0 16px', font: "600 17px 'Space Grotesk',sans-serif" }}>Immutable creator fees</h2>
          <div className="field-grid">
            <label className="form-field"><span>Creator mint fee · bps</span><input value={creatorMintFee} onChange={(event) => setCreatorMintFee(event.target.value)} inputMode="numeric" style={fieldStyle} /></label>
            <label className="form-field"><span>Creator redeem fee · bps</span><input value={creatorRedeemFee} onChange={(event) => setCreatorRedeemFee(event.target.value)} inputMode="numeric" style={fieldStyle} /></label>
          </div>
          <div className="summary-grid" style={{ marginTop: 16 }}>
            <div><span>Total mint fee</span><strong>{percentageLabel(protocolMint + (Number(creatorMintFee) || 0))}</strong><small>{protocolMint} protocol + {Number(creatorMintFee) || 0} creator bps</small></div>
            <div><span>Total redeem fee</span><strong>{percentageLabel(protocolRedeem + (Number(creatorRedeemFee) || 0))}</strong><small>{protocolRedeem} protocol + {Number(creatorRedeemFee) || 0} creator bps</small></div>
          </div>
          <div style={{ marginTop: 16, padding: 13, background: 'var(--neon-dim)', border: '1px solid var(--neon-line)', borderRadius: 11, fontSize: 12.5, lineHeight: 1.5 }}>Creating the index does not automatically configure NAV or USDG Zap routes. Direct in-kind mint and redemption remain the core paths.</div>
          {error && <div style={{ marginTop: 14, color: 'var(--neg)', fontSize: 13 }}>{error}</div>}
          <button onClick={submit} disabled={pendingAction != null} className="primary-button" style={{ marginTop: 18 }}>{pendingAction ?? 'Create index on-chain'}</button>
        </section>
      </div>
    </main>
  )
}
