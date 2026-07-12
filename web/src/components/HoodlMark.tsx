import type { CSSProperties } from 'react'

type Variant = 'tile' | 'outline' | 'glyph'

interface HoodlMarkProps {
  /** Rendered pixel size of the square mark. */
  size?: number
  /** Corner radius of the tile background (scales with size). Ignored for the glyph variant. */
  radius?: number
  /**
   * tile    — neon rounded tile with a robin-black glyph (primary lockup)
   * outline — neon-outlined tile with a neon glyph
   * glyph   — bare glyph, inherits `color`
   */
  variant?: Variant
  /** Glyph color for the `glyph` variant. Defaults to the neon accent. */
  color?: string
  style?: CSSProperties
  className?: string
  title?: string
}

/**
 * HOODL geometric "H" mark — two rounded uprights bridged by a bar on a 32×32 grid.
 * Mirrors the logo sheet: tile radius 7, bars 5 wide (radius 2) inset 7px.
 */
export default function HoodlMark({
  size = 34,
  radius = 9,
  variant = 'tile',
  color = 'var(--neon)',
  style,
  className,
  title,
}: HoodlMarkProps) {
  // Radius on the 32-unit viewBox so it visually matches the requested pixel radius.
  const vbRadius = (radius / size) * 32
  const glyphFill = variant === 'tile' ? 'var(--on-neon)' : variant === 'outline' ? 'var(--neon)' : color

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ display: 'block', ...style }}
      role="img"
      aria-label={title ?? 'HOODL'}
    >
      {title ? <title>{title}</title> : null}
      {variant === 'tile' ? <rect width="32" height="32" rx={vbRadius} fill="var(--neon)" /> : null}
      {variant === 'outline' ? (
        <rect x="0.8" y="0.8" width="30.4" height="30.4" rx={vbRadius} fill="none" stroke="var(--neon)" strokeWidth="1.6" />
      ) : null}
      <g fill={glyphFill}>
        <rect x="7" y="7" width="5" height="18" rx="2" />
        <rect x="20" y="7" width="5" height="18" rx="2" />
        <rect x="7" y="13.5" width="18" height="5" rx="2" />
      </g>
    </svg>
  )
}
