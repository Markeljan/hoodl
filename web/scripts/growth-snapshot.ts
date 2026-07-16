import deployment from '../../deployments/robinhood-mainnet.json'

interface TokenSnapshot {
  symbol: string
  address: string
  holders: number
  totalSupplyRaw: string
  decimals: number
  directDexPairs: number
}

interface GrowthSnapshot {
  capturedAt: string
  network: string
  chainId: number
  tokens: TokenSnapshot[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') throw new Error(`Expected ${key} to be a string.`)
  return value
}

function nonnegativeInteger(value: string, key: string): number {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`Expected ${key} to be a nonnegative integer.`)
  return parsed
}

export function parseBlockscoutToken(value: unknown): Pick<TokenSnapshot, 'holders' | 'totalSupplyRaw' | 'decimals'> {
  if (!isRecord(value)) throw new Error('Blockscout returned an invalid token response.')

  return {
    holders: nonnegativeInteger(requiredString(value, 'holders_count'), 'holders_count'),
    totalSupplyRaw: requiredString(value, 'total_supply'),
    decimals: nonnegativeInteger(requiredString(value, 'decimals'), 'decimals'),
  }
}

export function parseDexPairCount(value: unknown): number {
  if (!isRecord(value)) throw new Error('DexScreener returned an invalid token response.')
  const pairs = value.pairs
  if (pairs === null) return 0
  if (!Array.isArray(pairs)) throw new Error('DexScreener returned an invalid pairs collection.')
  return pairs.length
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`)
  return response.json()
}

async function tokenSnapshot(symbol: string, address: string): Promise<TokenSnapshot> {
  const [blockscout, dexScreener] = await Promise.all([
    fetchJson(`${deployment.network.explorerUrl}/api/v2/tokens/${address}`),
    fetchJson(`https://api.dexscreener.com/latest/dex/tokens/${address}`),
  ])

  return {
    symbol,
    address,
    ...parseBlockscoutToken(blockscout),
    directDexPairs: parseDexPairCount(dexScreener),
  }
}

export async function captureGrowthSnapshot(): Promise<GrowthSnapshot> {
  const tokens = await Promise.all([
    tokenSnapshot(deployment.contracts.hai.symbol, deployment.contracts.hai.address),
    tokenSnapshot(deployment.contracts.hmeme.symbol, deployment.contracts.hmeme.address),
  ])

  return {
    capturedAt: new Date().toISOString(),
    network: deployment.network.name,
    chainId: deployment.network.chainId,
    tokens,
  }
}

if (import.meta.main) {
  const snapshot = await captureGrowthSnapshot()
  console.log(JSON.stringify(snapshot, null, 2))
}
