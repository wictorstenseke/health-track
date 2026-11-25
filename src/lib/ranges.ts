import { chartDay, yearOf } from './dates'
import { formatDayMonth, formatMonthShort, formatWeekdayInitial } from './format'
import { roundValue } from './metrics'
import { sortByTime, valueAt, yearSeries, yearStats, type ChartPoint, type Point } from './stats'

/** What Hem's chart can show: the last week, month or three months up to today, or the calendar year. */
export const RANGES = ['week', 'month', 'quarter', 'year'] as const
export type Range = (typeof RANGES)[number]
type Rolling = Exclude<Range, 'year'>

/** An x axis other than the chart's own Jan–Dec one. */
export interface ChartAxis {
  domain: [number, number]
  ticks: number[]
  label: (x: number) => string
}

export interface RangeChart {
  points: ChartPoint[]
  /** Absent for the year, which uses the chart's Jan–Dec axis. */
  axis?: ChartAxis
  /** Latest − first over the range; null with fewer than two points. */
  change: number | null
}

/** Local midnight `days` from the day of `now`, plus `months` whole months. */
function dayFrom(now: number, days: number, months = 0, hour = 0): number {
  const d = new Date(now)
  return new Date(d.getFullYear(), d.getMonth() + months, d.getDate() + days, hour).getTime()
}

/** [start, end) in ms: ends when today does. A week is today and the six days before. */
export function rangeWindow(range: Rolling, now: number): { start: number; end: number } {
  const start = range === 'week' ? dayFrom(now, -6) : dayFrom(now, 0, range === 'month' ? -1 : -3)
  return { start, end: dayFrom(now, 1) }
}

/** Ticks sit at noon, under the middle of their day. */
function rangeTicks(range: Rolling, now: number, start: number, end: number): number[] {
  if (range === 'week') return Array.from({ length: 7 }, (_, i) => dayFrom(now, i - 6, 0, 12))
  if (range === 'month') return [28, 21, 14, 7, 0].map((ago) => dayFrom(now, -ago, 0, 12))
  // Three months: where each month starts.
  const first = new Date(start)
  return Array.from({ length: 5 }, (_, i) => new Date(first.getFullYear(), first.getMonth() + i, 1).getTime()).filter(
    (t) => t >= start && t < end,
  )
}

const TICK_LABEL: Record<Rolling, (ts: number) => string> = {
  week: formatWeekdayInitial,
  month: formatDayMonth,
  quarter: formatMonthShort,
}

/**
 * The points, axis and change for one range. A rolling range's x is the timestamp; when there are points both
 * before and inside it, the line starts at the left edge on the value it had there, so the change covers the whole range.
 */
export function rangeChart(points: Point[], range: Range, now: number): RangeChart {
  if (range === 'year') {
    const year = yearOf(now)
    const stats = yearStats(points, year)
    return { points: yearSeries(points, [year])[0]?.points ?? [], change: stats && stats.count >= 2 ? stats.change : null }
  }
  const { start, end } = rangeWindow(range, now)
  const sorted = sortByTime(points)
  const chart = sorted.filter((p) => p.takenAt >= start && p.takenAt < end).map((p) => ({ x: p.takenAt, y: p.value }))
  if (chart.length > 0 && chart[0].x > start && sorted[0].takenAt < start) {
    const atStart = valueAt(sorted, start)
    if (atStart !== null) chart.unshift({ x: start, y: roundValue(atStart) })
  }
  return {
    points: chart,
    axis: { domain: [start, end], ticks: rangeTicks(range, now, start, end), label: TICK_LABEL[range] },
    change: chart.length >= 2 ? roundValue(chart[chart.length - 1].y - chart[0].y) : null,
  }
}

/** Where a point taken at `takenAt` sits on the range's x axis, or null when the range doesn't show it. */
export function rangeX(range: Range, takenAt: number, now: number): number | null {
  if (range === 'year') return yearOf(takenAt) === yearOf(now) ? chartDay(takenAt) : null
  const { start, end } = rangeWindow(range, now)
  return takenAt >= start && takenAt < end ? takenAt : null
}
