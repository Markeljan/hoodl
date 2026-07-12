import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [transferTo, setTransferTo] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
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

  const runAction = async (action: () => Promise<`0x${string}`>, success: string) => {
    try {
      const hash = await action()
      toast(`${success} · ${shortAddress(hash, 10, 6)}`)
    } catch (error) {
      toast(messageOf(error))
    }
  }

  const go = (nextScreen: Screen) => {
    setScreen(nextScreen)
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

  const haiBalance = hai ? (hoodl.balances[hai.id] ?? 0n) : 0n
  const holdingValueRaw = hai?.navRaw ? mulDivFloor(haiBalance, hai.navRaw, SHARE_UNIT) : null
  const lookthrough =
    hai?.rows.map((row) => ({
      sym: row.sym,
      name: row.name,
      color: row.color,
      amountLabel: amountLabel(mulDivFloor(row.unitsRaw, haiBalance, SHARE_UNIT), row.decimals),
      valueLabel: usdRawLabel(row.valueRaw == null ? null : mulDivFloor(row.valueRaw, haiBalance, SHARE_UNIT)),
    })) ?? []

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
        toast('Switched to Robinhood Chain.')
      } else if (hoodl.account) {
        await hoodl.disconnect()
        toast('Wallet disconnected.')
      } else {
        const account = await hoodl.connect()
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

  return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--canvas)', color: 'var(--text)', fontFamily: 'Manrope,system-ui,sans-serif' }}>
      <Nav
        screen={screen}
        themeLabel={theme === 'dark' ? 'Dark' : 'Light'}
        connectLabel={connectLabel}
        networkState={hoodl.wrongNetwork ? 'wrong' : hoodl.account ? 'ready' : 'disconnected'}
        onLogo={() => go('landing')}
        onDiscover={() => go('discover')}
        onPortfolio={() => go('portfolio')}
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
      {screen === 'detail' && sel && (
        <Detail
          sel={sel}
          goDiscover={() => go('discover')}
          tab={tab}
          setTab={setTab}
          blockNumber={hoodl.blockNumber}
          explorerUrl={`${explorerUrl}/address/${sel.address}`}
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
          onMint={() => {
            try {
              const raw = parseAmount(mintShares, 18)
              void runAction(() => hoodl.mintInKind(sel, raw), `Minted ${sel.symbol}`)
            } catch (error) {
              toast(messageOf(error))
            }
          }}
          redeemShares={redeemShares}
          onRedeemShares={setRedeemShares}
          redeemBasket={redeemBasket}
          indexBalanceLabel={walletAmountLabel(hoodl.balances[sel.id] ?? 0n, 18)}
          redeemFeeLabel={`${sel.fRedeemLabel} · ${amountLabel(redeemGrossShares - redeemNetShares, 18)} ${sel.symbol}`}
          onRedeem={() => {
            try {
              const raw = parseAmount(redeemShares, 18)
              void runAction(() => hoodl.redeemInKind(sel, raw), `Redeemed ${sel.symbol}`)
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
          hai={hai}
          usdgBalanceLabel={walletAmountLabel(hoodl.usdgBalance, 6)}
          walletError={hoodl.walletError}
          hBalLabel={walletAmountLabel(haiBalance, 18)}
          totalLabel={hoodl.account && !hoodl.walletDataReady ? (hoodl.walletError ? 'Unavailable' : 'Loading…') : usdRawLabel(holdingValueRaw)}
          lookthrough={lookthrough}
          buyMore={() => hai && openTrade(hai.id, 'buy')}
          redeemHold={() => hai && openTrade(hai.id, 'redeem')}
          transferTo={transferTo}
          onTransferTo={setTransferTo}
          transferAmount={transferAmount}
          onTransferAmount={setTransferAmount}
          pendingAction={hoodl.pendingAction}
          lastTxUrl={lastTxUrl}
          onTransfer={() => {
            if (!hai) return
            try {
              const recipient = getAddress(transferTo.trim())
              const amount = parseAmount(transferAmount, 18)
              void runAction(() => hoodl.transferIndex(hai, recipient, amount), `Transferred ${hai.symbol}`)
            } catch (error) {
              toast(messageOf(error))
            }
          }}
        />
      )}

      <Footer />
      {toastMsg && <Toast msg={toastMsg} />}
    </div>
  )
}
