import { describe, expect, test } from 'bun:test'

const root = new URL('../', import.meta.url)

async function read(path: string): Promise<string> {
  return Bun.file(new URL(path, root)).text()
}

function capture(source: string, pattern: RegExp, label: string): string {
  const match = source.match(pattern)
  if (!match) throw new Error(`Missing ${label}`)
  return match[1]
}

async function pngDimensions(path: string): Promise<{ width: number; height: number }> {
  const file = Bun.file(new URL(path, root))
  const bytes = new Uint8Array(await file.arrayBuffer())
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

describe('site discovery metadata', () => {
  test('publishes canonical, Open Graph, Twitter, and structured metadata', async () => {
    const html = await read('index.html')

    expect(html).toContain('<link rel="canonical" href="https://hoodl.finance/" />')
    expect(html).toContain('<meta property="og:type" content="website" />')
    expect(html).toContain('<meta property="og:image" content="https://hoodl.finance/og-image.png" />')
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />')
    expect(html).toContain('<meta name="twitter:image" content="https://hoodl.finance/og-image.png" />')

    const structuredData = capture(html, /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/, 'JSON-LD')
    expect(() => JSON.parse(structuredData)).not.toThrow()
  })

  test('publishes crawl and install manifests with the production URL', async () => {
    const [robots, sitemap, manifest] = await Promise.all([read('public/robots.txt'), read('public/sitemap.xml'), read('public/site.webmanifest')])

    expect(robots).toContain('Sitemap: https://hoodl.finance/sitemap.xml')
    expect(sitemap).toContain('<loc>https://hoodl.finance/</loc>')
    expect(() => JSON.parse(manifest)).not.toThrow()
    expect(manifest).toContain('"theme_color": "#ccff00"')
  })

  test('uses a correctly sized PNG social card', async () => {
    const image = Bun.file(new URL('public/og-image.png', root))

    expect(await image.exists()).toBe(true)
    expect(image.type).toBe('image/png')
    expect(await pngDimensions('public/og-image.png')).toEqual({ width: 1200, height: 630 })
  })
})
