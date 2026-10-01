import { useEffect, type ReactNode } from 'react'
import { sv } from '../i18n/sv'

export function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label={sv.common.cancel} className="sheet-backdrop absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="sheet-panel relative mx-auto w-full max-w-md rounded-t-[28px] bg-white px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-zinc-200" />
        <h2 className="mb-2 text-center text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  )
}
