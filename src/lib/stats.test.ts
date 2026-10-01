import { describe, expect, it } from 'vitest'
import { bmi, latest, latestOnDay, sameDateLastYear, valueAt, withDeltas, yearSeries, yearsDescending, yearStats } from './stats'

const at = (y: number, m: number, d: number, h = 8) => new Date(y, m - 1, d, h).getTime()
const p = (y: number, m: number, d: number, value: number) => ({ takenAt: at(y, m, d), value })

const points = [
  p(2025, 3, 1, 86.0),
  p(2026, 1, 5, 85.0),
  p(2024, 6, 1, 88.2),
  p(2026, 9, 30, 82.4),
  p(2026, 5, 1, 83.9),
  p(2025, 11, 1, 84.0),
]

describe('latest / yearsDescending', () => {
  it('finds the newest point', () => {
    expect(latest(points)?.value).toBe(82.4)
    expect(latest([])).toBeUndefined()
  })
  it('lists distinct years newest first', () => {
    expect(yearsDescending(points)).toEqual([2026, 2025, 2024])
  })
})

describe('latestOnDay', () => {
  const p = (d: number, h: number, value: number) => ({ takenAt: new Date(2026, 9, d, h).getTime(), value })
  it("returns that calendar day's newest point", () => {
    const points = [p(1, 7, 80), p(1, 21, 81), p(2, 7, 82)]
    expect(latestOnDay(points, new Date(2026, 9, 1, 12).getTime())).toEqual(p(1, 21, 81))
  })
  it('returns undefined when the day has no points', () => {
    expect(latestOnDay([p(1, 23, 80), p(3, 0, 82)], new Date(2026, 9, 2, 12).getTime())).toBeUndefined()
  })
})

describe('yearStats', () => {
  it('summarises one year', () => {
    expect(yearStats(points, 2026)).toEqual({
      year: 2026, count: 3, first: 85.0, latest: 82.4, lowest: 82.4, highest: 85.0, change: -2.6,
    })
  })
  it('returns null for empty years', () => {
    expect(yearStats(points, 2023)).toBeNull()
  })
})

describe('withDeltas', () => {
  it('sorts ascending and diffs against the previous point', () => {
    const rows = withDeltas([p(2026, 1, 3, 85.1), p(2026, 1, 1, 85.4), p(2026, 1, 2, 85.4)])
    expect(rows.map((r) => [r.value, r.delta])).toEqual([[85.4, null], [85.4, 0], [85.1, -0.3]])
  })
})

describe('bmi', () => {
  it('computes kg/m² to one decimal', () => {
    expect(bmi(82.4, 183)).toBe(24.6)
  })
})

describe('valueAt', () => {
  const pts = [p(2025, 9, 1, 86), p(2025, 9, 11, 85)]
  it('interpolates between surrounding points', () => {
    expect(valueAt(pts, at(2025, 9, 6))).toBeCloseTo(85.5, 5)
  })
  it('returns exact matches', () => {
    expect(valueAt(pts, at(2025, 9, 1))).toBe(86)
  })
  it('uses the nearest point within 14 days outside the range', () => {
    expect(valueAt(pts, at(2025, 9, 20))).toBe(85)
    expect(valueAt(pts, at(2025, 8, 20))).toBe(86)
  })
  it('gives up beyond 14 days', () => {
    expect(valueAt(pts, at(2025, 10, 1))).toBeNull()
    expect(valueAt([], at(2025, 10, 1))).toBeNull()
  })
})

describe('sameDateLastYear', () => {
  it('compares latest value with the interpolated value a year ago', () => {
    const pts = [p(2025, 9, 26, 84.6), p(2025, 10, 6, 83.6), p(2026, 9, 30, 82.4)]
    expect(sameDateLastYear(pts, at(2026, 10, 1))).toEqual({
      date: at(2025, 10, 1), then: 84.1, now: 82.4, diff: -1.7,
    })
  })
  it('returns null without data a year back', () => {
    expect(sameDateLastYear([p(2026, 9, 30, 82.4)], at(2026, 10, 1))).toBeNull()
  })
})

describe('yearSeries', () => {
  it('builds one series per year on the shared axis', () => {
    const series = yearSeries(points, [2026, 2025, 2023])
    expect(series.map((s) => s.year)).toEqual([2026, 2025])
    expect(series[0].points.map((pt) => pt.y)).toEqual([85.0, 83.9, 82.4])
    expect(series[0].points[0].x).toBeCloseTo(4 + 8 / 24, 5)
  })
})
