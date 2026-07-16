import type { Screen, Tab } from './model'

export type StaticScreen = Exclude<Screen, 'detail'>

export type AppRoute =
  | { screen: 'landing' }
  | { screen: 'discover' }
  | { screen: 'create' }
  | { screen: 'portfolio' }
  | { screen: 'creator' }
  | { screen: 'activity' }
  | { screen: 'safety' }
  | { screen: 'operator' }
  | { screen: 'detail'; indexId: string; tab: Tab }

interface LocationLike {
  pathname: string
  search: string
}

function tabFromSearch(search: string): Tab {
  const action = new URLSearchParams(search).get('action')
  if (action === 'mint' || action === 'redeem' || action === 'sell') return action
  return 'buy'
}

function decodeIndexId(segment: string): string {
  try {
    return decodeURIComponent(segment).toLowerCase()
  } catch {
    return segment.toLowerCase()
  }
}

export function routeForScreen(screen: StaticScreen): AppRoute {
  switch (screen) {
    case 'landing':
      return { screen: 'landing' }
    case 'discover':
      return { screen: 'discover' }
    case 'create':
      return { screen: 'create' }
    case 'portfolio':
      return { screen: 'portfolio' }
    case 'creator':
      return { screen: 'creator' }
    case 'activity':
      return { screen: 'activity' }
    case 'safety':
      return { screen: 'safety' }
    case 'operator':
      return { screen: 'operator' }
  }
}

export function hrefForScreen(screen: StaticScreen): string {
  switch (screen) {
    case 'landing':
      return '/'
    case 'discover':
      return '/indexes'
    case 'create':
      return '/create'
    case 'portfolio':
      return '/portfolio'
    case 'creator':
      return '/manage'
    case 'activity':
      return '/activity'
    case 'safety':
      return '/safety'
    case 'operator':
      return '/operator'
  }
}

export function hrefForIndex(indexId: string, tab: Tab = 'buy'): string {
  const pathname = `/indexes/${encodeURIComponent(indexId.toLowerCase())}`
  return tab === 'buy' ? pathname : `${pathname}?action=${tab}`
}

export function hrefForRoute(route: AppRoute): string {
  return route.screen === 'detail' ? hrefForIndex(route.indexId, route.tab) : hrefForScreen(route.screen)
}

export function routeFromLocation(location: LocationLike): AppRoute {
  const segments = location.pathname.split('/').filter(Boolean)
  if (segments.length === 0) return { screen: 'landing' }

  if (segments.length === 2 && segments[0] === 'indexes') {
    return { screen: 'detail', indexId: decodeIndexId(segments[1]), tab: tabFromSearch(location.search) }
  }

  if (segments.length !== 1) return { screen: 'landing' }

  switch (segments[0]) {
    case 'indexes':
      return { screen: 'discover' }
    case 'create':
      return { screen: 'create' }
    case 'portfolio':
      return { screen: 'portfolio' }
    case 'manage':
      return { screen: 'creator' }
    case 'activity':
      return { screen: 'activity' }
    case 'safety':
      return { screen: 'safety' }
    case 'operator':
      return { screen: 'operator' }
    default:
      return { screen: 'landing' }
  }
}
