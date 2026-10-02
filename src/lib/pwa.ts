import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

/**
 * An installed iOS app rarely reloads, so a deployed build would otherwise sit unused for days.
 * The app looks for a new build on launch and whenever it returns to the foreground; installing it
 * is the user's call (Inställningar), so a reload never eats a half-entered weight.
 */
export type UpdateStatus = 'idle' | 'checking' | 'latest' | 'ready' | 'failed'

let status: UpdateStatus = 'idle'
let registration: ServiceWorkerRegistration | undefined
const listeners = new Set<() => void>()
const set = (next: UpdateStatus) => {
  status = next
  listeners.forEach((l) => l())
}

registerSW({
  onNeedRefresh: () => set('ready'),
  onRegisteredSW: (_url, r) => {
    registration = r
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void r?.update().catch(() => {})
    })
  },
})

/** Resolves once the check is done; a found build reports itself through `onNeedRefresh`. */
export async function checkForUpdate(): Promise<void> {
  if (status === 'ready') return
  if (!registration) return set('latest')
  set('checking')
  try {
    await registration.update()
    const incoming = registration.installing
    if (incoming) {
      await new Promise<void>((resolve) => {
        incoming.addEventListener('statechange', () => {
          if (incoming.state !== 'installing') resolve()
        })
      })
    }
    if (!registration.waiting) set('latest')
  } catch {
    set('failed')
  }
}

/**
 * Activates the waiting build and reloads into it. Not the plugin's `updateSW`: it only reloads if a service
 * worker controlled the page at launch, so on the first launch after install the button did nothing. Without a
 * controller nothing waits either (the new build activates at once), so a plain reload is the update.
 */
export function installUpdate(): void {
  const waiting = registration?.waiting
  if (!waiting) return window.location.reload()
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
  waiting.postMessage({ type: 'SKIP_WAITING' })
}

export function useUpdateStatus(): UpdateStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => status,
  )
}
