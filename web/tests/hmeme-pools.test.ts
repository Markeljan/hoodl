import { describe, expect, test } from 'bun:test'
import { encodeAbiParameters, getAddress, keccak256, parseAbiParameters } from 'viem'
import launch from '../../deployments/robinhood-meme-index.json'

describe('hMEME periphery routes', () => {
  test('covers every component exactly once with a token/USDG pool', () => {
    const componentTokens = launch.components.map((component) => getAddress(component.token)).sort()
    const routeTokens = launch.periphery.routes.map((route) => getAddress(route.token)).sort()

    expect(routeTokens).toEqual(componentTokens)
    expect(new Set(routeTokens).size).toBe(routeTokens.length)
    for (const route of launch.periphery.routes) {
      const quote = getAddress(launch.periphery.quoteToken)
      const currency0 = getAddress(route.poolKey.currency0)
      const currency1 = getAddress(route.poolKey.currency1)
      const token = getAddress(route.token)
      expect((currency0 === token && currency1 === quote) || (currency0 === quote && currency1 === token)).toBe(true)
      expect(route.poolKey.hooks).toBe('0x0000000000000000000000000000000000000000')
    }
  })

  test('records the exact initialized Uniswap v4 pool IDs', () => {
    for (const route of launch.periphery.routes) {
      const poolId = keccak256(
        encodeAbiParameters(parseAbiParameters('address,address,uint24,int24,address'), [
          getAddress(route.poolKey.currency0),
          getAddress(route.poolKey.currency1),
          route.poolKey.fee,
          route.poolKey.tickSpacing,
          getAddress(route.poolKey.hooks),
        ]),
      )
      expect(poolId).toBe(route.poolId)
    }
  })
})
