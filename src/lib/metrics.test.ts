import { describe, expect, it } from 'vitest'
import { isMetricId, isValidHeight, isValidValue, roundValue } from './metrics'

describe('roundValue', () => {
  it('rounds to one decimal', () => {
    expect(roundValue(82.44)).toBe(82.4)
    expect(roundValue(82.46)).toBe(82.5)
    expect(roundValue(0.1 + 0.2)).toBe(0.3)
  })
  it('never returns negative zero', () => {
    expect(Object.is(roundValue(-0.04), 0)).toBe(true)
  })
})

describe('isMetricId', () => {
  it('accepts known ids only', () => {
    expect(isMetricId('weight')).toBe(true)
    expect(isMetricId('hip')).toBe(true)
    expect(isMetricId('chest')).toBe(false)
    expect(isMetricId('toString')).toBe(false)
  })
})

describe('isValidValue', () => {
  it('checks range and finiteness', () => {
    expect(isValidValue('weight', 82.4)).toBe(true)
    expect(isValidValue('weight', 19.9)).toBe(false)
    expect(isValidValue('weight', 300.1)).toBe(false)
    expect(isValidValue('waist', Number.NaN)).toBe(false)
  })
})

describe('isValidHeight', () => {
  it('accepts 100–250 cm', () => {
    expect(isValidHeight(183)).toBe(true)
    expect(isValidHeight(99)).toBe(false)
    expect(isValidHeight(251)).toBe(false)
  })
})
