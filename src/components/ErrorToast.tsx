import { useEffect, useState } from 'react'
import { sv } from '../i18n/sv'

/**
 * Writes run as fire-and-forget promises, so a failed IndexedDB write surfaces as an unhandled rejection.
 * Stays until the app is reloaded: the connection is usually gone for good.
 */
export function ErrorToast() {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const onRejection = () => setFailed(true)
    window.addEventListener('unhandledrejection', onRejection)
    return () => window.removeEventListener('unhandledrejection', onRejection)
  }, [])

  if (!failed) return null
  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[60] mx-auto flex max-w-md items-center justify-between rounded-full bg-ink px-5 py-3 text-white shadow-xl"
    >
      <span>{sv.errors.failed}</span>
      <button type="button" onClick={() => window.location.reload()} className="font-semibold text-ember-400">
        {sv.errors.reload}
      </button>
    </div>
  )
}
