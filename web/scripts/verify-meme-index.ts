import { createPublicClient, defineChain, getAddress, http, isHex, parseAbi, size } from 'viem'
import launch from '../../deployments/robinhood-meme-index.json'
import deployment from '../../deployments/robinhood-mainnet.json'

const factoryAbi = parseAbi([
  'function indexesCount() view returns (uint256)',
  'function allIndexes(uint256 index) view returns (address)',
  'function isIndex(address index) view returns (bool)',
])

const indexAbi = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function creator() view returns (address)',
  'function description() view returns (string)',
  'function imageURI() view returns (string)',
  'function tokenURI() view returns (string)',
  'function contractURI() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function components() view returns (address[] tokens, uint256[] units)',
  'function feeBps() view returns (uint16,uint16,uint16,uint16)',
])

function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const chain = defineChain({
  id: deployment.network.chainId,
  name: deployment.network.name,
  nativeCurrency: deployment.network.nativeCurrency,
  rpcUrls: { default: { http: [deployment.network.rpcUrl] } },
})
const client = createPublicClient({ chain, transport: http(deployment.network.rpcUrl) })
const factory = getAddress(launch.index.factory)
const index = getAddress(launch.index.address)
const transactionHash = launch.verification.creationTransactionHash
invariant(isHex(transactionHash) && size(transactionHash) === 32, 'Invalid creation transaction hash')

const [
  name,
  symbol,
  creator,
  description,
  imageURI,
  tokenURI,
  contractURI,
  totalSupply,
  componentResult,
  feeResult,
  registryCount,
  registered,
  receipt,
  code,
] = await Promise.all([
  client.readContract({ address: index, abi: indexAbi, functionName: 'name' }),
  client.readContract({ address: index, abi: indexAbi, functionName: 'symbol' }),
  client.readContract({ address: index, abi: indexAbi, functionName: 'creator' }),
  client.readContract({ address: index, abi: indexAbi, functionName: 'description' }),
  client.readContract({ address: index, abi: indexAbi, functionName: 'imageURI' }),
  client.readContract({ address: index, abi: indexAbi, functionName: 'tokenURI' }),
  client.readContract({ address: index, abi: indexAbi, functionName: 'contractURI' }),
  client.readContract({ address: index, abi: indexAbi, functionName: 'totalSupply' }),
  client.readContract({ address: index, abi: indexAbi, functionName: 'components' }),
  client.readContract({ address: index, abi: indexAbi, functionName: 'feeBps' }),
  client.readContract({ address: factory, abi: factoryAbi, functionName: 'indexesCount' }),
  client.readContract({ address: factory, abi: factoryAbi, functionName: 'isIndex', args: [index] }),
  client.getTransactionReceipt({ hash: transactionHash }),
  client.getCode({ address: index }),
])

invariant(name === launch.index.name, 'Name mismatch')
invariant(symbol === launch.index.symbol, 'Symbol mismatch')
invariant(getAddress(creator) === getAddress(launch.index.creator), 'Creator mismatch')
invariant(description === launch.index.description, 'Description mismatch')
invariant(imageURI === launch.index.imageURI, 'Image URI mismatch')
invariant(tokenURI === contractURI, 'tokenURI and contractURI differ')
invariant(registered, 'Index is absent from the factory registry')
invariant(receipt.status === 'success', 'Creation transaction failed')
invariant(receipt.blockNumber === BigInt(launch.verification.blockNumber), 'Creation block mismatch')
invariant(code != null && code !== '0x', 'Index runtime bytecode is missing')
invariant(totalSupply === 0n, 'Unexpected pre-mint supply')

const [tokens, units] = componentResult
invariant(tokens.length === launch.components.length && units.length === launch.components.length, 'Component count mismatch')
for (let position = 0; position < launch.components.length; position += 1) {
  invariant(getAddress(tokens[position]) === getAddress(launch.components[position].token), `Token mismatch at ${position}`)
  invariant(units[position] === BigInt(launch.components[position].rawUnitsPerShare), `Unit mismatch at ${position}`)
}

const expectedFees = [
  launch.feesBps.protocolMint,
  launch.feesBps.protocolRedeem,
  launch.feesBps.creatorMint,
  launch.feesBps.creatorRedeem,
]
invariant(feeResult.every((fee, position) => fee === expectedFees[position]), 'Fee mismatch')

const prefix = 'data:application/json;base64,'
invariant(tokenURI.startsWith(prefix), 'tokenURI is not base64 JSON')
const metadataText = Buffer.from(tokenURI.slice(prefix.length), 'base64').toString('utf8')
const metadata: unknown = JSON.parse(metadataText)
const expectedMetadata = { name: launch.index.name, symbol: launch.index.symbol, description: launch.index.description, image: launch.index.imageURI }
invariant(JSON.stringify(metadata) === JSON.stringify(expectedMetadata), 'Decoded metadata mismatch')

const imageResponse = await fetch(imageURI)
invariant(imageResponse.status === 200, `Image returned HTTP ${imageResponse.status}`)
invariant(imageResponse.headers.get('content-type') === 'image/png', 'Image is not served as PNG')
const imageBytes = new Uint8Array(await imageResponse.arrayBuffer())
const imageView = new DataView(imageBytes.buffer, imageBytes.byteOffset, imageBytes.byteLength)
invariant(imageView.getUint32(16) === 1024 && imageView.getUint32(20) === 1024, 'Image is not 1024x1024')
const digest = await crypto.subtle.digest('SHA-256', imageBytes)
const imageSha256 = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')

const sourceResponse = await fetch(`${deployment.network.explorerApiUrl}?module=contract&action=getsourcecode&address=${index}`)
const sourceText = await sourceResponse.text()
invariant(sourceResponse.ok && sourceText.includes('"ContractName":"IndexToken"'), 'Blockscout source verification missing')

console.log(
  JSON.stringify(
    {
      status: 'verified',
      index,
      transactionHash,
      blockNumber: receipt.blockNumber.toString(),
      registryCount: registryCount.toString(),
      componentCount: tokens.length,
      feesBps: feeResult,
      metadata: expectedMetadata,
      image: { status: imageResponse.status, width: 1024, height: 1024, sha256: imageSha256 },
      sourceVerified: true,
      totalSupply: totalSupply.toString(),
    },
    null,
    2,
  ),
)
