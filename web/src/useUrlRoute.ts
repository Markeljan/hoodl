import { useCallback, useEffect, useState } from 'react'
import { hrefForRoute, routeFromLocation } from './routes'
import type { AppRoute } from './routes'

function currentRoute(): AppRoute {
  return routeFromLocation(window.location)
}

export function useUrlRoute(): { route: AppRoute; navigate: (route: AppRoute) => void } {
  const [route, setRoute] = useState(currentRoute)

  useEffect(() => {
    const handlePopState = () => setRoute(currentRoute())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = useCallback((nextRoute: AppRoute) => {
    const href = hrefForRoute(nextRoute)
    if (`${window.location.pathname}${window.location.search}` !== href) {
      window.history.pushState(null, '', href)
    }
    setRoute(nextRoute)
  }, [])

  return { route, navigate }
}
