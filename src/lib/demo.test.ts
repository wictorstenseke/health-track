import { describe, expect, it } from 'vitest'
import { startOfLocalDay } from './dates'
import { demoRows } from './demo'
import { isValidValue, roundValue } from './metrics'

const now = new Date(2026, 9, 2, 9, 30).getTime()
const rows = demoRows(now)
const of = (metricId: string) => rows.filter((r) => r.metricId === metricId)

describe('demoRows', () => {
  it('runs from 1 January two years back up to yesterday, leaving today for the user', () => {
    const times = rows.map((r) => r.takenAt)
    expect(new Date(Math.min(...times)).getFullYear()).toBe(2024)
    expect(Math.min(...times)).toBeLessThan(new Date(2024, 0, 8).getTime())
    expect(Math.max(...times)).toBeLessThan(startOfLocalDay(now))
    expect(Math.max(...times)).toBeGreaterThanOrEqual(startOfLocalDay(now) - 7 * 86_400_000)
  })

  it('weighs in three to four times a week', () => {
    const weeks = (startOfLocalDay(now) - new Date(2024, 0, 1).getTime()) / (7 * 86_400_000)
    const perWeek = of('weight').length / weeks
    expect(perWeek).toBeGreaterThanOrEqual(3)
    expect(perWeek).toBeLessThanOrEqual(4)
  })

  it('measures waist and hip together about once a month', () => {
    const waist = of('waist')
    expect(waist.length).toBeGreaterThanOrEqual(25)
    expect(waist.length).toBeLessThanOrEqual(40)
    expect(of('hip').map((r) => r.takenAt)).toEqual(waist.map((r) => r.takenAt))
  })

  it('gives only valid values with one decimal', () => {
    for (const r of rows) {
      expect(isValidValue(r.metricId, r.value)).toBe(true)
      expect(r.value).toBe(roundValue(r.value))
    }
  })

  it('loses weight and centimetres over time', () => {
    const avg = (xs: { value: number }[]) => xs.reduce((s, r) => s + r.value, 0) / xs.length
    for (const metricId of ['weight', 'waist', 'hip']) {
      const series = of(metricId)
      expect(avg(series.slice(-5))).toBeLessThan(avg(series.slice(0, 5)))
    }
  })

  it('is the same every time for the same day', () => {
    expect(demoRows(now)).toEqual(rows)
  })
})
