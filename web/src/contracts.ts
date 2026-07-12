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
