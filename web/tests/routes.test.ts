import { describe, expect, test } from 'bun:test'
import { hrefForIndex, hrefForRoute, hrefForScreen, routeFromLocation } from '../src/routes'

const INDEX = '0x9f5e540829A647C6BFC02066888Ee6f9E43708FD'
const NORMALIZED_INDEX = INDEX.toLowerCase()

describe('URL-backed app routes', () => {
  test('configures the host to serve client-side deep links', async () => {
    const config = await Bun.file(new URL('../vercel.json', import.meta.url)).json()
    expect(config).toEqual({ rewrites: [{ source: '/(.*)', destination: '/index.html' }] })
  })

  test('maps each shareable top-level screen to a stable path', () => {
    expect(hrefForScreen('landing')).toBe('/')
    expect(hrefForScreen('discover')).toBe('/indexes')
    expect(hrefForScreen('create')).toBe('/create')
    expect(hrefForScreen('portfolio')).toBe('/portfolio')
    expect(hrefForScreen('creator')).toBe('/manage')
    expect(hrefForScreen('activity')).toBe('/activity')
    expect(hrefForScreen('safety')).toBe('/safety')
    expect(hrefForScreen('operator')).toBe('/operator')
  })

  test('uses the immutable index address and only serializes non-default actions', () => {
    expect(hrefForIndex(INDEX)).toBe(`/indexes/${NORMALIZED_INDEX}`)
    expect(hrefForIndex(INDEX, 'mint')).toBe(`/indexes/${NORMALIZED_INDEX}?action=mint`)
    expect(hrefForRoute({ screen: 'detail', indexId: INDEX, tab: 'sell' })).toBe(`/indexes/${NORMALIZED_INDEX}?action=sell`)
  })

  test('restores index and trade action state from a copied URL', () => {
    expect(routeFromLocation({ pathname: `/indexes/${INDEX}`, search: '?action=redeem' })).toEqual({
      screen: 'detail',
      indexId: NORMALIZED_INDEX,
      tab: 'redeem',
    })
  })

  test('defaults invalid or absent actions to buy', () => {
    expect(routeFromLocation({ pathname: `/indexes/${INDEX}`, search: '?action=unknown' })).toEqual({
      screen: 'detail',
      indexId: NORMALIZED_INDEX,
      tab: 'buy',
    })
  })

  test('parses static routes and safely falls back for unknown paths', () => {
    expect(routeFromLocation({ pathname: '/indexes/', search: '' })).toEqual({ screen: 'discover' })
    expect(routeFromLocation({ pathname: '/activity', search: '' })).toEqual({ screen: 'activity' })
    expect(routeFromLocation({ pathname: '/safety', search: '' })).toEqual({ screen: 'safety' })
    expect(routeFromLocation({ pathname: '/not-a-page', search: '' })).toEqual({ screen: 'landing' })
  })
})
