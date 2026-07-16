import { useEffect, useMemo, useRef, useState } from 'react'
import { track } from '@vercel/analytics/react'
import { getAddress } from 'viem'
import { analyticsProperties, publicIndexIdentifier } from './analytics'
import type { AnalyticsContext, FailureStage, ProtocolActionKind, WalletActionKind } from './analytics'
import { addresses, explorerUrl } from './contracts'
import { amountLabel, mulDivCeil, mulDivFloor, netShares, parseAmount, parseAmountOrZero, shortAddress, usdRawLabel } from './model'
import type { Tab } from './model'
import { hrefForIndex, routeForScreen } from './routes'
import type { StaticScreen } from './routes'
import { useHoodl } from './useHoodl'
import { useUrlRoute } from './useUrlRoute'
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
import Safety from './components/Safety'

const SHARE_UNIT = 10n ** 18n

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed.'
}

function copyTextFromUserGesture(value: string): boolean {
  const activeElement = document.activeElement
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, value.length)

  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
    if (activeElement instanceof HTMLElement) activeElement.focus()
  }
}

function titleForScreen(screen: StaticScreen): string {
  switch (screen) {
    case 'landing':
      return 'HOODL · Permissionless index tokens'
    case 'discover':
      return 'Discover indexes | HOODL'
    case 'create':
      return 'Create an index | HOODL'
    case 'portfolio':
      return 'Portfolio | HOODL'
    case 'creator':
      return 'Manage indexes | HOODL'
    case 'activity':
      return 'Protocol activity | HOODL'
    case 'safety':
      return 'Safety and eligibility | HOODL'
    case 'operator':
      return 'Operator console | HOODL'
  }
}

export default function App() {
  const hoodl = useHoodl()
  const { route, navigate } = useUrlRoute()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
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
  const screen = route.screen
  const selId = route.screen === 'detail' ? route.indexId : null
  const tab = route.screen === 'detail' ? route.tab : 'buy'
  const routeTab = route.screen === 'detail' ? route.tab : undefined

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const sel = selId == null ? null : (hoodl.indexes.find((index) => index.id === selId) ?? null)
  const selectedSymbol = sel?.symbol ?? null
  const hai = hoodl.indexes.find((index) => index.address.toLowerCase() === addresses.hai.toLowerCase()) ?? null

  useEffect(() => {
    track('Screen Viewed', {
      index_id: route.screen === 'detail' ? publicIndexIdentifier(selId ?? undefined) : null,
      index_symbol: selectedSymbol,
      screen,
      tab: routeTab ?? null,
    })
  }, [route.screen, routeTab, screen, selId, selectedSymbol])

  useEffect(() => {
    document.title = screen === 'detail' ? (sel ? `${sel.symbol} · ${sel.name} | HOODL` : 'Index | HOODL') : titleForScreen(screen)
  }, [screen, sel])

  const toast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastMsg(msg)
    toastTimer.current = setTimeout(() => setToastMsg(null), 4200)
  }

  const copyShareLink = () => {
    if (!sel) return
    const url = new URL(hrefForIndex(sel.id, tab), window.location.origin).toString()
    const context: AnalyticsContext = { actionKind: 'copy_index_link', index: sel, screen, tab }
    const copied = () => {
      track('Share Action', analyticsProperties(context, { success: true }))
      toast('Index link copied.')
    }
    const copyFailed = () => {
      track('Share Action', analyticsProperties(context, { error: 'Clipboard unavailable', failureStage: 'clipboard', success: false }))
      toast('Copy the URL from your address bar to share this index.')
    }

    if (copyTextFromUserGesture(url)) {
      copied()
      return
    }

    if (!navigator.clipboard) {
      copyFailed()
      return
    }

    void navigator.clipboard.writeText(url).then(copied).catch(copyFailed)
  }

  const trackProtocolFailure = (context: AnalyticsContext, failureStage: FailureStage, error: unknown) => {
    track('Protocol Action', analyticsProperties(context, { error, failureStage, success: false, transactionSuccess: failureStage === 'execution' ? false : null }))
  }

  const runAction = async (context: AnalyticsContext, action: () => Promise<`0x${string}`>, success: string, after?: () => void) => {
    try {
      const hash = await action()
      track('Protocol Action', analyticsProperties(context, { success: true, transactionSuccess: true }))
      toast(`${success} · ${shortAddress(hash, 10, 6)}`)
      after?.()
    } catch (error) {
      trackProtocolFailure(context, 'execution', error)
      toast(messageOf(error))
    }
  }

  const protocolContext = (actionKind: ProtocolActionKind, index?: { address?: string; symbol: string }): AnalyticsContext => ({
    actionKind,
    index,
    screen,
    tab: routeTab,
  })

  const go = (nextScreen: StaticScreen) => {
    navigate(routeForScreen(nextScreen))
    window.scrollTo(0, 0)
  }
  const openDetail = (id: string) => {
    navigate({ screen: 'detail', indexId: id, tab: 'buy' })
    window.scrollTo(0, 0)
  }
  const openTrade = (id: string, nextTab: Tab) => {
    navigate({ screen: 'detail', indexId: id, tab: nextTab })
    window.scrollTo(0, 0)
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
    const actionKind: WalletActionKind = hoodl.wrongNetwork ? 'switch_network' : hoodl.account ? 'disconnect' : 'connect'
    const context = { actionKind, index: sel ?? undefined, screen, tab: routeTab }
    try {
      if (hoodl.wrongNetwork) {
        await hoodl.switchNetwork()
        toast('Switched to Robinhood Chain.')
      } else if (hoodl.account) {
        await hoodl.disconnect()
        toast('Wallet disconnected.')
      } else {
        const account = await hoodl.connect()
        toast(`Connected ${shortAddress(account)}.`)
      }
      track('Wallet Action', analyticsProperties(context, { success: true }))
    } catch (error) {
      track('Wallet Action', analyticsProperties(context, { error, failureStage: 'wallet', success: false }))
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
      {screen === 'detail' && !sel && (
        <main className="page">
          <div style={{ maxWidth: 620, padding: 28, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18 }}>
            <h1 style={{ margin: 0, font: "700 30px 'Space Grotesk',sans-serif" }}>
              {hoodl.loading ? 'Opening index…' : hoodl.loadError ? 'Could not load this index' : 'Index not found'}
            </h1>
            <p style={{ margin: '10px 0 20px', color: 'var(--text-2)', lineHeight: 1.55 }}>
              {hoodl.loading
                ? 'Reading the factory registry and matching the contract address from this URL.'
                : hoodl.loadError ?? 'No registered index matches the contract address in this URL.'}
            </p>
            <button type="button" onClick={() => go('discover')} className="primary-button">Browse indexes</button>
          </div>
        </main>
      )}
      {screen === 'create' && (
        <CreateIndex
          protocol={hoodl.protocolState}
          pendingAction={hoodl.pendingAction}
          onCreate={(input) => void runAction(protocolContext('create_index', { symbol: input.symbol }), () => hoodl.createIndex(input), `Created ${input.symbol}`, () => go('discover'))}
        />
      )}
      {screen === 'detail' && sel && (
        <Detail
          sel={sel}
          goDiscover={() => go('discover')}
          tab={tab}
          setTab={(nextTab) => navigate({ screen: 'detail', indexId: sel.id, tab: nextTab })}
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
            const context = protocolContext('buy_with_usdg', sel)
            try {
              const raw = parseAmount(usdgIn, 6)
              void runAction(context, () => hoodl.buyWithUsdg(sel, raw), `Bought ${sel.symbol}`)
            } catch (error) {
              trackProtocolFailure(context, 'input', error)
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
            const context = protocolContext('mint_in_kind', sel)
            try {
              const raw = parseAmount(mintShares, 18)
              const recipient = mintRecipient.trim() ? getAddress(mintRecipient.trim()) : undefined
              void runAction(context, () => hoodl.mintInKind(sel, raw, recipient), `Minted ${sel.symbol}`)
            } catch (error) {
              trackProtocolFailure(context, 'input', error)
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
            const context = protocolContext('redeem_in_kind', sel)
            try {
              const raw = parseAmount(redeemShares, 18)
              const recipient = redeemRecipient.trim() ? getAddress(redeemRecipient.trim()) : undefined
              void runAction(context, () => hoodl.redeemInKind(sel, raw, recipient), `Redeemed ${sel.symbol}`)
            } catch (error) {
              trackProtocolFailure(context, 'input', error)
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
            const context = protocolContext('quote_zap_redeem', sel)
            try {
              const shares = parseAmount(sellShares, 18)
              setSellQuoting(true)
              void hoodl
                .quoteZapRedeem(sel, shares)
                .then((amount) => {
                  setSellQuote({ indexId: sel.id, shares, amount })
                  track('Protocol Action', analyticsProperties(context, { success: true }))
                  toast('Executable V4 quote refreshed.')
                })
                .catch((error) => {
                  track('Protocol Action', analyticsProperties(context, { error, failureStage: 'quote', success: false }))
                  toast(messageOf(error))
                })
                .finally(() => setSellQuoting(false))
            } catch (error) {
              track('Protocol Action', analyticsProperties(context, { error, failureStage: 'input', success: false }))
              toast(messageOf(error))
            }
          }}
          onSell={() => {
            const context = protocolContext('sell_to_usdg', sel)
            try {
              const shares = parseAmount(sellShares, 18)
              if (!sellQuote || sellQuote.indexId !== sel.id || sellQuote.shares !== shares || sellMinRaw == null) throw new Error('Refresh the executable quote before selling.')
              void runAction(context, () => hoodl.redeemToUsdg(sel, shares, sellMinRaw), `Sold ${sel.symbol}`)
            } catch (error) {
              trackProtocolFailure(context, 'input', error)
              toast(messageOf(error))
            }
          }}
          onShare={copyShareLink}
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
          onTransfer={(index, recipient, amount) => void runAction(protocolContext('transfer_index', index), () => hoodl.transferIndex(index, recipient, amount), `Transferred ${index.symbol}`)}
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
          onMetadata={(index, description, imageURI) => void runAction(protocolContext('update_metadata', index), () => hoodl.updateMetadata(index, description, imageURI), `Updated ${index.symbol}`)}
          onCreator={(index, creator) => void runAction(protocolContext('transfer_creator_role', index), () => hoodl.updateCreator(index, creator), `Transferred ${index.symbol} creator role`, () => go('discover'))}
        />
      )}
      {screen === 'activity' && <Activity activity={hoodl.activity} error={hoodl.activityError} />}
      {screen === 'safety' && <Safety />}
      {screen === 'operator' && (
        <Operator
          account={hoodl.account}
          protocol={hoodl.protocolState}
          pendingAction={hoodl.pendingAction}
          onConnect={() => void handleWallet()}
          onFees={(mintBps, redeemBps) => void runAction(protocolContext('set_protocol_fees'), () => hoodl.setProtocolFees(mintBps, redeemBps), 'Updated future protocol fees')}
          onTreasury={(treasury) => void runAction(protocolContext('set_treasury'), () => hoodl.setTreasury(treasury), 'Updated protocol treasury')}
          onLens={(token, config) => void runAction(protocolContext('set_lens_config'), () => hoodl.setLensConfig(token, config), 'Updated Lens source')}
          onSequencer={(feed, grace) => void runAction(protocolContext('set_sequencer_guard'), () => hoodl.setSequencer(feed, grace), 'Updated sequencer guard')}
          onZap={(token, pool) => void runAction(protocolContext('set_zap_pool'), () => hoodl.setZapPool(token, pool), 'Updated Zap route')}
          onTransferOwnership={(contract, owner) => void runAction(protocolContext('transfer_contract_ownership'), () => hoodl.transferContractOwnership(contract, owner), `Transferred ${contract} ownership`, () => go('landing'))}
          onRenounce={(contract) => void runAction(protocolContext('renounce_contract_ownership'), () => hoodl.renounceContractOwnership(contract), `Renounced ${contract} ownership`, () => go('landing'))}
        />
      )}

      <Footer />
      {toastMsg && <Toast msg={toastMsg} />}
    </div>
  )
}
