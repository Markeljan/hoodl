import { createPublicClient, createWalletClient, custom, defineChain, getAddress, http, parseAbi } from 'viem'
import type { Abi, Address } from 'viem'
import deployment from '../../deployments/robinhood-mainnet.json'
import indexFactoryJson from '../../deployments/abis/IndexFactory.json'
import indexLensJson from '../../deployments/abis/IndexLens.json'
import indexTokenJson from '../../deployments/abis/IndexToken.json'
import indexZapJson from '../../deployments/abis/IndexZap.json'

export const robinhoodChain = defineChain({
  id: deployment.network.chainId,
  name: deployment.network.name,
  nativeCurrency: deployment.network.nativeCurrency,
  rpcUrls: {
    default: { http: [deployment.network.rpcUrl] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: deployment.network.explorerUrl },
  },
})

export const addresses = {
  factory: getAddress(deployment.contracts.indexFactory.address),
  lens: getAddress(deployment.contracts.indexLens.address),
  zap: getAddress(deployment.contracts.indexZap.address),
  hai: getAddress(deployment.contracts.hai.address),
  usdg: getAddress(deployment.tokens.usdg.address),
  quoter: getAddress(deployment.externalContracts.uniswapV4Quoter),
} as const

export const abis = {
  factory: indexFactoryJson as Abi,
  lens: indexLensJson as Abi,
  index: indexTokenJson as Abi,
  zap: indexZapJson as Abi,
} as const

export const erc20Abi = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
])

export const factoryAppAbi = parseAbi([
  'struct IndexParams { string name; string symbol; address[] tokens; uint256[] units; uint16 creatorMintFeeBps; uint16 creatorRedeemFeeBps; string description; string imageURI; }',
  'function createIndex(IndexParams p) returns (address index)',
  'function mintFeeBps() view returns (uint16)',
  'function redeemFeeBps() view returns (uint16)',
  'function treasury() view returns (address)',
  'function owner() view returns (address)',
  'function setProtocolFees(uint16 mintBps, uint16 redeemBps)',
  'function setTreasury(address treasury)',
  'function transferOwnership(address newOwner)',
  'function renounceOwnership()',
  'event IndexCreated(address indexed index, address indexed creator, string name, string symbol, address[] tokens, uint256[] units, uint16 protocolMintFeeBps, uint16 protocolRedeemFeeBps, uint16 creatorMintFeeBps, uint16 creatorRedeemFeeBps)',
])

export const indexAppAbi = parseAbi([
  'function imageURI() view returns (string)',
  'function tokenURI() view returns (string)',
  'function contractURI() view returns (string)',
  'function previewRedeem(uint256 shares) view returns (uint256[] amountsOut)',
  'function setCreator(address newCreator)',
  'function setMetadata(string description, string imageURI)',
  'event Minted(address indexed minter, address indexed to, uint256 grossShares, uint256 sharesOut)',
  'event Redeemed(address indexed redeemer, address indexed to, uint256 shares, uint256 sharesBurned)',
  'event CreatorSet(address indexed creator)',
  'event MetadataSet(string description, string imageURI)',
])

export const lensAppAbi = parseAbi([
  'struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }',
  'struct PriceConfig { uint8 source; address feed; uint256 maxStaleness; PoolKey poolKey; bool tokenIsCurrency0; }',
  'function configOf(address token) view returns (PriceConfig)',
  'function owner() view returns (address)',
  'function sequencerFeed() view returns (address)',
  'function sequencerGracePeriod() view returns (uint256)',
  'function setConfig(address token, PriceConfig cfg)',
  'function setSequencer(address feed, uint256 gracePeriod)',
  'function transferOwnership(address newOwner)',
  'function renounceOwnership()',
])

export const zapAppAbi = parseAbi([
  'struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }',
  'function hasPool(address token) view returns (bool)',
  'function poolOf(address token) view returns (PoolKey)',
  'function owner() view returns (address)',
  'function zapRedeem(address index, uint256 shares, uint256 minUsdgOut) returns (uint256 usdgOut)',
  'function setPool(address token, PoolKey key)',
  'function transferOwnership(address newOwner)',
  'function renounceOwnership()',
  'event ZapMint(address indexed user, address indexed index, uint256 usdgSpent, uint256 sharesOut)',
  'event ZapRedeem(address indexed user, address indexed index, uint256 sharesIn, uint256 usdgOut)',
])

export const quoterAppAbi = parseAbi([
  'struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }',
  'struct QuoteExactSingleParams { PoolKey poolKey; bool zeroForOne; uint128 exactAmount; bytes hookData; }',
  'function quoteExactInputSingle(QuoteExactSingleParams params) returns (uint256 amountOut, uint256 gasEstimate)',
])

export const publicClient = createPublicClient({
  chain: robinhoodChain,
  transport: http(deployment.network.rpcUrl),
})

type CustomProvider = Parameters<typeof custom>[0]

export interface InjectedProvider extends CustomProvider {
  on?: (event: string, listener: (value: unknown) => void) => void
  removeListener?: (event: string, listener: (value: unknown) => void) => void
}

declare global {
  interface Window {
    ethereum?: InjectedProvider
  }
}

export function getInjectedProvider(): InjectedProvider | null {
  return typeof window === 'undefined' ? null : (window.ethereum ?? null)
}

export function walletClient(provider: InjectedProvider, account: Address) {
  return createWalletClient({
    account,
    chain: robinhoodChain,
    transport: custom(provider),
  })
}

export const chainIdHex = `0x${robinhoodChain.id.toString(16)}`
export const explorerUrl = deployment.network.explorerUrl
export const deploymentBlock = BigInt(deployment.deployment.blockNumber)
