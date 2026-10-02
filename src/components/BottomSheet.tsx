import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { sv } from '../i18n/sv'
import { CloseIcon } from './icons'

/** A drag on the top bar closes the sheet past this far down, or when flicked down faster than this. */
const CLOSE_DISTANCE = 100
const CLOSE_VELOCITY = 0.5 // px/ms
/** Held still this long before letting go, the drag counts as a placement, not a flick. */
const FLICK_PAUSE_MS = 100
/** Must match the duration-200 slide on the panel and fade on the backdrop. */
const SLIDE_MS = 200

export function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // How far the panel is pulled down. Set through `translate`, which the sheet-up animation's transform leaves alone.
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ startY: number; lastY: number; lastT: number; velocity: number } | null>(null)
  const [closing, setClosing] = useState(false)

  // Slide the panel the rest of the way out and fade the backdrop, then unmount.
  const close = () => {
    if (closing) return
    setClosing(true)
    setOffset(window.innerHeight)
    setTimeout(onClose, SLIDE_MS)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (closing) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { startY: e.clientY, lastY: e.clientY, lastT: e.timeStamp, velocity: 0 }
    setDragging(true)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const dt = Math.max(1, e.timeStamp - d.lastT)
    d.velocity = 0.8 * ((e.clientY - d.lastY) / dt) + 0.2 * d.velocity
    d.lastY = e.clientY
    d.lastT = e.timeStamp
    setOffset(Math.max(0, e.clientY - d.startY))
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    setDragging(false)
    const velocity = e.timeStamp - d.lastT > FLICK_PAUSE_MS ? 0 : d.velocity
    if (e.clientY - d.startY > CLOSE_DISTANCE || velocity > CLOSE_VELOCITY) close()
    else setOffset(0)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label={title}>
      {/* The wrapper fades out on close; the backdrop's own fade-in animation would override an opacity set on it. */}
      <div className={`absolute inset-0 transition-opacity duration-200 ${closing ? 'opacity-0' : ''}`}>
        <button type="button" aria-label={sv.common.cancel} className="sheet-backdrop size-full bg-black/30 dark:bg-black/50" onClick={close} />
      </div>
      <div
        className={`sheet-panel relative mx-auto w-full max-w-md rounded-t-[28px] bg-surface px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl ${dragging ? '' : 'transition-transform duration-200 ease-out'}`}
        style={{ translate: `0 ${offset}px` }}
      >
        <div
          className="-mx-4 cursor-grab touch-none px-4 pt-3 pb-2 select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="mx-auto mb-3 h-1.5 w-17.5 rounded-full bg-faint/30" />
          <h2 className="px-10 text-center text-lg font-semibold">{title}</h2>
        </div>
        {/* Same inset from the top as from the right edge. */}
        <button
          type="button"
          aria-label={sv.common.close}
          onClick={close}
          className="absolute top-4 right-4 grid size-8 place-items-center rounded-full bg-fill text-muted [&>svg]:size-4.5"
        >
          <CloseIcon />
        </button>
        {children}
      </div>
    </div>
  )
}
