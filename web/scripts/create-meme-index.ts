import { createPublicClient, createWalletClient, defineChain, getAddress, http, isHex, parseAbi, size } from 'viem'
import type { Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import launch from '../../deployments/robinhood-meme-index.json'
import deployment from '../../deployments/robinhood-mainnet.json'

const factoryAbi = parseAbi([
  'struct IndexParams { string name; string symbol; address[] tokens; uint256[] units; uint16 creatorMintFeeBps; uint16 creatorRedeemFeeBps; string description; string imageURI; }',
  'function createIndex(IndexParams p) returns (address index)',
  'function indexesCount() view returns (uint256)',
  'function allIndexes(uint256 index) view returns (address)',
])

const indexAbi = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
])

const privateKey = process.env.DEPLOYER_PRIVATE_KEY
if (!privateKey || !isHex(privateKey) || size(privateKey) !== 32) {
  throw new Error('DEPLOYER_PRIVATE_KEY must be a 32-byte hex value in the root .env')
}

const account = privateKeyToAccount(privateKey)
const expectedCreator = getAddress(launch.index.creator)
if (account.address !== expectedCreator) throw new Error('DEPLOYER_PRIVATE_KEY is not the project deployer')

const chain = defineChain({
  id: deployment.network.chainId,
  name: deployment.network.name,
  nativeCurrency: deployment.network.nativeCurrency,
  rpcUrls: { default: { http: [deployment.network.rpcUrl] } },
})

const publicClient = createPublicClient({ chain, transport: http(deployment.network.rpcUrl) })
const walletClient = createWalletClient({ account, chain, transport: http(deployment.network.rpcUrl) })
const factory = getAddress(launch.index.factory)

async function findExistingIndex(): Promise<Address | null> {
  const count = await publicClient.readContract({ address: factory, abi: factoryAbi, functionName: 'indexesCount' })
  for (let position = 0n; position < count; position += 1n) {
    const candidate = getAddress(
      await publicClient.readContract({ address: factory, abi: factoryAbi, functionName: 'allIndexes', args: [position] }),
    )
    const [name, symbol] = await Promise.all([
      publicClient.readContract({ address: candidate, abi: indexAbi, functionName: 'name' }),
      publicClient.readContract({ address: candidate, abi: indexAbi, functionName: 'symbol' }),
    ])
    if (name === launch.index.name && symbol === launch.index.symbol) return candidate
  }
  return null
}

const existing = await findExistingIndex()
if (existing) {
  console.log(JSON.stringify({ status: 'already-created', index: existing }, null, 2))
  process.exit(0)
}

const params = {
  name: launch.index.name,
  symbol: launch.index.symbol,
  tokens: launch.components.map((component) => getAddress(component.token)),
  units: launch.components.map((component) => BigInt(component.rawUnitsPerShare)),
  creatorMintFeeBps: launch.feesBps.creatorMint,
  creatorRedeemFeeBps: launch.feesBps.creatorRedeem,
  description: launch.index.description,
  imageURI: launch.index.imageURI,
}

const simulation = await publicClient.simulateContract({
  address: factory,
  abi: factoryAbi,
  functionName: 'createIndex',
  args: [params],
  account,
})

if (process.env.BROADCAST !== 'true') {
  console.log(JSON.stringify({ status: 'simulated', index: simulation.result, creator: account.address }, null, 2))
  process.exit(0)
}

const hash = await walletClient.writeContract(simulation.request)
const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
if (receipt.status !== 'success') throw new Error(`Index creation reverted: ${hash}`)

const index = await findExistingIndex()
if (!index) throw new Error(`Transaction succeeded but hMEME is absent from the factory registry: ${hash}`)

console.log(
  JSON.stringify(
    {
      status: receipt.status,
      index,
      creator: account.address,
      transactionHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice.toString(),
    },
    null,
    2,
  ),
)
