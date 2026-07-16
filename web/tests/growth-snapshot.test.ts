import { describe, expect, test } from 'bun:test'
import { parseBlockscoutToken, parseDexPairCount } from '../scripts/growth-snapshot'

describe('growth snapshot response parsing', () => {
  test('extracts holder and supply data from Blockscout', () => {
    expect(
      parseBlockscoutToken({
        holders_count: '12',
        total_supply: '182586228464392559',
        decimals: '18',
      }),
    ).toEqual({ holders: 12, totalSupplyRaw: '182586228464392559', decimals: 18 })
  })

  test('counts DexScreener pairs and treats a null collection as no market', () => {
    expect(parseDexPairCount({ pairs: null })).toBe(0)
    expect(parseDexPairCount({ pairs: [{ pairAddress: '0x1' }, { pairAddress: '0x2' }] })).toBe(2)
  })

  test('rejects malformed upstream payloads instead of publishing bad metrics', () => {
    expect(() => parseBlockscoutToken({ holders_count: 1, total_supply: '0', decimals: '18' })).toThrow()
    expect(() => parseDexPairCount({ pairs: 'none' })).toThrow()
  })
})
