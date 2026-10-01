import { roundValue } from './metrics'

export const DIAL_MIN = 60
export const DIAL_MAX = 100
export const DEFAULT_WEIGHT = 75
/** Scale spacing in SVG units per kg. Tune on device. */
export const UNITS_PER_KG = 32
/** kg visible either side of the needle */
export const HALF_SPAN_KG = 4.5

export function clampDial(v: number): number {
  return Math.min(DIAL_MAX, Math.max(DIAL_MIN, v))
}

/** Weight shown by the dial: clamped to the dial range, 1 decimal. */
export function toDialValue(v: number): number {
  return roundValue(clampDial(v))
}

/** Dragging left (negative dx) slides the scale left, bringing higher numbers under the needle. */
export function valueAfterDrag(startValue: number, dxUnits: number): number {
  return clampDial(startValue - dxUnits / UNITS_PER_KG)
}

export type TickKind = 'major' | 'mid' | 'minor'

export interface Tick {
  value: number
  kind: TickKind
  /** Distance from the needle along the arc, in SVG units */
  offset: number
}

/** Ticks every 0.5 kg within the dial range: major (labelled) every 5 kg, mid every 1 kg. */
export function visibleTicks(center: number, halfSpanKg = HALF_SPAN_KG): Tick[] {
  const ticks: Tick[] = []
  const from = Math.max(Math.ceil((center - halfSpanKg) * 2), DIAL_MIN * 2)
  const to = Math.min(Math.floor((center + halfSpanKg) * 2), DIAL_MAX * 2)
  for (let k = from; k <= to; k++) {
    const value = k / 2
    const kind: TickKind = k % 10 === 0 ? 'major' : k % 2 === 0 ? 'mid' : 'minor'
    ticks.push({ value, kind, offset: (value - center) * UNITS_PER_KG })
  }
  return ticks
}

/** Tick opacity by distance from the needle: solid in the middle, fading out at the ends of the scale. */
export function edgeFade(offset: number, halfSpanKg = HALF_SPAN_KG): number {
  return Math.max(0, 1 - (Math.abs(offset) / (halfSpanKg * UNITS_PER_KG)) ** 4)
}

/** Friction per 16 ms frame */
const FRICTION = 0.9
/** Below this speed (kg/ms) the fling stops */
const MIN_VELOCITY = 0.0005
/** Fastest fling (kg/ms): with FRICTION 0.9 a fling travels at most ~3 kg. Tune on device. */
export const MAX_FLING_VELOCITY = 0.02

export function clampVelocity(v: number): number {
  return Math.min(MAX_FLING_VELOCITY, Math.max(-MAX_FLING_VELOCITY, v))
}

/** One animation step of a fling. Velocity in kg/ms. Hitting either end stops the fling. */
export function momentumStep(value: number, velocity: number, dtMs: number): { value: number; velocity: number } {
  const next = value + velocity * dtMs
  const clamped = clampDial(next)
  if (clamped !== next) return { value: clamped, velocity: 0 }
  const decayed = velocity * Math.pow(FRICTION, dtMs / 16)
  return { value: next, velocity: Math.abs(decayed) < MIN_VELOCITY ? 0 : decayed }
}
