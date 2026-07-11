import { useEffect, useMemo, useRef, useState } from 'react'
import { computeAll, num, usd, parsePositive } from './model'
import type { Screen, Tab } from './model'
import Nav from './components/Nav'
import Ticker from './components/Ticker'
import Landing from './components/Landing'
import Discover from './components/Discover'
import Detail from './components/Detail'
import Portfolio from './components/Portfolio'
import Footer from './components/Footer'
import Toast from './components/Toast'

const H_BAL = 3.42

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [screen, setScreen] = useState<Screen>('landing')
  const [selId, setSelId] = useState('hai')
  const [tab, setTab] = useState<Tab>('buy')
  const [usdgIn, setUsdgIn] = useState('100')
  const [mintShares, setMintShares] = useState('1')
  const [redeemShares, setRedeemShares] = useState('3')
  const [connected, setConnected] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const { list, byId } = useMemo(() => computeAll(), [])
  const sel = byId[selId] ?? list[0]
  const hai = byId['hai']

  const toast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastMsg(msg)
    toastTimer.current = setTimeout(() => setToastMsg(null), 2800)
  }

  const go = (scr: Screen) => {
    setScreen(scr)
    window.scrollTo(0, 0)
  }
  const openDetail = (id: string) => {
    setSelId(id)
    setTab('buy')
    go('detail')
  }
  const openTrade = (id: string, t: Tab) => {
    setSelId(id)
    setTab(t)
    go('detail')
  }

  // buy (zap) quote
  const uv = parsePositive(usdgIn)
  const buyRate = sel.nav * (1 + sel.fMint / 100)
  const buyShares = buyRate > 0 ? uv / buyRate : 0
  const buyFeeUsd = buyShares * sel.nav * (sel.fMint / 100)
  const buyRoute = sel.rows.map((r) => ({ sym: r.sym, color: r.color, amountLabel: num(r.units * buyShares) }))

  // in-kind mint quote
  const ms = parsePositive(mintShares)
  const mintBasket = sel.rows.map((r) => ({ sym: r.sym, color: r.color, amountLabel: num(r.units * ms), valueLabel: usd(r.units * ms * r.price) }))
  const mintNet = ms * (1 - sel.fMint / 100)

  // redeem quote
  const rs = parsePositive(redeemShares)
  const redeemNet = rs * (1 - sel.fRedeem / 100)
  const redeemBasket = sel.rows.map((r) => ({ sym: r.sym, color: r.color, amountLabel: num(r.units * redeemNet), valueLabel: usd(r.units * redeemNet * r.price) }))
  const redeemFeeShares = rs * (sel.fRedeem / 100)

  // portfolio
  const holdValue = H_BAL * hai.nav
  const lookthrough = hai.rows.map((r) => ({
    sym: r.sym,
    name: r.name,
    color: r.color,
    amountLabel: num(r.units * H_BAL),
    valueLabel: usd(r.units * H_BAL * r.price),
  }))

  return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--canvas)', color: 'var(--text)', fontFamily: 'Manrope,system-ui,sans-serif' }}>
      <Nav
        screen={screen}
        themeLabel={theme === 'dark' ? 'Dark' : 'Light'}
        connectLabel={connected ? '0x9a…f4c2' : 'Connect'}
        onLogo={() => go('landing')}
        onDiscover={() => go('discover')}
        onPortfolio={() => go('portfolio')}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onConnect={() => {
          const now = !connected
          setConnected(now)
          toast(now ? 'Wallet connected (demo)' : 'Wallet disconnected')
        }}
      />
      <Ticker />

      {screen === 'landing' && <Landing buyNow={() => openTrade('hai', 'buy')} exploreNow={() => go('discover')} />}
      {screen === 'discover' && <Discover indexes={list} openDetail={openDetail} />}
      {screen === 'detail' && (
        <Detail
          sel={sel}
          goDiscover={() => go('discover')}
          tab={tab}
          setTab={setTab}
          usdgIn={usdgIn}
          onUsdgIn={setUsdgIn}
          buySharesLabel={num(buyShares)}
          buyRoute={buyRoute}
          buyFeeLabel={sel.fMintLabel + ' · ' + usd(buyFeeUsd)}
          buyMaxLabel={usd(uv)}
          onBuy={() => toast('Simulated zap · bought ' + num(buyShares) + ' ' + sel.symbol)}
          mintShares={mintShares}
          onMintShares={setMintShares}
          mintBasket={mintBasket}
          mintNetLabel={num(mintNet)}
          onMint={() => toast('Simulated in-kind mint · ' + num(mintNet) + ' ' + sel.symbol)}
          redeemShares={redeemShares}
          onRedeemShares={setRedeemShares}
          redeemBasket={redeemBasket}
          redeemFeeLabel={sel.fRedeemLabel + ' · ' + num(redeemFeeShares) + ' ' + sel.symbol}
          onRedeem={() => toast('Simulated redeem · basket returned for ' + num(rs) + ' ' + sel.symbol)}
          onMoney={() => toast('Composable ERC-20 — transfer, LP, or post as collateral anywhere')}
        />
      )}
      {screen === 'portfolio' && (
        <Portfolio
          totalLabel={usd(holdValue)}
          haiChgLabel={hai.changeLabel}
          haiChgColor={hai.chgColor}
          hBalLabel={num(H_BAL)}
          haiNavLabel={hai.navLabel}
          holdValueLabel={usd(holdValue)}
          lookthrough={lookthrough}
          buyMore={() => openTrade('hai', 'buy')}
          redeemHold={() => openTrade('hai', 'redeem')}
          transferHold={() => toast('Transfer hAI — it’s a standard ERC-20')}
        />
      )}

      <Footer />
      {toastMsg && <Toast msg={toastMsg} />}
    </div>
  )
}
