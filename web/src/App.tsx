import { useEffect, useMemo, useRef, useState } from 'react'
import { track } from '@vercel/analytics/react'
import { getAddress } from 'viem'
import { addresses, explorerUrl } from './contracts'
import { amountLabel, mulDivCeil, mulDivFloor, netShares, parseAmount, parseAmountOrZero, shortAddress, usdRawLabel } from './model'
import type { Screen, Tab } from './model'
import { useHoodl } from './useHoodl'
import Nav from './components/Nav'
import Ticker from './components/Ticker'
import Landing from './components/Landing'
import Discover from './components/Discover'
import Detail from './components/Detail'
import Portfolio from './components/Portfolio'
import CreateIndex from './components/CreateIndex'
import Creator from './components/Creator'
import Activity from './components/Activity'
import Operator from './components/Operator'
import Footer from './components/Footer'
import Toast from './components/Toast'

const SHARE_UNIT = 10n ** 18n

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed.'
}

export default function App() {
  const hoodl = useHoodl()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [screen, setScreen] = useState<Screen>('landing')
  const [selId, setSelId] = useState(addresses.hai.toLowerCase())
  const [tab, setTab] = useState<Tab>('buy')
  const [usdgIn, setUsdgIn] = useState('35')
  const [mintShares, setMintShares] = useState('1')
  const [redeemShares, setRedeemShares] = useState('1')
  const [mintRecipient, setMintRecipient] = useState('')
  const [redeemRecipient, setRedeemRecipient] = useState('')
  const [sellShares, setSellShares] = useState('1')
  const [sellSlippage, setSellSlippage] = useState('1')
  const [sellQuote, setSellQuote] = useState<{ indexId: string; shares: bigint; amount: bigint } | null>(null)
  const [sellQuoting, setSellQuoting] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    if (hoodl.indexes.length > 0 && !hoodl.indexes.some((index) => index.id === selId)) {
      setSelId(hoodl.indexes[0].id)
    }
  }, [hoodl.indexes, selId])

  const sel = hoodl.indexes.find((index) => index.id === selId) ?? hoodl.indexes[0] ?? null
  const hai = hoodl.indexes.find((index) => index.address.toLowerCase() === addresses.hai.toLowerCase()) ?? null

  const toast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastMsg(msg)
    toastTimer.current = setTimeout(() => setToastMsg(null), 4200)
  }

  const runAction = async (action: () => Promise<`0x${string}`>, success: string, after?: () => void) => {
    try {
      const hash = await action()
      track('Protocol Action Completed')
      toast(`${success} · ${shortAddress(hash, 10, 6)}`)
      after?.()
    } catch (error) {
      track('Protocol Action Failed')
      toast(messageOf(error))
    }
  }

  const go = (nextScreen: Screen) => {
    setScreen(nextScreen)
    track('Screen Viewed', { screen: nextScreen })
    window.scrollTo(0, 0)
  }
  const openDetail = (id: string) => {
    setSelId(id)
    setTab('buy')
    go('detail')
  }
  const openTrade = (id: string, nextTab: Tab) => {
    setSelId(id)
    setTab(nextTab)
    go('detail')
  }

  useEffect(() => {
    setSellQuote(null)
  }, [selId, sellShares])

  const maxUsdgRaw = parseAmountOrZero(usdgIn, 6)
  const buyGrossShares = sel?.navRaw ? (maxUsdgRaw * SHARE_UNIT * 10_000n) / (sel.navRaw * 10_300n) : 0n
  const buyNetShares = sel ? netShares(buyGrossShares, sel.protocolMintFeeBps, sel.creatorMintFeeBps) : 0n
  const buyRoute =
    sel?.rows.map((row) => ({
      sym: row.sym,
      color: row.color,
      amountLabel: amountLabel(mulDivCeil(row.unitsRaw, buyGrossShares, SHARE_UNIT), row.decimals),
    })) ?? []
  const buyFeeValueRaw = sel?.navRaw ? mulDivFloor(buyGrossShares - buyNetShares, sel.navRaw, SHARE_UNIT) : 0n

  const mintGrossShares = parseAmountOrZero(mintShares, 18)
  const mintNetShares = sel ? netShares(mintGrossShares, sel.protocolMintFeeBps, sel.creatorMintFeeBps) : 0n
  const mintBasket =
    sel?.rows.map((row) => ({
      sym: row.sym,
      color: row.color,
      amountLabel: amountLabel(mulDivCeil(row.unitsRaw, mintGrossShares, SHARE_UNIT), row.decimals),
      valueLabel: usdRawLabel(row.valueRaw == null ? null : mulDivFloor(row.valueRaw, mintGrossShares, SHARE_UNIT)),
    })) ?? []

  const redeemGrossShares = parseAmountOrZero(redeemShares, 18)
  const redeemNetShares = sel ? netShares(redeemGrossShares, sel.protocolRedeemFeeBps, sel.creatorRedeemFeeBps) : 0n
  const redeemBasket =
    sel?.rows.map((row) => ({
      sym: row.sym,
      color: row.color,
      amountLabel: amountLabel(mulDivFloor(row.unitsRaw, redeemNetShares, SHARE_UNIT), row.decimals),
      valueLabel: usdRawLabel(row.valueRaw == null ? null : mulDivFloor(row.valueRaw, redeemNetShares, SHARE_UNIT)),
    })) ?? []

  const sellSlippageBps = Math.max(0, Math.min(10_000, Math.round((Number(sellSlippage) || 0) * 100)))
  const sellQuoteRaw = sel && sellQuote?.indexId === sel.id ? sellQuote.amount : null
  const sellMinRaw = sellQuoteRaw == null ? null : (sellQuoteRaw * BigInt(10_000 - sellSlippageBps)) / 10_000n

  const tickerItems = useMemo(() => {
    const seen = new Set<string>()
    const items: { sym: string; priceLabel: string; detail: string; color: string }[] = []
    for (const index of hoodl.indexes) {
      items.push({ sym: index.symbol, priceLabel: index.navLabel, detail: 'NAV', color: index.color })
      for (const row of index.rows) {
        if (seen.has(row.token.toLowerCase())) continue
        seen.add(row.token.toLowerCase())
        items.push({ sym: row.sym, priceLabel: row.priceLabel, detail: 'on-chain', color: row.color })
      }
    }
    return items
  }, [hoodl.indexes])

  const handleWallet = async () => {
    try {
      if (hoodl.wrongNetwork) {
        await hoodl.switchNetwork()
        track('Wallet Network Switched')
        toast('Switched to Robinhood Chain.')
      } else if (hoodl.account) {
        await hoodl.disconnect()
        track('Wallet Disconnected')
        toast('Wallet disconnected.')
      } else {
        const account = await hoodl.connect()
        track('Wallet Connected')
        toast(`Connected ${shortAddress(account)}.`)
      }
    } catch (error) {
      toast(messageOf(error))
    }
  }

  const lastTxUrl = hoodl.lastTxHash ? `${explorerUrl}/tx/${hoodl.lastTxHash}` : null
  const connectLabel = hoodl.wrongNetwork ? 'Switch network' : hoodl.account ? shortAddress(hoodl.account) : 'Connect wallet'
  const walletAmountLabel = (raw: bigint, decimals: number) =>
    hoodl.account && !hoodl.walletDataReady ? (hoodl.walletError ? 'Unavailable' : 'Loading…') : amountLabel(raw, decimals)
  const creatorIndexes = hoodl.indexes.filter((index) => hoodl.account && index.creator.toLowerCase() === hoodl.account.toLowerCase())
  const isOperator = Boolean(
    hoodl.account &&
      hoodl.protocolState &&
      [hoodl.protocolState.factoryOwner, hoodl.protocolState.lensOwner, hoodl.protocolState.zapOwner].some((owner) => owner.toLowerCase() === hoodl.account?.toLowerCase()),
  )

  return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--canvas)', color: 'var(--text)', fontFamily: 'Manrope,system-ui,sans-serif' }}>
      <Nav
        screen={screen}
        themeLabel={theme === 'dark' ? 'Dark' : 'Light'}
        connectLabel={connectLabel}
        networkState={hoodl.wrongNetwork ? 'wrong' : hoodl.account ? 'ready' : 'disconnected'}
        onLogo={() => go('landing')}
        onDiscover={() => go('discover')}
        onCreate={() => go('create')}
        onPortfolio={() => go('portfolio')}
        onCreator={() => go('creator')}
        onActivity={() => go('activity')}
        onOperator={() => go('operator')}
        showCreator={creatorIndexes.length > 0}
        showOperator={isOperator}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onConnect={() => void handleWallet()}
      />
      <Ticker items={tickerItems} blockNumber={hoodl.blockNumber} loading={hoodl.loading} />

      {screen === 'landing' && (
        <Landing
          hai={hai}
          loading={hoodl.loading}
          buyNow={() => (hai ? openTrade(hai.id, 'buy') : toast('The deployed index is still loading.'))}
          exploreNow={() => go('discover')}
        />
      )}
      {screen === 'discover' && (
        <Discover
          indexes={hoodl.indexes}
          loading={hoodl.loading}
          error={hoodl.loadError}
          retry={() => void hoodl.refresh().catch((error) => toast(messageOf(error)))}
          openDetail={openDetail}
        />
      )}
      {screen === 'create' && (
        <CreateIndex
          protocol={hoodl.protocolState}
          pendingAction={hoodl.pendingAction}
          onCreate={(input) => void runAction(() => hoodl.createIndex(input), `Created ${input.symbol}`, () => go('discover'))}
        />
      )}
      {screen === 'detail' && sel && (
        <Detail
          sel={sel}
          goDiscover={() => go('discover')}
          tab={tab}
          setTab={setTab}
          blockNumber={hoodl.blockNumber}
          explorerUrl={`${explorerUrl}/address/${sel.address}`}
          treasuryLabel={hoodl.protocolState ? shortAddress(hoodl.protocolState.treasury, 8, 6) : 'Loading…'}
          walletReady={hoodl.account != null && !hoodl.wrongNetwork}
          pendingAction={hoodl.pendingAction}
          lastTxUrl={lastTxUrl}
          usdgIn={usdgIn}
          onUsdgIn={setUsdgIn}
          usdgBalanceLabel={walletAmountLabel(hoodl.usdgBalance, 6)}
          buySharesLabel={amountLabel(buyNetShares, 18)}
          buyRoute={buyRoute}
          buyFeeLabel={`${sel.fMintLabel} · ${usdRawLabel(buyFeeValueRaw)}`}
          buyMaxLabel={usdRawLabel(maxUsdgRaw)}
          onBuy={() => {
            try {
              const raw = parseAmount(usdgIn, 6)
              void runAction(() => hoodl.buyWithUsdg(sel, raw), `Bought ${sel.symbol}`)
            } catch (error) {
              toast(messageOf(error))
            }
          }}
          mintShares={mintShares}
          onMintShares={setMintShares}
          mintBasket={mintBasket}
          mintNetLabel={amountLabel(mintNetShares, 18)}
          mintRecipient={mintRecipient}
          onMintRecipient={setMintRecipient}
          onMint={() => {
            try {
              const raw = parseAmount(mintShares, 18)
              const recipient = mintRecipient.trim() ? getAddress(mintRecipient.trim()) : undefined
              void runAction(() => hoodl.mintInKind(sel, raw, recipient), `Minted ${sel.symbol}`)
            } catch (error) {
              toast(messageOf(error))
            }
          }}
          redeemShares={redeemShares}
          onRedeemShares={setRedeemShares}
          redeemBasket={redeemBasket}
          indexBalanceLabel={walletAmountLabel(hoodl.balances[sel.id] ?? 0n, 18)}
          redeemFeeLabel={`${sel.fRedeemLabel} · ${amountLabel(redeemGrossShares - redeemNetShares, 18)} ${sel.symbol}`}
          redeemRecipient={redeemRecipient}
          onRedeemRecipient={setRedeemRecipient}
          onRedeem={() => {
            try {
              const raw = parseAmount(redeemShares, 18)
              const recipient = redeemRecipient.trim() ? getAddress(redeemRecipient.trim()) : undefined
              void runAction(() => hoodl.redeemInKind(sel, raw, recipient), `Redeemed ${sel.symbol}`)
            } catch (error) {
              toast(messageOf(error))
            }
          }}
          sellShares={sellShares}
          onSellShares={setSellShares}
          sellQuoteLabel={sellQuoteRaw == null ? '—' : amountLabel(sellQuoteRaw, 6)}
          sellMinLabel={sellMinRaw == null ? '—' : amountLabel(sellMinRaw, 6)}
          sellSlippage={sellSlippage}
          onSellSlippage={setSellSlippage}
          sellQuoting={sellQuoting}
          onSellQuote={() => {
            try {
              const shares = parseAmount(sellShares, 18)
              setSellQuoting(true)
              void hoodl
                .quoteZapRedeem(sel, shares)
                .then((amount) => {
                  setSellQuote({ indexId: sel.id, shares, amount })
                  toast('Executable V4 quote refreshed.')
                })
                .catch((error) => toast(messageOf(error)))
                .finally(() => setSellQuoting(false))
            } catch (error) {
              toast(messageOf(error))
            }
          }}
          onSell={() => {
            try {
              const shares = parseAmount(sellShares, 18)
              if (!sellQuote || sellQuote.indexId !== sel.id || sellQuote.shares !== shares || sellMinRaw == null) throw new Error('Refresh the executable quote before selling.')
              void runAction(() => hoodl.redeemToUsdg(sel, shares, sellMinRaw), `Sold ${sel.symbol}`)
            } catch (error) {
              toast(messageOf(error))
            }
          }}
        />
      )}
      {screen === 'portfolio' && (
        <Portfolio
          connected={hoodl.account != null}
          accountLabel={hoodl.account ? shortAddress(hoodl.account) : 'Not connected'}
          onConnect={() => void handleWallet()}
          indexes={hoodl.indexes}
          balances={hoodl.balances}
          usdgBalanceLabel={walletAmountLabel(hoodl.usdgBalance, 6)}
          walletError={hoodl.walletError}
          walletDataReady={hoodl.walletDataReady}
          onTrade={(index, nextTab) => openTrade(index.id, nextTab)}
          pendingAction={hoodl.pendingAction}
          lastTxUrl={lastTxUrl}
          onTransfer={(index, recipient, amount) => void runAction(() => hoodl.transferIndex(index, recipient, amount), `Transferred ${index.symbol}`)}
        />
      )}
      {screen === 'creator' && (
        <Creator
          account={hoodl.account}
          indexes={hoodl.indexes}
          balances={hoodl.balances}
          activity={hoodl.activity}
          pendingAction={hoodl.pendingAction}
          onConnect={() => void handleWallet()}
          onMetadata={(index, description, imageURI) => void runAction(() => hoodl.updateMetadata(index, description, imageURI), `Updated ${index.symbol}`)}
          onCreator={(index, creator) => void runAction(() => hoodl.updateCreator(index, creator), `Transferred ${index.symbol} creator role`, () => go('discover'))}
        />
      )}
      {screen === 'activity' && <Activity activity={hoodl.activity} error={hoodl.activityError} />}
      {screen === 'operator' && (
        <Operator
          account={hoodl.account}
          protocol={hoodl.protocolState}
          pendingAction={hoodl.pendingAction}
          onConnect={() => void handleWallet()}
          onFees={(mintBps, redeemBps) => void runAction(() => hoodl.setProtocolFees(mintBps, redeemBps), 'Updated future protocol fees')}
          onTreasury={(treasury) => void runAction(() => hoodl.setTreasury(treasury), 'Updated protocol treasury')}
          onLens={(token, config) => void runAction(() => hoodl.setLensConfig(token, config), 'Updated Lens source')}
          onSequencer={(feed, grace) => void runAction(() => hoodl.setSequencer(feed, grace), 'Updated sequencer guard')}
          onZap={(token, pool) => void runAction(() => hoodl.setZapPool(token, pool), 'Updated Zap route')}
          onTransferOwnership={(contract, owner) => void runAction(() => hoodl.transferContractOwnership(contract, owner), `Transferred ${contract} ownership`, () => go('landing'))}
          onRenounce={(contract) => void runAction(() => hoodl.renounceContractOwnership(contract), `Renounced ${contract} ownership`, () => go('landing'))}
        />
      )}

      <Footer />
      {toastMsg && <Toast msg={toastMsg} />}
    </div>
  )
}
