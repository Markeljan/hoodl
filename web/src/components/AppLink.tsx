import type { AnchorHTMLAttributes, MouseEvent } from 'react'

type AppLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string
  onNavigate: () => void
}

export default function AppLink({ href, onClick, onNavigate, ...props }: AppLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.currentTarget.target === '_blank' ||
      event.currentTarget.hasAttribute('download')
    ) {
      return
    }

    event.preventDefault()
    onNavigate()
  }

  return <a {...props} href={href} onClick={handleClick} />
}
