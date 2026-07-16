import { describe, expect, test } from 'bun:test'
import { tokenKind } from '../src/model'

describe('token classification', () => {
  test('only labels known Robinhood Stock Tokens as stock tokens', () => {
    expect(tokenKind('NVDA')).toBe('Stock token')
    expect(tokenKind('tsla')).toBe('Stock token')
    expect(tokenKind('CASHCAT')).toBe('Memecoin')
    expect(tokenKind('USDG')).toBe('Stablecoin')
    expect(tokenKind('UNKNOWN')).toBe('Token')
  })
})
