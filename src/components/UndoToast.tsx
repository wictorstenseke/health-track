import { useEffect } from 'react'
import { sv } from '../i18n/sv'

const UNDO_MS = 5000

/** `onDismiss` must be stable (useCallback), otherwise the timer restarts on every render. */
export function UndoToast({ message, onUndo, onDismiss }: { message: string; onUndo: () => void; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, UNDO_MS)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(var(--tab-bar-top)+0.5rem)] z-40 mx-auto flex max-w-md items-center justify-between rounded-full bg-raised px-5 py-3 text-white shadow-xl"
    >
      <span>{message}</span>
      <button type="button" onClick={onUndo} className="font-semibold text-ember-400">
        {sv.toast.undo}
      </button>
    </div>
  )
}
