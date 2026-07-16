import type { Screen, Tab } from './model'

export type ProtocolActionKind =
  | 'buy_with_usdg'
  | 'create_index'
  | 'mint_in_kind'
  | 'quote_zap_redeem'
  | 'redeem_in_kind'
  | 'renounce_contract_ownership'
  | 'sell_to_usdg'
  | 'set_lens_config'
  | 'set_protocol_fees'
  | 'set_sequencer_guard'
  | 'set_treasury'
  | 'set_zap_pool'
  | 'transfer_contract_ownership'
  | 'transfer_creator_role'
  | 'transfer_index'
  | 'update_metadata'

export type WalletActionKind = 'connect' | 'disconnect' | 'switch_network'

export type AnalyticsActionKind = ProtocolActionKind | WalletActionKind | 'copy_index_link'

export type FailureStage = 'clipboard' | 'execution' | 'input' | 'quote' | 'wallet'

export type FailureReason =
  | 'clipboard_unavailable'
  | 'funding_or_allowance'
  | 'invalid_input'
  | 'network'
  | 'quote_unavailable'
  | 'reverted'
  | 'unknown'
  | 'user_rejected'
  | 'wallet_unavailable'

export interface AnalyticsIndex {
  address?: string
  symbol: string
}

export interface AnalyticsContext {
  actionKind: AnalyticsActionKind
  index?: AnalyticsIndex
  screen: Screen
  tab?: Tab
}

export interface AnalyticsOutcome {
  error?: unknown
  failureStage?: FailureStage
  success: boolean
  transactionSuccess?: boolean | null
}

type AnalyticsProperties = Record<string, boolean | null | number | string>

export function publicIndexIdentifier(address?: string): string | null {
  if (!address) return null
  const normalized = address.toLowerCase()
  if (normalized.length <= 18) return `contract:${normalized}`
  return `contract:${normalized.slice(0, 10)}…${normalized.slice(-6)}`
}

export function failureReason(error: unknown): FailureReason {
  const message = (error instanceof Error ? error.message : typeof error === 'string' ? error : '').toLowerCase()

  if (message.includes('reject') || message.includes('denied') || message.includes('cancelled') || message.includes('canceled')) return 'user_rejected'
  if (message.includes('clipboard')) return 'clipboard_unavailable'
  if (message.includes('no browser wallet') || message.includes('wallet was detected') || message.includes('install') && message.includes('wallet')) return 'wallet_unavailable'
  if (message.includes('chain') || message.includes('network')) return 'network'
  if (message.includes('insufficient') || message.includes('balance') || message.includes('allowance') || message.includes('funds')) return 'funding_or_allowance'
  if (message.includes('quote') || message.includes('nav')) return 'quote_unavailable'
  if (
    message.includes('valid') ||
    message.includes('amount') ||
    message.includes('address') ||
    message.includes('recipient') ||
    message.includes('greater than zero')
  ) return 'invalid_input'
  if (message.includes('revert') || message.includes('execution')) return 'reverted'
  return 'unknown'
}

export function analyticsProperties(context: AnalyticsContext, outcome: AnalyticsOutcome): AnalyticsProperties {
  return {
    action_kind: context.actionKind,
    action_success: outcome.success,
    failure_reason: outcome.success ? 'none' : failureReason(outcome.error),
    failure_stage: outcome.success ? 'none' : outcome.failureStage ?? 'execution',
    index_id: publicIndexIdentifier(context.index?.address),
    index_symbol: context.index?.symbol ?? null,
    screen: context.screen,
    tab: context.tab ?? null,
    transaction_success: outcome.transactionSuccess ?? null,
  }
}
