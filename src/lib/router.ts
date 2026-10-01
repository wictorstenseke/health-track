import { useSyncExternalStore } from 'react'
import { isMetricId, type MetricId } from './metrics'

export type Route = { name: 'home' } | { name: 'measures' } | { name: 'settings' } | { name: 'metric'; metricId: MetricId }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '')
  if (path === '/matt') return { name: 'measures' }
  if (path === '/installningar') return { name: 'settings' }
  const metric = path.match(/^\/metric\/(\w+)$/)
  if (metric && isMetricId(metric[1])) return { name: 'metric', metricId: metric[1] }
  return { name: 'home' }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'measures':
      return '#/matt'
    case 'settings':
      return '#/installningar'
    case 'metric':
      return `#/metric/${route.metricId}`
  }
}

export function navigate(route: Route): void {
  window.location.hash = routeToHash(route)
}

/** Back within the app, or home when the page was opened directly on a sub-route. */
export function goBack(): void {
  if (window.history.length > 1) window.history.back()
  else navigate({ name: 'home' })
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return parseHash(hash)
}
