import { describe, expect, test } from 'bun:test'
import { decodeMetadataURI } from '../src/metadata'

const metadata = {
  name: 'HOODL AI Index',
  symbol: 'hAI',
  description: 'A permissionless on-chain index.',
  image: 'https://hoodl.finance/tokens/hai.png',
}

describe('on-chain metadata URI decoder', () => {
  test('decodes the contract base64 JSON document', () => {
    const uri = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`
    const result = decodeMetadataURI(uri)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document).toEqual({ ...metadata, json: JSON.stringify(metadata, null, 2) })
  })

  test('decodes URL-encoded JSON data URIs', () => {
    const uri = `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`
    const result = decodeMetadataURI(uri)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document.symbol).toBe('hAI')
  })

  test('returns a readable error for unsupported or malformed values', () => {
    expect(decodeMetadataURI('ipfs://metadata').ok).toBe(false)
    expect(decodeMetadataURI('data:application/json;base64,not-json').ok).toBe(false)
  })
})
