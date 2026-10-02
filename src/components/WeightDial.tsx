import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { sv } from '../i18n/sv'
import { clampVelocity, DIAL_MAX, DIAL_MIN, edgeFade, HALF_SPAN_KG, momentumStep, toDialValue, UNITS_PER_KG, valueAfterDrag, visibleTicks } from '../lib/dialMath'
import { haptic } from '../lib/haptics'
import { roundValue } from '../lib/metrics'

// Geometry (SVG units). A straight pill-shaped band; ticks hang from its top edge; the needle is fixed in the middle.
const VIEW_W = 360
const BAND = { x: 2, y: 2, width: VIEW_W - 4, height: 80, rim: 8 }
const VIEW_H = BAND.y * 2 + BAND.height
const CX = VIEW_W / 2
const TICK_TOP = BAND.y + 10
const TICK_LENGTH = { major: 24, mid: 16, minor: 10 } as const
const LABEL_Y = TICK_TOP + 38
/** Without its own band (`bare`), the view is cropped to what's inside it: needle top to just under the labels. */
const BARE_VIEW = { x: BAND.x + BAND.rim, y: TICK_TOP - 8, width: VIEW_W - (BAND.x + BAND.rim) * 2, height: LABEL_Y + 10 - (TICK_TOP - 8) }
/** kg either side of the needle when bare: the ticks run out to just inside the view's edges. */
const BARE_HALF_SPAN_KG = (BARE_VIEW.width / 2 - 4) / UNITS_PER_KG
const FLING_PAUSE_MS = 80

interface Drag {
  startX: number
  startPos: number
  /** SVG units per CSS pixel */
  scale: number
  lastX: number
  lastT: number
  /** kg per ms */
  velocity: number
}

interface WeightDialProps {
  value: number
  onChange: (value: number) => void
  /** No band of its own: the caller's container is the band. */
  bare?: boolean
}

/** Fixed needle, sliding scale. Drag or fling; snaps to 0.1 kg. Emits only snapped values. */
export function WeightDial({ value, onChange, bare = false }: WeightDialProps) {
  const view = bare ? BARE_VIEW : { x: 0, y: 0, width: VIEW_W, height: VIEW_H }
  const halfSpan = bare ? BARE_HALF_SPAN_KG : HALF_SPAN_KG
  const [pos, setPos] = useState(() => toDialValue(value))
  const posRef = useRef(pos)
  const emitted = useRef(toDialValue(value))
  const drag = useRef<Drag | null>(null)
  const frame = useRef<number | null>(null)

  const move = (p: number) => {
    posRef.current = p
    setPos(p)
    const snapped = roundValue(p)
    if (snapped !== emitted.current) {
      emitted.current = snapped
      onChange(snapped)
      haptic()
    }
  }

  const stopFling = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
  }

  // Follow outside changes (typed value, new data) while the user is not touching the dial.
  useEffect(() => {
    if (drag.current || frame.current !== null) return
    const next = toDialValue(value)
    if (next !== roundValue(posRef.current)) {
      posRef.current = next
      emitted.current = next
      setPos(next)
    }
  }, [value])

  useEffect(() => stopFling, [])

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    stopFling()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = {
      startX: e.clientX,
      startPos: posRef.current,
      scale: view.width / e.currentTarget.getBoundingClientRect().width,
      lastX: e.clientX,
      lastT: e.timeStamp,
      velocity: 0,
    }
  }

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (!d) return
    const dt = Math.max(1, e.timeStamp - d.lastT)
    const instant = (-(e.clientX - d.lastX) * d.scale) / UNITS_PER_KG / dt
    d.velocity = 0.8 * instant + 0.2 * d.velocity
    d.lastX = e.clientX
    d.lastT = e.timeStamp
    move(valueAfterDrag(d.startPos, (e.clientX - d.startX) * d.scale))
  }

  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    let velocity = e.timeStamp - d.lastT > FLING_PAUSE_MS ? 0 : clampVelocity(d.velocity)
    if (velocity === 0) {
      move(roundValue(posRef.current))
      return
    }
    let last = performance.now()
    const step = (now: number) => {
      const r = momentumStep(posRef.current, velocity, now - last)
      last = now
      velocity = r.velocity
      if (velocity === 0) {
        frame.current = null
        move(roundValue(r.value))
        return
      }
      move(r.value)
      frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  }

  return (
    <svg
      viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
      className="w-full cursor-grab touch-none select-none"
      role="slider"
      aria-label={sv.metrics.weight}
      aria-valuemin={DIAL_MIN}
      aria-valuemax={DIAL_MAX}
      aria-valuenow={roundValue(pos)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <defs>
        <linearGradient id="dial-rim" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--color-rim-end)' }} />
          <stop offset="0.5" style={{ stopColor: 'var(--color-rim-mid)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-rim-end)' }} />
        </linearGradient>
      </defs>
      {!bare && (
        <>
          <rect x={BAND.x} y={BAND.y} width={BAND.width} height={BAND.height} rx={BAND.height / 2} fill="url(#dial-rim)" />
          <rect
            x={BAND.x + BAND.rim}
            y={BAND.y + BAND.rim}
            width={BAND.width - BAND.rim * 2}
            height={BAND.height - BAND.rim * 2}
            rx={BAND.height / 2 - BAND.rim}
            style={{ fill: 'var(--color-surface)' }}
          />
        </>
      )}
      {visibleTicks(pos, halfSpan).map((t) => {
        const x = CX + t.offset
        return (
          <g key={t.value} opacity={edgeFade(t.offset, halfSpan)}>
            <line
              x1={x}
              y1={TICK_TOP}
              x2={x}
              y2={TICK_TOP + TICK_LENGTH[t.kind]}
              style={{ stroke: t.kind === 'major' ? 'var(--color-scale-major)' : 'var(--color-faint)' }}
              strokeWidth={t.kind === 'minor' ? 1.5 : 2}
              strokeLinecap="round"
            />
            {t.kind === 'major' && (
              <text
                x={x}
                y={LABEL_Y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={14}
                fontWeight={500}
                style={{ fill: 'var(--color-scale-major)' }}
              >
                {t.value}
              </text>
            )}
          </g>
        )
      })}
      {/* Ends just past the major tick (length 24) so it stays clear of the scale labels. */}
      <line x1={CX} y1={TICK_TOP - 6} x2={CX} y2={TICK_TOP + 28} style={{ stroke: 'var(--color-ember-500)' }} strokeWidth={3} strokeLinecap="round" />
    </svg>
  )
}
