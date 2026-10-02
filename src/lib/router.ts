import { useSyncExternalStore } from 'react'
import { isMetricId, type MetricId } from './metrics'

export type Route = { name: 'setup' } | { name: 'home' } | { name: 'measures' } | { name: 'settings' } | { name: 'metric'; metricId: MetricId }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '')
  if (path === '/start') return { name: 'setup' }
  if (path === '/matt') return { name: 'measures' }
  if (path === '/installningar') return { name: 'settings' }
  const metric = path.match(/^\/metric\/(\w+)$/)
  if (metric && isMetricId(metric[1])) return { name: 'metric', metricId: metric[1] }
  return { name: 'home' }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'setup':
      return '#/start'
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

export type TabName = 'setup' | 'home' | 'measures' | 'settings'

/** In demo mode the setup screen gets a tab of its own, first, for entering real data. */
export function tabsFor(demo: boolean): TabName[] {
  return demo ? ['setup', 'home', 'measures', 'settings'] : ['home', 'measures', 'settings']
}

/**
 * The tab a route lives under: a detail screen belongs to the tab whose card opens it.
 * Outside demo mode there is no setup tab, so its route shows Hem.
 */
export function tabOf(route: Route, demo = false): TabName {
  if (route.name === 'setup') return demo ? 'setup' : 'home'
  if (route.name !== 'metric') return route.name
  return route.metricId === 'weight' ? 'home' : 'measures'
}

/** Written on every history entry the app pushes, so back knows the previous entry is the app too. */
export const APP_HISTORY_STATE = { pushedByApp: true } as const

/**
 * `history.length` can't tell: it also counts pages before the app and forward entries, so from a detail
 * screen opened directly (link, bookmark, PWA launch) `history.back()` would leave the app.
 */
export function backTarget(historyState: unknown, route: Route): 'history' | Route {
  const pushedByApp = typeof historyState === 'object' && historyState !== null && 'pushedByApp' in historyState
  return pushedByApp ? 'history' : { name: tabOf(route) }
}

/** `pushState` fires no event, so subscribers are told directly. */
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

/**
 * Detail screens push an entry so back returns to their tab; tab switches replace it, like a native tab bar.
 * Always through the history API: iOS Home Screen apps can treat a followed link as a page load.
 */
export function navigate(route: Route, { replace = false } = {}): void {
  if (replace) window.history.replaceState(null, '', routeToHash(route))
  else window.history.pushState(APP_HISTORY_STATE, '', routeToHash(route))
  notify()
}

export function goBack(): void {
  const target = backTarget(window.history.state, parseHash(window.location.hash))
  if (target === 'history') window.history.back()
  else navigate(target, { replace: true })
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  window.addEventListener('popstate', onChange)
  window.addEventListener('hashchange', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('popstate', onChange)
    window.removeEventListener('hashchange', onChange)
  }
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return parseHash(hash)
}
