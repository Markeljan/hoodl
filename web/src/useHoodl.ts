import { useCallback, useEffect, useState } from 'react'
import { BaseError, formatUnits, getAddress, zeroAddress } from 'viem'
import type { Abi, Address, Hash } from 'viem'
import {
  abis,
  addresses,
  chainIdHex,
  deploymentBlock,
  erc20Abi,
  explorerUrl,
  factoryAppAbi,
  getInjectedProvider,
  indexAppAbi,
  lensAppAbi,
  publicClient,
  quoterAppAbi,
  robinhoodChain,
  walletClient,
  zapAppAbi,
} from './contracts'
import { amountLabel, percentageLabel, shortAddress, tokenColor, tokenKind, usdRawLabel } from './model'
import type { ActivityItem, IndexView, LensSource, PoolView, Row } from './model'

const SHARE_UNIT = 10n ** 18n
const MAX_UINT128 = (1n << 128n) - 1n

function errorMessage(error: unknown): string {
  if (error instanceof BaseError) return error.shortMessage
  if (error instanceof Error) return error.message
  return 'The wallet request failed.'
}

async function safeRead<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read()
  } catch {
    return null
  }
}

function poolView(pool: { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address }): PoolView {
  return {
    currency0: getAddress(pool.currency0),
    currency1: getAddress(pool.currency1),
    fee: pool.fee,
    tickSpacing: pool.tickSpacing,
    hooks: getAddress(pool.hooks),
  }
}

type ComponentCapability = Pick<Row, 'lensSource' | 'lensSourceLabel' | 'lensFeed' | 'maxStaleness' | 'lensPool' | 'zapRouted' | 'zapPool'>

async function loadComponentCapability(token: Address): Promise<ComponentCapability> {
  if (token.toLowerCase() === addresses.usdg.toLowerCase()) {
    return {
      lensSource: 'USDG',
      lensSourceLabel: 'USDG cash leg · 1:1',
      lensFeed: null,
      maxStaleness: null,
      lensPool: null,
      zapRouted: true,
      zapPool: null,
    }
  }

  const [config, zapRouted] = await Promise.all([
    safeRead(() => publicClient.readContract({ address: addresses.lens, abi: lensAppAbi, functionName: 'configOf', args: [token] })),
    safeRead(() => publicClient.readContract({ address: addresses.zap, abi: zapAppAbi, functionName: 'hasPool', args: [token] })),
  ])
  const zapPool = zapRouted
    ? await safeRead(() => publicClient.readContract({ address: addresses.zap, abi: zapAppAbi, functionName: 'poolOf', args: [token] }))
    : null
  const source: LensSource = config?.source === 1 ? 'CHAINLINK' : config?.source === 2 ? 'POOL_USDG' : 'NONE'

  return {
    lensSource: source,
    lensSourceLabel:
      source === 'CHAINLINK'
        ? `Chainlink · max ${config?.maxStaleness.toString() ?? '—'}s stale`
        : source === 'POOL_USDG'
          ? 'Uniswap v4 USDG pool · spot'
          : 'No NAV source',
    lensFeed: source === 'CHAINLINK' && config && config.feed !== zeroAddress ? getAddress(config.feed) : null,
    maxStaleness: source === 'CHAINLINK' ? (config?.maxStaleness ?? null) : null,
    lensPool: source === 'POOL_USDG' && config ? poolView(config.poolKey) : null,
    zapRouted: zapRouted ?? false,
    zapPool: zapPool ? poolView(zapPool) : null,
  }
}

async function loadTokenRow(token: Address, unitsRaw: bigint): Promise<Row> {
  const [symbolResult, nameResult, decimalsResult, capability] = await Promise.all([
    safeRead(() => publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'symbol' })),
    safeRead(() => publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'name' })),
    safeRead(() => publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' })),
    loadComponentCapability(token),
  ])
  const sym = symbolResult ?? shortAddress(token)
  const name = nameResult ?? sym
  const decimals = decimalsResult ?? 18
  const wholeToken = 10n ** BigInt(decimals)
  const [priceRaw, valueRaw] = await Promise.all([
    safeRead(() =>
      publicClient.readContract({ address: addresses.lens, abi: abis.lens, functionName: 'valueOf', args: [token, wholeToken] }) as Promise<bigint>,
    ),
    safeRead(() =>
      publicClient.readContract({ address: addresses.lens, abi: abis.lens, functionName: 'valueOf', args: [token, unitsRaw] }) as Promise<bigint>,
    ),
  ])
  return {
    key: token.toLowerCase(),
    token,
    sym,
    name,
    kind: tokenKind(sym),
    color: tokenColor(sym),
    decimals,
    unitsRaw,
    unitsLabel: amountLabel(unitsRaw, decimals),
    priceRaw,
    priceLabel: usdRawLabel(priceRaw),
    valueRaw,
    valueLabel: usdRawLabel(valueRaw),
    weight: 0,
    weightLabel: '—',
    barWidth: '0%',
    ...capability,
  }
}

async function loadIndex(address: Address): Promise<IndexView> {
  const [name, symbol, creator, description, imageURI, tokenURI, contractURI, totalSupplyRaw, componentResult, feeResult, navRaw] = await Promise.all([
    publicClient.readContract({ address, abi: abis.index, functionName: 'name' }) as Promise<string>,
    publicClient.readContract({ address, abi: abis.index, functionName: 'symbol' }) as Promise<string>,
    publicClient.readContract({ address, abi: abis.index, functionName: 'creator' }) as Promise<Address>,
    publicClient.readContract({ address, abi: abis.index, functionName: 'description' }) as Promise<string>,
    safeRead(() => publicClient.readContract({ address, abi: indexAppAbi, functionName: 'imageURI' })),
    safeRead(() => publicClient.readContract({ address, abi: indexAppAbi, functionName: 'tokenURI' })),
    safeRead(() => publicClient.readContract({ address, abi: indexAppAbi, functionName: 'contractURI' })),
    publicClient.readContract({ address, abi: abis.index, functionName: 'totalSupply' }) as Promise<bigint>,
    publicClient.readContract({ address, abi: abis.index, functionName: 'components' }) as Promise<readonly [readonly Address[], readonly bigint[]]>,
    publicClient.readContract({ address, abi: abis.index, functionName: 'feeBps' }) as Promise<readonly [number, number, number, number]>,
    safeRead(() => publicClient.readContract({ address: addresses.lens, abi: abis.lens, functionName: 'navPerShare', args: [address] }) as Promise<bigint>),
  ])

  const [tokens, units] = componentResult
  const rows = await Promise.all(tokens.map((token, index) => loadTokenRow(getAddress(token), units[index])))
  const navNumber = navRaw == null ? null : Number(formatUnits(navRaw, 6))
  for (const row of rows) {
    row.weight = navRaw && row.valueRaw != null ? Number((row.valueRaw * 10_000n) / navRaw) / 100 : 0
    row.weightLabel = row.valueRaw == null || navRaw == null ? '—' : `${row.weight.toFixed(1)}%`
    row.barWidth = `${Math.max(0, Math.min(100, row.weight)).toFixed(2)}%`
  }
  const kinds = new Set(rows.map((row) => row.kind))
  const kindSummary = kinds.has('Stock token') && kinds.has('Memecoin') ? 'Stocks + Crypto' : [...kinds].join(' + ')
  const [protocolMintFeeBps, protocolRedeemFeeBps, creatorMintFeeBps, creatorRedeemFeeBps] = feeResult.map(Number)
  const totalMintFeeBps = protocolMintFeeBps + creatorMintFeeBps
  const totalRedeemFeeBps = protocolRedeemFeeBps + creatorRedeemFeeBps
  const canValue = navRaw != null && rows.every((row) => row.lensSource !== 'NONE')
  const canZap = rows.every((row) => row.zapRouted)

  return {
    id: address.toLowerCase(),
    address,
    name,
    symbol,
    tagline: description || 'A permissionless, in-kind redeemable index token.',
    description,
    imageURI: imageURI ?? '',
    tokenURI: tokenURI ?? '',
    contractURI: contractURI ?? '',
    flagship: address.toLowerCase() === addresses.hai.toLowerCase(),
    creator,
    creatorLabel: shortAddress(creator),
    color: '#ccff00',
    navRaw,
    nav: navNumber,
    navLabel: usdRawLabel(navRaw),
    totalSupplyRaw,
    supplyLabel: amountLabel(totalSupplyRaw, 18, 4),
    protocolMintFeeBps,
    protocolRedeemFeeBps,
    creatorMintFeeBps,
    creatorRedeemFeeBps,
    totalMintFeeBps,
    totalRedeemFeeBps,
    fMintLabel: percentageLabel(totalMintFeeBps),
    fRedeemLabel: percentageLabel(totalRedeemFeeBps),
    kindSummary,
    rows,
    unitsNote: `1 ${symbol} = ${rows.map((row) => `${row.unitsLabel} ${row.sym}`).join(' + ')}. Fixed forever.`,
    segments: rows.map((row) => ({ color: row.color, width: row.barWidth })),
    canValue,
    canZapMint: canZap,
    canZapRedeem: canZap,
    capabilitySummary: canValue && canZap ? 'NAV + USDG zap ready' : canValue ? 'NAV ready · in-kind only' : 'In-kind only · NAV unavailable',
  }
}

async function loadIndexes(): Promise<{ indexes: IndexView[]; blockNumber: bigint }> {
  const [count, blockNumber] = await Promise.all([
    publicClient.readContract({ address: addresses.factory, abi: abis.factory, functionName: 'indexesCount' }) as Promise<bigint>,
    publicClient.getBlockNumber(),
  ])
  const indexAddresses = await Promise.all(
    Array.from({ length: Number(count) }, (_, index) =>
      publicClient.readContract({ address: addresses.factory, abi: abis.factory, functionName: 'allIndexes', args: [BigInt(index)] }) as Promise<Address>,
    ),
  )
  return { indexes: await Promise.all(indexAddresses.map((address) => loadIndex(getAddress(address)))), blockNumber }
}

export interface ProtocolState {
  mintFeeBps: number
  redeemFeeBps: number
  treasury: Address
  factoryOwner: Address
  lensOwner: Address
  zapOwner: Address
  sequencerFeed: Address
  sequencerGracePeriod: bigint
}

export interface CreateIndexInput {
  name: string
  symbol: string
  tokens: Address[]
  units: bigint[]
  creatorMintFeeBps: number
  creatorRedeemFeeBps: number
  description: string
  imageURI: string
}

export interface PoolConfigInput {
  currency0: Address
  currency1: Address
  fee: number
  tickSpacing: number
  hooks: Address
}

export interface LensConfigInput {
  source: 1 | 2
  feed: Address
  maxStaleness: bigint
  poolKey: PoolConfigInput
  tokenIsCurrency0: boolean
}

export type ManagedContract = 'factory' | 'lens' | 'zap'

async function loadProtocolState(): Promise<ProtocolState> {
  const [mintFeeBps, redeemFeeBps, treasury, factoryOwner, lensOwner, zapOwner, sequencerFeed, sequencerGracePeriod] = await Promise.all([
    publicClient.readContract({ address: addresses.factory, abi: factoryAppAbi, functionName: 'mintFeeBps' }),
    publicClient.readContract({ address: addresses.factory, abi: factoryAppAbi, functionName: 'redeemFeeBps' }),
    publicClient.readContract({ address: addresses.factory, abi: factoryAppAbi, functionName: 'treasury' }),
    publicClient.readContract({ address: addresses.factory, abi: factoryAppAbi, functionName: 'owner' }),
    publicClient.readContract({ address: addresses.lens, abi: lensAppAbi, functionName: 'owner' }),
    publicClient.readContract({ address: addresses.zap, abi: zapAppAbi, functionName: 'owner' }),
    publicClient.readContract({ address: addresses.lens, abi: lensAppAbi, functionName: 'sequencerFeed' }),
    publicClient.readContract({ address: addresses.lens, abi: lensAppAbi, functionName: 'sequencerGracePeriod' }),
  ])
  return {
    mintFeeBps,
    redeemFeeBps,
    treasury: getAddress(treasury),
    factoryOwner: getAddress(factoryOwner),
    lensOwner: getAddress(lensOwner),
    zapOwner: getAddress(zapOwner),
    sequencerFeed: getAddress(sequencerFeed),
    sequencerGracePeriod,
  }
}

function indexSymbol(indexes: IndexView[], address: Address): string {
  return indexes.find((index) => index.address.toLowerCase() === address.toLowerCase())?.symbol ?? shortAddress(address)
}

async function loadActivities(indexes: IndexView[]): Promise<ActivityItem[]> {
  const indexAddresses = indexes.map((index) => index.address)
  const [created, zapMints, zapRedeems, mints, redeems, creatorChanges, metadataChanges] = await Promise.all([
    publicClient.getContractEvents({ address: addresses.factory, abi: factoryAppAbi, eventName: 'IndexCreated', fromBlock: deploymentBlock, strict: true }),
    publicClient.getContractEvents({ address: addresses.zap, abi: zapAppAbi, eventName: 'ZapMint', fromBlock: deploymentBlock, strict: true }),
    publicClient.getContractEvents({ address: addresses.zap, abi: zapAppAbi, eventName: 'ZapRedeem', fromBlock: deploymentBlock, strict: true }),
    indexAddresses.length === 0
      ? Promise.resolve([])
      : publicClient.getContractEvents({ address: indexAddresses, abi: indexAppAbi, eventName: 'Minted', fromBlock: deploymentBlock, strict: true }),
    indexAddresses.length === 0
      ? Promise.resolve([])
      : publicClient.getContractEvents({ address: indexAddresses, abi: indexAppAbi, eventName: 'Redeemed', fromBlock: deploymentBlock, strict: true }),
    indexAddresses.length === 0
      ? Promise.resolve([])
      : publicClient.getContractEvents({ address: indexAddresses, abi: indexAppAbi, eventName: 'CreatorSet', fromBlock: deploymentBlock, strict: true }),
    indexAddresses.length === 0
      ? Promise.resolve([])
      : publicClient.getContractEvents({ address: indexAddresses, abi: indexAppAbi, eventName: 'MetadataSet', fromBlock: deploymentBlock, strict: true }),
  ])
  const items: ActivityItem[] = []
  for (const log of created) {
    if (!log.transactionHash) continue
    const index = getAddress(log.args.index)
    items.push({
      id: `${log.transactionHash}-${log.logIndex}`,
      kind: 'created',
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      index,
      actor: getAddress(log.args.creator),
      title: `${log.args.symbol} created`,
      detail: `${log.args.name} · ${log.args.tokens.length} components`,
    })
  }
  for (const log of mints) {
    if (!log.transactionHash) continue
    const index = getAddress(log.address)
    items.push({
      id: `${log.transactionHash}-${log.logIndex}`,
      kind: 'minted',
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      index,
      actor: getAddress(log.args.minter),
      title: `${indexSymbol(indexes, index)} minted in-kind`,
      detail: `${amountLabel(log.args.grossShares, 18)} gross → ${amountLabel(log.args.sharesOut, 18)} shares`,
      sharesRaw: log.args.grossShares,
    })
  }
  for (const log of redeems) {
    if (!log.transactionHash) continue
    const index = getAddress(log.address)
    items.push({
      id: `${log.transactionHash}-${log.logIndex}`,
      kind: 'redeemed',
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      index,
      actor: getAddress(log.args.redeemer),
      title: `${indexSymbol(indexes, index)} redeemed in-kind`,
      detail: `${amountLabel(log.args.shares, 18)} shares · ${amountLabel(log.args.sharesBurned, 18)} burned`,
      sharesRaw: log.args.shares,
    })
  }
  for (const log of zapMints) {
    if (!log.transactionHash) continue
    const index = getAddress(log.args.index)
    items.push({
      id: `${log.transactionHash}-${log.logIndex}`,
      kind: 'zap-mint',
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      index,
      actor: getAddress(log.args.user),
      title: `${indexSymbol(indexes, index)} bought with USDG`,
      detail: `${amountLabel(log.args.usdgSpent, 6)} USDG → ${amountLabel(log.args.sharesOut, 18)} shares`,
      sharesRaw: log.args.sharesOut,
      usdgRaw: log.args.usdgSpent,
    })
  }
  for (const log of zapRedeems) {
    if (!log.transactionHash) continue
    const index = getAddress(log.args.index)
    items.push({
      id: `${log.transactionHash}-${log.logIndex}`,
      kind: 'zap-redeem',
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      index,
      actor: getAddress(log.args.user),
      title: `${indexSymbol(indexes, index)} sold for USDG`,
      detail: `${amountLabel(log.args.sharesIn, 18)} shares → ${amountLabel(log.args.usdgOut, 6)} USDG`,
      sharesRaw: log.args.sharesIn,
      usdgRaw: log.args.usdgOut,
    })
  }
  for (const log of creatorChanges) {
    if (!log.transactionHash) continue
    const index = getAddress(log.address)
    items.push({
      id: `${log.transactionHash}-${log.logIndex}`,
      kind: 'creator',
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      index,
      actor: getAddress(log.args.creator),
      title: `${indexSymbol(indexes, index)} creator changed`,
      detail: `Fee recipient → ${shortAddress(log.args.creator)}`,
    })
  }
  for (const log of metadataChanges) {
    if (!log.transactionHash) continue
    const index = getAddress(log.address)
    items.push({
      id: `${log.transactionHash}-${log.logIndex}`,
      kind: 'metadata',
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      index,
      actor: null,
      title: `${indexSymbol(indexes, index)} metadata updated`,
      detail: log.args.description || 'Description cleared',
    })
  }
  return items.sort((first, second) => (first.blockNumber === second.blockNumber ? second.id.localeCompare(first.id) : first.blockNumber > second.blockNumber ? -1 : 1))
}

interface SendRequest {
  address: Address
  abi: Abi
  functionName: string
  args?: readonly unknown[]
  account: Address
}

export function useHoodl() {
  const [indexes, setIndexes] = useState<IndexView[]>([])
  const [protocolState, setProtocolState] = useState<ProtocolState | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [activityError, setActivityError] = useState<string | null>(null)
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [account, setAccount] = useState<Address | null>(null)
  const [walletChainId, setWalletChainId] = useState<number | null>(null)
  const [balances, setBalances] = useState<Record<string, bigint>>({})
  const [usdgBalance, setUsdgBalance] = useState(0n)
  const [walletDataReady, setWalletDataReady] = useState(false)
  const [walletError, setWalletError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [lastTxHash, setLastTxHash] = useState<Hash | null>(null)

  const loadProtocol = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const [result, nextProtocolState] = await Promise.all([loadIndexes(), loadProtocolState()])
      setIndexes(result.indexes)
      setProtocolState(nextProtocolState)
      setBlockNumber(result.blockNumber)
      setLoadError(null)
      void loadActivities(result.indexes)
        .then((items) => {
          setActivity(items)
          setActivityError(null)
        })
        .catch((error) => setActivityError(errorMessage(error)))
      return result.indexes
    } catch (error) {
      setLoadError(errorMessage(error))
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const loadWalletBalances = useCallback(async (owner: Address, currentIndexes: IndexView[]) => {
    try {
      const [indexBalances, nextUsdgBalance] = await Promise.all([
        Promise.all(
          currentIndexes.map(async (index) => {
            const balance = await publicClient.readContract({ address: index.address, abi: erc20Abi, functionName: 'balanceOf', args: [owner] })
            return [index.id, balance] as const
          }),
        ),
        publicClient.readContract({ address: addresses.usdg, abi: erc20Abi, functionName: 'balanceOf', args: [owner] }),
      ])
      setBalances(Object.fromEntries(indexBalances))
      setUsdgBalance(nextUsdgBalance)
      setWalletDataReady(true)
      setWalletError(null)
    } catch (error) {
      setWalletDataReady(false)
      setWalletError(errorMessage(error))
      throw error
    }
  }, [])

  const refresh = useCallback(async () => {
    const currentIndexes = await loadProtocol(false)
    if (account) await loadWalletBalances(account, currentIndexes)
  }, [account, loadProtocol, loadWalletBalances])

  useEffect(() => {
    void loadProtocol(true).catch(() => undefined)
    const interval = window.setInterval(() => void loadProtocol(false).catch(() => undefined), 30_000)
    return () => window.clearInterval(interval)
  }, [loadProtocol])

  useEffect(() => {
    if (account && indexes.length > 0) void loadWalletBalances(account, indexes).catch(() => undefined)
    else {
      setBalances({})
      setUsdgBalance(0n)
      setWalletDataReady(false)
      setWalletError(null)
    }
  }, [account, indexes, loadWalletBalances])

  useEffect(() => {
    const provider = getInjectedProvider()
    if (!provider) return

    const syncAccounts = (value: unknown) => {
      const values = Array.isArray(value) ? value : []
      setAccount(typeof values[0] === 'string' ? getAddress(values[0]) : null)
    }
    const syncChain = (value: unknown) => {
      if (typeof value === 'string') setWalletChainId(Number.parseInt(value, 16))
    }

    void provider.request({ method: 'eth_accounts' }).then(syncAccounts).catch(() => undefined)
    void provider.request({ method: 'eth_chainId' }).then(syncChain).catch(() => undefined)
    provider.on?.('accountsChanged', syncAccounts)
    provider.on?.('chainChanged', syncChain)
    return () => {
      provider.removeListener?.('accountsChanged', syncAccounts)
      provider.removeListener?.('chainChanged', syncChain)
    }
  }, [])

  const switchNetwork = useCallback(async () => {
    const provider = getInjectedProvider()
    if (!provider) throw new Error('No browser wallet was detected. Install or open an EVM wallet, then try again.')
    try {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] })
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? Number(error.code) : 0
      if (code !== 4902) throw error
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: chainIdHex,
            chainName: robinhoodChain.name,
            nativeCurrency: robinhoodChain.nativeCurrency,
            rpcUrls: robinhoodChain.rpcUrls.default.http,
            blockExplorerUrls: [explorerUrl],
          },
        ],
      })
    }
    setWalletChainId(robinhoodChain.id)
    return provider
  }, [])

  const connect = useCallback(async () => {
    const provider = getInjectedProvider()
    if (!provider) throw new Error('No browser wallet was detected. Install or open an EVM wallet, then try again.')
    const requested = await provider.request({ method: 'eth_requestAccounts' })
    const values = Array.isArray(requested) ? requested : []
    if (typeof values[0] !== 'string') throw new Error('The wallet did not return an account.')
    const nextAccount = getAddress(values[0])
    setAccount(nextAccount)
    const currentChain = Number.parseInt(String(await provider.request({ method: 'eth_chainId' })), 16)
    if (currentChain !== robinhoodChain.id) await switchNetwork()
    else setWalletChainId(currentChain)
    return nextAccount
  }, [switchNetwork])

  const disconnect = useCallback(async () => {
    const provider = getInjectedProvider()
    try {
      await provider?.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] })
    } catch {
      // Some injected wallets do not implement permission revocation; local disconnect still works.
    }
    setAccount(null)
    setBalances({})
    setUsdgBalance(0n)
    setWalletDataReady(false)
    setWalletError(null)
  }, [])

  const requireWallet = useCallback(async () => {
    const nextAccount = account ?? (await connect())
    const provider = getInjectedProvider()
    if (!provider) throw new Error('No browser wallet was detected.')
    const currentChain = Number.parseInt(String(await provider.request({ method: 'eth_chainId' })), 16)
    if (currentChain !== robinhoodChain.id) await switchNetwork()
    return { account: nextAccount, provider }
  }, [account, connect, switchNetwork])

  const send = useCallback(
    async (request: SendRequest, label: string): Promise<Hash> => {
      const provider = getInjectedProvider()
      if (!provider) throw new Error('No browser wallet was detected.')
      setPendingAction(`${label} · check your wallet`)
      const simulation = await publicClient.simulateContract(request)
      const hash = await walletClient(provider, request.account).writeContract(simulation.request)
      setLastTxHash(hash)
      setPendingAction(`${label} · confirming on-chain`)
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') throw new Error(`${label} reverted.`)
      return hash
    },
    [],
  )

  const approveIfNeeded = useCallback(
    async (token: Address, spender: Address, amount: bigint, owner: Address, label: string) => {
      const allowance = await publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'allowance', args: [owner, spender] })
      if (allowance >= amount) return
      await send({ address: token, abi: erc20Abi, functionName: 'approve', args: [spender, amount], account: owner }, `Approve ${label}`)
    },
    [send],
  )

  const finishAction = useCallback(
    async (action: () => Promise<Hash>) => {
      try {
        const hash = await action()
        setPendingAction(null)
        try {
          await refresh()
        } catch {
          // The transaction is already confirmed; a failed follow-up read must not report it as reverted.
        }
        return hash
      } catch (error) {
        setPendingAction(null)
        throw new Error(errorMessage(error))
      }
    },
    [refresh],
  )

  const buyWithUsdg = useCallback(
    async (index: IndexView, maxUsdgIn: bigint) =>
      finishAction(async () => {
        if (!index.navRaw || index.navRaw <= 0n) throw new Error('This index has no available NAV quote.')
        const { account: owner } = await requireWallet()
        const grossShares = (maxUsdgIn * SHARE_UNIT * 10_000n) / (index.navRaw * 10_300n)
        if (grossShares <= 0n) throw new Error('The USDG amount is too small.')
        await approveIfNeeded(addresses.usdg, addresses.zap, maxUsdgIn, owner, 'USDG')
        return send(
          { address: addresses.zap, abi: abis.zap, functionName: 'zapMint', args: [index.address, grossShares, maxUsdgIn], account: owner },
          `Buy ${index.symbol}`,
        )
      }),
    [approveIfNeeded, finishAction, requireWallet, send],
  )

  const mintInKind = useCallback(
    async (index: IndexView, grossShares: bigint, recipient?: Address) =>
      finishAction(async () => {
        const { account: owner } = await requireWallet()
        const preview = (await publicClient.readContract({
          address: index.address,
          abi: abis.index,
          functionName: 'previewMint',
          args: [grossShares],
        })) as readonly [readonly bigint[], bigint]
        for (let i = 0; i < index.rows.length; i += 1) {
          await approveIfNeeded(index.rows[i].token, index.address, preview[0][i], owner, index.rows[i].sym)
        }
        return send(
          { address: index.address, abi: abis.index, functionName: 'mint', args: [grossShares, recipient ?? owner], account: owner },
          `Mint ${index.symbol}`,
        )
      }),
    [approveIfNeeded, finishAction, requireWallet, send],
  )

  const redeemInKind = useCallback(
    async (index: IndexView, shares: bigint, recipient?: Address) =>
      finishAction(async () => {
        const { account: owner } = await requireWallet()
        return send(
          { address: index.address, abi: abis.index, functionName: 'redeem', args: [shares, recipient ?? owner], account: owner },
          `Redeem ${index.symbol}`,
        )
      }),
    [finishAction, requireWallet, send],
  )

  const transferIndex = useCallback(
    async (index: IndexView, recipient: Address, amount: bigint) =>
      finishAction(async () => {
        const { account: owner } = await requireWallet()
        return send(
          { address: index.address, abi: erc20Abi, functionName: 'transfer', args: [recipient, amount], account: owner },
          `Transfer ${index.symbol}`,
        )
      }),
    [finishAction, requireWallet, send],
  )

  const createIndex = useCallback(
    async (input: CreateIndexInput) =>
      finishAction(async () => {
        const { account: owner } = await requireWallet()
        return send(
          {
            address: addresses.factory,
            abi: factoryAppAbi,
            functionName: 'createIndex',
            args: [input],
            account: owner,
          },
          `Create ${input.symbol}`,
        )
      }),
    [finishAction, requireWallet, send],
  )

  const quoteZapRedeem = useCallback(async (index: IndexView, shares: bigint): Promise<bigint> => {
    if (!index.canZapRedeem) throw new Error('One or more components do not have a configured USDG Zap route.')
    const amounts = await publicClient.readContract({ address: index.address, abi: indexAppAbi, functionName: 'previewRedeem', args: [shares] })
    let totalUsdg = 0n
    for (let position = 0; position < index.rows.length; position += 1) {
      const row = index.rows[position]
      const amount = amounts[position]
      if (amount === 0n) continue
      if (row.token.toLowerCase() === addresses.usdg.toLowerCase()) {
        totalUsdg += amount
        continue
      }
      if (!row.zapPool) throw new Error(`${row.sym} does not have a readable Zap pool.`)
      if (amount > MAX_UINT128) throw new Error(`${row.sym} amount exceeds the V4 quoter limit.`)
      const quote = await publicClient.simulateContract({
        address: addresses.quoter,
        abi: quoterAppAbi,
        functionName: 'quoteExactInputSingle',
        args: [
          {
            poolKey: row.zapPool,
            zeroForOne: row.zapPool.currency0.toLowerCase() === row.token.toLowerCase(),
            exactAmount: amount,
            hookData: '0x',
          },
        ],
        account: addresses.zap,
      })
      totalUsdg += quote.result[0]
    }
    return totalUsdg
  }, [])

  const redeemToUsdg = useCallback(
    async (index: IndexView, shares: bigint, minUsdgOut: bigint) =>
      finishAction(async () => {
        const { account: owner } = await requireWallet()
        await approveIfNeeded(index.address, addresses.zap, shares, owner, index.symbol)
        return send(
          {
            address: addresses.zap,
            abi: zapAppAbi,
            functionName: 'zapRedeem',
            args: [index.address, shares, minUsdgOut],
            account: owner,
          },
          `Sell ${index.symbol}`,
        )
      }),
    [approveIfNeeded, finishAction, requireWallet, send],
  )

  const updateMetadata = useCallback(
    async (index: IndexView, description: string, imageURI: string) =>
      finishAction(async () => {
        const { account: owner } = await requireWallet()
        return send(
          { address: index.address, abi: indexAppAbi, functionName: 'setMetadata', args: [description, imageURI], account: owner },
          `Update ${index.symbol} metadata`,
        )
      }),
    [finishAction, requireWallet, send],
  )

  const updateCreator = useCallback(
    async (index: IndexView, nextCreator: Address) =>
      finishAction(async () => {
        const { account: owner } = await requireWallet()
        return send(
          { address: index.address, abi: indexAppAbi, functionName: 'setCreator', args: [nextCreator], account: owner },
          `Transfer ${index.symbol} creator role`,
        )
      }),
    [finishAction, requireWallet, send],
  )

  const setProtocolFees = useCallback(
    async (mintBps: number, redeemBps: number) =>
      finishAction(async () => {
        const { account: owner } = await requireWallet()
        return send(
          { address: addresses.factory, abi: factoryAppAbi, functionName: 'setProtocolFees', args: [mintBps, redeemBps], account: owner },
          'Set future protocol fees',
        )
      }),
    [finishAction, requireWallet, send],
  )

  const setTreasury = useCallback(
    async (treasury: Address) =>
      finishAction(async () => {
        const { account: owner } = await requireWallet()
        return send(
          { address: addresses.factory, abi: factoryAppAbi, functionName: 'setTreasury', args: [treasury], account: owner },
          'Set protocol treasury',
        )
      }),
    [finishAction, requireWallet, send],
  )

  const setLensConfig = useCallback(
    async (token: Address, config: LensConfigInput) =>
      finishAction(async () => {
        const { account: owner } = await requireWallet()
        return send(
          { address: addresses.lens, abi: lensAppAbi, functionName: 'setConfig', args: [token, config], account: owner },
          'Set Lens price source',
        )
      }),
    [finishAction, requireWallet, send],
  )

  const setSequencer = useCallback(
    async (feed: Address, gracePeriod: bigint) =>
      finishAction(async () => {
        const { account: owner } = await requireWallet()
        return send(
          { address: addresses.lens, abi: lensAppAbi, functionName: 'setSequencer', args: [feed, gracePeriod], account: owner },
          'Set Lens sequencer guard',
        )
      }),
    [finishAction, requireWallet, send],
  )

  const setZapPool = useCallback(
    async (token: Address, pool: PoolConfigInput) =>
      finishAction(async () => {
        const { account: owner } = await requireWallet()
        return send(
          { address: addresses.zap, abi: zapAppAbi, functionName: 'setPool', args: [token, pool], account: owner },
          'Set Zap route',
        )
      }),
    [finishAction, requireWallet, send],
  )

  const transferContractOwnership = useCallback(
    async (contract: ManagedContract, nextOwner: Address) =>
      finishAction(async () => {
        const { account: owner } = await requireWallet()
        if (contract === 'factory') {
          return send(
            { address: addresses.factory, abi: factoryAppAbi, functionName: 'transferOwnership', args: [nextOwner], account: owner },
            'Transfer Factory ownership',
          )
        }
        if (contract === 'lens') {
          return send(
            { address: addresses.lens, abi: lensAppAbi, functionName: 'transferOwnership', args: [nextOwner], account: owner },
            'Transfer Lens ownership',
          )
        }
        return send(
          { address: addresses.zap, abi: zapAppAbi, functionName: 'transferOwnership', args: [nextOwner], account: owner },
          'Transfer Zap ownership',
        )
      }),
    [finishAction, requireWallet, send],
  )

  const renounceContractOwnership = useCallback(
    async (contract: ManagedContract) =>
      finishAction(async () => {
        const { account: owner } = await requireWallet()
        if (contract === 'factory') {
          return send({ address: addresses.factory, abi: factoryAppAbi, functionName: 'renounceOwnership', account: owner }, 'Renounce Factory ownership')
        }
        if (contract === 'lens') {
          return send({ address: addresses.lens, abi: lensAppAbi, functionName: 'renounceOwnership', account: owner }, 'Renounce Lens ownership')
        }
        return send({ address: addresses.zap, abi: zapAppAbi, functionName: 'renounceOwnership', account: owner }, 'Renounce Zap ownership')
      }),
    [finishAction, requireWallet, send],
  )

  return {
    indexes,
    protocolState,
    activity,
    activityError,
    blockNumber,
    loading,
    loadError,
    account,
    walletChainId,
    wrongNetwork: account != null && walletChainId !== robinhoodChain.id,
    balances,
    usdgBalance,
    walletDataReady,
    walletError,
    pendingAction,
    lastTxHash,
    connect,
    disconnect,
    switchNetwork,
    refresh,
    buyWithUsdg,
    mintInKind,
    redeemInKind,
    transferIndex,
    createIndex,
    quoteZapRedeem,
    redeemToUsdg,
    updateMetadata,
    updateCreator,
    setProtocolFees,
    setTreasury,
    setLensConfig,
    setSequencer,
    setZapPool,
    transferContractOwnership,
    renounceContractOwnership,
  }
}
