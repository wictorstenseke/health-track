import { describe, expect, it } from 'vitest'
import { chartDay } from './dates'
import { rangeChart, rangeWindow, rangeX, smoothPoints } from './ranges'

const at = (y: number, m: number, d: number, h = 8) => new Date(y, m - 1, d, h).getTime()
const p = (y: number, m: number, d: number, value: number) => ({ takenAt: at(y, m, d), value })
const now = at(2026, 11, 25, 6)

describe('rangeWindow', () => {
  it('ends when today does and starts a week, a month or three months back', () => {
    const end = at(2026, 11, 26, 0)
    expect(rangeWindow('week', now)).toEqual({ start: at(2026, 11, 19, 0), end })
    expect(rangeWindow('month', now)).toEqual({ start: at(2026, 10, 25, 0), end })
    expect(rangeWindow('quarter', now)).toEqual({ start: at(2026, 8, 25, 0), end })
  })
  it('crosses into last year', () => {
    expect(rangeWindow('quarter', at(2026, 1, 10)).start).toBe(at(2025, 10, 10, 0))
  })
})

describe('rangeChart', () => {
  const points = [p(2025, 12, 1, 80), p(2026, 1, 5, 76), p(2026, 11, 17, 70), p(2026, 11, 21, 71), p(2026, 11, 25, 69.5)]

  it('charts the calendar year on the Jan–Dec axis', () => {
    const chart = rangeChart(points, 'year', now)
    expect(chart.axis).toBeUndefined()
    expect(chart.points.map((c) => c.y)).toEqual([76, 70, 71, 69.5])
    expect(chart.points[0].x).toBe(chartDay(at(2026, 1, 5)))
    expect(chart.change).toBe(-6.5)
  })

  it('starts a rolling range on the value at its left edge', () => {
    const chart = rangeChart(points, 'week', now)
    // 19 Nov 00:00 lies 40 of the 96 hours from 70 (17 Nov 08:00) to 71 (21 Nov 08:00).
    expect(chart.points).toEqual([
      { x: at(2026, 11, 19, 0), y: 70.4 },
      { x: at(2026, 11, 21), y: 71 },
      { x: at(2026, 11, 25), y: 69.5 },
    ])
    expect(chart.change).toBe(-0.9)
    expect(chart.axis?.domain).toEqual([at(2026, 11, 19, 0), at(2026, 11, 26, 0)])
  })

  it('adds no edge point when nothing is older than the range', () => {
    const chart = rangeChart([p(2026, 11, 21, 71), p(2026, 11, 25, 69.5)], 'month', now)
    expect(chart.points.map((c) => c.y)).toEqual([71, 69.5])
    expect(chart.change).toBe(-1.5)
  })

  it('is empty, with no change, when the range has no points', () => {
    const chart = rangeChart([p(2026, 1, 5, 76)], 'week', now)
    expect(chart.points).toEqual([])
    expect(chart.change).toBeNull()
  })

  it('labels a week by day, a month by week and three months by month', () => {
    const labels = (range: 'week' | 'month' | 'quarter') => {
      const axis = rangeChart(points, range, now).axis!
      return axis.ticks.map(axis.label)
    }
    expect(labels('week')).toEqual(['T', 'F', 'L', 'S', 'M', 'T', 'O'])
    expect(labels('month')).toEqual(['28/10', '4/11', '11/11', '18/11', '25/11'])
    expect(labels('quarter')).toEqual(['sep', 'okt', 'nov'])
  })
})

describe('smoothPoints', () => {
  it('averages each point with its neighbours within reach, and leaves the ends', () => {
    const points = [0, 1, 2, 3, 10].map((x, i) => ({ x, y: [70, 73, 70, 72, 60][i] }))
    expect(smoothPoints(points, 1).map((c) => c.y)).toEqual([70, 71, 71.66666666666667, 71, 60])
  })
})

describe('rangeX', () => {
  it('places a point on the range it falls in', () => {
    expect(rangeX('year', at(2026, 3, 1), now)).toBe(chartDay(at(2026, 3, 1)))
    expect(rangeX('year', at(2025, 12, 31), now)).toBeNull()
    expect(rangeX('week', at(2026, 11, 20), now)).toBe(at(2026, 11, 20))
    expect(rangeX('week', at(2026, 11, 18), now)).toBeNull()
  })
})
