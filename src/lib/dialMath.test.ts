import { describe, expect, it } from 'vitest'
import {
  clampDial, clampVelocity, edgeFade, HALF_SPAN_KG, MAX_FLING_VELOCITY, momentumStep, toDialValue, UNITS_PER_KG, valueAfterDrag, visibleTicks,
} from './dialMath'

describe('clampDial / toDialValue', () => {
  it('keeps values inside 60–100', () => {
    expect(clampDial(59)).toBe(60)
    expect(clampDial(101)).toBe(100)
    expect(clampDial(82.4)).toBe(82.4)
    expect(toDialValue(82.44)).toBe(82.4)
    expect(toDialValue(120)).toBe(100)
  })
})

describe('valueAfterDrag', () => {
  it('increases when dragging left', () => {
    expect(valueAfterDrag(82, -UNITS_PER_KG)).toBe(83)
    expect(valueAfterDrag(82, UNITS_PER_KG / 2)).toBe(81.5)
  })
  it('clamps at the ends', () => {
    expect(valueAfterDrag(99, -10 * UNITS_PER_KG)).toBe(100)
  })
})

describe('visibleTicks', () => {
  it('lists half-kg ticks around the value with major every 5 kg', () => {
    const ticks = visibleTicks(82.4)
    expect(ticks[0].value).toBe(78)
    expect(ticks.at(-1)?.value).toBe(86.5)
    expect(ticks.filter((t) => t.kind === 'major').map((t) => t.value)).toEqual([80, 85])
    expect(ticks.find((t) => t.value === 83)?.kind).toBe('mid')
    expect(ticks.find((t) => t.value === 83.5)?.kind).toBe('minor')
    expect(ticks.find((t) => t.value === 80)?.offset).toBeCloseTo(-2.4 * UNITS_PER_KG, 5)
  })
  it('never goes outside the dial range', () => {
    expect(visibleTicks(61)[0].value).toBe(60)
    expect(visibleTicks(99).at(-1)?.value).toBe(100)
  })
})

describe('edgeFade', () => {
  const edge = HALF_SPAN_KG * UNITS_PER_KG
  it('is fully visible at the needle and gone at the ends of the scale', () => {
    expect(edgeFade(0)).toBe(1)
    expect(edgeFade(edge)).toBe(0)
    expect(edgeFade(-edge)).toBe(0)
  })
  it('fades only near the ends', () => {
    expect(edgeFade(edge / 2)).toBeGreaterThan(0.9)
    expect(edgeFade(edge * 0.9)).toBeLessThan(edgeFade(edge / 2))
  })
  it('fades over a wider span when given one', () => {
    expect(edgeFade(edge, 6)).toBeGreaterThan(0.5)
    expect(edgeFade(6 * UNITS_PER_KG, 6)).toBe(0)
  })
})

describe('momentumStep', () => {
  it('moves and slows down', () => {
    const r = momentumStep(80, 0.01, 16)
    expect(r.value).toBeCloseTo(80.16, 5)
    expect(r.velocity).toBeCloseTo(0.009, 5)
  })
  it('eventually stops', () => {
    let s = { value: 80, velocity: 0.02 }
    for (let i = 0; i < 500 && s.velocity !== 0; i++) s = momentumStep(s.value, s.velocity, 16)
    expect(s.velocity).toBe(0)
  })
  it('stops at the ends', () => {
    expect(momentumStep(99.9, 0.05, 16)).toEqual({ value: 100, velocity: 0 })
  })
  it('caps fling speed in both directions', () => {
    expect(clampVelocity(1)).toBe(MAX_FLING_VELOCITY)
    expect(clampVelocity(-1)).toBe(-MAX_FLING_VELOCITY)
    expect(clampVelocity(0.001)).toBe(0.001)
  })
})
