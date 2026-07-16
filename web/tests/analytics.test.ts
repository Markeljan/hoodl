import { describe, expect, test } from 'bun:test'
import { analyticsProperties, failureReason, publicIndexIdentifier } from '../src/analytics'

const INDEX = '0x9f5e540829A647C6BFC02066888Ee6f9E43708FD'

describe('privacy-safe analytics helpers', () => {
  test('uses a stable shortened public index identifier', () => {
    const identifier = publicIndexIdentifier(INDEX)
    expect(identifier).toBe('contract:0x9f5e5408…3708fd')
    expect(identifier).not.toContain(INDEX.toLowerCase())
  })

  test('classifies actionable failure reasons without recording the raw message', () => {
    expect(failureReason(new Error('User rejected the request.'))).toBe('user_rejected')
    expect(failureReason(new Error('Clipboard unavailable.'))).toBe('clipboard_unavailable')
    expect(failureReason(new Error('No browser wallet was detected.'))).toBe('wallet_unavailable')
    expect(failureReason(new Error('Insufficient USDG balance.'))).toBe('funding_or_allowance')
    expect(failureReason(new Error('Refresh the executable quote before selling.'))).toBe('quote_unavailable')
    expect(failureReason(new Error('Transaction execution reverted.'))).toBe('reverted')
  })

  test('includes funnel context and success without wallet data or raw errors', () => {
    const properties = analyticsProperties(
      { actionKind: 'buy_with_usdg', index: { address: INDEX, symbol: 'hAI' }, screen: 'detail', tab: 'buy' },
      { error: new Error('User rejected transaction from 0x1111111111111111111111111111111111111111'), failureStage: 'execution', success: false, transactionSuccess: false },
    )

    expect(properties).toEqual({
      action_kind: 'buy_with_usdg',
      action_success: false,
      failure_reason: 'user_rejected',
      failure_stage: 'execution',
      index_id: 'contract:0x9f5e5408…3708fd',
      index_symbol: 'hAI',
      screen: 'detail',
      tab: 'buy',
      transaction_success: false,
    })
    expect(JSON.stringify(properties)).not.toContain('0x1111111111111111111111111111111111111111')
  })
})
