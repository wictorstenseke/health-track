import type { CsvRow } from './csv'
import { roundValue } from './metrics'

/** The example person the demo fills in on the setup screen. */
export const DEMO_PROFILE = { name: 'Alex', heightCm: 178 }

/** mulberry32: a tiny seeded generator, so the demo shows the same data every time. */
function seededRandom(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

/** 0 → 1 → 0 over a span of days, peaking in its middle. */
const bump = (dayOfSpan: number, length: number) => (dayOfSpan >= 0 && dayOfSpan < length ? Math.sin((Math.PI * dayOfSpan) / length) : 0)

/**
 * Example readings from 1 January two years back up to yesterday, dated relative to `now` so the demo never
 * looks stale and Hem's chart has three years to compare. Today stays empty for the user to try the dial.
 * Weight 3–4 mornings a week, slowly dropping, with a bump over Christmas and summer; waist and hip together
 * about every four weeks.
 */
export function demoRows(now: number): CsvRow[] {
  const random = seededRandom(20240101)
  const today = new Date(now)
  const start = new Date(today.getFullYear() - 2, 0, 1)
  const days = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - start.getTime()) / 86_400_000)
  const rows: CsvRow[] = []
  let nextMeasure = 3

  for (let day = 0; day < days; day++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + day)
    const progress = day / days
    const christmas = bump(date.getMonth() === 11 ? date.getDate() - 18 : date.getMonth() === 0 ? date.getDate() + 13 : -1, 35)
    const summer = bump(date.getMonth() === 6 ? date.getDate() : date.getMonth() === 7 ? date.getDate() + 31 : -1, 45)

    if (random() < 0.5) {
      const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 6, 30 + Math.floor(random() * 120)).getTime()
      const weight = 88 - 7 * progress + 1.4 * christmas + 0.8 * summer + (random() + random() - 1) * 0.6
      rows.push({ metric: 'weight', takenAt: at, value: roundValue(weight) })
    }

    if (day === nextMeasure) {
      const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 7, Math.floor(random() * 60)).getTime()
      // A tape measure reads in half centimetres.
      const half = (v: number) => roundValue(Math.round(v * 2) / 2)
      rows.push({ metric: 'waist', takenAt: at, value: half(97 - 6 * progress + 1.5 * christmas + (random() - 0.5)) })
      rows.push({ metric: 'hip', takenAt: at, value: half(105 - 3 * progress + 0.8 * christmas + (random() - 0.5)) })
      nextMeasure += 24 + Math.floor(random() * 10)
    }
  }
  return rows
}
