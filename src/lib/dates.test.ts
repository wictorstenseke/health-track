import { describe, expect, it } from 'vitest'
import { calendarDaysBetween, chartDay, MONTH_START_DAYS, parseDayMonth, parseLocalIso, toLocalIso } from './dates'

describe('toLocalIso / parseLocalIso', () => {
  it('round-trips local time', () => {
    const ts = new Date(2026, 9, 1, 7, 32).getTime()
    expect(toLocalIso(ts)).toBe('2026-10-01T07:32')
    expect(parseLocalIso('2026-10-01T07:32')).toBe(ts)
  })
  it('accepts space separator, seconds and slashes', () => {
    expect(parseLocalIso('2026-10-01 07:32:15')).toBe(new Date(2026, 9, 1, 7, 32, 15).getTime())
    expect(parseLocalIso('2024/1/3')).toBe(new Date(2024, 0, 3, 12).getTime())
  })
  it('puts date-only values at noon', () => {
    expect(parseLocalIso('2024-01-03')).toBe(new Date(2024, 0, 3, 12).getTime())
  })
  it('rejects garbage and impossible dates', () => {
    expect(parseLocalIso('hello')).toBeNull()
    expect(parseLocalIso('2026-02-30')).toBeNull()
    expect(parseLocalIso('03/01/2024')).toBeNull()
  })
})

describe('parseDayMonth', () => {
  it('reads Swedish day/month in the given year at noon', () => {
    expect(parseDayMonth('2/1', 2024)).toBe(new Date(2024, 0, 2, 12).getTime())
    expect(parseDayMonth('23/10', 2025)).toBe(new Date(2025, 9, 23, 12).getTime())
  })
  it('rejects impossible dates and other formats', () => {
    expect(parseDayMonth('29/2', 2025)).toBeNull()
    expect(parseDayMonth('1/13', 2024)).toBeNull()
    expect(parseDayMonth('2024-01-02', 2024)).toBeNull()
    expect(parseDayMonth('Datum', 2024)).toBeNull()
  })
})

describe('calendarDaysBetween', () => {
  it('counts calendar days, not 24h blocks', () => {
    expect(calendarDaysBetween(new Date(2026, 9, 1, 23, 59).getTime(), new Date(2026, 9, 2, 0, 1).getTime())).toBe(1)
    expect(calendarDaysBetween(new Date(2026, 9, 1, 8).getTime(), new Date(2026, 9, 1, 20).getTime())).toBe(0)
  })
  it('is DST-safe', () => {
    expect(calendarDaysBetween(new Date(2026, 2, 28, 12).getTime(), new Date(2026, 2, 30, 12).getTime())).toBe(2)
  })
})

describe('chartDay', () => {
  it('maps dates onto a shared leap-year axis', () => {
    expect(chartDay(new Date(2026, 0, 1).getTime())).toBe(0)
    expect(chartDay(new Date(2024, 1, 29).getTime())).toBe(59)
    expect(chartDay(new Date(2026, 2, 1).getTime())).toBe(60)
    expect(chartDay(new Date(2025, 2, 1).getTime())).toBe(60)
    expect(chartDay(new Date(2026, 11, 31).getTime())).toBe(365)
  })
  it('adds time of day as a fraction', () => {
    expect(chartDay(new Date(2026, 0, 1, 12).getTime())).toBe(0.5)
  })
  it('exposes month starts', () => {
    expect(MONTH_START_DAYS).toEqual([0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335])
  })
})
