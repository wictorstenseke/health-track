import { calendarDaysBetween, chartDay, yearOf } from './dates'
import { roundValue } from './metrics'

export interface Point {
  takenAt: number
  value: number
}

/** Ascending by time. Returns a copy. */
export function sortByTime<T extends Point>(points: T[]): T[] {
  return [...points].sort((a, b) => a.takenAt - b.takenAt)
}

export function latest<T extends Point>(points: T[]): T | undefined {
  return points.reduce<T | undefined>((best, p) => (!best || p.takenAt > best.takenAt ? p : best), undefined)
}

/** Distinct years present, newest first. */
export function yearsDescending(points: Point[]): number[] {
  return [...new Set(points.map((p) => yearOf(p.takenAt)))].sort((a, b) => b - a)
}

export function pointsInYear<T extends Point>(points: T[], year: number): T[] {
  return sortByTime(points.filter((p) => yearOf(p.takenAt) === year))
}

export interface YearStats {
  year: number
  count: number
  first: number
  latest: number
  lowest: number
  highest: number
  /** latest − first */
  change: number
}

export function yearStats(points: Point[], year: number): YearStats | null {
  const inYear = pointsInYear(points, year)
  if (inYear.length === 0) return null
  const values = inYear.map((p) => p.value)
  const first = values[0]
  const last = values[values.length - 1]
  return {
    year,
    count: values.length,
    first,
    latest: last,
    lowest: Math.min(...values),
    highest: Math.max(...values),
    change: roundValue(last - first),
  }
}

/** Ascending, each point with the difference to the previous point (null for the first). */
export function withDeltas<T extends Point>(points: T[]): Array<T & { delta: number | null }> {
  const sorted = sortByTime(points)
  return sorted.map((p, i) => ({ ...p, delta: i === 0 ? null : roundValue(p.value - sorted[i - 1].value) }))
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100
  return roundValue(weightKg / (m * m))
}

/**
 * Value at `ts`: linear interpolation between the surrounding points,
 * else the nearest point if within `maxGapDays`, else null.
 */
export function valueAt(points: Point[], ts: number, maxGapDays = 14): number | null {
  const sorted = sortByTime(points)
  let before: Point | undefined
  let after: Point | undefined
  for (const p of sorted) {
    if (p.takenAt <= ts) before = p
    else {
      after = p
      break
    }
  }
  if (before && before.takenAt === ts) return before.value
  if (before && after) {
    const t = (ts - before.takenAt) / (after.takenAt - before.takenAt)
    return before.value + t * (after.value - before.value)
  }
  const nearest = before ?? after
  if (nearest && Math.abs(calendarDaysBetween(nearest.takenAt, ts)) <= maxGapDays) return nearest.value
  return null
}

export interface SameDateComparison {
  /** Same calendar date one year before `now` */
  date: number
  then: number
  /** Latest value */
  now: number
  /** now − then */
  diff: number
}

export function sameDateLastYear(points: Point[], now: number): SameDateComparison | null {
  const last = latest(points)
  if (!last) return null
  const target = new Date(now)
  target.setFullYear(target.getFullYear() - 1)
  const then = valueAt(points, target.getTime())
  if (then === null) return null
  const thenRounded = roundValue(then)
  return { date: target.getTime(), then: thenRounded, now: last.value, diff: roundValue(last.value - thenRounded) }
}

export interface ChartPoint {
  x: number
  y: number
}

export interface YearSeries {
  year: number
  points: ChartPoint[]
}

/** One series per requested year, x on the shared Jan–Dec axis. Years without points are left out. */
export function yearSeries(points: Point[], years: number[]): YearSeries[] {
  return years
    .map((year) => ({ year, points: pointsInYear(points, year).map((p) => ({ x: chartDay(p.takenAt), y: p.value })) }))
    .filter((s) => s.points.length > 0)
}
