import { describe, expect, it } from 'vitest'
import { sv } from './sv'

describe('sv', () => {
  it('says what deleting a type takes with it', () => {
    expect(sv.detail.confirmDeleteMetric('Bröst', 14)).toBe('Bröst och dess 14 mätningar raderas. Det går inte att ångra.')
    expect(sv.detail.confirmDeleteMetric('Bröst', 1)).toBe('Bröst och dess 1 mätning raderas. Det går inte att ångra.')
    expect(sv.detail.confirmDeleteMetric('Bröst', 0)).toBe('Bröst raderas.')
  })
  it('counts entries', () => {
    expect(sv.detail.count(1)).toBe('1 mätning')
    expect(sv.detail.count(3)).toBe('3 mätningar')
  })
})
