export type Screen = 'landing' | 'discover' | 'detail' | 'portfolio'
export type Tab = 'buy' | 'mint' | 'redeem'

export interface Token {
  sym: string
  name: string
  kind: 'Stock' | 'Memecoin'
  price: number
  color: string
  chg: number
}

export interface RawIndex {
  id: string
  name: string
  symbol: string
  flagship?: boolean
  meta?: boolean
  color: string
  tagline: string
  /** [component key, fixed units per share] — key is a token symbol or another index id */
  comps: [string, number][]
  change: number
  supply: number
  creator: string
  fMint: number
  fRedeem: number
}

export interface Row {
  key: string
  sym: string
  name: string
  kind: string
  color: string
  isIndex: boolean
  units: number
  unitsLabel: string
  price: number
  priceLabel: string
  value: number
  valueLabel: string
  weight: number
  weightLabel: string
  barWidth: string
}

export interface IndexView {
  id: string
  name: string
  symbol: string
  tagline: string
  flagship: boolean
  meta: boolean
  creator: string
  color: string
  nav: number
  navLabel: string
  change: number
  changeLabel: string
  up: boolean
  chgColor: string
  supply: number
  supplyLabel: string
  fMint: number
  fRedeem: number
  fMintLabel: string
  fRedeemLabel: string
  kindSummary: string
  rows: Row[]
  unitsNote: string
  segments: { color: string; width: string }[]
  chartLine: string
  chartArea: string
  chartStroke: string
}

export const TOKENS: Record<string, Token> = {
  NVDA: { sym: 'NVDA', name: 'NVIDIA', kind: 'Stock', price: 322.4, color: '#76b900', chg: 2.14 },
  TSLA: { sym: 'TSLA', name: 'Tesla', kind: 'Stock', price: 284.0, color: '#e82127', chg: -1.32 },
  AAPL: { sym: 'AAPL', name: 'Apple', kind: 'Stock', price: 241.3, color: '#9fa6ab', chg: 0.48 },
  AMD: { sym: 'AMD', name: 'AMD', kind: 'Stock', price: 178.9, color: '#ed1c24', chg: 1.87 },
  CASHCAT: { sym: 'CASHCAT', name: 'Cash Cat', kind: 'Memecoin', price: 0.1567, color: '#f5a623', chg: 9.65 },
  GOAT: { sym: 'GOAT', name: 'Goatseus', kind: 'Memecoin', price: 0.0284, color: '#b06f3a', chg: -4.2 },
  FARTCOIN: { sym: 'FARTCOIN', name: 'Fartcoin', kind: 'Memecoin', price: 1.243, color: '#8b5cf6', chg: 6.1 },
  ARC: { sym: 'ARC', name: 'AI Rig', kind: 'Memecoin', price: 0.418, color: '#22d3ee', chg: -2.75 },
}

export const RAW_INDEXES: RawIndex[] = [
  {
    id: 'hai',
    name: 'HOODL AI Index',
    symbol: 'hAI',
    flagship: true,
    color: '#CCFF00',
    tagline: 'The AI trade in one token — NVDA, TSLA, and the memecoin that won’t shut up.',
    comps: [
      ['NVDA', 0.05],
      ['TSLA', 0.025],
      ['CASHCAT', 60],
    ],
    change: 4.18,
    supply: 12480,
    creator: 'hoodl.eth',
    fMint: 0.5,
    fRedeem: 0.2,
  },
  {
    id: 'hmag',
    name: 'Megacap Tech',
    symbol: 'hMAG',
    color: '#D2CEC7',
    tagline: 'Four mega-cap equities bundled into one composable ERC-20.',
    comps: [
      ['NVDA', 0.05],
      ['TSLA', 0.03],
      ['AAPL', 0.06],
      ['AMD', 0.1],
    ],
    change: 1.24,
    supply: 3120,
    creator: '0x9a…f4',
    fMint: 0.4,
    fRedeem: 0.1,
  },
  {
    id: 'hdgn',
    name: 'Degen Meta',
    symbol: 'hDGN',
    color: '#f5a623',
    tagline: 'The Robinhood Chain meme rotation, wrapped and redeemable.',
    comps: [
      ['CASHCAT', 20],
      ['GOAT', 15],
      ['FARTCOIN', 0.5],
      ['ARC', 1],
    ],
    change: -6.32,
    supply: 88400,
    creator: '0x3c…aa',
    fMint: 0.6,
    fRedeem: 0.2,
  },
  {
    id: 'hmeta',
    name: 'Index of Indexes',
    symbol: 'hMETA',
    meta: true,
    color: '#CCFF00',
    tagline: 'A meta-index whose components are other HOODL indexes. Only possible here.',
    comps: [
      ['hai', 0.5],
      ['hmag', 0.3],
      ['hdgn', 2],
    ],
    change: 2.71,
    supply: 640,
    creator: 'hoodl.eth',
    fMint: 0.5,
    fRedeem: 0.2,
  },
]

export function fmtChg(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

export function usd(n: number): string {
  if (!isFinite(n)) return '$0.00'
  const a = Math.abs(n)
  if (a >= 1) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (a === 0) return '$0.00'
  const s = n.toPrecision(a >= 0.01 ? 4 : 3)
  return '$' + parseFloat(s).toString()
}

export function num(n: number): string {
  if (!isFinite(n) || n === 0) return '0'
  const a = Math.abs(n)
  const dp = a >= 1000 ? 0 : a >= 100 ? 2 : a >= 1 ? 3 : 4
  return n.toLocaleString('en-US', { maximumFractionDigits: dp })
}

function genChart(seed: number, up: boolean): number[] {
  const out: number[] = []
  let v = 100
  for (let i = 0; i < 26; i++) {
    const w = Math.sin(seed * 1.7 + i * 0.6) * 2.4 + Math.cos(seed * 0.9 + i * 0.27) * 1.7
    v = v + w + (up ? 0.7 : -0.55)
    out.push(v)
  }
  return out
}

function spark(vals: number[]): { line: string; area: string } {
  const w = 600,
    h = 140,
    pl = 6,
    pt = 14,
    pb = 10
  const mn = Math.min(...vals)
  const mx = Math.max(...vals)
  const rng = mx - mn || 1
  const n = vals.length
  const X = (i: number) => pl + (w - 2 * pl) * (i / (n - 1))
  const Y = (v: number) => pt + (h - pt - pb) * (1 - (v - mn) / rng)
  const pts = vals.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1))
  return {
    line: pts.join(' '),
    area: 'M ' + X(0).toFixed(1) + ',' + (h - pb).toFixed(1) + ' L ' + pts.join(' L ') + ' L ' + X(n - 1).toFixed(1) + ',' + (h - pb).toFixed(1) + ' Z',
  }
}

export function computeAll(): { list: IndexView[]; byId: Record<string, IndexView> } {
  const byRawId: Record<string, RawIndex> = {}
  RAW_INDEXES.forEach((r) => (byRawId[r.id] = r))
  const cache: Record<string, number> = {}
  const navOf = (id: string): number => {
    if (cache[id] != null) return cache[id]
    let s = 0
    byRawId[id].comps.forEach(([k, u]) => {
      s += u * priceOf(k)
    })
    cache[id] = s
    return s
  }
  const priceOf = (k: string): number => {
    if (TOKENS[k]) return TOKENS[k].price
    if (byRawId[k]) return navOf(k)
    return 0
  }

  const list = RAW_INDEXES.map((it, ci): IndexView => {
    const nav = navOf(it.id)
    const rows = it.comps.map(([k, u]): Row => {
      const isIdx = !!byRawId[k]
      const price = isIdx ? navOf(k) : TOKENS[k].price
      const value = u * price
      const weight = nav > 0 ? (value / nav) * 100 : 0
      return {
        key: k,
        sym: isIdx ? byRawId[k].symbol : k,
        name: isIdx ? byRawId[k].name : TOKENS[k].name,
        kind: isIdx ? 'Index' : TOKENS[k].kind,
        color: isIdx ? byRawId[k].color || '#B3B0AA' : TOKENS[k].color,
        isIndex: isIdx,
        units: u,
        unitsLabel: num(u),
        price,
        priceLabel: usd(price),
        value,
        valueLabel: usd(value),
        weight,
        weightLabel: weight.toFixed(1) + '%',
        barWidth: weight.toFixed(2) + '%',
      }
    })
    const kinds: Record<string, 1> = {}
    rows.forEach((r) => (kinds[r.kind] = 1))
    let kindSummary: string
    if (it.meta) kindSummary = 'Meta-index'
    else if (kinds['Stock'] && kinds['Memecoin']) kindSummary = 'Stocks + Crypto'
    else if (kinds['Stock']) kindSummary = 'Equities'
    else if (kinds['Memecoin']) kindSummary = 'Memecoins'
    else kindSummary = 'Mixed'
    const up = it.change >= 0
    const sp = spark(genChart(ci + 1, up))
    const unitsNote = '1 ' + it.symbol + ' = ' + rows.map((r) => r.unitsLabel + ' ' + r.sym).join(' + ') + '. Fixed forever.'
    return {
      id: it.id,
      name: it.name,
      symbol: it.symbol,
      tagline: it.tagline,
      flagship: !!it.flagship,
      meta: !!it.meta,
      creator: it.creator,
      color: it.color || '#CCFF00',
      nav,
      navLabel: usd(nav),
      change: it.change,
      changeLabel: fmtChg(it.change),
      up,
      chgColor: up ? 'var(--pos)' : 'var(--neg)',
      supply: it.supply,
      supplyLabel: it.supply.toLocaleString('en-US'),
      fMint: it.fMint,
      fRedeem: it.fRedeem,
      fMintLabel: it.fMint.toFixed(2) + '%',
      fRedeemLabel: it.fRedeem.toFixed(2) + '%',
      kindSummary,
      rows,
      unitsNote,
      segments: rows.map((r) => ({ color: r.color, width: r.barWidth })),
      chartLine: sp.line,
      chartArea: sp.area,
      chartStroke: up ? 'var(--pos)' : 'var(--neg)',
    }
  })
  const byId: Record<string, IndexView> = {}
  list.forEach((o) => (byId[o.id] = o))
  return { list, byId }
}

export function parsePositive(s: string): number {
  const v = parseFloat(s)
  return isFinite(v) && v > 0 ? v : 0
}
