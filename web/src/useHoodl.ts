import { useCallback, useEffect, useState } from 'react'
import { BaseError, formatUnits, getAddress } from 'viem'
import type { Abi, Address, Hash } from 'viem'
import { abis, addresses, chainIdHex, erc20Abi, explorerUrl, getInjectedProvider, publicClient, robinhoodChain, walletClient } from './contracts'
import { amountLabel, percentageLabel, shortAddress, tokenColor, tokenKind, usdRawLabel } from './model'
import type { IndexView, Row } from './model'

const SHARE_UNIT = 10n ** 18n

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

async function loadTokenRow(token: Address, unitsRaw: bigint): Promise<Row> {
  const [symbolResult, nameResult, decimalsResult] = await Promise.all([
    safeRead(() => publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'symbol' })),
    safeRead(() => publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'name' })),
    safeRead(() => publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' })),
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
  }
}

async function loadIndex(address: Address): Promise<IndexView> {
  const [name, symbol, creator, description, totalSupplyRaw, componentResult, feeResult, navRaw] = await Promise.all([
    publicClient.readContract({ address, abi: abis.index, functionName: 'name' }) as Promise<string>,
    publicClient.readContract({ address, abi: abis.index, functionName: 'symbol' }) as Promise<string>,
    publicClient.readContract({ address, abi: abis.index, functionName: 'creator' }) as Promise<Address>,
    publicClient.readContract({ address, abi: abis.index, functionName: 'description' }) as Promise<string>,
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

  return {
    id: address.toLowerCase(),
    address,
    name,
    symbol,
    tagline: description || 'A permissionless, in-kind redeemable index token.',
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

interface SendRequest {
  address: Address
  abi: Abi
  functionName: string
  args?: readonly unknown[]
  account: Address
}

export function useHoodl() {
  const [indexes, setIndexes] = useState<IndexView[]>([])
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
      const result = await loadIndexes()
      setIndexes(result.indexes)
      setBlockNumber(result.blockNumber)
      setLoadError(null)
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
    async (index: IndexView, grossShares: bigint) =>
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
          { address: index.address, abi: abis.index, functionName: 'mint', args: [grossShares, owner], account: owner },
          `Mint ${index.symbol}`,
        )
      }),
    [approveIfNeeded, finishAction, requireWallet, send],
  )

  const redeemInKind = useCallback(
    async (index: IndexView, shares: bigint) =>
      finishAction(async () => {
        const { account: owner } = await requireWallet()
        return send(
          { address: index.address, abi: abis.index, functionName: 'redeem', args: [shares, owner], account: owner },
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

  return {
    indexes,
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
  }
}
