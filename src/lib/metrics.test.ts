import { describe, expect, it } from 'vitest'
import {
  cleanName, defaultMetrics, isValidHeight, isValidValue, nameProblem, resolveLabel, roundValue, sortMetrics, unitOf,
} from './metrics'

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

describe('unitOf', () => {
  it('is kg for weight and cm for every measurement type', () => {
    expect(unitOf('weight')).toBe('kg')
    expect(unitOf('waist')).toBe('cm')
    expect(unitOf('3f2b8c1e-7a4d-4e5f-9b6a-1c2d3e4f5a6b')).toBe('cm')
  })
})

describe('isValidValue for a measurement type', () => {
  it('goes down to 1 cm, where weight stops at 20 kg', () => {
    expect(isValidValue('waist', 16.5)).toBe(true)
    expect(isValidValue('own-type', 1)).toBe(true)
    expect(isValidValue('own-type', 0.9)).toBe(false)
    expect(isValidValue('own-type', 300.1)).toBe(false)
    expect(isValidValue('weight', 16.5)).toBe(false)
  })
})

describe('defaultMetrics', () => {
  it('is Midja and Höft under the ids the CSV export uses', () => {
    expect(defaultMetrics(5)).toEqual([
      { id: 'waist', name: 'Midja', createdAt: 5 },
      { id: 'hip', name: 'Höft', createdAt: 5 },
    ])
  })
})

describe('cleanName', () => {
  it('trims and turns runs of whitespace into one space', () => {
    expect(cleanName('  Vänster   överarm ')).toBe('Vänster överarm')
  })
})

describe('nameProblem', () => {
  const existing = [{ name: 'Midja' }, { name: 'Höft' }, { name: 'Vänster arm' }]

  it('accepts a new name', () => {
    expect(nameProblem('Bröst', existing)).toBeNull()
  })
  it('rejects an empty name and one of only spaces', () => {
    expect(nameProblem('', existing)).toBe('empty')
    expect(nameProblem('   ', existing)).toBe('empty')
  })
  it('allows 30 characters and rejects 31', () => {
    expect(nameProblem('a'.repeat(30), existing)).toBeNull()
    expect(nameProblem('a'.repeat(31), existing)).toBe('tooLong')
  })
  it('rejects a name in use, whatever its case or spacing', () => {
    expect(nameProblem('midja', existing)).toBe('taken')
    expect(nameProblem('  HÖFT ', existing)).toBe('taken')
    expect(nameProblem('vänster  ARM', existing)).toBe('taken')
  })
  it('rejects the reserved words', () => {
    for (const name of ['Vikt', 'weight', 'Waist', 'HIP']) expect(nameProblem(name, [])).toBe('taken')
  })
})

describe('sortMetrics', () => {
  it('sorts A–Ö in Swedish order, ignoring case, and leaves the input alone', () => {
    const input = [{ name: 'Överarm' }, { name: 'bröst' }, { name: 'Ärm' }, { name: 'Vad' }, { name: 'Ål' }, { name: 'Arm' }]
    expect(sortMetrics(input).map((m) => m.name)).toEqual(['Arm', 'bröst', 'Vad', 'Ål', 'Ärm', 'Överarm'])
    expect(input[0].name).toBe('Överarm')
  })
})

describe('resolveLabel', () => {
  const metrics = [...defaultMetrics(0), { id: 'abc', name: 'Bröst', createdAt: 0 }]

  it('keeps weight', () => {
    expect(resolveLabel('weight', metrics)).toEqual({ id: 'weight' })
  })
  it('finds a type by its id', () => {
    expect(resolveLabel('waist', metrics)).toEqual({ id: 'waist' })
  })
  it('finds a type by its name, ignoring case', () => {
    expect(resolveLabel('bröst', metrics)).toEqual({ id: 'abc' })
  })
  it('asks for an unknown name to be created under a new id', () => {
    const resolved = resolveLabel('  Lår ', metrics)
    expect(resolved.create).toBe('Lår')
    expect(resolved.id).not.toBe('')
    expect(metrics.some((m) => m.id === resolved.id)).toBe(false)
  })
  it('brings a deleted default back under its own id and name', () => {
    expect(resolveLabel('waist', [])).toEqual({ id: 'waist', create: 'Midja' })
    expect(resolveLabel('hip', [])).toEqual({ id: 'hip', create: 'Höft' })
  })
  it('uses an own type called Midja when the default is gone', () => {
    expect(resolveLabel('waist', [{ id: 'xyz', name: 'midja', createdAt: 0 }])).toEqual({ id: 'xyz' })
  })
  it('treats a name that is also an Object property as a name', () => {
    expect(resolveLabel('toString', metrics).create).toBe('toString')
  })
})
