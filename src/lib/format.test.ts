import { describe, expect, it } from 'vitest'
import {
  formatDate, formatDelta, formatMonthInitial, formatMonthYear, formatNumber, formatRelativeDay,
  formatRowDate, formatTime, formatValue, parseDecimal,
} from './format'

const ts = new Date(2026, 9, 1, 7, 32).getTime()

describe('numbers', () => {
  it('uses Swedish decimal comma', () => {
    expect(formatNumber(82.4)).toBe('82,4')
    expect(formatNumber(82)).toBe('82,0')
    expect(formatValue(92.5, 'cm')).toBe('92,5 cm')
  })
  it('signs deltas with a real minus sign', () => {
    expect(formatDelta(0.3)).toBe('+0,3')
    expect(formatDelta(-0.3)).toBe('−0,3')
    expect(formatDelta(0)).toBe('0,0')
  })
})

describe('dates', () => {
  it('formats without trailing dots', () => {
    expect(formatDate(ts)).toBe('1 okt 2026')
    expect(formatRowDate(new Date(2026, 8, 30).getTime())).toBe('ons 30 sep')
    expect(formatMonthYear(ts)).toBe('Oktober 2026')
    expect(formatTime(ts)).toBe('07:32')
    expect(formatMonthInitial(0)).toBe('J')
    expect(formatMonthInitial(9)).toBe('O')
  })
  it('formats relative days', () => {
    expect(formatRelativeDay(ts, ts)).toBe('idag')
    expect(formatRelativeDay(new Date(2026, 8, 30, 22).getTime(), ts)).toBe('igår')
    expect(formatRelativeDay(new Date(2026, 8, 28).getTime(), ts)).toBe('för 3 dagar sedan')
  })
})

describe('parseDecimal', () => {
  it('accepts comma, dot, spaces and units', () => {
    expect(parseDecimal('82,4')).toBe(82.4)
    expect(parseDecimal('82.4')).toBe(82.4)
    expect(parseDecimal(' 82,4 kg ')).toBe(82.4)
    expect(parseDecimal('92')).toBe(92)
  })
  it('rejects non-numbers', () => {
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
    expect(parseDecimal('82,4,1')).toBeNull()
  })
})
