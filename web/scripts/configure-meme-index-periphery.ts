import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeAbiParameters,
  getAddress,
  http,
  isAddressEqual,
  isHex,
  keccak256,
  parseAbi,
  parseAbiParameters,
  size,
  zeroAddress,
} from 'viem'
import type { Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import launch from '../../deployments/robinhood-meme-index.json'
import deployment from '../../deployments/robinhood-mainnet.json'

const lensAbi = parseAbi([
  'struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }',
  'struct PriceConfig { uint8 source; address feed; uint256 maxStaleness; PoolKey poolKey; bool tokenIsCurrency0; }',
  'function owner() view returns (address)',
  'function configOf(address token) view returns (PriceConfig)',
  'function setConfig(address token, PriceConfig cfg)',
  'function navPerShare(address index) view returns (uint256)',
])

const zapAbi = parseAbi([
  'struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }',
  'function owner() view returns (address)',
  'function hasPool(address token) view returns (bool)',
  'function poolOf(address token) view returns (PoolKey)',
  'function setPool(address token, PoolKey key)',
])

const stateViewAbi = parseAbi([
  'function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
])

const quoterAbi = parseAbi([
  'struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }',
  'struct QuoteExactSingleParams { PoolKey poolKey; bool zeroForOne; uint128 exactAmount; bytes hookData; }',
  'function quoteExactInputSingle(QuoteExactSingleParams params) returns (uint256 amountOut, uint256 gasEstimate)',
  'function quoteExactOutputSingle(QuoteExactSingleParams params) returns (uint256 amountIn, uint256 gasEstimate)',
])

function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const privateKey = process.env.DEPLOYER_PRIVATE_KEY
if (!privateKey || !isHex(privateKey) || size(privateKey) !== 32) {
  throw new Error('DEPLOYER_PRIVATE_KEY must be a 32-byte hex value in the root .env')
}

const account = privateKeyToAccount(privateKey)
const expectedOwner = getAddress(launch.index.creator)
invariant(account.address === expectedOwner, 'DEPLOYER_PRIVATE_KEY is not the project deployer')

const chain = defineChain({
  id: deployment.network.chainId,
  name: deployment.network.name,
  nativeCurrency: deployment.network.nativeCurrency,
  rpcUrls: { default: { http: [deployment.network.rpcUrl] } },
})
const publicClient = createPublicClient({ chain, transport: http(deployment.network.rpcUrl) })
const walletClient = createWalletClient({ account, chain, transport: http(deployment.network.rpcUrl) })
const lens = getAddress(launch.periphery.lens)
const zap = getAddress(launch.periphery.zap)
const stateView = getAddress(launch.periphery.stateView)
const quoter = getAddress(launch.periphery.quoter)
const quoteToken = getAddress(launch.periphery.quoteToken)
const index = getAddress(launch.index.address)

const [lensOwner, zapOwner] = await Promise.all([
  publicClient.readContract({ address: lens, abi: lensAbi, functionName: 'owner' }),
  publicClient.readContract({ address: zap, abi: zapAbi, functionName: 'owner' }),
])
invariant(isAddressEqual(lensOwner, account.address), 'Project deployer does not own IndexLens')
invariant(isAddressEqual(zapOwner, account.address), 'Project deployer does not own IndexZap')

function poolFor(route: (typeof launch.periphery.routes)[number]) {
  return {
    currency0: getAddress(route.poolKey.currency0),
    currency1: getAddress(route.poolKey.currency1),
    fee: route.poolKey.fee,
    tickSpacing: route.poolKey.tickSpacing,
    hooks: getAddress(route.poolKey.hooks),
  }
}

interface PoolLike {
  currency0: Address
  currency1: Address
  fee: number
  tickSpacing: number
  hooks: Address
}

function poolMatches(left: PoolLike, right: PoolLike): boolean {
  return (
    isAddressEqual(left.currency0, right.currency0) &&
    isAddressEqual(left.currency1, right.currency1) &&
    left.fee === right.fee &&
    left.tickSpacing === right.tickSpacing &&
    isAddressEqual(left.hooks, right.hooks)
  )
}

const componentUnits = new Map(launch.components.map((component) => [component.token.toLowerCase(), BigInt(component.rawUnitsPerShare)]))
const broadcast = process.env.BROADCAST === 'true'
const transactions: Array<{ symbol: string; target: 'lens' | 'zap'; hash: string; blockNumber: string }> = []
const routeResults: Array<{
  symbol: string
  poolId: string
  lens: string
  zap: string
  buyOneShareUsdgRaw: string
  sellOneShareUsdgRaw: string
}> = []

for (const route of launch.periphery.routes) {
  const token = getAddress(route.token)
  const pool = poolFor(route)
  const poolId = keccak256(
    encodeAbiParameters(parseAbiParameters('address,address,uint24,int24,address'), [
      pool.currency0,
      pool.currency1,
      pool.fee,
      pool.tickSpacing,
      pool.hooks,
    ]),
  )
  invariant(poolId === route.poolId, `${route.symbol} PoolKey does not hash to the recorded poolId`)
  invariant(
    (isAddressEqual(pool.currency0, token) && isAddressEqual(pool.currency1, quoteToken)) ||
      (isAddressEqual(pool.currency0, quoteToken) && isAddressEqual(pool.currency1, token)),
    `${route.symbol} pool is not token/USDG`,
  )

  const units = componentUnits.get(token.toLowerCase())
  invariant(units != null, `${route.symbol} is absent from the hMEME basket`)
  const [slot0, currentLens, hasZapPool] = await Promise.all([
    publicClient.readContract({ address: stateView, abi: stateViewAbi, functionName: 'getSlot0', args: [poolId] }),
    publicClient.readContract({ address: lens, abi: lensAbi, functionName: 'configOf', args: [token] }),
    publicClient.readContract({ address: zap, abi: zapAbi, functionName: 'hasPool', args: [token] }),
  ])
  invariant(slot0[0] > 0n, `${route.symbol} v4 pool is not initialized`)
  const currentZap = hasZapPool
    ? await publicClient.readContract({ address: zap, abi: zapAbi, functionName: 'poolOf', args: [token] })
    : null
  const lensReady =
    currentLens.source === 2 &&
    isAddressEqual(currentLens.feed, zeroAddress) &&
    currentLens.maxStaleness === 0n &&
    currentLens.tokenIsCurrency0 === route.tokenIsCurrency0 &&
    poolMatches(currentLens.poolKey, pool)
  const zapReady = currentZap != null && poolMatches(currentZap, pool)

  const [buyQuote, sellQuote] = await Promise.all([
    publicClient.simulateContract({
      address: quoter,
      abi: quoterAbi,
      functionName: 'quoteExactOutputSingle',
      args: [
        {
          poolKey: pool,
          zeroForOne: isAddressEqual(pool.currency0, quoteToken),
          exactAmount: units,
          hookData: '0x',
        },
      ],
      account: zap,
    }),
    publicClient.simulateContract({
      address: quoter,
      abi: quoterAbi,
      functionName: 'quoteExactInputSingle',
      args: [
        {
          poolKey: pool,
          zeroForOne: isAddressEqual(pool.currency0, token),
          exactAmount: units,
          hookData: '0x',
        },
      ],
      account: zap,
    }),
  ])

  let lensStatus = lensReady ? 'already-configured' : 'simulated'
  if (!lensReady) {
    const simulation = await publicClient.simulateContract({
      address: lens,
      abi: lensAbi,
      functionName: 'setConfig',
      args: [
        token,
        {
          source: 2,
          feed: zeroAddress,
          maxStaleness: 0n,
          poolKey: pool,
          tokenIsCurrency0: route.tokenIsCurrency0,
        },
      ],
      account,
    })
    if (broadcast) {
      const hash = await walletClient.writeContract(simulation.request)
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      invariant(receipt.status === 'success', `${route.symbol} Lens configuration reverted`)
      transactions.push({ symbol: route.symbol, target: 'lens', hash, blockNumber: receipt.blockNumber.toString() })
      lensStatus = 'configured'
    }
  }

  let zapStatus = zapReady ? 'already-configured' : 'simulated'
  if (!zapReady) {
    const simulation = await publicClient.simulateContract({
      address: zap,
      abi: zapAbi,
      functionName: 'setPool',
      args: [token, pool],
      account,
    })
    if (broadcast) {
      const hash = await walletClient.writeContract(simulation.request)
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      invariant(receipt.status === 'success', `${route.symbol} Zap configuration reverted`)
      transactions.push({ symbol: route.symbol, target: 'zap', hash, blockNumber: receipt.blockNumber.toString() })
      zapStatus = 'configured'
    }
  }

  routeResults.push({
    symbol: route.symbol,
    poolId,
    lens: lensStatus,
    zap: zapStatus,
    buyOneShareUsdgRaw: buyQuote.result[0].toString(),
    sellOneShareUsdgRaw: sellQuote.result[0].toString(),
  })
}

const allConfigured = broadcast || routeResults.every((route) => route.lens === 'already-configured' && route.zap === 'already-configured')
const navPerShare = allConfigured
  ? await publicClient.readContract({ address: lens, abi: lensAbi, functionName: 'navPerShare', args: [index] })
  : null

console.log(
  JSON.stringify(
    {
      status: broadcast ? 'configured' : transactions.length === 0 && allConfigured ? 'already-configured' : 'simulated',
      index,
      routes: routeResults,
      navPerShareUsdgRaw: navPerShare?.toString() ?? null,
      transactions,
    },
    null,
    2,
  ),
)
