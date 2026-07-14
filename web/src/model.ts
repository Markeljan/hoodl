import { formatUnits, parseUnits } from 'viem'
import type { Address } from 'viem'

export type Screen = 'landing' | 'discover' | 'create' | 'detail' | 'portfolio' | 'creator' | 'activity' | 'operator'
export type Tab = 'buy' | 'mint' | 'redeem' | 'sell'

export type LensSource = 'USDG' | 'CHAINLINK' | 'POOL_USDG' | 'NONE'

export interface PoolView {
  currency0: Address
  currency1: Address
  fee: number
  tickSpacing: number
  hooks: Address
}

export interface Row {
  key: string
  token: Address
  sym: string
  name: string
  kind: string
  color: string
  decimals: number
  unitsRaw: bigint
  unitsLabel: string
  priceRaw: bigint | null
  priceLabel: string
  valueRaw: bigint | null
  valueLabel: string
  weight: number
  weightLabel: string
  barWidth: string
  lensSource: LensSource
  lensSourceLabel: string
  lensFeed: Address | null
  maxStaleness: bigint | null
  lensPool: PoolView | null
  zapRouted: boolean
  zapPool: PoolView | null
}

export interface IndexView {
  id: string
  address: Address
  name: string
  symbol: string
  tagline: string
  description: string
  imageURI: string
  tokenURI: string
  contractURI: string
  flagship: boolean
  creator: Address
  creatorLabel: string
  color: string
  navRaw: bigint | null
  nav: number | null
  navLabel: string
  totalSupplyRaw: bigint
  supplyLabel: string
  protocolMintFeeBps: number
  protocolRedeemFeeBps: number
  creatorMintFeeBps: number
  creatorRedeemFeeBps: number
  totalMintFeeBps: number
  totalRedeemFeeBps: number
  fMintLabel: string
  fRedeemLabel: string
  kindSummary: string
  rows: Row[]
  unitsNote: string
  segments: { color: string; width: string }[]
  canValue: boolean
  canZapMint: boolean
  canZapRedeem: boolean
  capabilitySummary: string
}

export type ActivityKind = 'created' | 'minted' | 'redeemed' | 'zap-mint' | 'zap-redeem' | 'creator' | 'metadata'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  blockNumber: bigint
  transactionHash: `0x${string}`
  index: Address
  actor: Address | null
  title: string
  detail: string
  sharesRaw?: bigint
  usdgRaw?: bigint
}

const TOKEN_COLORS: Record<string, string> = {
  NVDA: '#76b900',
  TSLA: '#e82127',
  CASHCAT: '#f5a623',
  ARROW: '#ccff00',
  HOODRAT: '#ff3e94',
  WISHBONE: '#f7e7b6',
  HOODIE: '#8b5cf6',
  USDG: '#ccff00',
}

const MEMECOIN_SYMBOLS = new Set(['CASHCAT', 'ARROW', 'HOODRAT', 'WISHBONE', 'HOODIE'])

export function tokenColor(symbol: string): string {
  return TOKEN_COLORS[symbol.toUpperCase()] ?? '#8b9aad'
}

export function tokenKind(symbol: string): string {
  const normalized = symbol.toUpperCase()
  if (MEMECOIN_SYMBOLS.has(normalized)) return 'Memecoin'
  if (normalized === 'USDG') return 'Stablecoin'
  return 'Stock token'
}

export function shortAddress(address: string, left = 6, right = 4): string {
  return `${address.slice(0, left)}…${address.slice(-right)}`
}

export function usd(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return 'Unavailable'
  const a = Math.abs(n)
  if (a >= 1) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (a === 0) return '$0.00'
  const s = n.toPrecision(a >= 0.01 ? 4 : 3)
  return '$' + Number.parseFloat(s).toString()
}

export function num(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '0'
  const a = Math.abs(n)
  const dp = a >= 1000 ? 0 : a >= 100 ? 2 : a >= 1 ? 4 : 6
  return n.toLocaleString('en-US', { maximumFractionDigits: dp })
}

export function amountLabel(raw: bigint, decimals: number, maxFractionDigits = 6): string {
  const value = Number(formatUnits(raw, decimals))
  if (!Number.isFinite(value)) return formatUnits(raw, decimals)
  return value.toLocaleString('en-US', { maximumFractionDigits: maxFractionDigits })
}

export function usdRawLabel(raw: bigint | null): string {
  return raw == null ? 'Unavailable' : usd(Number(formatUnits(raw, 6)))
}

export function percentageLabel(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`
}

export function parseAmount(value: string, decimals: number): bigint {
  const trimmed = value.trim()
  if (!/^\d*\.?\d+$/.test(trimmed)) throw new Error('Enter a valid positive amount.')
  const raw = parseUnits(trimmed, decimals)
  if (raw <= 0n) throw new Error('Amount must be greater than zero.')
  return raw
}

export function parseAmountOrZero(value: string, decimals: number): bigint {
  try {
    return parseAmount(value, decimals)
  } catch {
    return 0n
  }
}

export function mulDivFloor(a: bigint, b: bigint, denominator: bigint): bigint {
  return (a * b) / denominator
}

export function mulDivCeil(a: bigint, b: bigint, denominator: bigint): bigint {
  const product = a * b
  return product === 0n ? 0n : (product - 1n) / denominator + 1n
}

export function netShares(grossShares: bigint, firstFeeBps: number, secondFeeBps: number): bigint {
  return grossShares - (grossShares * BigInt(firstFeeBps)) / 10_000n - (grossShares * BigInt(secondFeeBps)) / 10_000n
}
