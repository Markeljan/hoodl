import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { getAddress, zeroAddress } from 'viem'
import type { Address } from 'viem'
import { shortAddress } from '../model'
import type { LensConfigInput, ManagedContract, PoolConfigInput, ProtocolState } from '../useHoodl'

interface OperatorProps {
  account: Address | null
  protocol: ProtocolState | null
  pendingAction: string | null
  onConnect: () => void
  onFees: (mintBps: number, redeemBps: number) => void
  onTreasury: (treasury: Address) => void
  onLens: (token: Address, config: LensConfigInput) => void
  onSequencer: (feed: Address, gracePeriod: bigint) => void
  onZap: (token: Address, pool: PoolConfigInput) => void
  onTransferOwnership: (contract: ManagedContract, owner: Address) => void
  onRenounce: (contract: ManagedContract) => void
}

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '11px 12px',
  border: '1px solid var(--border-strong)',
  borderRadius: 9,
  background: 'var(--surface-2)',
  color: 'var(--text)',
  outline: 'none',
  font: "500 12px 'JetBrains Mono',monospace",
}

const managedContracts: ManagedContract[] = ['factory', 'lens', 'zap']

interface PoolFields {
  currency0: string
  currency1: string
  fee: string
  tickSpacing: string
  hooks: string
}

const emptyPool: PoolFields = { currency0: '', currency1: '', fee: '3000', tickSpacing: '60', hooks: zeroAddress }

function parsePool(fields: PoolFields): PoolConfigInput {
  const fee = Number(fields.fee)
  const tickSpacing = Number(fields.tickSpacing)
  if (!Number.isInteger(fee) || fee < 0 || fee > 16_777_215) throw new Error('Pool fee must fit uint24.')
  if (!Number.isInteger(tickSpacing) || tickSpacing < -8_388_608 || tickSpacing > 8_388_607) throw new Error('Tick spacing must fit int24.')
  return {
    currency0: getAddress(fields.currency0.trim()),
    currency1: getAddress(fields.currency1.trim()),
    fee,
    tickSpacing,
    hooks: getAddress(fields.hooks.trim()),
  }
}

function PoolFieldsForm({ value, onChange }: { value: PoolFields; onChange: (value: PoolFields) => void }) {
  return (
    <div className="field-grid" style={{ marginTop: 12 }}>
      <label className="form-field"><span>Currency 0</span><input value={value.currency0} onChange={(event) => onChange({ ...value, currency0: event.target.value })} style={fieldStyle} /></label>
      <label className="form-field"><span>Currency 1</span><input value={value.currency1} onChange={(event) => onChange({ ...value, currency1: event.target.value })} style={fieldStyle} /></label>
      <label className="form-field"><span>Fee</span><input value={value.fee} onChange={(event) => onChange({ ...value, fee: event.target.value })} style={fieldStyle} /></label>
      <label className="form-field"><span>Tick spacing</span><input value={value.tickSpacing} onChange={(event) => onChange({ ...value, tickSpacing: event.target.value })} style={fieldStyle} /></label>
      <label className="form-field"><span>Hooks</span><input value={value.hooks} onChange={(event) => onChange({ ...value, hooks: event.target.value })} style={fieldStyle} /></label>
    </div>
  )
}

export default function Operator(p: OperatorProps) {
  const [mintFee, setMintFee] = useState('0')
  const [redeemFee, setRedeemFee] = useState('0')
  const [treasury, setTreasury] = useState('')
  const [lensToken, setLensToken] = useState('')
  const [lensSource, setLensSource] = useState<'1' | '2'>('1')
  const [feed, setFeed] = useState('')
  const [maxStaleness, setMaxStaleness] = useState('259200')
  const [lensPool, setLensPool] = useState<PoolFields>(emptyPool)
  const [tokenIsCurrency0, setTokenIsCurrency0] = useState(true)
  const [sequencerFeed, setSequencerFeed] = useState<string>(zeroAddress)
  const [gracePeriod, setGracePeriod] = useState('0')
  const [zapToken, setZapToken] = useState('')
  const [zapPool, setZapPool] = useState<PoolFields>(emptyPool)
  const [managedContract, setManagedContract] = useState<ManagedContract>('factory')
  const [nextOwner, setNextOwner] = useState('')
  const [renounceText, setRenounceText] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!p.protocol) return
    setMintFee(p.protocol.mintFeeBps.toString())
    setRedeemFee(p.protocol.redeemFeeBps.toString())
    setTreasury(p.protocol.treasury)
    setSequencerFeed(p.protocol.sequencerFeed)
    setGracePeriod(p.protocol.sequencerGracePeriod.toString())
  }, [p.protocol])

  if (!p.account) {
    return <main className="page"><h1 style={{ margin: 0, font: "700 34px 'Space Grotesk',sans-serif" }}>Operator console</h1><p style={{ color: 'var(--text-2)' }}>Connect an owner wallet to access protocol configuration.</p><button onClick={p.onConnect} className="primary-button">Connect owner wallet</button></main>
  }
  if (!p.protocol) return <main className="page">Loading owner state…</main>

  const ownerOf = (contract: ManagedContract) => contract === 'factory' ? p.protocol?.factoryOwner : contract === 'lens' ? p.protocol?.lensOwner : p.protocol?.zapOwner
  const isOwner = (contract: ManagedContract) => ownerOf(contract)?.toLowerCase() === p.account?.toLowerCase()
  const run = (action: () => void) => {
    try {
      setError(null)
      action()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Check the operator parameters.')
    }
  }
  const panelStyle: CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 20 }
  const buttonDisabled = p.pendingAction != null
  return (
    <main className="page">
      <span style={{ font: "600 11px 'JetBrains Mono',monospace", color: 'var(--neg)', letterSpacing: '.08em' }}>PRIVILEGED WRITES</span>
      <h1 style={{ margin: '8px 0 5px', font: "700 34px 'Space Grotesk',sans-serif" }}>Operator console</h1>
      <p style={{ margin: 0, color: 'var(--text-2)' }}>Separated from retail flows. Every write is simulated and still requires wallet confirmation.</p>
      <div className="summary-grid" style={{ marginTop: 20 }}>
        {managedContracts.map((contract) => <div key={contract}><span>{contract} owner</span><strong style={{ fontSize: 16 }}>{shortAddress(ownerOf(contract) ?? zeroAddress, 8, 6)}</strong><small>{isOwner(contract) ? 'Connected wallet can write' : 'Read-only for this wallet'}</small></div>)}
      </div>
      {error && <div style={{ marginTop: 16, color: 'var(--neg)', padding: 12, border: '1px solid var(--border)', borderRadius: 10 }}>{error}</div>}

      <div className="operator-grid" style={{ marginTop: 20 }}>
        <section style={panelStyle}>
          <h2 style={{ margin: 0, font: "600 17px 'Space Grotesk',sans-serif" }}>Factory economics</h2>
          <div className="field-grid" style={{ marginTop: 14 }}><label className="form-field"><span>Future mint fee · bps</span><input value={mintFee} onChange={(event) => setMintFee(event.target.value)} style={fieldStyle} /></label><label className="form-field"><span>Future redeem fee · bps</span><input value={redeemFee} onChange={(event) => setRedeemFee(event.target.value)} style={fieldStyle} /></label></div>
          <button disabled={buttonDisabled || !isOwner('factory')} onClick={() => run(() => p.onFees(Number(mintFee), Number(redeemFee)))} className="secondary-button" style={{ marginTop: 12 }}>Set future fees</button>
          <label className="form-field" style={{ marginTop: 16 }}><span>Treasury</span><input value={treasury} onChange={(event) => setTreasury(event.target.value)} style={fieldStyle} /></label>
          <button disabled={buttonDisabled || !isOwner('factory')} onClick={() => run(() => p.onTreasury(getAddress(treasury.trim())))} className="secondary-button" style={{ marginTop: 12 }}>Set treasury</button>
        </section>

        <section style={panelStyle}>
          <h2 style={{ margin: 0, font: "600 17px 'Space Grotesk',sans-serif" }}>Lens price source</h2>
          <label className="form-field" style={{ marginTop: 14 }}><span>Token</span><input value={lensToken} onChange={(event) => setLensToken(event.target.value)} style={fieldStyle} /></label>
          <label className="form-field" style={{ marginTop: 12 }}><span>Source</span><select value={lensSource} onChange={(event) => setLensSource(event.target.value === '2' ? '2' : '1')} style={fieldStyle}><option value="1">Chainlink</option><option value="2">Uniswap v4 pool spot</option></select></label>
          {lensSource === '1' ? <div className="field-grid" style={{ marginTop: 12 }}><label className="form-field"><span>Feed</span><input value={feed} onChange={(event) => setFeed(event.target.value)} style={fieldStyle} /></label><label className="form-field"><span>Max staleness · seconds</span><input value={maxStaleness} onChange={(event) => setMaxStaleness(event.target.value)} style={fieldStyle} /></label></div> : <><PoolFieldsForm value={lensPool} onChange={setLensPool} /><label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, fontSize: 13 }}><input type="checkbox" checked={tokenIsCurrency0} onChange={(event) => setTokenIsCurrency0(event.target.checked)} /> Token is currency0</label></>}
          <button disabled={buttonDisabled || !isOwner('lens')} onClick={() => run(() => p.onLens(getAddress(lensToken.trim()), lensSource === '1' ? { source: 1, feed: getAddress(feed.trim()), maxStaleness: BigInt(maxStaleness), poolKey: { currency0: zeroAddress, currency1: zeroAddress, fee: 0, tickSpacing: 0, hooks: zeroAddress }, tokenIsCurrency0: false } : { source: 2, feed: zeroAddress, maxStaleness: 0n, poolKey: parsePool(lensPool), tokenIsCurrency0 }))} className="secondary-button" style={{ marginTop: 13 }}>Set price source</button>
        </section>

        <section style={panelStyle}>
          <h2 style={{ margin: 0, font: "600 17px 'Space Grotesk',sans-serif" }}>Lens sequencer guard</h2>
          <label className="form-field" style={{ marginTop: 14 }}><span>Uptime feed · zero disables</span><input value={sequencerFeed} onChange={(event) => setSequencerFeed(event.target.value)} style={fieldStyle} /></label>
          <label className="form-field" style={{ marginTop: 12 }}><span>Grace period · seconds</span><input value={gracePeriod} onChange={(event) => setGracePeriod(event.target.value)} style={fieldStyle} /></label>
          <button disabled={buttonDisabled || !isOwner('lens')} onClick={() => run(() => p.onSequencer(getAddress(sequencerFeed.trim()), BigInt(gracePeriod)))} className="secondary-button" style={{ marginTop: 13 }}>Set sequencer guard</button>
        </section>

        <section style={panelStyle}>
          <h2 style={{ margin: 0, font: "600 17px 'Space Grotesk',sans-serif" }}>Zap pool route</h2>
          <label className="form-field" style={{ marginTop: 14 }}><span>Component token</span><input value={zapToken} onChange={(event) => setZapToken(event.target.value)} style={fieldStyle} /></label>
          <PoolFieldsForm value={zapPool} onChange={setZapPool} />
          <button disabled={buttonDisabled || !isOwner('zap')} onClick={() => run(() => p.onZap(getAddress(zapToken.trim()), parsePool(zapPool)))} className="secondary-button" style={{ marginTop: 13 }}>Set Zap route</button>
        </section>

        <section style={{ ...panelStyle, gridColumn: '1 / -1', borderColor: 'color-mix(in srgb,var(--neg) 35%,var(--border))' }}>
          <h2 style={{ margin: 0, font: "600 17px 'Space Grotesk',sans-serif", color: 'var(--neg)' }}>Ownership</h2>
          <div className="field-grid" style={{ marginTop: 14 }}><label className="form-field"><span>Contract</span><select value={managedContract} onChange={(event) => setManagedContract(event.target.value === 'lens' ? 'lens' : event.target.value === 'zap' ? 'zap' : 'factory')} style={fieldStyle}><option value="factory">Factory</option><option value="lens">Lens</option><option value="zap">Zap</option></select></label><label className="form-field"><span>New owner</span><input value={nextOwner} onChange={(event) => setNextOwner(event.target.value)} style={fieldStyle} /></label></div>
          <button disabled={buttonDisabled || !isOwner(managedContract)} onClick={() => run(() => p.onTransferOwnership(managedContract, getAddress(nextOwner.trim())))} className="secondary-button" style={{ marginTop: 12 }}>Transfer ownership</button>
          <label className="form-field" style={{ marginTop: 18 }}><span>Type RENOUNCE {managedContract.toUpperCase()} to permanently remove its owner</span><input value={renounceText} onChange={(event) => setRenounceText(event.target.value)} style={fieldStyle} /></label>
          <button disabled={buttonDisabled || !isOwner(managedContract) || renounceText !== `RENOUNCE ${managedContract.toUpperCase()}`} onClick={() => p.onRenounce(managedContract)} style={{ marginTop: 12, padding: '11px 14px', border: '1px solid var(--neg)', borderRadius: 9, background: 'transparent', color: 'var(--neg)' }}>Renounce ownership permanently</button>
        </section>
      </div>
    </main>
  )
}
