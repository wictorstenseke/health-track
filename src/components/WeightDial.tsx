import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { sv } from '../i18n/sv'
import {
  angleFor, ARC_RADIUS, clampVelocity, DIAL_MAX, DIAL_MIN, HALF_SPAN_KG, momentumStep, polar, toDialValue, UNITS_PER_KG, valueAfterDrag,
  visibleTicks,
} from '../lib/dialMath'
import { haptic } from '../lib/haptics'
import { roundValue } from '../lib/metrics'

// Geometry (SVG units). Ticks sit on ARC_RADIUS around (CX, CY); the needle is fixed at the top.
const VIEW_W = 360
const VIEW_H = 130
const CX = VIEW_W / 2
const CY = 20 + ARC_RADIUS
const BAND_RADIUS = ARC_RADIUS - 30
const BAND_WIDTH = 80
const MAX_ANGLE = angleFor(HALF_SPAN_KG * UNITS_PER_KG)
const BAND_ANGLE = MAX_ANGLE + 0.04
const TICK_LENGTH = { major: 24, mid: 16, minor: 10 } as const
const LABEL_RADIUS = ARC_RADIUS - 38
const FLING_PAUSE_MS = 80

function arcPath(radius: number, halfAngle: number): string {
  const start = polar(-halfAngle, radius, CX, CY)
  const end = polar(halfAngle, radius, CX, CY)
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`
}

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

/** Fixed needle, sliding scale. Drag or fling; snaps to 0.1 kg. Emits only snapped values. */
export function WeightDial({ value, onChange }: { value: number; onChange: (value: number) => void }) {
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

  // Follow outside changes (± buttons, typed value) while the user is not touching the dial.
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
      scale: VIEW_W / e.currentTarget.getBoundingClientRect().width,
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

  const needleTop = polar(0, ARC_RADIUS + 6, CX, CY)
  const needleBottom = polar(0, ARC_RADIUS - 52, CX, CY)

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
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
          <stop offset="0" stopColor="#ffd2bd" />
          <stop offset="0.5" stopColor="#ff9466" />
          <stop offset="1" stopColor="#ffd2bd" />
        </linearGradient>
      </defs>
      <path d={arcPath(BAND_RADIUS, BAND_ANGLE)} fill="none" stroke="url(#dial-rim)" strokeWidth={BAND_WIDTH} strokeLinecap="round" />
      <path d={arcPath(BAND_RADIUS, BAND_ANGLE)} fill="none" stroke="#fff" strokeWidth={BAND_WIDTH - 16} strokeLinecap="round" />
      {visibleTicks(pos).map((t) => {
        const angle = angleFor(t.offset)
        const outer = polar(angle, ARC_RADIUS, CX, CY)
        const inner = polar(angle, ARC_RADIUS - TICK_LENGTH[t.kind], CX, CY)
        const label = polar(angle, LABEL_RADIUS, CX, CY)
        const fade = Math.max(0, 1 - (Math.abs(angle) / MAX_ANGLE) ** 4)
        return (
          <g key={t.value} opacity={fade}>
            <line
              x1={outer.x}
              y1={outer.y}
              x2={inner.x}
              y2={inner.y}
              stroke={t.kind === 'major' ? '#141416' : '#a1a1aa'}
              strokeWidth={t.kind === 'minor' ? 1.5 : 2}
              strokeLinecap="round"
            />
            {t.kind === 'major' && (
              <text
                x={label.x}
                y={label.y}
                transform={`rotate(${(angle * 180) / Math.PI} ${label.x} ${label.y})`}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={14}
                fontWeight={500}
                fill="#141416"
              >
                {t.value}
              </text>
            )}
          </g>
        )
      })}
      <line x1={needleTop.x} y1={needleTop.y} x2={needleBottom.x} y2={needleBottom.y} stroke="#ff5a1f" strokeWidth={3} strokeLinecap="round" />
    </svg>
  )
}
