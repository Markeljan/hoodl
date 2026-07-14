export interface MetadataDocument {
  name: string | null
  symbol: string | null
  description: string | null
  image: string | null
  json: string
}

export type DecodedMetadata =
  | { ok: true; document: MetadataDocument }
  | { ok: false; message: string }

function decodeBase64(value: string): string {
  const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function stringField(value: object, key: string): string | null {
  const entry = Object.entries(value).find(([entryKey]) => entryKey === key)
  return typeof entry?.[1] === 'string' ? entry[1] : null
}

export function decodeMetadataURI(uri: string): DecodedMetadata {
  const match = uri.match(/^data:application\/json(?:;charset=[^;,]+)?(;base64)?,(.*)$/s)
  if (!match) return { ok: false, message: 'This contract returned an unsupported metadata URI.' }

  try {
    const json = match[1] ? decodeBase64(match[2]) : decodeURIComponent(match[2])
    const parsed: unknown = JSON.parse(json)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false, message: 'The metadata URI does not contain a JSON object.' }
    }

    return {
      ok: true,
      document: {
        name: stringField(parsed, 'name'),
        symbol: stringField(parsed, 'symbol'),
        description: stringField(parsed, 'description'),
        image: stringField(parsed, 'image'),
        json: JSON.stringify(parsed, null, 2),
      },
    }
  } catch {
    return { ok: false, message: 'The on-chain metadata could not be decoded.' }
  }
}
